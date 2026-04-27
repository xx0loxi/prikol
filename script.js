// Вспомогательная функция для геолокации
async function getGeoInfo() {
    try {
        const resp = await fetch('https://ipapi.co/json/');
        if (!resp.ok) throw new Error('Geo API failed');
        return await resp.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// --- НОВЫЙ ПОДХОД: Определение модели и ОС через getHighEntropyValues() ---
async function getAccurateDeviceInfo() {
    // Стандартные значения по умолчанию
    let model = 'Неизвестно';
    let platform = 'Неизвестно';
    let osVersion = 'Неизвестно';

    try {
        if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
            // Запрашиваем все необходимые высокоэнтропийные данные
            const hints = await navigator.userAgentData.getHighEntropyValues([
                "model",           // Модель устройства
                "platform",       // Платформа (например, "Android", "Windows")
                "platformVersion" // Версия ОС (например, "16", "10.0")
            ]);

            // 1. Определяем модель
            if (hints.model && hints.model.trim() !== '') {
                model = hints.model;
            } else if (navigator.userAgentData.mobile) {
                // Если модель не пришла, но это мобильное устройство
                model = 'Мобильное устройство';
            } else {
                // Для ПК часто модель не приходит, поэтому используем ПК
                model = 'ПК';
            }

            // 2. Определяем платформу и версию ОС
            if (hints.platform) {
                platform = hints.platform;
                // Приводим к удобочитаемому виду
                if (platform.toLowerCase().includes('android')) {
                    platform = 'Android';
                } else if (platform.toLowerCase().includes('ios') || platform.toLowerCase().includes('macos')) {
                    // Для iPhone/iPad платформа обычно "iOS" или "macOS" в зависимости от контекста
                    // Но getHighEntropyValues может вернуть "iOS"
                    platform = 'iPhone';
                } else if (platform.toLowerCase().includes('windows')) {
                    platform = 'ПК (Windows)';
                } else if (platform.toLowerCase().includes('mac')) {
                    platform = 'ПК (Mac)';
                } else if (platform.toLowerCase().includes('linux')) {
                    platform = 'ПК (Linux)';
                }
            }

            // 3. Определяем версию ОС
            if (hints.platformVersion) {
                osVersion = hints.platformVersion;
            }

            return { model, platform, osVersion };
        }
    } catch (e) {
        console.warn('getHighEntropyValues failed, falling back to UAParser', e);
    }

    // Фолбэк на UAParser, если getHighEntropyValues не поддерживается или вернул ошибку
    try {
        const parser = new UAParser();
        const result = parser.getResult();
        
        if (result.device && result.device.model) {
            model = result.device.model;
        } else if (result.device && result.device.type) {
            model = result.device.type;
        }

        if (result.os && result.os.name) {
            platform = result.os.name;
        }

        if (result.os && result.os.version) {
            osVersion = result.os.version;
        }
    } catch (e) {
        console.error('UAParser fallback error:', e);
    }

    return { model, platform, osVersion };
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (без изменений) ---

function formatBrowserInfo() {
    const parser = new UAParser();
    const browser = parser.getBrowser();
    if (!browser) return { name: 'Неизвестно', version: '' };
    return {
        name: browser.name || 'Неизвестно',
        version: browser.version || ''
    };
}

function getScreenInfo() {
    return {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio
    };
}

async function getBatteryInfo() {
    try {
        if (!navigator.getBattery) return null;
        const battery = await navigator.getBattery();
        return {
            level: Math.round(battery.level * 100) + '%',
            charging: battery.charging ? 'Да' : 'Нет'
        };
    } catch (e) {
        return null;
    }
}

function getMemoryInfo() {
    if (navigator.deviceMemory) {
        return navigator.deviceMemory + ' GB';
    }
    if (performance.memory) {
        const bytes = performance.memory.jsHeapSizeLimit;
        return Math.round(bytes / (1024 * 1024 * 1024)) + ' GB';
    }
    return 'неизвестно';
}

function getCpuCores() {
    return navigator.hardwareConcurrency || 'неизвестно';
}

function getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
        effectiveType: conn.effectiveType || 'неизвестно',
        downlink: conn.downlink ? conn.downlink + ' Mbps' : 'неизвестно',
        rtt: conn.rtt ? conn.rtt + ' ms' : 'неизвестно',
        type: conn.type || 'неизвестно'
    };
}

function getWebRTCIPs() {
    return new Promise((resolve) => {
        const ips = [];
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        pc.onicecandidate = (event) => {
            if (!event.candidate) {
                pc.close();
                resolve(ips);
                return;
            }
            const candidate = event.candidate.candidate;
            const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
            const match = candidate.match(ipRegex);
            if (match) {
                ips.push(match[0]);
            }
        };
        setTimeout(() => {
            pc.close();
            resolve(ips);
        }, 2000);
    });
}

// --- ГЛАВНАЯ ФУНКЦИЯ ОТОБРАЖЕНИЯ ---
async function showInfo() {
    const block = document.getElementById('info-block');
    
    // Запускаем все запросы параллельно для скорости
    const [geo, deviceInfo, browserInfo, screen, battery, memory, cores, connection, webrtcIPs] = await Promise.all([
        getGeoInfo(),
        getAccurateDeviceInfo(),
        formatBrowserInfo(),
        getScreenInfo(),
        getBatteryInfo(),
        getMemoryInfo(),
        getCpuCores(),
        getConnectionInfo(),
        getWebRTCIPs()
    ]);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let html = '';
    html += `<p><strong>IP:</strong> ${geo?.ip || 'не определён'}</p>`;
    html += `<p><strong>Страна:</strong> ${geo?.country_name || 'не определена'} (${geo?.country_code || 'N/A'})</p>`;
    html += `<p><strong>Область:</strong> ${geo?.region || 'не определён'}</p>`;
    html += `<p><strong>Почтовый индекс:</strong> ${geo?.postal || 'не определён'}</p>`;
    html += `<p><strong>Провайдер:</strong> ${geo?.org || 'не определён'}</p>`;
    html += `<p><strong>Часовой пояс:</strong> ${timeZone}</p>`;
    html += `<p><strong>Модель устройства:</strong> ${deviceInfo.model}</p>`;
    html += `<p><strong>Платформа:</strong> ${deviceInfo.platform}</p>`;
    html += `<p><strong>ОС:</strong> ${deviceInfo.platform} ${deviceInfo.osVersion}</p>`;
    html += `<p><strong>Браузер:</strong> ${browserInfo.name} ${browserInfo.version}</p>`;
    html += `<p><strong>Экран:</strong> ${screen.width}x${screen.height}, глубина: ${screen.colorDepth} bit, pixelRatio: ${screen.pixelRatio}</p>`;
    if (battery) {
        html += `<p><strong>Батарея:</strong> ${battery.level}, заряжается: ${battery.charging}</p>`;
    } else {
        html += `<p><strong>Батарея:</strong> информация недоступна</p>`;
    }
    html += `<p><strong>ОЗУ:</strong> ${memory}</p>`;
    html += `<p><strong>Ядер CPU:</strong> ${cores}</p>`;
    if (connection) {
        html += `<p><strong>Сеть:</strong> тип ${connection.type}, эффективный тип ${connection.effectiveType}, скорость ${connection.downlink}, RTT ${connection.rtt}</p>`;
    } else {
        html += `<p><strong>Сеть:</strong> информация недоступна</p>`;
    }
    if (webrtcIPs.length > 0) {
        html += `<p><strong>Локальные IP (WebRTC):</strong> ${webrtcIPs.join(', ')}</p>`;
    } else {
        html += `<p><strong>Локальные IP (WebRTC):</strong> не обнаружены</p>`;
    }
    
    block.innerHTML = html;
}

showInfo();

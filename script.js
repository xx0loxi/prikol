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

// ---- НОВАЯ ФУНКЦИЯ: Получение точной информации об устройстве ----
async function getDeviceAndBrowserInfo() {
    // Пытаемся получить данные через современный API Client Hints
    try {
        // Вызываем метод библиотеки, который сам обращается к API браузера
        const result = await UAParser().withClientHints();
        return {
            device: result.device,
            os: result.os,
            browser: result.browser
        };
    } catch (e) {
        console.warn('Client Hints не сработали, fallback на обычный парсинг', e);
        // Если API недоступен (старый браузер), используем старый метод
        const parser = new UAParser();
        return {
            device: parser.getDevice(),
            os: parser.getOS(),
            browser: parser.getBrowser()
        };
    }
}

function formatDeviceInfo(device, os) {
    let model = device.model || '';
    const type = device.type || '';
    const vendor = device.vendor || '';
    const osName = os.name || 'Неизвестно';
    const osVersion = os.version || '';

    // Если модель не определилась, пробуем подставить вендора или тип
    if (!model || model === 'K' || model.length <= 1) {
        if (type) {
            model = type === 'mobile' ? 'Мобильное устройство' : type;
        } else if (vendor) {
            model = vendor;
        } else {
            model = 'Неизвестно';
        }
    }

    let platform;
    const osLower = osName.toLowerCase();
    if (osLower.includes('android')) {
        platform = 'Android';
    } else if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad')) {
        platform = 'iPhone';
    } else if (osLower.includes('windows')) {
        platform = 'ПК (Windows)';
    } else if (osLower.includes('mac')) {
        platform = 'ПК (Mac)';
    } else if (osLower.includes('linux')) {
        platform = 'ПК (Linux)';
    } else {
        platform = 'Неизвестно';
    }

    return {
        model,
        platform,
        os: `${osName} ${osVersion}`.trim()
    };
}

function formatBrowserInfo(browser) {
    if (!browser) return { name: 'Неизвестно', version: '' };
    return {
        name: browser.name || 'Неизвестно',
        version: browser.version || ''
    };
}

// Скрин
function getScreenInfo() {
    return {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio
    };
}

// Батарея
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

// Память
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

// Ядра CPU
function getCpuCores() {
    return navigator.hardwareConcurrency || 'неизвестно';
}

// Сеть
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

// WebRTC IP
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

// ---- ОСНОВНАЯ ФУНКЦИЯ ОТОБРАЖЕНИЯ ----
async function showInfo() {
    const block = document.getElementById('info-block');
    const geo = await getGeoInfo();

    // Получаем точные данные об устройстве
    const { device, os, browser } = await getDeviceAndBrowserInfo();
    const formattedDevice = formatDeviceInfo(device, os);
    const formattedBrowser = formatBrowserInfo(browser);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screen = getScreenInfo();
    const battery = await getBatteryInfo();
    const memory = getMemoryInfo();
    const cores = getCpuCores();
    const connection = getConnectionInfo();
    const webrtcIPs = await getWebRTCIPs();

    let html = '';
    html += `<p>IP: ${geo?.ip || 'не определён'}</p>`;
    html += `<p>Страна: ${geo?.country_name || 'не определена'} (${geo?.country_code || 'N/A'})</p>`;
    html += `<p>Область: ${geo?.region || 'не определён'}</p>`;
    html += `<p>Почтовый индекс: ${geo?.postal || 'не определён'}</p>`;
    html += `<p>Провайдер: ${geo?.org || 'не определён'}</p>`;
    html += `<p>Часовой пояс: ${timeZone}</p>`;
    html += `<p>Модель устройства: ${formattedDevice.model}</p>`;
    html += `<p>Платформа: ${formattedDevice.platform}</p>`;
    html += `<p>ОС: ${formattedDevice.os}</p>`;
    html += `<p>Браузер: ${formattedBrowser.name} ${formattedBrowser.version}</p>`;
    html += `<p>Экран: ${screen.width}x${screen.height}, глубина: ${screen.colorDepth} bit, pixelRatio: ${screen.pixelRatio}</p>`;
    if (battery) {
        html += `<p>Батарея: ${battery.level}, заряжается: ${battery.charging}</p>`;
    } else {
        html += `<p>Батарея: информация недоступна</p>`;
    }
    html += `<p>ОЗУ: ${memory}</p>`;
    html += `<p>Ядер CPU: ${cores}</p>`;
    if (connection) {
        html += `<p>Сеть: тип ${connection.type}, эффективный тип ${connection.effectiveType}, скорость ${connection.downlink}, RTT ${connection.rtt}</p>`;
    } else {
        html += `<p>Сеть: информация недоступна</p>`;
    }
    if (webrtcIPs.length > 0) {
        html += `<p>Локальные IP (WebRTC): ${webrtcIPs.join(', ')}</p>`;
    } else {
        html += `<p>Локальные IP (WebRTC): не обнаружены</p>`;
    }
    block.innerHTML = html;
}

showInfo();

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

function getDeviceAndBrowserInfo() {
    const parser = new UAParser();
    return {
        device: parser.getDevice(),
        browser: parser.getBrowser(),
        os: parser.getOS()
    };
}

// Умное определение модели устройства, особенно для Samsung
function extractAccurateModel(ua, deviceInfo) {
    const vendor = (deviceInfo.device.vendor || '').toLowerCase();
    const model = deviceInfo.device.model || '';
    const type = deviceInfo.device.type || '';
    const osName = (deviceInfo.os.name || '').toLowerCase();

    // Если это мобильное устройство (не ПК)
    if (type === 'mobile' || type === 'tablet') {
        // Попытка найти модель Samsung (SM-...)
        if (vendor.includes('samsung') || osName.includes('android')) {
            const match = ua.match(/SM-[A-Za-z0-9]+/i) || ua.match(/GT-[A-Za-z0-9]+/i);
            if (match) return match[0];
        }
        // Для iPhone модель из UAParser обычно точна, но можно проверить
        if (osName.includes('ios') || osName.includes('iphone')) {
            // iPhone модели часто записаны как "iPhone X", оставляем как есть или уточняем
            if (model.includes('iPhone')) return model;
        }
        // Если модель уже выглядит нормально (не одна буква), возвращаем её
        if (model && model.length > 1) return model;
        // Для остальных случаев используем ос и тип
        if (osName.includes('android')) return 'Android устройство';
        if (osName.includes('ios')) return 'Apple устройство';
        return 'Мобильное устройство';
    }
    // ПК или ноутбук
    return model || 'ПК';
}

// Определение настоящей версии Windows (10 или 11)
async function getAccurateOS(osInfo) {
    if (!osInfo.name) return 'Неизвестно';
    let osName = osInfo.name;
    let osVersion = osInfo.version || '';

    // Для Windows проверяем возможную Windows 11
    if (osName.toLowerCase().includes('windows')) {
        // Используем современное API, если доступно
        if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
            try {
                const uaData = await navigator.userAgentData.getHighEntropyValues(['platformVersion']);
                const fullVersion = uaData.platformVersion || '';
                const majorVersion = fullVersion.split('.')[0];
                if (majorVersion === '13' || majorVersion === '11') {
                    return `Windows 11 (${osVersion})`;
                } else if (majorVersion === '10') {
                    // Проверим билд через user-agent (не всегда, но можно)
                    const ntMatch = navigator.userAgent.match(/Windows NT 10\.0;.*?(\d{5,})/);
                    if (ntMatch && parseInt(ntMatch[1]) >= 22000) {
                        return `Windows 11 (${osVersion})`;
                    }
                    return `Windows 10 (${osVersion})`;
                }
            } catch (e) {}
        }
        // Если getHighEntropyValues недоступен, проверяем user-agent на билд
        const ntMatch = navigator.userAgent.match(/Windows NT 10\.0;.*?(\d{5,})/);
        if (ntMatch && parseInt(ntMatch[1]) >= 22000) {
            return `Windows 11 (${osVersion})`;
        }
        return `Windows 10 (${osVersion})`;
    }

    // Остальные ОС
    return `${osName} ${osVersion}`.trim();
}

function formatDeviceInfo(deviceInfo, ua) {
    const { device, os } = deviceInfo;
    const osName = os.name || 'Неизвестно';
    const osVersion = os.version || '';

    // Платформа
    let platform;
    const osLower = osName.toLowerCase();
    if (osLower.includes('android')) platform = 'Android';
    else if (osLower.includes('ios')) platform = 'iPhone';
    else if (osLower.includes('windows')) platform = 'ПК (Windows)';
    else if (osLower.includes('mac')) platform = 'ПК (Mac)';
    else if (osLower.includes('linux')) platform = 'ПК (Linux)';
    else platform = 'Неизвестно';

    // Точная модель
    const model = extractAccurateModel(ua, { device, os: { name: osName } });

    return { model, platform, os: `${osName} ${osVersion}`.trim() };
}

function formatBrowserInfo(browser) {
    if (!browser) return { name: 'Неизвестно', version: '' };
    return { name: browser.name || 'Неизвестно', version: browser.version || '' };
}

// Скрин, батарея, память, ядра, сеть
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
    if (navigator.deviceMemory) return navigator.deviceMemory + ' GB';
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

async function showInfo() {
    const block = document.getElementById('info-block');
    const geo = await getGeoInfo();
    const ua = navigator.userAgent;
    const deviceInfo = getDeviceAndBrowserInfo();

    // Асинхронно получаем уточнённую ОС (Windows 10/11)
    const accurateOS = await getAccurateOS(deviceInfo.os);
    const formattedDevice = formatDeviceInfo(deviceInfo, ua);
    const browserInfo = formatBrowserInfo(deviceInfo.browser);
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
    html += `<p>ОС: ${accurateOS}</p>`;
    html += `<p>Браузер: ${browserInfo.name} ${browserInfo.version}</p>`;
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

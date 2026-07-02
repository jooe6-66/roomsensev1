// ====== KONFIGURASI BACKEND ======
const BACKEND_URL = "https://unengaged-finalist-married.ngrok-free.dev"; 
// =================================

// Fungsi helper untuk mendapatkan URL API
const getApiUrl = (path) => {
    if (BACKEND_URL) {
        const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
        return `${base}${path}`;
    }
    return path;
};

// Fungsi helper untuk mendapatkan URL WebSocket
const getWsUrl = (path) => {
    if (BACKEND_URL) {
        const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
        const wsBase = base.replace(/^http/, 'ws');
        return `${wsBase}${path}`;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${path}`;
};

// Fungsi helper untuk menampilkan Toast Notification melayang
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '✨';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Hapus dari DOM setelah 4 detik
    setTimeout(() => {
        toast.remove();
    }, 4000);
};



/* ==========================================================================
   DYNAMIC CONFIGURATION (LOCAL STORAGE)
   ========================================================================== */
let CONFIG = {
    tempMin: parseFloat(localStorage.getItem('tempMin')) || 20.0,
    tempMax: parseFloat(localStorage.getItem('tempMax')) || 26.0,
    humidMin: parseInt(localStorage.getItem('humidMin')) || 40,
    humidMax: parseInt(localStorage.getItem('humidMax')) || 60,
    interval: parseInt(localStorage.getItem('interval')) || 30
};

// ====== HISTORICAL REPORTS STATE ======
let historicalData = [];
let reportChartInstance = null;

/* ==========================================================================
   SYSTEM THEME MODE SWITCHER
   ========================================================================== */
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const htmlElement = document.documentElement;

// Ambil status tema yang tersimpan
const savedTheme = localStorage.getItem('theme') || 'dark';
htmlElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
        const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', targetTheme);
        localStorage.setItem('theme', targetTheme);
        
        updateThemeIcon(targetTheme);
        
        // Perbarui warna grafik agar cocok dengan tema baru
        updateChartThemeColors(targetTheme);
    });
}

function updateThemeIcon(theme) {
    const iconSvg = document.getElementById('theme-icon-svg');
    if (!iconSvg) return;
    if (theme === 'light') {
        // Tampilkan ikon Bulan ketika sedang tema Terang (agar klik berikutnya beralih ke Gelap)
        iconSvg.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    } else {
        // Tampilkan ikon Matahari ketika sedang tema Gelap (agar klik berikutnya beralih ke Terang)
        iconSvg.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
}

// Mendapatkan konfigurasi warna berdasarkan tema saat ini
function getThemeColors(theme) {
    const isLight = (theme === 'light');
    return {
        gridColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.02)',
        tickColor: isLight ? '#64748b' : '#7e7c9c',
        tooltipBg: isLight ? '#ffffff' : '#121124',
        tooltipBorder: isLight ? '#e2e8f0' : '#201e3d',
        tooltipText: isLight ? '#1e1b4b' : '#f8fafc'
    };
}

/* ==========================================================================
   SINGLE PAGE APPLICATION (TAB SWITCHING)
   ========================================================================== */
function switchTab(tabId) {
    // Sembunyikan semua konten tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    // Tampilkan tab yang dipilih
    const targetTab = document.getElementById(`${tabId}-tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    }

    // Perbarui judul halaman di Header
    const titles = {
        overview: 'Dashboard Overview',
        reports: 'Laporan Sensor',
        settings: 'Pengaturan Sistem'
    };
    document.getElementById('page-title').textContent = titles[tabId] || 'Dashboard';

    // Perbarui status aktif di Sidebar Menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        }
    });

    if (tabId === 'reports') {
        fetchHistoricalData();
    }
}

// Pasang event listener klik pada item menu sidebar
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
    });
});

/* ==========================================================================
   SETTINGS FORM CONTROL
   ========================================================================== */
function loadSettingsForm() {
    document.getElementById('set-temp-min').value = CONFIG.tempMin;
    document.getElementById('set-temp-max').value = CONFIG.tempMax;
    document.getElementById('set-humid-min').value = CONFIG.humidMin;
    document.getElementById('set-humid-max').value = CONFIG.humidMax;
    document.getElementById('set-interval').value = CONFIG.interval;
}

const settingsForm = document.getElementById('settings-form');
if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const tempMin = parseFloat(document.getElementById('set-temp-min').value);
        const tempMax = parseFloat(document.getElementById('set-temp-max').value);
        const humidMin = parseInt(document.getElementById('set-humid-min').value);
        const humidMax = parseInt(document.getElementById('set-humid-max').value);
        const interval = parseInt(document.getElementById('set-interval').value);

        // Validasi input sederhana
        if (tempMin >= tempMax) {
            showSaveStatus("Validasi Gagal: Suhu minimum harus lebih kecil dari suhu maksimum!", false);
            return;
        }
        if (humidMin >= humidMax) {
            showSaveStatus("Validasi Gagal: Kelembaban minimum harus lebih kecil dari kelembaban maksimum!", false);
            return;
        }

        // Simpan ke Local Storage
        localStorage.setItem('tempMin', tempMin);
        localStorage.setItem('tempMax', tempMax);
        localStorage.setItem('humidMin', humidMin);
        localStorage.setItem('humidMax', humidMax);
        localStorage.setItem('interval', interval);

        // Update objek CONFIG di memori
        CONFIG.tempMin = tempMin;
        CONFIG.tempMax = tempMax;
        CONFIG.humidMin = humidMin;
        CONFIG.humidMax = humidMax;
        CONFIG.interval = interval;

        // Ambil nilai sensor saat ini dan langsung evaluasi ulang status badge
        const currentTemp = parseFloat(document.getElementById('temp-val').textContent);
        const currentHumid = parseFloat(document.getElementById('humid-val').textContent);
        const currentHi = parseFloat(document.getElementById('hi-val').textContent);

        updateAllMetrics(
            isNaN(currentTemp) ? null : currentTemp, 
            isNaN(currentHumid) ? null : currentHumid, 
            isNaN(currentHi) ? null : currentHi
        );

        fetch(getApiUrl('/api/settings'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                tempMin: tempMin,
                tempMax: tempMax,
                humidMin: humidMin,
                humidMax: humidMax,
                interval: interval
            })
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengirim ke server Node-RED");
            showSaveStatus("Konfigurasi disimpan secara lokal & berhasil diterapkan ke ESP32!", true);
        })
        .catch(err => {
            console.error("Gagal mengirim ke backend Node-RED:", err);
            showSaveStatus("Tersimpan di browser, gagal memperbarui server (Pastikan ngrok aktif).", false);
        });
    });
}

function showSaveStatus(message, isSuccess) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `save-status show ${isSuccess ? 'success' : 'error'}`;
        
        // Sembunyikan notifikasi setelah 4 detik
        setTimeout(() => {
            statusEl.className = "save-status";
        }, 4000);
    }
    
    // Tampilkan Toast Premium
    showToast(message, isSuccess ? 'success' : 'error');
}

/* ==========================================================================
   SPARKLINE (NATIVE SVG) GENERATOR
   ========================================================================== */
// ponytail: native SVG generator untuk menggantikan library Chart.js di sparkline
const sparklineData = {
    tempSparkline: [],
    humidSparkline: [],
    hiSparkline: []
};

function pushToSparkline(sparklineId, value) {
    if (value === null || value === undefined || isNaN(value)) return;
    
    const data = sparklineData[sparklineId];
    if (!data) return;
    
    data.push(value);
    if (data.length > 10) {
        data.shift();
    }
    
    const svgEl = document.getElementById(sparklineId);
    if (!svgEl) return;
    
    const linePath = svgEl.querySelector('.sparkline-line');
    const fillPath = svgEl.querySelector('.sparkline-fill');
    if (!linePath) return;
    
    const N = data.length;
    if (N < 2) return;
    
    // Cari nilai minimum dan maksimum data
    let min = Math.min(...data);
    let max = Math.max(...data);
    
    // Cegah pembagian nol jika data bernilai konstan
    if (max === min) {
        min -= 1;
        max += 1;
    }
    
    const points = [];
    for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * 100;
        const y = 30 - (((data[i] - min) / (max - min)) * 26 + 2); // padding 2px di atas & bawah
        points.push({x, y});
    }
    
    // Susun string koordinat d untuk path garis
    let lineD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < N; i++) {
        lineD += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
    }
    
    // Susun string koordinat d untuk path fill area (berakhir di bawah)
    const fillD = `${lineD} L ${points[N - 1].x.toFixed(1)} 30 L ${points[0].x.toFixed(1)} 30 Z`;
    
    linePath.setAttribute('d', lineD);
    if (fillPath) fillPath.setAttribute('d', fillD);
}

/* ==========================================================================
   MAIN INTERACTIVE CHART INITIALIZATION
   ========================================================================== */
const ctxMain = document.getElementById('roomsenseChart').getContext('2d');

const tempGrad = ctxMain.createLinearGradient(0, 0, 0, 300);
tempGrad.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
tempGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');

const humidGrad = ctxMain.createLinearGradient(0, 0, 0, 300);
humidGrad.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
humidGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');

const hiGrad = ctxMain.createLinearGradient(0, 0, 0, 300);
hiGrad.addColorStop(0, 'rgba(234, 179, 8, 0.15)');
hiGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');

const initColors = getThemeColors(savedTheme);

const roomsenseChart = new Chart(ctxMain, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Suhu (°C)',
                borderColor: '#f43f5e',
                backgroundColor: tempGrad,
                data: [],
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 1.5,
                pointHoverRadius: 5
            },
            {
                label: 'Kelembaban (%)',
                borderColor: '#0ea5e9',
                backgroundColor: humidGrad,
                data: [],
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 1.5,
                pointHoverRadius: 5
            },
            {
                label: 'Heat Index (°C)',
                borderColor: '#eab308',
                backgroundColor: hiGrad,
                data: [],
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 1.5,
                pointHoverRadius: 5
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: initColors.tooltipBg,
                titleColor: initColors.tooltipText,
                bodyColor: initColors.tickColor,
                borderColor: initColors.tooltipBorder,
                borderWidth: 1,
                padding: 10,
                bodyFont: { family: 'Outfit' },
                titleFont: { family: 'Outfit', weight: '600' }
            }
        },
        scales: {
            x: {
                grid: { color: initColors.gridColor },
                ticks: { color: initColors.tickColor, font: { family: 'Outfit', size: 10 } }
            },
            y: {
                grid: { color: initColors.gridColor },
                ticks: { color: initColors.tickColor, font: { family: 'Outfit', size: 10 } }
            }
        }
    }
});

// ====== CUSTOM LEGEND BUTTONS SINKRONISASI ======
const legendButtons = {
    0: { btn: document.getElementById('legend-temp'), activeClass: 'active-temp' },
    1: { btn: document.getElementById('legend-humid'), activeClass: 'active-humid' },
    2: { btn: document.getElementById('legend-hi'), activeClass: 'active-hi' }
};

Object.keys(legendButtons).forEach(indexStr => {
    const index = parseInt(indexStr);
    const item = legendButtons[index];
    if (item.btn) {
        item.btn.addEventListener('click', () => {
            const isVisible = roomsenseChart.isDatasetVisible(index);
            if (isVisible) {
                roomsenseChart.hide(index);
                item.btn.classList.remove(item.activeClass);
            } else {
                roomsenseChart.show(index);
                item.btn.classList.add(item.activeClass);
            }
        });
    }
});

// ====== HISTORICAL REPORT LEGEND BUTTONS SINKRONISASI ======
const reportLegendButtons = {
    0: { btn: document.getElementById('report-legend-temp'), activeClass: 'active-temp' },
    1: { btn: document.getElementById('report-legend-humid'), activeClass: 'active-humid' },
    2: { btn: document.getElementById('report-legend-hi'), activeClass: 'active-hi' }
};

Object.keys(reportLegendButtons).forEach(indexStr => {
    const index = parseInt(indexStr);
    const item = reportLegendButtons[index];
    if (item.btn) {
        item.btn.addEventListener('click', () => {
            if (reportChartInstance) {
                const isVisible = reportChartInstance.isDatasetVisible(index);
                if (isVisible) {
                    reportChartInstance.hide(index);
                    item.btn.classList.remove(item.activeClass);
                } else {
                    reportChartInstance.show(index);
                    item.btn.classList.add(item.activeClass);
                }
            } else {
                item.btn.classList.toggle(item.activeClass);
            }
        });
    }
});

function updateChartThemeColors(theme) {
    const colors = getThemeColors(theme);
    
    roomsenseChart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
    roomsenseChart.options.plugins.tooltip.titleColor = colors.tooltipText;
    roomsenseChart.options.plugins.tooltip.bodyColor = colors.tickColor;
    roomsenseChart.options.plugins.tooltip.borderColor = colors.tooltipBorder;
    
    roomsenseChart.options.scales.x.grid.color = colors.gridColor;
    roomsenseChart.options.scales.x.ticks.color = colors.tickColor;
    roomsenseChart.options.scales.y.grid.color = colors.gridColor;
    roomsenseChart.options.scales.y.ticks.color = colors.tickColor;
    
    roomsenseChart.update();
    
    // Perbarui pula tema warna pada chart laporan historis jika sedang aktif
    if (reportChartInstance) {
        reportChartInstance.options.plugins.legend.labels.color = colors.tickColor;
        reportChartInstance.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
        reportChartInstance.options.plugins.tooltip.titleColor = colors.tooltipText;
        reportChartInstance.options.plugins.tooltip.bodyColor = colors.tickColor;
        reportChartInstance.options.plugins.tooltip.borderColor = colors.tooltipBorder;
        
        reportChartInstance.options.scales.x.grid.color = colors.gridColor;
        reportChartInstance.options.scales.x.ticks.color = colors.tickColor;
        reportChartInstance.options.scales.y.grid.color = colors.gridColor;
        reportChartInstance.options.scales.y.ticks.color = colors.tickColor;
        
        reportChartInstance.update();
    }
}

/* ==========================================================================
   METRIC STATUS VALUES AND EVALUATIONS (DYNAMIC WITH CONFIG)
   ========================================================================== */
function evaluateTemperature(temp) {
    const el = document.getElementById('temp-badge');
    const desc = document.getElementById('temp-desc');
    desc.textContent = `Rentang nyaman: ${CONFIG.tempMin.toFixed(1)}-${CONFIG.tempMax.toFixed(1)}°C`;
    
    if (temp < CONFIG.tempMin) {
        el.className = "comfort-badge badge-warning";
        el.textContent = "Dingin";
    } else if (temp >= CONFIG.tempMin && temp <= CONFIG.tempMax) {
        el.className = "comfort-badge badge-normal";
        el.textContent = "Nyaman";
    } else {
        el.className = "comfort-badge badge-danger";
        el.textContent = "Panas";
    }
}

function evaluateHumidity(humid) {
    const el = document.getElementById('humid-badge');
    const desc = document.getElementById('humid-desc');
    desc.textContent = `Rentang nyaman: ${CONFIG.humidMin}-${CONFIG.humidMax}%`;
    
    if (humid < CONFIG.humidMin) {
        el.className = "comfort-badge badge-warning";
        el.textContent = "Kering";
    } else if (humid >= CONFIG.humidMin && humid <= CONFIG.humidMax) {
        el.className = "comfort-badge badge-normal";
        el.textContent = "Ideal";
    } else {
        el.className = "comfort-badge badge-danger";
        el.textContent = "Lembab";
    }
}

function evaluateHeatIndex(hi) {
    const el = document.getElementById('hi-badge');
    const desc = document.getElementById('hi-desc');
    if (hi < 27) {
        el.className = "comfort-badge badge-normal";
        el.textContent = "Aman";
        desc.textContent = "Tidak ada resiko termal.";
    } else if (hi >= 27 && hi < 32) {
        el.className = "comfort-badge badge-warning";
        el.textContent = "Waspada";
        desc.textContent = "Fisik mulai cepat lelah.";
    } else if (hi >= 32 && hi < 41) {
        el.className = "comfort-badge badge-danger";
        el.textContent = "Sangat Waspada";
        desc.textContent = "Resiko kram otot / kelelahan panas.";
    } else {
        el.className = "comfort-badge badge-danger";
        el.textContent = "Bahaya";
        desc.textContent = "Resiko tinggi sengatan panas (heatstroke).";
    }
}

function updateAllMetrics(temp, humid, hi) {
    document.getElementById('temp-val').textContent = temp !== null ? parseFloat(temp).toFixed(1) : "--";
    document.getElementById('humid-val').textContent = humid !== null ? parseFloat(humid).toFixed(1) : "--";
    document.getElementById('hi-val').textContent = hi !== null ? parseFloat(hi).toFixed(1) : "--";

    evaluateTemperature(temp !== null ? temp : 0);
    evaluateHumidity(humid !== null ? humid : 0);
    evaluateHeatIndex(hi !== null ? hi : 0);
}

/* ==========================================================================
   DATA LOADER (HISTORY & REAL-TIME WEBSOCKET)
   ========================================================================== */
fetch(getApiUrl('/api/history'), {
    headers: {
        'ngrok-skip-browser-warning': 'true'
    }
})
    .then(res => res.json())
    .then(data => {
        data.forEach(row => {
            const timeLabel = new Date(row.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            
            const temp = (row.temperature !== null) ? parseFloat(row.temperature) : null;
            const humid = (row.humidity !== null) ? parseFloat(row.humidity) : null;
            const hi = (row.heat_index !== null) ? parseFloat(row.heat_index) : temp;

            roomsenseChart.data.labels.push(timeLabel);
            roomsenseChart.data.datasets[0].data.push(temp);
            roomsenseChart.data.datasets[1].data.push(humid);
            roomsenseChart.data.datasets[2].data.push(hi);

            if (temp !== null) pushToSparkline('tempSparkline', temp);
            if (humid !== null) pushToSparkline('humidSparkline', humid);
            if (hi !== null) pushToSparkline('hiSparkline', hi);
        });
        
        if (data.length > 0) {
            const latest = data[data.length - 1];
            const temp = (latest.temperature !== null) ? parseFloat(latest.temperature) : null;
            const humid = (latest.humidity !== null) ? parseFloat(latest.humidity) : null;
            const hi = (latest.heat_index !== null) ? parseFloat(latest.heat_index) : temp;
            updateAllMetrics(temp, humid, hi);
        }
        roomsenseChart.update();
    })
    .catch(err => console.error("Gagal memuat data histori:", err));

// 2. Koneksi WebSocket untuk Data Real-time & Deteksi Status Sensor dengan Auto-Reconnect
const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');

let ws = null;
let lastMessageTime = Date.now();
let sensorOfflineTriggered = false;
let wsReconnectDelay = 2000;
const maxWsReconnectDelay = 30000;

function setSensorOnlineStatus(online) {
    const dot = document.getElementById('conn-dot');
    const text = document.getElementById('conn-text');
    const cards = document.querySelectorAll('.metric-card');
    
    if (online) {
        if (dot) dot.className = "status-dot online";
        if (text) text.textContent = "Terhubung";
        cards.forEach(card => card.classList.remove('stale-data'));
        if (sensorOfflineTriggered) {
            showToast("Sensor ESP32 terhubung kembali!", "success");
            sensorOfflineTriggered = false;
        }
    } else {
        if (dot) dot.className = "status-dot offline-sensor";
        if (text) text.textContent = "Sensor Offline";
        cards.forEach(card => card.classList.add('stale-data'));
        if (!sensorOfflineTriggered) {
            showToast("Sensor terputus! Data tidak diperbarui.", "warning");
            sensorOfflineTriggered = true;
        }
    }
}

function connectWebSocket() {
    const wsUrl = getWsUrl('/ws/sensor');
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        if (connDot) connDot.className = "status-dot online";
        if (connText) connText.textContent = "Terhubung";
        lastMessageTime = Date.now(); // Reset timer saat koneksi websocket terbuka
        wsReconnectDelay = 2000;      // Reset delay saat sukses terhubung
    };

    ws.onclose = () => {
        if (connDot) connDot.className = "status-dot";
        if (connText) connText.textContent = "Terputus";
        
        // ponytail: auto-reconnect dengan exponential backoff
        setTimeout(() => {
            console.log("WebSocket: Mencoba menghubungkan kembali...");
            connectWebSocket();
        }, wsReconnectDelay);
        
        wsReconnectDelay = Math.min(wsReconnectDelay * 1.5, maxWsReconnectDelay);
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close(); // Pemicu onclose
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Deteksi pesan LWT status MQTT dari ESP32
            if (data.status === "offline") {
                setSensorOnlineStatus(false);
                return;
            }
            
            // Setiap menerima pesan sensor baru, perbarui waktu dan status online
            lastMessageTime = Date.now();
            setSensorOnlineStatus(true);

            const timeLabel = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            
            const temp = (data.temperature !== undefined) ? parseFloat(data.temperature) : null;
            const humid = (data.humidity !== undefined) ? parseFloat(data.humidity) : null;
            const hi = (data.heat_index !== undefined && data.heat_index !== null) ? parseFloat(data.heat_index) : temp;

            updateAllMetrics(temp, humid, hi);

            if (temp !== null) pushToSparkline('tempSparkline', temp);
            if (humid !== null) pushToSparkline('humidSparkline', humid);
            if (hi !== null) pushToSparkline('hiSparkline', hi);

            roomsenseChart.data.labels.push(timeLabel);
            roomsenseChart.data.datasets[0].data.push(temp);
            roomsenseChart.data.datasets[1].data.push(humid);
            roomsenseChart.data.datasets[2].data.push(hi);

            if (roomsenseChart.data.labels.length > 50) {
                roomsenseChart.data.labels.shift();
                roomsenseChart.data.datasets[0].data.shift();
                roomsenseChart.data.datasets[1].data.shift();
                roomsenseChart.data.datasets[2].data.shift();
            }

            roomsenseChart.update();
        } catch (err) {
            console.error("Gagal membaca data WebSocket:", err);
        }
    };
}

// Inisialisasi koneksi WebSocket
connectWebSocket();

// Cek status heartbeat sensor secara berkala (setiap 5 detik)
setInterval(() => {
    const savedInterval = parseInt(localStorage.getItem('interval') || '30') * 1000;
    const threshold = Math.max(savedInterval * 2, 20000); // Batas minimal 20 detik sebelum dianggap offline
    
    // Jika tidak ada data MQTT baru melewati batas threshold, nyatakan offline
    if (Date.now() - lastMessageTime > threshold) {
        setSensorOnlineStatus(false);
    }
}, 5000);

/* ==========================================================================
   APP INITIALIZATION
   ========================================================================== */
// Load pengaturan awal ke form formulir saat web pertama dibuka
loadSettingsForm();
// Pemicu inisialisasi teks rentang nyaman pada kartu metrik
updateAllMetrics(null, null, null);

// ====== HISTORICAL REPORTS LOGIC ======
function fetchHistoricalData() {
    fetch(getApiUrl('/api/export'), {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    })
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengambil data historis");
            return res.text();
        })
        .then(csvText => {
            historicalData = parseCSV(csvText);
            
            // Set tanggal default jika belum diisi
            const startInput = document.getElementById('filter-start-date');
            const endInput = document.getElementById('filter-end-date');
            if (startInput && !startInput.value) {
                initDefaultFilterDates();
            }
            
            // Lakukan pemfilteran pertama kali
            filterReports();
        })
        .catch(err => {
            console.error("Gagal memuat laporan historis:", err);
        });
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        if (cols.length < 5) continue;
        
        const id = cols[0];
        const timestamp = cols[1].replace(/"/g, ''); // Hapus tanda kutip ganda
        const temperature = parseFloat(cols[2]);
        const humidity = parseFloat(cols[3]);
        const heat_index = parseFloat(cols[4]);
        
        if (isNaN(temperature) || isNaN(humidity)) continue;
        
        result.push({
            id,
            timestamp,
            temperature,
            humidity,
            heat_index,
            dateObj: new Date(timestamp.replace(/-/g, '/')) // Biar aman cross-browser parsing
        });
    }
    return result;
}

function initDefaultFilterDates() {
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    if (historicalData && historicalData.length > 0) {
        // Cari tanggal paling awal dan paling akhir dari data yang ada di database
        const dates = historicalData.map(row => row.dateObj);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        document.getElementById('filter-start-date').value = formatDate(minDate);
        document.getElementById('filter-end-date').value = formatDate(maxDate);
    } else {
        // Fallback jika tidak ada data sama sekali
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        document.getElementById('filter-start-date').value = formatDate(sevenDaysAgo);
        document.getElementById('filter-end-date').value = formatDate(today);
    }
}

function filterReports() {
    const startDateStr = document.getElementById('filter-start-date').value;
    const endDateStr = document.getElementById('filter-end-date').value;
    
    if (!startDateStr || !endDateStr) return;
    
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    
    // Filter data yang berada dalam rentang
    const filtered = historicalData.filter(row => {
        return row.dateObj >= start && row.dateObj <= end;
    });
    
    // Urutkan (Lama ke Baru untuk chart, Baru ke Lama untuk tabel)
    const chartData = [...filtered].sort((a, b) => a.dateObj - b.dateObj);
    const tableData = [...filtered].sort((a, b) => b.dateObj - a.dateObj);
    
    updateReportsStats(filtered);
    renderReportsChart(chartData);
    renderReportsTable(tableData);
}

function updateReportsStats(data) {
    const count = data.length;
    document.getElementById('stats-total-records').textContent = count;
    
    if (count === 0) {
        document.getElementById('stats-avg-temp').textContent = '-- °C';
        document.getElementById('stats-avg-humid').textContent = '-- %';
        document.getElementById('stats-avg-hi').textContent = '-- °C';
        return;
    }
    
    let sumTemp = 0, sumHumid = 0, sumHi = 0;
    data.forEach(row => {
        sumTemp += row.temperature;
        sumHumid += row.humidity;
        sumHi += row.heat_index;
    });
    
    document.getElementById('stats-avg-temp').textContent = (sumTemp / count).toFixed(1) + ' °C';
    document.getElementById('stats-avg-humid').textContent = (sumHumid / count).toFixed(1) + ' %';
    document.getElementById('stats-avg-hi').textContent = (sumHi / count).toFixed(1) + ' °C';
}

function renderReportsChart(data) {
    const ctx = document.getElementById('reportChart').getContext('2d');
    
    const labels = data.map(row => {
        return row.dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
               row.dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    });
    
    const temps = data.map(row => row.temperature);
    const humids = data.map(row => row.humidity);
    const his = data.map(row => row.heat_index);
    
    if (reportChartInstance) {
        reportChartInstance.destroy();
    }
    
    const isLight = (document.documentElement.getAttribute('data-theme') === 'light');
    const themeName = isLight ? 'light' : 'dark';
    const colors = getThemeColors(themeName);
    
    const tempGrad = ctx.createLinearGradient(0, 0, 0, 300);
    tempGrad.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
    tempGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    
    const humidGrad = ctx.createLinearGradient(0, 0, 0, 300);
    humidGrad.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
    humidGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
    
    const hiGrad = ctx.createLinearGradient(0, 0, 0, 300);
    hiGrad.addColorStop(0, 'rgba(234, 179, 8, 0.15)');
    hiGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
    
    reportChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Suhu (°C)',
                    borderColor: '#f43f5e',
                    backgroundColor: tempGrad,
                    data: temps,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1.5,
                    pointHoverRadius: 5
                },
                {
                    label: 'Kelembaban (%)',
                    borderColor: '#0ea5e9',
                    backgroundColor: humidGrad,
                    data: humids,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1.5,
                    pointHoverRadius: 5
                },
                {
                    label: 'Heat Index (°C)',
                    borderColor: '#eab308',
                    backgroundColor: hiGrad,
                    data: his,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1.5,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Sembunyikan legenda bawaan Chart.js
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipText,
                    bodyColor: colors.tickColor,
                    borderColor: colors.tooltipBorder,
                    borderWidth: 1,
                    padding: 10,
                    bodyFont: { family: 'Outfit' },
                    titleFont: { family: 'Outfit', weight: '600' }
                }
            },
            scales: {
                x: {
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.tickColor, font: { family: 'Outfit', size: 9 }, maxRotation: 45, minRotation: 45 }
                },
                y: {
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.tickColor, font: { family: 'Outfit', size: 9 } }
                }
            }
        }
    });

    // Sinkronisasikan visibilitas dataset dengan status tombol legenda kustom
    Object.keys(reportLegendButtons).forEach(indexStr => {
        const index = parseInt(indexStr);
        const item = reportLegendButtons[index];
        if (item.btn) {
            const isActive = item.btn.classList.contains(item.activeClass);
            if (!isActive) {
                reportChartInstance.hide(index);
            } else {
                reportChartInstance.show(index);
            }
        }
    });
}

function renderReportsTable(data) {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Tidak ada data ditemukan pada rentang tanggal tersebut.</td></tr>`;
        return;
    }
    
    data.forEach(row => {
        const timeStr = row.dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                        row.dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${timeStr}</td>
            <td style="font-weight: 600; color: #f43f5e;">${row.temperature.toFixed(1)} °C</td>
            <td style="font-weight: 600; color: #0ea5e9;">${row.humidity.toFixed(1)} %</td>
            <td style="font-weight: 600; color: #eab308;">${row.heat_index.toFixed(1)} °C</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportFilteredReports() {
    const startDateStr = document.getElementById('filter-start-date').value;
    const endDateStr = document.getElementById('filter-end-date').value;
    
    if (!startDateStr || !endDateStr) return;
    
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    
    const filtered = historicalData.filter(row => {
        return row.dateObj >= start && row.dateObj <= end;
    });
    
    if (filtered.length === 0) {
        showToast("Tidak ada data untuk diekspor!", "error");
        return;
    }
    
    filtered.sort((a, b) => a.dateObj - b.dateObj);
    
    let csvContent = "data:text/csv;charset=utf-8,ID,Waktu/Timestamp,Suhu (C),Kelembaban (%),Heat Index (C)\n";
    filtered.forEach(row => {
        csvContent += `${row.id},"${row.timestamp}",${row.temperature},${row.humidity},${row.heat_index}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_sensor_${startDateStr}_ke_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Laporan sensor berhasil diekspor ke CSV!", "success");
}

// Register reports event listeners
const filterForm = document.getElementById('filter-form');
if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        filterReports();
    });
}

const btnExportReports = document.getElementById('btn-export-reports');
if (btnExportReports) {
    btnExportReports.addEventListener('click', () => {
        exportFilteredReports();
    });
}

// ==========================================================================
// CHATBOT FLOATING POPUP LOGIC
// ==========================================================================
const chatTriggerBtn = document.getElementById('chat-trigger-btn');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

if (chatTriggerBtn && chatCloseBtn && chatWindow) {
    chatTriggerBtn.addEventListener('click', () => {
        const isVisible = chatWindow.style.display !== 'none';
        chatWindow.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            if (chatInput) chatInput.focus();
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    chatCloseBtn.addEventListener('click', () => {
        chatWindow.style.display = 'none';
    });
}

if (chatForm && chatInput && chatMessages) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = chatInput.value.trim();
        if (!messageText) return;
        
        // Tampilkan pesan User
        appendMessage(messageText, 'user-message');
        chatInput.value = '';
        
        // Tampilkan typing indicator
        const typingIndicator = appendMessage('AI sedang berpikir...', 'bot-message typing-message');
        
        // Kirim ke backend Node-RED beserta data batas kenyamanan
        const payloadObj = {
            message: messageText,
            settings: {
                temp_min: localStorage.getItem('tempMin') || '20.0',
                temp_max: localStorage.getItem('tempMax') || '26.0',
                humid_min: localStorage.getItem('humidMin') || '40',
                humid_max: localStorage.getItem('humidMax') || '60'
            }
        };

        fetch(getApiUrl('/api/chat'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payloadObj)
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal menghubungi server chatbot");
            return res.json();
        })
        .then(data => {
            // Hapus typing indicator
            typingIndicator.remove();
            
            // Tampilkan pesan Bot
            const botResponse = data.response || "Maaf, saya tidak menerima jawaban yang valid dari server.";
            appendMessage(botResponse, 'bot-message');
        })
        .catch(err => {
            console.error("Chatbot error:", err);
            typingIndicator.remove();
            appendMessage("Gagal menghubungi asisten AI. Pastikan server Node-RED & ngrok aktif.", 'bot-message');
            showToast("Koneksi chatbot gagal! Cek server & ngrok.", "error");
        });
    });
}

function appendMessage(text, senderClass) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${senderClass}`;
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
}

// ====== PREMIUM HOVER PARALLAX GLOW EFFECT ======
// ponytail: dynamic radial gradient tracking using CSS custom properties for metric cards
document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

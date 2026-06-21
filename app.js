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

// Sesuaikan URL download link (CSV) secara dinamis
document.getElementById('download-link').href = getApiUrl('/api/export');

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

        // Kirim konfigurasi ke server Node-RED via HTTP POST
        fetch(getApiUrl('/api/settings'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
    statusEl.textContent = message;
    statusEl.className = `save-status show ${isSuccess ? 'success' : 'error'}`;
    
    // Sembunyikan notifikasi setelah 4 detik
    setTimeout(() => {
        statusEl.className = "save-status";
    }, 4000);
}

/* ==========================================================================
   SPARKLINE (MINI CHART) GENERATOR
   ========================================================================== */
function createSparkline(canvasId, lineColor, rgbColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, 45);
    fillGradient.addColorStop(0, `rgba(${rgbColor}, 0.2)`);
    fillGradient.addColorStop(1, `rgba(${rgbColor}, 0)`);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                data: [],
                borderColor: lineColor,
                backgroundColor: fillGradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { display: false }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// Inisialisasi masing-masing Sparkline
const tempSparkline = createSparkline('tempSparkline', '#f43f5e', '244, 63, 94');
const humidSparkline = createSparkline('humidSparkline', '#0ea5e9', '14, 165, 233');
const hiSparkline = createSparkline('hiSparkline', '#eab308', '234, 179, 8');

function pushToSparkline(chart, value) {
    chart.data.datasets[0].data.push(value);
    if (chart.data.datasets[0].data.length > 10) {
        chart.data.datasets[0].data.shift();
    }
    chart.update('none');
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
                position: 'top',
                align: 'end',
                labels: {
                    font: { family: 'Outfit', size: 12, weight: '500' },
                    boxWidth: 8,
                    usePointStyle: true,
                    generateLabels: (chart) => {
                        const datasets = chart.data.datasets;
                        const isLight = (document.documentElement.getAttribute('data-theme') === 'light');
                        
                        return datasets.map((dataset, i) => {
                            const isVisible = chart.isDatasetVisible(i);
                            
                            // Warna teks: Cerah jika aktif, redup jika tidak aktif (hidden)
                            let fontColor;
                            if (isVisible) {
                                fontColor = isLight ? '#1e1b4b' : '#f8fafc';
                            } else {
                                fontColor = isLight ? '#cbd5e1' : '#475569';
                            }
                            
                            return {
                                text: dataset.label,
                                fillStyle: isVisible ? dataset.borderColor : (isLight ? '#e2e8f0' : '#201e3d'),
                                strokeStyle: isVisible ? dataset.borderColor : (isLight ? '#cbd5e1' : '#475569'),
                                lineWidth: 2,
                                pointStyle: 'circle',
                                hidden: false, // PAKSA false agar tidak dicoret/strikethrough oleh Chart.js
                                index: i,
                                datasetIndex: i,
                                fontColor: fontColor
                            };
                        });
                    }
                }
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

function updateChartThemeColors(theme) {
    const colors = getThemeColors(theme);
    
    roomsenseChart.options.plugins.legend.labels.color = colors.tickColor;
    
    roomsenseChart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
    roomsenseChart.options.plugins.tooltip.titleColor = colors.tooltipText;
    roomsenseChart.options.plugins.tooltip.bodyColor = colors.tickColor;
    roomsenseChart.options.plugins.tooltip.borderColor = colors.tooltipBorder;
    
    roomsenseChart.options.scales.x.grid.color = colors.gridColor;
    roomsenseChart.options.scales.x.ticks.color = colors.tickColor;
    roomsenseChart.options.scales.y.grid.color = colors.gridColor;
    roomsenseChart.options.scales.y.ticks.color = colors.tickColor;
    
    roomsenseChart.update();
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
// 1. Ambil Data Histori Awal dari Database SQLite via API Node-RED
fetch(getApiUrl('/api/history'))
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

            if (temp !== null) pushToSparkline(tempSparkline, temp);
            if (humid !== null) pushToSparkline(humidSparkline, humid);
            if (hi !== null) pushToSparkline(hiSparkline, hi);
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

// 2. Koneksi WebSocket untuk Data Real-time
const wsUrl = getWsUrl('/ws/sensor');
const ws = new WebSocket(wsUrl);

const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');

ws.onopen = () => {
    connDot.className = "status-dot online";
    connText.textContent = "Terhubung";
};

ws.onclose = () => {
    connDot.className = "status-dot";
    connText.textContent = "Terputus";
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        const timeLabel = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const temp = (data.temperature !== undefined) ? parseFloat(data.temperature) : null;
        const humid = (data.humidity !== undefined) ? parseFloat(data.humidity) : null;
        const hi = (data.heat_index !== undefined && data.heat_index !== null) ? parseFloat(data.heat_index) : temp;

        updateAllMetrics(temp, humid, hi);

        if (temp !== null) pushToSparkline(tempSparkline, temp);
        if (humid !== null) pushToSparkline(humidSparkline, humid);
        if (hi !== null) pushToSparkline(hiSparkline, hi);

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

/* ==========================================================================
   APP INITIALIZATION
   ========================================================================== */
// Load pengaturan awal ke form formulir saat web pertama dibuka
loadSettingsForm();
// Pemicu inisialisasi teks rentang nyaman pada kartu metrik
updateAllMetrics(null, null, null);

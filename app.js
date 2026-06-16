// ====== KONFIGURASI BACKEND ======
// Ganti dengan URL Ngrok / Domain Publik Anda jika di-hosting di GitHub Pages (misal: "https://abcd-123.ngrok-free.app").
// Jika dijalankan secara lokal di Node-RED, biarkan kosong "" agar otomatis mendeteksi alamat IP lokal.
const BACKEND_URL = ""; 
// =================================

// Fungsi helper untuk mendapatkan URL API
const getApiUrl = (path) => {
    if (BACKEND_URL) {
        // Hapus trailing slash jika ada di BACKEND_URL
        const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
        return `${base}${path}`;
    }
    return path; // Path relatif untuk local Node-RED
};

// Fungsi helper untuk mendapatkan URL WebSocket
const getWsUrl = (path) => {
    if (BACKEND_URL) {
        const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
        // Ganti protokol http/https menjadi ws/wss
        const wsBase = base.replace(/^http/, 'ws');
        return `${wsBase}${path}`;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${path}`;
};

// Sesuaikan URL download link (CSV) secara dinamis
document.getElementById('download-link').href = getApiUrl('/api/export');

// Inisialisasi Chart.js
const ctx = document.getElementById('roomsenseChart').getContext('2d');
const roomsenseChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Suhu (°C)',
                borderColor: '#f43f5e', // Rose 500
                backgroundColor: 'rgba(244, 63, 94, 0.03)',
                data: [],
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 1.5,
                pointHoverRadius: 5
            },
            {
                label: 'Kelembaban (%)',
                borderColor: '#0ea5e9', // Sky 500
                backgroundColor: 'rgba(14, 165, 233, 0.03)',
                data: [],
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 1.5,
                pointHoverRadius: 5
            },
            {
                label: 'Heat Index (°C)',
                borderColor: '#eab308', // Amber 500
                backgroundColor: 'rgba(234, 179, 8, 0.03)',
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
                labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12, weight: '500' }, boxWidth: 10, usePointStyle: true }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 10,
                bodyFont: { family: 'Outfit' },
                titleFont: { family: 'Outfit', weight: '600' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.02)' },
                ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.02)' },
                ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 } }
            }
        }
    }
});

// Logika Status Kenyamanan / Evaluasi Ruangan
function evaluateTemperature(temp) {
    const el = document.getElementById('temp-badge');
    const desc = document.getElementById('temp-desc');
    if (temp < 20) {
        el.className = "comfort-badge badge-warning";
        el.textContent = "Dingin";
        desc.textContent = "Suhu di bawah rentang nyaman.";
    } else if (temp >= 20 && temp <= 26) {
        el.className = "comfort-badge badge-normal";
        el.textContent = "Nyaman";
        desc.textContent = "Suhu ruangan ideal.";
    } else {
        el.className = "comfort-badge badge-danger";
        el.textContent = "Panas";
        desc.textContent = "Suhu ruangan terlalu tinggi.";
    }
}

function evaluateHumidity(humid) {
    const el = document.getElementById('humid-badge');
    const desc = document.getElementById('humid-desc');
    if (humid < 40) {
        el.className = "comfort-badge badge-warning";
        el.textContent = "Kering";
        desc.textContent = "Kelembaban terlalu rendah.";
    } else if (humid >= 40 && humid <= 60) {
        el.className = "comfort-badge badge-normal";
        el.textContent = "Ideal";
        desc.textContent = "Kelembaban udara ideal.";
    } else {
        el.className = "comfort-badge badge-danger";
        el.textContent = "Lembab";
        desc.textContent = "Kelembaban terlalu tinggi.";
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

    if (temp !== null) evaluateTemperature(temp);
    if (humid !== null) evaluateHumidity(humid);
    if (hi !== null) evaluateHeatIndex(hi);
}

// 1. Ambil Data Histori Awal
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

        // Update Angka kartu & Evaluasi status
        updateAllMetrics(temp, humid, hi);

        // Update Grafik
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

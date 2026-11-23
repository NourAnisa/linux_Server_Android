#!/bin/bash
# ==============================================================================
# Skrip Lengkap Manajemen & Orkestrasi Semua Layanan Server Redmi Note 9
# ==============================================================================

echo "=========================================================="
echo "🚀 Memulai Orkestrasi Layanan Server Android (PRoot Debian)"
echo "=========================================================="
mkdir -p /var/log/server

# 1. Hentikan instance lama jika ada
echo "🛑 Membersihkan proses lama..."
pkill -f "tinycore-desktop/server.js" || true
pkill -f "openqris/server.js" || true
pkill -f "ttyd -p 7682" || true
sleep 1

# 2. Update Bansos Router ke 0.6.3 jika belum versi terbaru
echo "📦 Memeriksa pembaruan Bansos Router & OpenCode..."
npm install -g bansos-router@latest @opencode/cli@latest agentic-seo@latest >/dev/null 2>&1 || true

# 3. Jalankan Bansos AI Gateway (Port 17070)
if ! pgrep -f "bansos" >/dev/null 2>&1; then
    echo "▶️ Memulai Bansos AI Gateway (Port 17070)..."
    cd /var/www/bansos-router && nohup bansos start >> /var/log/server/bansos_watchdog.log 2>&1 &
fi

# 4. Jalankan ttyd Terminal Daemon (Port 7682)
echo "▶️ Menjalankan ttyd Terminal (Port 7682)..."
nohup ttyd -p 7682 -W /bin/bash > /var/log/server/ttyd.log 2>&1 &

# 5. Jalankan TinyCore Linux Web Desktop (Port 7681)
if [ -d "/var/www/tinycore-desktop" ]; then
    echo "▶️ Menjalankan TinyCore Web Desktop (Port 7681)..."
    cd /var/www/tinycore-desktop
    nohup node server.js > /var/log/server/tinycore_desktop.log 2>&1 &
fi

# 6. Jalankan OpenQRIS Payment Gateway (Port 5060)
if [ -d "/var/www/openqris" ]; then
    echo "▶️ Menjalankan OpenQRIS Gateway (Port 5060)..."
    cd /var/www/openqris
    nohup node --experimental-sqlite server.js > /var/log/server/openqris.log 2>&1 &
fi

# 7. Jalankan GoPay Gateway (Port 3005) jika ada
if [ -d "/var/www/gopay-gateway" ]; then
    echo "▶️ Menjalankan GoPay Gateway (Port 3005)..."
    cd /var/www/gopay-gateway
    nohup node server.js > /var/log/server/gopay_gateway.log 2>&1 &
fi

# 8. Jalankan OpenPlag (Port 5000)
if [ -d "/var/www/openplag" ] && ! pgrep -f "/var/www/openplag/app.py" >/dev/null 2>&1; then
    echo "▶️ Menjalankan OpenPlag (Port 5000)..."
    cd /var/www/openplag
    nohup python3 -m gunicorn -w 2 -b 0.0.0.0:5000 app:app > /var/log/server/openplag.log 2>&1 &
fi

# 9. Jalankan OpenJob (Port 5050)
if [ -d "/srv/openjob" ] && ! pgrep -f "openjob" >/dev/null 2>&1; then
    echo "▶️ Menjalankan OpenJob (Port 5050)..."
    cd /srv/openjob
    [ -d "/srv/openjob/job-auto-apply" ] && cd /srv/openjob/job-auto-apply
    nohup python3 -m gunicorn -w 2 -b 0.0.0.0:5050 app:app > /var/log/server/openjob.log 2>&1 &
fi

# 10. Jalankan OpenJurnal (Port 7860)
if [ -d "/var/www/openjurnal" ] && ! pgrep -f "/var/www/openjurnal/app.py" >/dev/null 2>&1; then
    echo "▶️ Menjalankan OpenJurnal (Port 7860)..."
    cd /var/www/openjurnal
    nohup python3 app.py > /var/log/server/openjurnal.log 2>&1 &
fi

# 11. Jalankan Nouride Router (Port 18254)
if [ -d "/srv/nouride" ] && ! pgrep -f "nouride" >/dev/null 2>&1; then
    echo "▶️ Menjalankan Nouride Router (Port 18254)..."
    cd /srv/nouride
    nohup /srv/nouride/nouride start > /var/log/server/nouride.log 2>&1 &
fi

# 12. Jalankan Bot Team 24/7 Orchestrator (Nadia CS, DEVRA, OtterOps, Noura Studio)
if ! pgrep -f "bot_team_daemon.py" >/dev/null 2>&1; then
    echo "▶️ Menjalankan Bot Team 24/7 Orchestrator..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    nohup python3 "$SCRIPT_DIR/bot_team_daemon.py" > /var/log/server/bot_team.log 2>&1 &
fi

sleep 2
echo "=========================================================="
echo "✅ Seluruh Layanan Berhasil Dijalankan:"
echo "   - TinyCore Desktop : http://127.0.0.1:7681 -> https://terminal.jokicoding.web.id"
echo "   - Bot Team 24/7    : Nadia CS, DEVRA, OtterOps, Noura Studio Online"
echo "   - OpenQRIS Gateway : http://127.0.0.1:5060 -> https://openqris.jokicoding.web.id"
echo "   - Bansos Gateway   : http://127.0.0.1:17070 -> https://bansos.jokicoding.web.id (v0.6.3)"
echo "   - OpenCode CLI     : Siap dijalankan di terminal (ketik: opencode)"
echo "   - OpenPlag.id      : http://127.0.0.1:5000 -> https://openplag.jokicoding.web.id"
echo "   - OpenJob.id       : http://127.0.0.1:5050 -> https://openjob.jokicoding.web.id"
echo "   - OpenJurnal.id    : http://127.0.0.1:7860 -> https://openjurnal.jokicoding.web.id"
echo "   - Nouride Router   : http://127.0.0.1:18254 -> https://router.jokicoding.web.id"
echo "=========================================================="

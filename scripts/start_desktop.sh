#!/bin/bash
# ==============================================================================
# Start Desktop: Menjalankan ttyd (Port 7682) & TinyCore Server (Port 7681)
# ==============================================================================

echo "Menghentikan instance lama..."
pkill -f "ttyd -p 7682" || true
pkill -f "tinycore-desktop/server.js" || true
sleep 1

echo "Memulai ttyd Terminal Daemon pada port 7682..."
nohup ttyd -p 7682 -W /bin/bash > /var/log/ttyd.log 2>&1 &

echo "Memulai TinyCore Desktop GUI Server pada port 7681..."
cd /var/www/tinycore-desktop
nohup node server.js > /var/log/tinycore.log 2>&1 &

sleep 2
echo "=== Status Layanan Desktop ==="
ps aux | grep -E "ttyd|server.js" | grep -v grep
echo "TinyCore Desktop aktif pada http://127.0.0.1:7681"

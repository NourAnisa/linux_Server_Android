#!/bin/bash
# ==============================================================================
# Diagnostics Script: Pemeriksaan Kesehatan Server ARM64 & Port Layanan
# ==============================================================================

echo "=========================================================="
echo "   DIAGNOSTIK SERVER REDMI NOTE 9 (ARM64 BOOKWORM)        "
echo "=========================================================="
echo "[1] Uptime & Beban CPU:"
uptime
echo ""

echo "[2] Penggunaan Memori RAM:"
free -m
echo ""

echo "[3] Kapasitas Penyimpanan (/var/www):"
df -h /var/www
echo ""

echo "[4] Port Layanan yang Sedang Aktif:"
netstat -tuln | grep -E '7681|7682|5060|3005|5050|7860|5000|17070' || ss -tuln
echo ""

echo "[5] Proses Layanan Aktif di /var/www:"
ps aux | grep -E 'node|python|cloudflared|ttyd' | grep -v grep
echo "=========================================================="

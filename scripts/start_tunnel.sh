#!/bin/bash
# ==============================================================================
# Start Tunnel: Cloudflare Zero Trust Ingress Tunnel
# ==============================================================================

if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo "Peringatan: Variabel CLOUDFLARE_TUNNEL_TOKEN belum diatur."
    echo "Jalankan: export CLOUDFLARE_TUNNEL_TOKEN='<token_anda>'"
    echo "Lalu jalankan ulang script ini."
    exit 1
fi

echo "Memulai Cloudflare Zero Trust Tunnel..."
pkill -f "cloudflared tunnel run" || true
sleep 1

nohup cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN" > /var/log/cloudflared.log 2>&1 &
sleep 2

ps aux | grep "cloudflared tunnel" | grep -v grep
echo "Cloudflare Tunnel berhasil dijalankan di latar belakang!"

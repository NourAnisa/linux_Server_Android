#!/bin/bash
# ==============================================================================
# Setup Script: Android Termux + Debian PRoot Environment
# Disusun untuk: Materi Perkuliahan Layanan Virtual
# Penulis: Ir. Nor Anisa, S.Kom., M.Kom.
# ==============================================================================

set -e

echo "=== [1/4] Memperbarui Paket Termux ==="
pkg update -y && pkg upgrade -y
pkg install -y proot-distro git curl wget jq nodejs ttyd

echo "=== [2/4] Memasang Debian PRoot ==="
if proot-distro list | grep -q "debian (installed)"; then
    echo "Debian PRoot sudah terpasang."
else
    proot-distro install debian
fi

echo "=== [3/4] Menyiapkan Direktori & Dependensi di Debian ==="
proot-distro login debian -- bash -c "
    apt update -y && apt upgrade -y
    apt install -y build-essential python3 python3-pip nodejs npm procps net-tools curl git jq
    mkdir -p /var/www /var/log
    echo 'Setup lingkungan Debian PRoot selesai!'
"

echo "=== [4/4] Selesai! Jalankan ./scripts/start_desktop.sh untuk memulai layanan. ==="

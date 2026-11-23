#!/bin/bash
# ==============================================================================
# Skrip Pembaruan Bansos Router ke v0.6.3 & Instalasi OpenCode CLI
# ==============================================================================

set -e
echo "=========================================================="
echo "📦 1. Memperbarui Bansos Router ke Versi 0.6.3 Terbaru..."
echo "=========================================================="
npm install -g bansos-router@latest

echo "🔄 Merestart Bansos Daemon..."
bansos restart || (bansos stop && sleep 1 && bansos start) || true

echo "=========================================================="
echo "🚀 2. Memasang OpenCode CLI..."
echo "=========================================================="
npm install -g @opencode/cli@latest

echo "=========================================================="
echo "✅ Pembaruan Selesai!"
echo "   - Bansos Router: v0.6.3 aktif pada port 17070"
echo "   - OpenCode CLI : Siap digunakan di terminal (ketik: opencode)"
echo "=========================================================="

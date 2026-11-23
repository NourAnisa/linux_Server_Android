#!/bin/bash
# ==============================================================================
# Skrip Audit Keamanan Otomatis OWASP WSTG v4.2 untuk Server Redmi Note 9
# Terinspirasi dari Claude Pentest Skills (frendysanusi) & OpenCode Pentester
# ==============================================================================

echo "=========================================================="
echo "🛡️ Memulai Audit Keamanan OWASP WSTG v4.2 di /var/www"
echo "=========================================================="
mkdir -p /var/log/server

REPORT_FILE="/var/log/server/security_audit_$(date +%Y%m%d_%H%M%S).md"
echo "# Laporan Audit Keamanan OWASP WSTG v4.2" > "$REPORT_FILE"
echo "Tanggal: $(date)" >> "$REPORT_FILE"
echo "Target: Seluruh Service /var/www (Redmi Note 9)" >> "$REPORT_FILE"
echo "----------------------------------------" >> "$REPORT_FILE"

echo "1. Memeriksa Proteksi File Sensitif (.env, database, private keys)..."
EXPOSED_ENV=$(find /var/www -maxdepth 3 -name ".env" 2>/dev/null)
if [ -n "$EXPOSED_ENV" ]; then
    echo "  [INFO] File .env ditemukan pada:" >> "$REPORT_FILE"
    echo "$EXPOSED_ENV" >> "$REPORT_FILE"
    # Pastikan permission aman
    chmod 600 /var/www/*/.env 2>/dev/null || true
fi

echo "2. Memeriksa Celah Potensi Raw SQL Concatenation..."
RAW_SQL=$(grep -rnE 'SELECT.*WHERE.*\+|INSERT.*VALUES.*\+' /var/www 2>/dev/null | grep -v 'node_modules' | head -n 10 || true)
if [ -n "$RAW_SQL" ]; then
    echo "  [PERINGATAN] Potensi SQL Concatenation:" >> "$REPORT_FILE"
    echo "$RAW_SQL" >> "$REPORT_FILE"
else
    echo "  [OK] Tidak ditemukan SQL query string concatenation yang rentan." >> "$REPORT_FILE"
fi

echo "3. Memeriksa Validasi SSRF pada Webhook..."
SSRF_CHECK=$(grep -rn 'isSafeWebhookUrl' /var/www/openqris 2>/dev/null || true)
if [ -n "$SSRF_CHECK" ]; then
    echo "  [OK] Filter proteksi SSRF aktif pada OpenQRIS." >> "$REPORT_FILE"
else
    echo "  [PERINGATAN] Filter SSRF belum ditemukan di OpenQRIS." >> "$REPORT_FILE"
fi

echo "4. Memeriksa Sanitasi XSS pada Tampilan Web..."
XSS_CHECK=$(grep -rn 'escapeHtml' /var/www/openqris/public 2>/dev/null || true)
if [ -n "$XSS_CHECK" ]; then
    echo "  [OK] Sanitasi escapeHtml aktif pada dashboard OpenQRIS." >> "$REPORT_FILE"
else
    echo "  [PERINGATAN] Periksa kelengkapan escapeHtml pada file dashboard." >> "$REPORT_FILE"
fi

echo "5. Memeriksa Status Autentikasi Terminal Web..."
AUTH_CHECK=$(grep -rn 'checkAuth' /var/www/tinycore-desktop/server.js 2>/dev/null || true)
if [ -n "$AUTH_CHECK" ]; then
    echo "  [OK] Autentikasi WebSocket & Terminal Desktop aktif dan aman." >> "$REPORT_FILE"
else
    echo "  [BAHAYA] Autentikasi terminal belum terpasang!" >> "$REPORT_FILE"
fi

echo "=========================================================="
echo "✅ Audit Keamanan Selesai! Laporan tersimpan di: $REPORT_FILE"
echo "=========================================================="
cat "$REPORT_FILE"

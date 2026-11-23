# 🐧 Linux Server di Android & Web Desktop Terintegrasi AI (Antigravity / JokiCoding AI)

Repositori pembelajaran praktis untuk mata kuliah **Layanan Virtual / Komputasi Awan (Virtualization & Cloud Computing)**.

> **Dosen Pengampu:** Ir. Nor Anisa, S.Kom., M.Kom.  
> **Repositori Resmi:** [https://github.com/NourAnisa/linux_Server_Android](https://github.com/NourAnisa/linux_Server_Android)  
> **Web Desktop Live:** [https://terminal.jokicoding.web.id/](https://terminal.jokicoding.web.id/)  
> **Bansos AI Multi-Model Gateway:** [https://bansos.jokicoding.web.id/v1](https://bansos.jokicoding.web.id/v1)  

---

## 📚 Pilihan Panduan & Tutorial:

Untuk memudahkan pembelajaran mahasiswa dan dosen, materi dibagi menjadi 2 panduan:

1. 🚀 **[PANDUAN PRAKTIS & MUDAH DIPAHAMI (Langkah Demi Langkah)](./PANDUAN_PRAKTIKUM_MUDAH_LINUX_WEB_ANDROID.md)**  
   *Panduan bahasa santai, praktis dari nol, langkah instalasi Termux di Android, instal Debian Linux, menjalankan web desktop, integrasi Cloudflare Tunnel, hingga cara kerja AI asisten.* **(Sangat Direkomendasikan untuk Praktikum Mahasiswa!)**

2. 🎓 **[MODUL AKADEMIK LENGKAP & FONDASI TEORI](./Tutorial_Layanan_Virtual_Web_Linux_Antigravity.md)**  
   *Materi formal perkuliahan: Capaian Pembelajaran (CPMK), perbandingan paradigma virtualisasi (VMware vs Docker vs PRoot), arsitektur ReAct Tool Calling, spesifikasi hardware, dan analisis latensi.*

---

## ✨ Fitur Unggulan Proyek Ini

* 📱 **Hemat Daya & Ramah Lingkungan:** Server berjalan 24 jam di smartphone Android (Redmi Note 9 ARM64) dengan daya hanya ~5W. Baterai HP otomatis berfungsi sebagai UPS bawaan saat pemadaman listrik.
* 🌐 **Web Desktop Interaktif (TinyCore GUI):** Antarmuka desktop grafis yang dapat diakses dari browser mana pun tanpa perlu menginstal aplikasi SSH/VNC.
* ⌨️ **Terminal Web aterm (`ttyd`):** Terminal Linux bash interaktif berbasis WebSocket pada port 7682 yang disematkan langsung di dalam desktop web.
* 🤖 **JokiCoding AI Autonomous Coding Agent:** Asisten AI cerdas di dalam web desktop yang memiliki wewenang untuk membaca log, memeriksa error, mengedit kode, dan merestart service aplikasi di `/var/www`.
* 📷 **Dukungan Multimodal Vision (Upload Gambar):** Mahasiswa bisa melampirkan screenshot error via tombol klip kertas (`📎`), tempel langsung (`Ctrl + V`), atau drag-and-drop. Dianalisis secara gratis oleh model vision *Nemotron 3.5 Super VL*.
* 🔒 **Akses Publik Aman (Cloudflare Tunnel):** Tanpa perlu IP publik statis dan tanpa membuka port router (bebas blokir CGNAT provider seluler).

---

## 🗂️ Struktur Direktori Repositori

```text
├── web-desktop/                  # Source code Web Desktop TinyCore & JokiCoding AI
│   ├── server.js                 # HTTP & WebSocket proxy server (Port 7681)
│   ├── agent.js                  # Engine Autonomous AI Agent (Tool loop & Vision)
│   └── public/index.html         # Antarmuka Web Desktop GUI responsif
├── openqris/                     # Modul SaaS OpenQRIS (Payment Gateway BYOM 0% MDR)
│   └── public/                   # Dashboard merchant, landing page, demo, dan docs API
├── remote-tools/                 # Script upload biner dan utilitas remote
├── scripts/                      # Script background daemon & start service
├── PANDUAN_PRAKTIKUM_MUDAH_LINUX_WEB_ANDROID.md # Tutorial praktis ramah pemula
├── Tutorial_Layanan_Virtual_Web_Linux_Antigravity.md # Modul akademik & CPMK
└── README.md                     # Informasi utama repositori
```

---

## 🚀 Quickstart: Menjalankan Server di Android

1. **Buka Termux di Android, lalu login ke Debian:**
   ```bash
   proot-distro login debian
   ```

2. **Clone repositori ini:**
   ```bash
   cd /var/www
   git clone https://github.com/NourAnisa/linux_Server_Android.git
   ```

3. **Jalankan Terminal Web (`ttyd`):**
   ```bash
   nohup ttyd -p 7682 -i 127.0.0.1 -W bash > /var/log/ttyd.log 2>&1 &
   ```

4. **Jalankan Web Desktop & AI Agent:**
   ```bash
   cd /var/www/linux_Server_Android/web-desktop
   npm install
   nohup node server.js > /var/log/tinycore.log 2>&1 &
   ```

5. **Buka di browser:**  
   Kunjungi `http://<IP_HP_ANDROID>:7681` atau URL Cloudflare Tunnel publik Anda.

---

## 👩‍🏫 Lisensi & Hak Cipta
Modul ini dikembangkan untuk kepentingan akademik dan praktikum mahasiswa pada Program Studi Teknologi Informasi / Ilmu Komputer.  
Dikelola oleh **Ir. Nor Anisa, S.Kom., M.Kom.**

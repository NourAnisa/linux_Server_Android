# 🐧 Panduan Praktis & Mudah: Membuat Linux Server di Android & Diakses Lewat Web
## Modul Pembelajaran Mata Kuliah Layanan Virtual / Komputasi Awan

> **Dosen Pengampu:** Ir. Nor Anisa, S.Kom., M.Kom.  
> **Repositori Resmi:** [https://github.com/NourAnisa/linux_Server_Android](https://github.com/NourAnisa/linux_Server_Android)  
> **Hasil Implementasi Live:** [https://terminal.jokicoding.web.id/](https://terminal.jokicoding.web.id/)  

---

## 💡 Pengantar Sederhana: Apa yang Akan Kita Buat?

Bayangkan kamu punya HP Android bekas yang sudah jarang dipakai. Biasanya HP tersebut hanya disimpan di laci.  
Dalam praktikum ini, kita akan menyulap **HP Android tersebut menjadi Server Komputer Linux 24 Jam** yang:
1. **Hemat Listrik:** Hanya butuh daya ~5 Watt (baterai HP otomatis jadi baterai cadangan / UPS jika mati lampu).
2. **Bisa Dibuka dari Web Browser:** Kamu dan teman-temanmu bisa membuka terminal Linux dan tampilan desktop grafis hanya lewat link web (misal: `https://terminal.jokicoding.web.id/`).
3. **Pintar (Ada AI Assistant):** Ada asisten AI (**JokiCoding AI / Antigravity**) yang bisa disuruh lewat chat untuk mengecek error, mengedit kode, merestart aplikasi, dan membaca gambar screenshot error secara otomatis!

```
+-------------------------------------------------------------+
|                     HP ANDROID (Redmi Note 9)               |
|                                                             |
|  [ Aplikasi Termux ]                                        |
|         │                                                   |
|         ▼                                                   |
|  [ Sistem Linux Debian ] (PRoot - Tanpa Root HP)            |
|         │                                                   |
|         ├─► aterm (ttyd) : Terminal Linux di Web (Port 7682)|
|         ├─► TinyCore GUI : Web Desktop & AI Agent (Port 7681)|
|         └─► Cloudflare   : Membuat link HTTPS gratis publik |
+─────────────────────────────────────────────────────────────+
                                ▲
                                │ Akses Internet
                                ▼
               Laptop / HP Mahasiswa (Browser)
```

---

## 🛠️ Alat dan Bahan yang Dibutuhkan
1. **HP Android:** Bebas merek apa saja (Xiaomi, Samsung, Oppo, dll) minimal RAM 3 GB atau 4 GB. **TIDAK PERLU DI-ROOT**.
2. **Koneksi Internet:** WiFi atau kuota data seluler.
3. **Laptop / Komputer:** Untuk mencoba membuka web server yang sudah online.
4. **Akun GitHub:** Untuk menyimpan dan memperbarui source code.

---

## 🚀 LANGKAH 1: Persiapan di HP Android (Install Termux)

1. Buka browser di HP Android, download dan install aplikasi **Termux** versi terbaru dari [F-Droid](https://f-droid.org/packages/com.termux/) (jangan gunakan versi Play Store karena sudah usang).
2. Buka aplikasi Termux, lalu ketik perintah berikut satu per satu:
   ```bash
   pkg update -y && pkg upgrade -y
   pkg install wget curl git proot proot-distro -y
   ```
3. Berikan izin Termux agar tidak dimatikan oleh sistem hemat daya Android:
   - Ketik: `termux-wake-lock`
   - Buka Pengaturan HP ➔ Aplikasi ➔ Termux ➔ Penghemat Baterai ➔ Pilih **"Tidak Ada Pembatasan"**.

---

## 🐧 LANGKAH 2: Menginstal Sistem Operasi Linux (Debian)

Kita akan memasang Debian GNU/Linux 64-bit di dalam Android menggunakan teknologi **PRoot** (virtualisasi aman di tingkat aplikasi tanpa perlu root HP).

1. Di dalam Termux, ketik perintah berikut untuk memasang Debian:
   ```bash
   proot-distro install debian
   ```
2. Setelah selesai, masuk ke dalam Linux Debian dengan perintah:
   ```bash
   proot-distro login debian
   ```
   *(Tanda prompt di layar akan berubah menjadi `root@localhost:~#` — artinya kamu sudah resmi berada di dalam sistem operasi Linux!)*

3. Update paket dan pasang peralatan penting:
   ```bash
   apt update && apt upgrade -y
   apt install nodejs npm python3 python3-pip git curl net-tools procps nano htop -y
   ```

---

## 🖥️ LANGKAH 3: Memasang Web Terminal (`ttyd`) & Web Desktop

Agar terminal Linux ini bisa dibuka lewat web browser tanpa perlu membuka aplikasi Termux:

1. **Pasang `ttyd` (Aplikasi yang mengubah terminal bash jadi antarmuka web):**
   ```bash
   apt install ttyd -y
   ```
   Jalankan `ttyd` pada port `7682`:
   ```bash
   nohup ttyd -p 7682 -i 127.0.0.1 -W bash > /var/log/ttyd.log 2>&1 &
   ```

2. **Download Source Code Web Desktop & JokiCoding AI dari GitHub:**
   ```bash
   mkdir -p /var/www
   cd /var/www
   git clone https://github.com/NourAnisa/linux_Server_Android.git
   ```

3. **Jalankan Server Web Desktop (Port 7681):**
   ```bash
   cd /var/www/linux_Server_Android/web-desktop
   npm install
   nohup node server.js > /var/log/tinycore.log 2>&1 &
   ```

Sekarang web desktop Linux sudah aktif di jaringan lokal HP pada port `7681`.

---

## 🌐 LANGKAH 4: Membuka Akses ke Internet (Cloudflare Tunnel)

Saat ini server baru bisa dibuka di HP sendiri. Agar bisa dibuka oleh dosen, mahasiswa lain, atau dari laptop di rumah secara publik:

1. Pasang paket `cloudflared` di Linux Debian:
   ```bash
   apt install cloudflared -y
   ```
2. Hubungkan port `7681` ke domain milik kampus atau domain pribadi Bu Anisa:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:7681
   ```
   *(Atau gunakan Cloudflare Named Tunnel seperti yang digunakan pada domain `https://terminal.jokicoding.web.id/`).*
3. Selesai! Sekarang siapa saja yang membuka URL tersebut di browser akan melihat **Tampilan Desktop Linux TinyCore interaktif lengkap dengan terminal `aterm` dan AI assistant!**

---

## 🤖 LANGKAH 5: Komunikasi Antara Antigravity (AI) dan Web Server

Salah satu materi paling canggih dalam praktikum ini adalah **Autonomous AI Maintenance** (Pemeliharaan Sistem oleh AI).

### Bagaimana AI Antigravity Memperbaiki & Mengupdate Server?

Di laptop, Bu Anisa menggunakan **Antigravity**. Di server HP Android, berjalan program **`agent.js`** di `/var/www/linux_Server_Android/web-desktop/agent.js`.

```
                    ┌────────────────────────────┐
                    │      Antigravity AI        │
                    │   (Di Laptop Bu Anisa)     │
                    └─────────────┬──────────────┘
                                  │
                                  │ HTTP REST POST (JSON)
                                  │ Basic Auth (admin:bansos123)
                                  ▼
                    ┌────────────────────────────┐
                    │    https://terminal.       │
                    │    jokicoding.web.id/      │
                    │     api/agent/chat         │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │    Server HP Android       │
                    │      (server.js)           │
                    │             │              │
                    │             ▼              │
                    │      agent.js Engine       │
                    │   (Tool Calling Loop)      │
                    └──────┬──────┬──────┬───────┘
                           │      │      │
             ┌─────────────┘      │      └─────────────┐
             ▼                    ▼                    ▼
     [exec_cmd]             [read_file]          [write_file]
  Menjalankan perintah   Membaca kode yang    Menulis perbaikan kode
  bash & restart service       rusak           langsung di /var/www
```

### Format Perintah (Tool Calling ReAct):
Ketika Bu Anisa mengetik instruksi di Antigravity:
> *"Tolong periksa kenapa layanan openqris tidak bisa diakses dan perbaiki kodenya!"*

1. Antigravity mengirimkan pesan tersebut ke endpoint server:  
   `POST https://terminal.jokicoding.web.id/api/agent/chat`
2. Mesin AI di server menganalisis masalah dan memanggil *tool*:
   ```json
   {
     "thought": "Saya akan memeriksa status service openqris terlebih dahulu",
     "tool": "service_status",
     "args": {}
   }
   ```
3. Server mengeksekusi perintah tersebut secara lokal, membaca log error, lalu memanggil `edit_file` untuk memperbaiki baris kode yang rusak.
4. Server merestart aplikasi dengan `restart_service`.
5. AI menjawab ke Bu Anisa:  
   *"Layanan openqris sudah saya perbaiki di baris 42 dan service telah direstart normal kembali."*

---

## 📷 LANGKAH 6: Fitur Multimodal (Analisis Gambar & Screenshot)

Mahasiswa tidak hanya bisa mengetik teks, tetapi juga bisa mengirim gambar ke AI:
1. **Lampirkan Screenshot:** Klik ikon **Klip Kertas** (`📎`) di pojok kiri bawah jendela JokiCoding AI.
2. **Tempel Langsung:** Ambil tangkapan layar di laptop dengan *Snipping Tool*, lalu klik kolom teks dan tekan **`Ctrl + V`**.
3. **Analisis AI:** Gambar langsung dianalisis oleh model multimodal vision **Nemotron 3.5 Super VL** via Bansos Gateway (`https://bansos.jokicoding.web.id/v1`) tanpa dipungut biaya token!

---

## 🎯 Tugas Praktikum Mahasiswa (Hands-on Challenge)

Agar mahasiswa benar-benar memahami materi, berikan tugas praktikum mandiri berikut:

### Latihan 1: Navigasi Dasar Terminal
1. Buka [https://terminal.jokicoding.web.id/](https://terminal.jokicoding.web.id/) dan klik jendela terminal **`aterm`**.
2. Masuk ke folder web:  
   `cd /var/www`
3. Buat folder baru dengan nama NIM mahasiswa:  
   `mkdir mahasiswa-12345`
4. Buat file HTML sederhana di dalamnya menggunakan editor `nano`:  
   `nano mahasiswa-12345/index.html`  
   *(Isi dengan nama, NIM, dan pesan salam, lalu simpan dengan `Ctrl + O` lalu `Ctrl + X`).*

### Latihan 2: Kolaborasi dengan AI Asisten
1. Buka jendela **JokiCoding AI**.
2. Berikan instruksi ke AI:  
   *"Halo JokiCoding AI, tolong buatkan script kalkulator Python sederhana di dalam folder /var/www/mahasiswa-12345/kalkulator.py lalu jalankan uji cobanya!"*
3. Perhatikan bagaimana AI berpikir (*reasoning*), menulis file secara otonom, dan menampilkan hasil eksekusinya di layar chat!

---

## 📌 Rangkuman & Kesimpulan Kuliah

| Konsep Konvensional | Konsep Modern (Modul Ini) | Manfaat Nyata |
|---|---|---|
| Server Fisik / VM Berat | Smartphone Android (PRoot ARM64) | Hemat daya 95%, portabel, murah |
| Terminal SSH Khusus | Web Terminal WebSocket (`ttyd`) | Bisa dibuka dari browser apa saja tanpa install aplikasi |
| Port Forwarding / IP Publik | Cloudflare Tunnel | Aman dari serangan DDoS, otomatis HTTPS, bebas blokir ISP |
| Coding & Maintenance Manual | Autonomous Agent Tool Calling | Perbaikan bug otomatis 24/7 didukung AI Multimodal |

Modul ini membuktikan bahwa perangkat mobile hemat daya masa kini memiliki kemampuan komputasi yang setara dengan mini-server enterprise jika dikombinasikan dengan virtualisasi ringan dan kecerdasan buatan (*Autonomous AI Agent*).

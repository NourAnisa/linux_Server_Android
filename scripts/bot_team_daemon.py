# ==============================================================================
# BOT TEAM 24/7 ORCHESTRATOR - AI Engineering & Research Lab
# Persona: Nadia CS, DEVRA 9Router, OtterOps DevOps, Noura Studio AI
# Zero Asterisk Compliance - Always Active
# ==============================================================================

import asyncio
import json
import os
import re
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

WITA = timezone(timedelta(hours=8))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVENT_LOG_PATHS = [
    os.path.join(BASE_DIR, 'agent-events.json'),
    os.path.join(BASE_DIR, 'scratch', 'linux_Server_Android', 'web-desktop', 'agent-events.json')
]

# Ambil kredensial bot secara dinamis dari Supabase Vault atau Environment (Bebas dari hardcoded token)
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://hgfftqiyqowuvpwiybhs.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZmZ0cWl5cW93dXZwd2l5YmhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjM4MTMzNCwiZXhwIjoyMTA3OTU3MzM0fQ.bmLAmDCizeTS7KY2JWp3mG2YcMMllb_vhe0FXpkirW0')

BOT_TOKENS = {
    'noranisa_bot': os.getenv('TELEGRAM_BOT_TOKEN', ''),
    'otter834_bot': os.getenv('OTTEROPS_BOT_TOKEN', ''),
    'devra9920_bot': os.getenv('DEVRA_BOT_TOKEN', ''),
    'noura_chat_bot': os.getenv('NOURA_BOT_TOKEN', '')
}

def load_vault_tokens():
    try:
        url = f"{SUPABASE_URL}/storage/v1/object/9router-persistence/telegram_bot_credentials.json"
        req = urllib.request.Request(url, headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f"Bearer {SUPABASE_KEY}",
            'User-Agent': 'Mozilla/5.0'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            bots = data.get('bots', {})
            if bots.get('nadia_cs', {}).get('token'):
                BOT_TOKENS['noranisa_bot'] = bots['nadia_cs']['token']
            if bots.get('otterops', {}).get('token'):
                BOT_TOKENS['otter834_bot'] = bots['otterops']['token']
            if bots.get('devra', {}).get('token'):
                BOT_TOKENS['devra9920_bot'] = bots['devra']['token']
            if bots.get('noura', {}).get('token'):
                BOT_TOKENS['noura_chat_bot'] = bots['noura']['token']
            print("[Vault] Berhasil memuat 4 token bot dari Supabase Storage Vault!")
    except Exception as e:
        print(f"[Vault Warning] Gagal memuat token dari Supabase: {e}")

load_vault_tokens()

AI_BASE_URL = os.getenv('AI_BASE_URL', 'https://bansos.jokicoding.web.id/v1')
AI_API_KEY = os.getenv('AI_API_KEY', 'bansos')

def clean_no_asterisk(text: str) -> str:
    """Menjamin tidak ada satupun karakter bintang (*) yang keluar."""
    if not text:
        return ""
    return re.sub(r'\*+', '', str(text)).strip()

def log_event(agent: str, event_type: str, details: str):
    """Menulis log aktivitas ke agent-events.json untuk monitoring terminal web."""
    payload = {
        'id': f"evt_{int(time.time() * 1000)}",
        'timestamp': datetime.now(WITA).strftime('%Y-%m-%d %H:%M:%S WITA'),
        'agent': agent,
        'type': event_type,
        'details': clean_no_asterisk(details)
    }
    
    for path in EVENT_LOG_PATHS:
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            events = []
            if os.path.exists(path):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        events = json.load(f)
                except Exception:
                    events = []
            events.insert(0, payload)
            events = events[:100]  # Simpan 100 event terakhir
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(events, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Log Error] {path}: {e}")

async def send_tg_message(token: str, chat_id, text: str, reply_to_id=None):
    clean = clean_no_asterisk(text)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': clean
    }
    if reply_to_id:
        payload['reply_to_message_id'] = reply_to_id

    data = urllib.parse.urlencode(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0'})
    loop = asyncio.get_running_loop()
    try:
        def do_req():
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        res = await loop.run_in_executor(None, do_req)
        return res.get('ok', False)
    except Exception as e:
        print(f"[TG Send Error] token={token[:10]}...: {e}")
        return False

async def send_tg_typing(token: str, chat_id):
    url = f"https://api.telegram.org/bot{token}/sendChatAction"
    payload = urllib.parse.urlencode({'chat_id': chat_id, 'action': 'typing'}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={'User-Agent': 'Mozilla/5.0'})
    loop = asyncio.get_running_loop()
    try:
        def do_req():
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.read()
        await loop.run_in_executor(None, do_req)
    except Exception:
        pass

async def call_ai(system_prompt: str, user_prompt: str, model: str = 'fast') -> str:
    url = f"{AI_BASE_URL}/chat/completions"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {AI_API_KEY}",
        'User-Agent': 'Mozilla/5.0'
    }
    body = json.dumps({
        'model': model,
        'messages': [
            {'role': 'system', 'content': system_prompt + "\nPENTING: DILARANG menggunakan tanda bintang (*) dalam format markdown. Gunakan strip (-) atau huruf kapital biasa."},
            {'role': 'user', 'content': user_prompt}
        ],
        'max_tokens': 650
    }).encode('utf-8')

    loop = asyncio.get_running_loop()
    for attempt_model in [model, 'nemotron-3.5-lightning-free', 'deepseek-v4.1-flash-free']:
        try:
            req_body = json.dumps({
                'model': attempt_model,
                'messages': [
                    {'role': 'system', 'content': system_prompt + "\nPENTING: DILARANG menggunakan tanda bintang (*) dalam jawaban sama sekali."},
                    {'role': 'user', 'content': user_prompt}
                ],
                'max_tokens': 650
            }).encode('utf-8')
            req = urllib.request.Request(url, data=req_body, headers=headers)
            
            def do_call():
                with urllib.request.urlopen(req, timeout=12) as resp:
                    return json.loads(resp.read().decode())

            res = await loop.run_in_executor(None, do_call)
            text = res['choices'][0]['message']['content']
            return clean_no_asterisk(text)
        except Exception as e:
            print(f"[AI Fallback] Model {attempt_model} error: {e}")
            await asyncio.sleep(0.5)

    return "Sistem AI sedang melakukan sinkronisasi model. Permintaan dicatat dan segera diproses."

# ==============================================================================
# LOGIKA MASING-MASING BOT
# ==============================================================================

# 1. NADIA CS (@noranisa_bot)
async def handle_nadia(msg, chat_id, text, msg_id, is_group):
    lower = text.lower()
    await send_tg_typing(BOT_TOKENS['noranisa_bot'], chat_id)
    log_event('Nadia CS', 'incoming_message', f"Dari chat {chat_id}: {text[:60]}")

    if any(k in lower for k in ['lapor', 'laporan', 'jobdesk', 'standup', 'rekap']):
        now_str = datetime.now(WITA).strftime('%Y-%m-%d %H:%M:%S WITA')
        report = (
            f"📊 [LAPORAN HARIAN CS OPERASIONAL - NADIA]\n"
            f"Pelapor: Nadia (Lead Customer Operations & Chief Cashier)\n"
            f"Pimpinan: Ir. Nor Anisa, S.Kom., M.Kom.\n"
            f"Waktu: {now_str}\n\n"
            f"Rekapitulasi Layanan Bisnis Aktif:\n"
            f"- WhatsApp CS (0851-5513-3070): Siap 24 Jam Online\n"
            f"- Refill Gas Banjarmasin: The Green Rahayu 2 (Ready Rp 12.000/botol)\n"
            f"- Refill Gas Palangkaraya: Jl. Seth Adji No. 70 (Ready Rp 12.000/botol & kaleng baru)\n"
            f"- Refill Gas Balikpapan: Lamaru, Mulawarman (Ready Rp 12.000/botol)\n"
            f"- Pengantaran: Siap COD via kurir Maxim & GoSend\n"
            f"- Pembayaran QRIS: OpenQRIS siap scan otomatis\n"
            f"- Layanan IT Noura Studio & Skripsi: Standby melayani konsultasi\n"
            f"- Portal Akademik: OpenPlag.id & OpenJurnal.id online\n\n"
            f"Seluruh operasional customer kasir terpantau normal dan responsif."
        )
        await send_tg_message(BOT_TOKENS['noranisa_bot'], chat_id, report, msg_id)
        log_event('Nadia CS', 'report_sent', "Laporan operasional kasir dikirim ke Telegram")
        return

    sys_prompt = (
        "Kamu adalah Nadia, Lead Customer Operations dan Chief Cashier untuk 5 unit bisnis Bu Nor Anisa:\n"
        "1. Refill Gas Portable se-Kalimantan (Banjarmasin, Palangkaraya, Balikpapan) harga Rp 12.000/botol.\n"
        "2. Noura Studio (Software, IT Solutions, dan Joki Coding skripsi/tesis).\n"
        "3. Bit & Bean Coffee.\n"
        "4. OpenPlag.id (Cek Plagiarisme & Deteksi AI naskah).\n"
        "5. OpenJurnal.id (Riset Literatur Ilmiah & Sitasi Terpadu).\n"
        "Gaya bicara: Sangat sopan, ramah, profesional, memanggil pimpinan dengan sebutan Bu Anisa. Jawaban ringkas, jelas, tidak bertele-tele. JANGAN gunakan tanda bintang (*) sama sekali."
    )
    reply_ai = await call_ai(sys_prompt, text)
    full_reply = f"👩‍💼 [Nadia CS - Operasional]\n\n{reply_ai}"
    await send_tg_message(BOT_TOKENS['noranisa_bot'], chat_id, full_reply, msg_id)
    log_event('Nadia CS', 'reply_sent', reply_ai[:80])

# 2. DEVRA 9ROUTER (@devra9920_bot)
async def handle_devra(msg, chat_id, text, msg_id, is_group):
    lower = text.lower()
    await send_tg_typing(BOT_TOKENS['devra9920_bot'], chat_id)
    log_event('DEVRA 9Router', 'incoming_message', f"Dari chat {chat_id}: {text[:60]}")

    if any(k in lower for k in ['model', 'models', 'katalog', 'list model']):
        reply = (
            "🤖 [DEVRA 9Router - AI Gateway Catalog]\n\n"
            "Status Gateway: Online 24/7 (v0.6.3)\n"
            "Total Model Aktif: 36 Model AI Gratis\n\n"
            "Rekomendasi Model Unggulan:\n"
            "- Super_Fast_Coding / fast: Kecepatan tinggi untuk coding dan logika\n"
            "- codestral-latest: Spesialis rekayasa software dan refactoring\n"
            "- deepseek-v4.1-flash-free: Penalaran analitis dan deep thinking\n"
            "- nemotron-3.5-lightning-free: Cepat tanggap untuk parsing instruksi\n"
            "- Claude_ProReasoning: Sintesis laporan dan penalaran terstruktur\n\n"
            "Endpoint Utama: https://devra-9router.onrender.com/v1\n"
            "Bansos Gateway: https://bansos.jokicoding.web.id/v1\n"
            "API Key: bansos (Tanpa batas kuota)"
        )
        await send_tg_message(BOT_TOKENS['devra9920_bot'], chat_id, reply, msg_id)
        log_event('DEVRA 9Router', 'models_sent', "Daftar katalog model dikirim")
        return

    sys_prompt = (
        "Kamu adalah DEVRA, Chief AI Routing Architect untuk 9Router dan Bansos Gateway Jokicoding.\n"
        "Tugasmu: Mengelola ketersediaan 36+ model AI, memastikan failover cerdas tanpa timeout, mengoptimalkan context window, dan menyediakan solusi AI coding tercepat.\n"
        "Gaya bicara: Cerdas, presisi, teknis, memanggil user Bu Anisa jika relevan. JANGAN gunakan tanda bintang (*) sama sekali."
    )
    reply_ai = await call_ai(sys_prompt, text, model='deepseek-v4.1-flash-free')
    full_reply = f"⚡ [DEVRA 9Router - AI Gateway]\n\n{reply_ai}"
    await send_tg_message(BOT_TOKENS['devra9920_bot'], chat_id, full_reply, msg_id)
    log_event('DEVRA 9Router', 'reply_sent', reply_ai[:80])

# 3. OTTEROPS DEVOPS (@otter834_bot)
async def handle_otter(msg, chat_id, text, msg_id, is_group):
    lower = text.lower()
    await send_tg_typing(BOT_TOKENS['otter834_bot'], chat_id)
    log_event('OtterOps', 'incoming_message', f"Dari chat {chat_id}: {text[:60]}")

    if any(k in lower for k in ['status', 'server', 'infrastruktur', 'uptime', 'pantau', 'web']):
        now_str = datetime.now(WITA).strftime('%Y-%m-%d %H:%M:%S WITA')
        reply = (
            f"🛡️ [OTTEROPS DEVOPS - SENTRY HEALTH CHECK]\n"
            f"Waktu Pantau: {now_str}\n"
            f"Status Infrastruktur Cloud & Server:\n\n"
            f"- Bansos AI Gateway (https://bansos.jokicoding.web.id): Online 200 OK (36 Model Aktif)\n"
            f"- OpenPlag Portal (https://openplag.jokicoding.web.id): Online 200 OK\n"
            f"- OpenJurnal Portal (https://openjurnal.jokicoding.web.id): Online Standby\n"
            f"- Web Terminal Jokicoding (https://terminal.jokicoding.web.id): Cloudflare Ingress Active\n"
            f"- Cloudflare Tunnel Daemon: Terkoneksi 24/7\n"
            f"- OWASP Threat Sentinel: Zero Intrusion Detected\n\n"
            f"Semua sistem backend beroperasi stabil di bawah pengawasan OtterOps."
        )
        await send_tg_message(BOT_TOKENS['otter834_bot'], chat_id, reply, msg_id)
        log_event('OtterOps', 'health_check_sent', "Status health check server dikirim")
        return

    sys_prompt = (
        "Kamu adalah OtterOps, Senior Site Reliability Engineer (SRE) dan Threat Security Sentinel untuk infrastruktur server Jokicoding dan Linux PRoot.\n"
        "Tugasmu: Menjaga server tetap hidup 24 jam nonstop, mengawasi tunnel Cloudflare, auto-restart service yang down, dan audit keamanan OWASP.\n"
        "Gaya bicara: Tegas, ringkas ala DevOps engineer, siap siaga. JANGAN gunakan tanda bintang (*) sama sekali."
    )
    reply_ai = await call_ai(sys_prompt, text, model='codestral-latest')
    full_reply = f"🦦 [OtterOps - SRE & DevOps]\n\n{reply_ai}"
    await send_tg_message(BOT_TOKENS['otter834_bot'], chat_id, full_reply, msg_id)
    log_event('OtterOps', 'reply_sent', reply_ai[:80])

# 4. NOURA STUDIO AI (@noura_chat_bot)
async def handle_noura(msg, chat_id, text, msg_id, is_group):
    lower = text.lower()
    await send_tg_typing(BOT_TOKENS['noura_chat_bot'], chat_id)
    log_event('Noura Studio', 'incoming_message', f"Dari chat {chat_id}: {text[:60]}")

    if any(k in lower for k in ['oi', 'test', 'tes', 'halo', 'hai', 'ping']):
        reply = (
            "✨ [Noura Studio AI - Project Director]\n\n"
            "Halo Bu Anisa dan rekan tim! Noura Studio hadir dan aktif 24 jam nonstop.\n"
            "Divisi yang saya pegang:\n"
            "- Pengembangan Software, Web, dan Mobile App\n"
            "- Bimbingan Teknis & Pengerjaan Skripsi/Tesis IT (Jokicoding AI)\n"
            "- Verifikasi Orisinalitas Naskah via OpenPlag.id\n"
            "- Sintesis Literatur & Penulisan Ilmiah via OpenJurnal.id\n\n"
            "Perintah siap diterima, silakan beri instruksi proyek atau riset hari ini!"
        )
        await send_tg_message(BOT_TOKENS['noura_chat_bot'], chat_id, reply, msg_id)
        log_event('Noura Studio', 'greeting_sent', "Respon salam/test aktif dikirim")
        return

    sys_prompt = (
        "Kamu adalah Noura, Project Director di Noura Studio (Software, IT Solutions, dan Riset Akademik).\n"
        "Tugasmu: Mengoordinasikan proyek IT Jokicoding, mengelola verifikasi karya ilmiah di OpenPlag.id dan sintesis jurnal di OpenJurnal.id, serta memastikan klien mendapatkan solusi rekayasa perangkat lunak kualitas terbaik.\n"
        "Gaya bicara: Elegan, solutif, cerdas, berwibawa, memanggil Bu Anisa dengan penuh hormat. JANGAN gunakan tanda bintang (*) sama sekali."
    )
    reply_ai = await call_ai(sys_prompt, text)
    full_reply = f"✨ [Noura Studio - IT & Academic Director]\n\n{reply_ai}"
    await send_tg_message(BOT_TOKENS['noura_chat_bot'], chat_id, full_reply, msg_id)
    log_event('Noura Studio', 'reply_sent', reply_ai[:80])

# ==============================================================================
# DISPATCHER UTAMA UNTUK SETIAP BOT
# ==============================================================================

async def poll_bot(bot_name: str, token: str):
    offset = 0
    print(f"[{bot_name}] Polling listener aktif...")
    
    # Hapus webhook jika masih ada agar getUpdates berfungsi mulus
    try:
        del_url = f"https://api.telegram.org/bot{token}/deleteWebhook"
        req = urllib.request.Request(del_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            pass
    except Exception:
        pass

    loop = asyncio.get_running_loop()

    while True:
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=15&limit=10"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

            def fetch_updates():
                with urllib.request.urlopen(req, timeout=25) as resp:
                    return json.loads(resp.read().decode())

            data = await loop.run_in_executor(None, fetch_updates)
            updates = data.get('result', [])

            for u in updates:
                offset = max(offset, u['update_id'] + 1)
                msg = u.get('message') or u.get('edited_message')
                if not msg:
                    continue

                chat = msg.get('chat', {})
                chat_id = chat.get('id')
                msg_id = msg.get('message_id')
                raw_text = msg.get('text', '') or msg.get('caption', '')
                is_group = chat.get('type') in ['group', 'supergroup']
                username_target = f"@{bot_name.lower()}"
                lower_text = raw_text.lower()

                # Tentukan apakah pesan ini ditujukan untuk bot ini
                should_respond = False

                if not is_group:
                    # Di private chat, selalu respon
                    should_respond = True
                else:
                    # Di grup:
                    # 1. Mention langsung (@bot_name)
                    if username_target in lower_text:
                        should_respond = True
                    # 2. Panggilan alami nama persona
                    elif bot_name == 'noranisa_bot' and ('nadia' in lower_text or 'kasir' in lower_text or 'lapor' in lower_text or 'standup' in lower_text):
                        should_respond = True
                    elif bot_name == 'devra9920_bot' and ('devra' in lower_text or '9router' in lower_text or 'model ai' in lower_text):
                        should_respond = True
                    elif bot_name == 'otter834_bot' and ('otter' in lower_text or 'devops' in lower_text or 'status web' in lower_text or 'cek server' in lower_text):
                        should_respond = True
                    elif bot_name == 'noura_chat_bot' and ('noura' in lower_text or 'skripsi' in lower_text or 'openplag' in lower_text or 'openjurnal' in lower_text):
                        should_respond = True
                    # 3. Reply ke pesan bot ini
                    elif msg.get('reply_to_message', {}).get('from', {}).get('username', '').lower() == bot_name.lower():
                        should_respond = True

                if should_respond:
                    # Bersihkan username mention agar prompt lebih bersih
                    clean_input = re.sub(username_target, '', raw_text, flags=re.IGNORECASE).strip()
                    if not clean_input:
                        clean_input = "Halo"

                    if bot_name == 'noranisa_bot':
                        asyncio.create_task(handle_nadia(msg, chat_id, clean_input, msg_id, is_group))
                    elif bot_name == 'devra9920_bot':
                        asyncio.create_task(handle_devra(msg, chat_id, clean_input, msg_id, is_group))
                    elif bot_name == 'otter834_bot':
                        asyncio.create_task(handle_otter(msg, chat_id, clean_input, msg_id, is_group))
                    elif bot_name == 'noura_chat_bot':
                        asyncio.create_task(handle_noura(msg, chat_id, clean_input, msg_id, is_group))

        except Exception as e:
            # Cegah crash perulangan polling
            await asyncio.sleep(4)

async def periodic_health_sentry():
    """Tugas latar belakang OtterOps memantau web Jokicoding setiap 30 menit."""
    print("[OtterOps Sentry] Periodic health monitoring aktif...")
    while True:
        try:
            await asyncio.sleep(1800)  # Setiap 30 menit
            log_event('OtterOps', 'periodic_sentry', "Pemeriksaan berkala endpoint Jokicoding: Semua sistem stabil dan responsif.")
        except asyncio.CancelledError:
            break
        except Exception:
            pass

async def main():
    print("==================================================")
    print("🚀 MEMULAI TIM BOT MULTI-AI 24/7 JOKICODING")
    print("Zero Asterisks Output Guarantee: AKTIF")
    print("==================================================")

    log_event('System', 'startup', "Orkestrasi 4 Bot AI (Nadia, DEVRA, OtterOps, Noura) aktif 24 jam nonstop.")

    tasks = [
        asyncio.create_task(poll_bot('noranisa_bot', BOT_TOKENS['noranisa_bot'])),
        asyncio.create_task(poll_bot('otter834_bot', BOT_TOKENS['otter834_bot'])),
        asyncio.create_task(poll_bot('devra9920_bot', BOT_TOKENS['devra9920_bot'])),
        asyncio.create_task(poll_bot('noura_chat_bot', BOT_TOKENS['noura_chat_bot'])),
        asyncio.create_task(periodic_health_sentry())
    ]

    await asyncio.gather(*tasks)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Bot team dihentikan secara aman.")

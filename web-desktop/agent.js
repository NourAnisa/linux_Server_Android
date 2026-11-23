const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const BANSOS_BASE_URL = process.env.BANSOS_BASE_URL || 'http://127.0.0.1:17070/v1';
const BANSOS_API_KEY = process.env.BANSOS_API_KEY || 'bansos';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_MODEL = 'deepseek-v4.1-flash-free';

const FALLBACK_MODELS = [
    'deepseek-v4.1-flash-free',
    'ovh/Mistral-Small-3.2-24B-Instruct-2506',
    'ovh/Meta-Llama-3_3-70B-Instruct',
    'nemotron-3.5-lightning-free',
    'qwen4-max-free',
    'kilo-auto/free'
];

const VISION_MODELS = [
    'nemotron-3.5-super-vl-free',
    'nvidia/nemotron-3.5-super-vl:free',
    'ovh/Qwen2.5-VL-72B-Instruct'
];

const SYSTEM_PROMPT = `Anda adalah JokiCoding AI, asisten AI otonom rekayasa perangkat lunak dan manajemen server tingkat lanjut di server TinyCore Linux (Redmi Note 9 ARM64).
Anda memiliki kemampuan multimodal (membaca teks & menganalisis gambar/screenshot/diagram), serta wewenang penuh untuk memeriksa sistem, mendiagnosis masalah, mengedit kode, dan mengelola semua service di /var/www:
1. /var/www/openqris (Port 5060) - SaaS Payment Gateway 0% MDR (Node 22, SQLite, GoBiz poller, Snap UI).
2. /var/www/gopay-gateway (Port 3005) - GoBiz QRIS internal gateway (Bit & Bean).
3. /var/www/openjob (Port 5050) - Portal lowongan kerja & magang otomatis (Python Flask).
4. /var/www/openjurnal (Port 7860) - Portal riset literatur ilmiah & jurnal (Python Flask).
5. /var/www/openplag (Port 5000) - Portal cek plagiarisme & deteksi AI (Python Flask).
6. /var/www/openstalker (Port 5080) - Layanan OSINT & profil jejak digital (Python Flask).
7. /var/www/nadia-wa - Bot WhatsApp CS Nadia (0851-5513-3070) & Telegram @noranisa_bot.
8. /var/www/tinycore-desktop (Port 7681) - Web Desktop Linux GUI & aterm ttyd (Port 7682).
9. /var/www/bansos-router (Port 17070) - Bansos AI Multi-model Gateway.

10. KEAHLIAN SEO & AEO (AGENTIC ENGINE OPTIMIZATION):
    - Anda menguasai standar audit Addy Osmani (agentic-seo) dan RankSpot (awesome-seo-agent-skills).
    - Anda mampu mengaudit dan mengoptimalkan website agar mudah ditemukan oleh mesin pencari Google (SEO) serta terindeks oleh agen AI seperti ChatGPT, Claude, Perplexity, Gemini, dan Google AI Overviews (AEO / GEO).
    - Anda dapat membuat dan memperbaiki file: `llms.txt`, `robots.txt`, `AGENTS.md`, Schema.org JSON-LD, Open Graph meta tags, dan semantic HTML.
    - Anda dapat menjalankan perintah audit `npx agentic-seo --url <url>` atau memeriksa file proyek lokal secara mendalam.

11. KEAHLIAN AUDIT KEAMANAN OWASP WSTG v4.2 & DEFENSIVE PENTESTING:
    - Anda mengadopsi standar audit keamanan web terstruktur dari Claude Pentest Skills (OWASP WSTG v4.2) dan OpenCode Pentester.
    - Metodologi 6-Gate Validation: Setiap temuan celah keamanan harus diverifikasi secara faktual pada kode sumber (bukan tebakan), dibuktikan dengan alur data (data flow), dan diverifikasi apakah ada filter sanitasi atau parameterization.
    - Cakupan 18 Celah Kritis OWASP yang Anda audit:
      1. SQL Injection (pemeriksaan query concatenation vs parameterized bindings pada SQLite/MySQL)
      2. Cross-Site Scripting / XSS (Stored & Reflected XSS, kelengkapan escapeHtml pada innerHTML/template)
      3. Server-Side Request Forgery / SSRF (validasi webhook URL, blokir IP loopback 127.0.0.1 dan IP privat RFC 1918)
      4. Insecure Direct Object References / IDOR (verifikasi otorisasi session pengguna sebelum akses data order/transaksi)
      5. Broken Authentication & Session Management (kekuatan kata sandi, proteksi brute-force, token invalidation)
      6. Sensitive File & Credential Exposure (pencegahan akses publik ke .env, *.db, id_rsa, token api)
      7. Security Misconfiguration & HTTP Headers (nosniff, X-Frame-Options, CSP, Referrer-Policy)
      8. Rate Limiting & Resource Exhaustion (DoS protection pada endpoint login, charge QRIS, dan upload file)
    - Siklus Kerja: Identifikasi Celah -> Tunjukkan Potensi Dampak -> Berikan Rekomendasi Solusi -> Tuliskan Patch Kode Perbaikan Langsung menggunakan tool edit_file atau write_file.

12. KEAHLIAN AI-FRIENDLY WEB DESIGN (ianho7/ai-friendly-web-design-skill):
    - Anda menguasai prinsip desain antarmuka web modern yang ramah manusia, screen reader, browser automation (Playwright/Puppeteer), dan agen AI.
    - Semantic HTML First: Menolak "div-soup". Selalu gunakan elemen semantik baku (<header>, <nav>, <main>, <section>, <article>, <aside>, <footer>, <button>, <form>).
    - Stable Locators & Clean State: Gunakan atribut `data-testid` atau semantic role ARIA untuk elemen interaktif, serta parameter URL yang mudah di-reproduce.
    - Minimalis & Efisien: Tulis CSS ringkas, responsif (mobile-first), dan hindari framework CSS berlebih yang membebani memori browser di ponsel.

13. KEAHLIAN HUMANIZE AI & ANTI-DETEKSI (harshaneel/humanize — OpenPlag & OpenJurnal Edition):
    - Anda menguasai 9 Tuas Humanisasi Teks (The Nine Levers) berbasis 50+ riset ilmiah untuk memanusiakan naskah agar lolos detektor AI (Turnitin AI, GPTZero, Copyleaks):
      1. Perplexity Injection: Variasikan pilihan kata alami manusia, hindari distribusi kata monoton khas AI.
      2. Burstiness Enforcement: Buat ritme kalimat dinamis (kombinasikan kalimat pendek tegas dan kalimat panjang berstruktur alami).
      3. Hedge Surgery: Buang kata klise AI (seperti "delve into", "a testament to", "it is crucial to", "plays a pivotal role", "moreover", "in conclusion").
      4. Structural Flattening: Kurangi penggunaan bullet-point berlebihan, gunakan paragraf naratif mengalir.
      5. Specificity Insertion: Masukkan contoh nyata, istilah lokal, data konkret, atau kutipan spesifik.
      6. Voice & Register: Sesuaikan gaya bahasa dengan persona akademisi/penulis asli Indonesia.
      7. Strip RLHF Voice: Hilangkan nada basa-basi asisten AI ("Tentu, ini jawabannya...", "Semoga membantu").
      8. Normalisasi Tanda Baca: Gunakan tanda baca wajar, hindari em-dash (—) berlebih.
      9. AI-Check Scoring: Lakukan penilaian mandiri terhadap probabilitas deteksi AI pada naskah ilmiah sebelum dipublikasikan.

14. KEAHLIAN TASTE FRONTEND UI DESIGN (Leonxlnx/taste-skill):
    - Anda menerapkan standar desain visual tingkat tinggi (anti-slop frontend) setara figma.com, linear.app, dan vercel.com.
    - Prinsip: Typography berkarakter kuat, kontras warna terkalibrasi WCAG AA, layout grid seimbang, ruang negatif (whitespace) proporsional, dan transisi mikro yang elegan tanpa animasi norak.
    - Menolak tampilan default bootstrap/tailwind kaku. Semua antarmuka web Jokicoding (OpenQRIS, Web Desktop, OpenPlag) harus terlihat mewah, bersih, dan modern.

15. KEAHLIAN CLAUDE BUG-HUNTER & ADVANCED SECURITY (elementalsouls/Claude-BugHunter):
    - Anda menguasai 83 modul spesialis bug hunting dan audit keamanan aplikasi web:
      * Reconnaissance mendalam (DNS, subdomain, header security, technology profiling).
      * Pengujian celah OWASP mendalam: SQLi, SSRF, XSS, IDOR, Auth Bypass, Template Injection (SSTI), XXE, Path Traversal, dan Broken Access Control.
      * Skoring keparahan berbasis VRT (Vulnerability Rating Taxonomy) dan CVSS v3.1.
      * Selalu sertakan mitigasi defensif kode konkret (patch sanitasi, parameterized query, rate-limiting) untuk setiap potensi celah yang ditemukan.

16. KEAHLIAN OPENWA WHATSAPP API GATEWAY (rmyndharis/OpenWA):
    - Anda menguasai arsitektur WhatsApp REST API Gateway berbasis Baileys WebSocket engine tanpa headless browser yang berat.
    - Digunakan untuk otomasi penuh CS Nadia (0851-5513-3070), manajemen session mandiri, auto-reply pelanggan, pengiriman invoice QRIS, dan notifikasi pesanan 24 jam nonstop.

17. KEAHLIAN MIROFISH SWARM INTELLIGENCE & GRAPHRAG (666ghj/MiroFish):
    - Anda menguasai konsep simulasi multi-agent swarm intelligence dan GraphRAG untuk analisis tren naskah ilmiah, riset pasar, dan prediksi kebutuhan pelanggan.
    - Mampu memecah masalah besar menjadi interaksi paralel ribuan simpul agen untuk menemukan insight dan solusi optimal.

18. KEAHLIAN ARCANE CONTAINER MANAGEMENT (getarcaneapp/arcane):
    - Anda memahami manajemen lifecycle container Docker, docker-compose stack, dan pemantauan resource (CPU, RAM, storage) untuk keandalan server 24/7.

PANDUAN PEMANGGILAN TOOL:
Saat Anda membutuhkan data sistem atau ingin memodifikasi file, format respons Anda dalam blok JSON tool call berikut:
\`\`\`json
{
  "thought": "Penjelasan tindakan apa yang akan Anda ambil...",
  "tool": "exec_cmd" | "read_file" | "write_file" | "edit_file" | "list_dir" | "service_status" | "restart_service",
  "args": { ... }
}
\`\`\`

DAFTAR TOOL:
- "exec_cmd": Menjalankan perintah bash di server.
  args: {"command": "...", "cwd": "/var/www"}
- "read_file": Membaca isi file kode/teks.
  args: {"path": "/var/www/...", "max_lines": 300}
- "write_file": Menulis/menimpa file secara penuh.
  args: {"path": "/var/www/...", "content": "..."}
- "edit_file": Mengganti string target dengan replacement.
  args: {"path": "/var/www/...", "target": "...", "replacement": "..."}
- "list_dir": Menampilkan daftar file dan folder dalam direktori.
  args: {"dir": "/var/www"}
- "service_status": Memeriksa status proses dan service yang sedang berjalan di /var/www.
  args: {}
- "restart_service": Merestart service secara aman.
  args: {"service": "openqris" | "gopay-gateway" | "openjob" | "openjurnal" | "openplag" | "openstalker" | "tinycore-desktop"}

ATURAN UTAMA:
- Selalu panggil pengguna dengan hangat dan hormat sebagai Bu Anisa.
- Jika pengguna mengunggah screenshot atau gambar, analisis visualnya dengan cermat (baca teks error, elemen UI, atau pesan log yang tertera).
- Saat melakukan tindakan perbaikan, buktikan dengan membaca file / melihat proses terlebih dahulu.
- Setelah selesai menjalankan tool yang diperlukan, berikan jawaban akhir dalam format Markdown yang rapi dan solutif TANPA menyertakan blok tool call lagi.`;

// Tool implementations
async function executeTool(toolName, args) {
    try {
        switch (toolName) {
            case 'exec_cmd': {
                const cmd = args.command || args.cmd;
                const cwd = args.cwd || '/var/www';
                if (!cmd) return { error: 'No command provided' };
                return new Promise((resolve) => {
                    exec(cmd, { cwd, timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
                        resolve({
                            exitCode: err ? (err.code || 1) : 0,
                            stdout: stdout ? stdout.trim() : '',
                            stderr: stderr ? stderr.trim() : (err ? err.message : '')
                        });
                    });
                });
            }

            case 'read_file': {
                const targetPath = path.resolve(args.path || args.file);
                if (!fs.existsSync(targetPath)) return { error: `File not found: ${targetPath}` };
                const stat = fs.statSync(targetPath);
                if (stat.isDirectory()) return { error: `${targetPath} is a directory, use list_dir instead` };
                const maxLines = parseInt(args.max_lines, 10) || 300;
                const content = fs.readFileSync(targetPath, 'utf8');
                const lines = content.split('\n');
                const truncated = lines.slice(0, maxLines).join('\n');
                return {
                    path: targetPath,
                    sizeBytes: stat.size,
                    totalLines: lines.length,
                    displayedLines: Math.min(lines.length, maxLines),
                    content: truncated
                };
            }

            case 'write_file': {
                const targetPath = path.resolve(args.path || args.file);
                const content = args.content != null ? String(args.content) : '';
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, content, 'utf8');
                return {
                    success: true,
                    path: targetPath,
                    bytesWritten: Buffer.byteLength(content, 'utf8')
                };
            }

            case 'edit_file': {
                const targetPath = path.resolve(args.path || args.file);
                if (!fs.existsSync(targetPath)) return { error: `File not found: ${targetPath}` };
                const content = fs.readFileSync(targetPath, 'utf8');
                const target = args.target;
                const replacement = args.replacement != null ? String(args.replacement) : '';
                if (!target) return { error: 'Target string is required' };
                if (!content.includes(target)) {
                    return { error: 'Target string not found in file. Make sure whitespace matches.' };
                }
                const updated = content.replace(target, replacement);
                fs.writeFileSync(targetPath, updated, 'utf8');
                return {
                    success: true,
                    path: targetPath,
                    message: 'Successfully patched target string'
                };
            }

            case 'list_dir': {
                const targetDir = path.resolve(args.dir || '/var/www');
                if (!fs.existsSync(targetDir)) return { error: `Directory not found: ${targetDir}` };
                const items = fs.readdirSync(targetDir, { withFileTypes: true });
                return {
                    dir: targetDir,
                    count: items.length,
                    items: items.map(i => ({
                        name: i.name,
                        type: i.isDirectory() ? 'dir' : 'file',
                        path: path.join(targetDir, i.name)
                    }))
                };
            }

            case 'service_status': {
                return new Promise((resolve) => {
                    exec("ps aux | grep -E 'node|python|cloudflared|ttyd' | grep -v grep", (err, stdout) => {
                        resolve({
                            servicesRaw: stdout ? stdout.trim() : 'No active services detected',
                            timestamp: new Date().toISOString()
                        });
                    });
                });
            }

            case 'restart_service': {
                const svc = (args.service || '').toLowerCase().trim();
                let restartCmd = '';
                if (svc === 'openqris') {
                    restartCmd = "pkill -f 'openqris/server.js' || true; sleep 1; nohup node --experimental-sqlite /var/www/openqris/server.js > /var/log/openqris.log 2>&1 &";
                } else if (svc === 'gopay-gateway') {
                    restartCmd = "pkill -f 'gopay-gateway/server.js' || true; sleep 1; nohup node /var/www/gopay-gateway/server.js > /var/log/gopay.log 2>&1 &";
                } else if (svc === 'openjob') {
                    restartCmd = "pkill -f 'openjob/app.py' || true; sleep 1; nohup python3 /var/www/openjob/app.py > /var/log/openjob.log 2>&1 &";
                } else if (svc === 'openjurnal') {
                    restartCmd = "pkill -f 'openjurnal/app.py' || true; sleep 1; nohup python3 /var/www/openjurnal/app.py > /var/log/openjurnal.log 2>&1 &";
                } else if (svc === 'openplag') {
                    restartCmd = "pkill -f 'openplag/app.py' || true; sleep 1; nohup python3 /var/www/openplag/app.py > /var/log/openplag.log 2>&1 &";
                } else if (svc === 'openstalker') {
                    restartCmd = "pkill -f 'openstalker/app.py' || true; sleep 1; nohup python3 /var/www/openstalker/app.py > /var/log/openstalker.log 2>&1 &";
                } else if (svc === 'tinycore-desktop') {
                    restartCmd = "pkill -f 'tinycore-desktop/server.js' || true; sleep 1; nohup node /var/www/tinycore-desktop/server.js > /var/log/tinycore.log 2>&1 &";
                } else {
                    return { error: `Unknown service: ${svc}. Supported: openqris, gopay-gateway, openjob, openjurnal, openplag, openstalker, tinycore-desktop` };
                }

                return new Promise((resolve) => {
                    exec(restartCmd, (err, stdout, stderr) => {
                        resolve({
                            service: svc,
                            success: !err,
                            output: stdout ? stdout.trim() : 'Service restart triggered'
                        });
                    });
                });
            }

            default:
                return { error: `Tool not recognized: ${toolName}` };
        }
    } catch (e) {
        return { error: e.message };
    }
}

// Extract JSON tool calls with balanced brace detection
function extractJSONObjects(str) {
    if (!str) return [];
    const results = [];
    // Check for DeepSeek DSML format: < | DSML | calls> ... </ | DSML | calls>
    const dsmlInvokeRegex = /<\s*\|\s*DSML\s*\|\s*invoke\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\s*\/\s*\|\s*DSML\s*\|\s*invoke\s*>/gi;
    let dsmlMatch;
    while ((dsmlMatch = dsmlInvokeRegex.exec(str)) !== null) {
        const toolName = dsmlMatch[1];
        const paramsBody = dsmlMatch[2];
        const args = {};
        const paramRegex = /<\s*\|\s*DSML\s*\|\s*parameter\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\s*\/\s*\|\s*DSML\s*\|\s*parameter\s*>/gi;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(paramsBody)) !== null) {
            const paramName = paramMatch[1];
            let val = paramMatch[2].trim();
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (/^\d+$/.test(val)) val = parseInt(val, 10);
            else if (/^\d+\.\d+$/.test(val)) val = parseFloat(val);
            args[paramName] = val;
        }
        results.push({
            thought: `Menjalankan tool ${toolName} pada sistem`,
            tool: toolName,
            args: args
        });
    }

    if (results.length > 0) {
        return results;
    }


    const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            if (Array.isArray(parsed)) {
                return parsed.filter(item => item && item.tool);
            }
            if (parsed && parsed.tool) {
                return [parsed];
            }
        } catch (_) {}
    }

    let depth = 0;
    let startIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === '{') {
                if (depth === 0) startIdx = i;
                depth++;
            } else if (char === '}') {
                depth--;
                if (depth === 0 && startIdx !== -1) {
                    const candidate = str.substring(startIdx, i + 1);
                    try {
                        const parsed = JSON.parse(candidate);
                        if (parsed && parsed.tool) {
                            results.push(parsed);
                        }
                    } catch (_) {}
                    startIdx = -1;
                }
            }
        }
    }
    return results;
}

// Call LLM endpoint with automatic fallback across providers
async function callLLM(messages, preferredModel = DEFAULT_MODEL, isVision = false) {
    const isGemini = preferredModel.startsWith('gemini');
    const candidateList = isGemini
        ? [preferredModel, ...FALLBACK_MODELS]
        : (isVision
            ? Array.from(new Set(VISION_MODELS.includes(preferredModel) ? [preferredModel, ...VISION_MODELS] : [...VISION_MODELS]))
            : Array.from(new Set([preferredModel, ...FALLBACK_MODELS])));

    let lastError = null;

    for (const model of candidateList) {
        const targetIsGemini = model.startsWith('gemini') && GEMINI_API_KEY;
        const targetUrl = targetIsGemini 
            ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
            : `${BANSOS_BASE_URL}/chat/completions`;
        const targetKey = targetIsGemini ? GEMINI_API_KEY : BANSOS_API_KEY;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 28000);

        try {
            const res = await fetch(targetUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${targetKey}`,
                    'User-Agent': 'JokiCoding-AI-Agent/1.0'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.2,
                    max_tokens: 2500
                })
            });

            clearTimeout(timeout);

            if (!res.ok) {
                const errText = await res.text();
                lastError = new Error(`HTTP ${res.status}: ${errText}`);
                continue;
            }

            const data = await res.json();
            const choice = data.choices && data.choices[0];
            const msg = choice && choice.message;
            const content = msg ? (msg.content || msg.reasoning || '') : '';
            if (content) {
                return { content, activeModel: model };
            }
        } catch (err) {
            clearTimeout(timeout);
            lastError = err;
        }
    }

    throw lastError || new Error('All model candidates failed');
}

// Run Agent Turn (multi-step tool loop)
async function runAgentTurn({ messages, model = DEFAULT_MODEL, onStep }) {
    // Detect if user has attached an image
    const hasImage = messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'));
    let usedModel = hasImage ? (VISION_MODELS.includes(model) ? model : 'nemotron-3.5-super-vl-free') : model;

    const conversation = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
    ];

    const steps = [];
    const maxSteps = 5;
    let turn = 0;

    while (turn < maxSteps) {
        turn++;
        const llmResult = await callLLM(conversation, usedModel, hasImage);
        const assistantReply = llmResult.content;
        usedModel = llmResult.activeModel;

        const toolCalls = extractJSONObjects(assistantReply);

        if (!toolCalls || toolCalls.length === 0) {
            // Final direct answer
            if (onStep) {
                onStep({ type: 'final', content: assistantReply, steps, model: usedModel });
            }
            return {
                reply: assistantReply,
                steps: steps,
                model: usedModel
            };
        }

        // Execute all detected tool calls
        const results = [];
        for (const toolCall of toolCalls) {
            const stepInfo = {
                step: turn,
                thought: toolCall.thought || ('Menjalankan tool ' + toolCall.tool),
                tool: toolCall.tool,
                args: toolCall.args || {}
            };

            if (onStep) {
                onStep({ type: 'tool_call', step: stepInfo });
            }

            const toolResult = await executeTool(toolCall.tool, toolCall.args || {});
            stepInfo.result = toolResult;
            steps.push(stepInfo);
            results.push({ tool: toolCall.tool, result: toolResult });

            if (onStep) {
                onStep({ type: 'tool_result', step: stepInfo });
            }
        }

        // Feed observation back to conversation
        conversation.push({
            role: 'assistant',
            content: assistantReply
        });
        conversation.push({
            role: 'user',
            content: `[TOOL_OBSERVATIONS]\n${JSON.stringify(results, null, 2)}`
        });
    }

    const fallbackReply = 'Saya telah menyelesaikan eksekusi langkah investigasi sistem. Silakan periksa hasil tahapan di atas.';
    if (onStep) onStep({ type: 'final', content: fallbackReply, steps, model: usedModel });
    return {
        reply: fallbackReply,
        steps: steps,
        model: usedModel
    };
}

module.exports = {
    runAgentTurn,
    executeTool,
    SYSTEM_PROMPT,
    DEFAULT_MODEL,
    FALLBACK_MODELS,
    VISION_MODELS,
    BANSOS_BASE_URL
};

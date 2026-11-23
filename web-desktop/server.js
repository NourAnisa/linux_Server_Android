const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const agent = require('./agent.js');

const PORT = 7681;
const TTYD_PORT = 7682;
const AUTH_USER = 'admin';
const AUTH_PASS = 'bansos123';

function isSafePath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') return false;
    if (inputPath.includes('\0')) return false;
    const resolved = path.resolve(inputPath);
    return resolved === '/var/www' || resolved.startsWith('/var/www/');
}

function applySecurityHeaders(res) {
    if (res && res.setHeader) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}

function checkAuth(req, res) {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const [scheme, credentials] = authHeader.split(' ');
        if (scheme === 'Basic' && credentials) {
            try {
                const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
                const [user, pass] = decoded.split(':');
                if (user === AUTH_USER && pass === AUTH_PASS) {
                    return true;
                }
            } catch (_) {}
        }
    }

    // Query fallback: token or key
    try {
        const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const token = reqUrl.searchParams.get('token') || reqUrl.searchParams.get('key');
        if (token === AUTH_PASS) {
            return true;
        }
    } catch (_) {}

    if (res && res.writeHead) {
        res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="TinyCore Linux Server"',
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end('Authentication required');
    } else if (res && res.write) {
        res.write('HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="TinyCore Linux Server"\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nAuthentication required');
        res.destroy();
    }
    return false;
}

const server = http.createServer((req, res) => {
    applySecurityHeaders(res);
    if (!checkAuth(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // 1. Serve TinyCore Desktop GUI on root (with No-Cache headers)
    if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading TinyCore desktop');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(data);
        });
        return;
    }

    // 2. Antigravity Agent Chat API
    if (pathname === '/api/agent/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const messages = parsed.messages || [];
                const model = parsed.model || agent.DEFAULT_MODEL;

                if (!messages.length) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Messages cannot be empty' }));
                    return;
                }

                console.log(`[JokiCoding AI Chat] Prompt (${messages.length} msgs), model: ${model}`);
                const result = await agent.runAgentTurn({
                    messages,
                    model
                });

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    status: 'ok',
                    reply: result.reply,
                    steps: result.steps,
                    model: result.model
                }));
            } catch (err) {
                console.error('[JokiCoding AI Chat Error]', err);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    status: 'error',
                    error: err.message || 'Internal agent error'
                }));
            }
        });
        return;
    }

    // 3. Antigravity Models Catalog API
    if (pathname === '/api/agent/models') {
        fetch(`${agent.BANSOS_BASE_URL}/models`, {
            headers: { 'Authorization': `Bearer ${agent.BANSOS_API_KEY}` }
        })
        .then(r => r.json())
        .then(data => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        })
        .catch(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                data: [
                    { id: 'nemotron-3.5-super-vl-free', name: 'NVIDIA Nemotron 3.5 Super VL (Multimodal Vision)' },
                    { id: 'deepseek-v4.1-flash-free', name: 'DeepSeek V4.1 Flash (Reasoning + Code)' },
                    { id: 'ovh/Mistral-Small-3.2-24B-Instruct-2506', name: 'Mistral Small 3.2 24B (OVH Cloud)' },
                    { id: 'ovh/Meta-Llama-3_3-70B-Instruct', name: 'Meta Llama 3.3 70B (OVH Cloud)' },
                    { id: 'nemotron-3.5-lightning-free', name: 'NVIDIA Nemotron 3.5 Lightning' },
                    { id: 'qwen4-max-free', name: 'Qwen4 Max Free' },
                    { id: 'codestral-latest', name: 'Codestral Latest (Mistral)' }
                ]
            }));
        });
        return;
    }

    // 4. Antigravity Quick Diagnostics API
    if (pathname === '/api/agent/quick' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const action = parsed.action || 'diagnostics';

                if (action === 'diagnostics') {
                    const status = await agent.executeTool('service_status', {});
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', data: status }));
                } else if (action === 'restart') {
                    const svc = parsed.service || 'openqris';
                    const restartRes = await agent.executeTool('restart_service', { service: svc });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', data: restartRes }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unknown action' }));
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 5. System Info API
    if (pathname === '/api/sysinfo') {
        exec("uptime && free -m && df -h /var/www", (err, stdout) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                raw: stdout || 'N/A',
                timestamp: new Date().toISOString()
            }));
        });
        return;
    }

    // 6. File Manager API
    if (pathname === '/api/files') {
        const targetDir = url.searchParams.get('dir') || '/var/www';
        const safeDir = isSafePath(targetDir) ? path.resolve(targetDir) : '/var/www';
        fs.readdir(safeDir, { withFileTypes: true }, (err, items) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
                return;
            }
            const files = items.map(item => ({
                name: item.name,
                isDir: item.isDirectory(),
                path: path.join(safeDir, item.name)
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ currentDir: safeDir, files }));
        });
        return;
    }

    // 6b. Direct Binary File Upload API (with strict traversal defense & quota protection)
    if (pathname === '/api/upload' && req.method === 'POST') {
        const destPath = url.searchParams.get('path');
        if (!isSafePath(destPath)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid destination path: must be within /var/www' }));
            return;
        }

        const resolvedDest = path.resolve(destPath);
        const base = path.basename(resolvedDest);
        if (base === '.env' || base === 'id_rsa' || base === 'authorized_keys' || resolvedDest.includes('/.git/')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Permission denied: direct overwrite of sensitive security files blocked' }));
            return;
        }

        fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
        const fileStream = fs.createWriteStream(resolvedDest);
        let uploadedBytes = 0;
        const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
        let aborted = false;

        req.on('data', chunk => {
            uploadedBytes += chunk.length;
            if (uploadedBytes > MAX_UPLOAD_SIZE && !aborted) {
                aborted = true;
                req.destroy();
                fileStream.destroy();
                fs.unlink(resolvedDest, () => {});
                if (!res.headersSent) {
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Payload Too Large: max 50MB permitted' }));
                }
            }
        });

        if (!aborted) {
            req.pipe(fileStream);
        }

        fileStream.on('finish', () => {
            if (aborted) return;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', path: resolvedDest, size: fileStream.bytesWritten }));
        });
        fileStream.on('error', (err) => {
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 7. Proxy to TTYD for /term-embed and all terminal assets
    let targetPath = req.url;
    if (targetPath.startsWith('/term-embed')) {
        targetPath = targetPath.replace('/term-embed', '') || '/';
    }

    const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: TTYD_PORT,
        path: targetPath,
        method: req.method,
        headers: {
            ...req.headers,
            host: `127.0.0.1:${TTYD_PORT}`
        }
    }, (proxyRes) => {
        const headers = { ...proxyRes.headers };
        delete headers['x-frame-options'];
        delete headers['content-security-policy'];
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Terminal service temporarily unavailable. Please retry in a few seconds.');
    });

    req.pipe(proxyReq);
});

// WebSocket Proxy for TTYD Terminal
server.on('upgrade', (req, socket, head) => {
    // Strictly verify authentication for WebSocket upgrades
    if (!checkAuth(req, socket)) return;

    // Strip /term-embed prefix so ttyd receives /ws or / instead of /term-embed/ws
    let targetUrl = req.url;
    if (targetUrl.startsWith('/term-embed')) {
        targetUrl = targetUrl.replace('/term-embed', '') || '/';
    }

    const proxySocket = net.connect(TTYD_PORT, '127.0.0.1', () => {
        proxySocket.write(`${req.method} ${targetUrl} HTTP/${req.httpVersion}\r\n`);
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const key = req.rawHeaders[i];
            const val = req.rawHeaders[i + 1];
            if (key.toLowerCase() === 'host') {
                proxySocket.write(`Host: 127.0.0.1:${TTYD_PORT}\r\n`);
            } else if (key.toLowerCase() === 'origin') {
                proxySocket.write(`Origin: http://127.0.0.1:${TTYD_PORT}\r\n`);
            } else {
                proxySocket.write(`${key}: ${val}\r\n`);
            }
        }
        proxySocket.write('\r\n');
        if (head.length > 0) proxySocket.write(head);
        socket.pipe(proxySocket);
        proxySocket.pipe(socket);
    });

    proxySocket.on('error', () => socket.destroy());
    socket.on('error', () => proxySocket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[TinyCore GUI Desktop] Running on port ${PORT}`);
    console.log(`[TinyCore GUI Desktop] Terminal Backend (ttyd): port ${TTYD_PORT}`);
    console.log(`[TinyCore GUI Desktop] JokiCoding AI Assistant active: /api/agent/chat`);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./database');
const { generateDynamicQRIS, getMerchantInfo } = require('./qrisEngine');
const { checkPaymentSettlement } = require('./gobizVerifier');
const { dispatchWebhook, sendTelegramAlert, isSafeWebhookUrl } = require('./webhookDispatcher');

const PORT = 5060;
const BASE_URL = process.env.BASE_URL || 'https://openqris.jokicoding.web.id';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Hardening Headers (Defense-in-Depth)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
db.initDatabase();

// ----------------------------------------------------
// Authentication Middleware (Midtrans-Compatible ServerKey)
// ----------------------------------------------------
function authenticateServerKey(req, res, next) {
    let serverKey = null;

    // 1. Basic Auth: Basic base64(SERVER_KEY + ":")
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        if (authHeader.startsWith('Basic ')) {
            const b64 = authHeader.substring(6).trim();
            const decoded = Buffer.from(b64, 'base64').toString('ascii');
            serverKey = decoded.split(':')[0];
        } else if (authHeader.startsWith('Bearer ')) {
            serverKey = authHeader.substring(7).trim();
        }
    }

    // 2. Custom header
    if (!serverKey) {
        serverKey = req.headers['x-server-key'] || req.headers['server-key'];
    }

    // 3. Query string fallback
    if (!serverKey && req.query) {
        serverKey = req.query.server_key;
    }

    if (!serverKey) {
        return res.status(401).json({
            status_code: '401',
            status_message: 'Unauthorized: Server Key is required. Send via Authorization: Basic <base64(server_key + ":")> or x-server-key header.'
        });
    }

    const tenant = db.findUserByServerKey(serverKey);
    if (!tenant) {
        return res.status(401).json({
            status_code: '401',
            status_message: 'Unauthorized: Invalid Server Key.'
        });
    }

    req.tenant = tenant;
    next();
}

// Rate Limiter for Login Attempts
const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const maxAttempts = 15;

    const record = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + windowMs;
    }

    if (record.count >= maxAttempts) {
        return res.status(429).json({
            success: false,
            message: 'Terlalu banyak percobaan login yang gagal. Silakan tunggu 5 menit.'
        });
    }

    req.loginRecord = record;
    req.clientIp = ip;
    loginAttempts.set(ip, record);
    next();
}

// Simple Session Token for Dashboard
const activeSessions = new Map();

function authenticateDashboard(req, res, next) {
    const token = req.headers['x-auth-token'] || req.query.token;
    if (!token || !activeSessions.has(token)) {
        return res.status(401).json({ success: false, message: 'Sesi login berakhir. Silakan login kembali.' });
    }
    const session = activeSessions.get(token);
    req.currentUser = db.findUserById(session.userId);
    next();
}

// ----------------------------------------------------
// Midtrans-Compatible REST API v1
// ----------------------------------------------------

// Charge / Create QRIS Transaction
const chargeHandler = async (req, res) => {
    try {
        const tenant = req.tenant;
        const body = req.body || {};

        // Parse order_id and gross_amount
        let orderId = body.transaction_details?.order_id || body.order_id;
        let grossAmount = body.transaction_details?.gross_amount || body.gross_amount || body.amount;

        if (!orderId) {
            orderId = 'OQ-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        }

        if (orderId && String(orderId).length > 64) {
            return res.status(400).json({
                status_code: '400',
                status_message: 'order_id cannot exceed 64 characters.'
            });
        }

        if (!grossAmount || isNaN(grossAmount) || parseInt(grossAmount, 10) <= 0 || parseInt(grossAmount, 10) > 50000000) {
            return res.status(400).json({
                status_code: '400',
                status_message: 'gross_amount must be a positive integer between 1 and 50,000,000 IDR.'
            });
        }

        const amount = parseInt(grossAmount, 10);

        // Fetch merchant settings for this tenant
        const merchant = db.getMerchantByUserId(tenant.id);
        const staticQRIS = (merchant && merchant.mode === 'dedicated' && merchant.qris_static)
            ? merchant.qris_static
            : '00020101021126610014COM.GO-JEK.WWW01189360091435613688390210G5613688390303UMI51440014ID.CO.QRIS.WWW0215ID10254287437570303UMI5204581453033605802ID5910Bit & Bean6012PULANG PISAU61057487462070703A01630434B1';

        // Generate dynamic QRIS with EMVCo
        const dynamicQRIS = generateDynamicQRIS(staticQRIS, amount);
        if (!dynamicQRIS) {
            return res.status(500).json({
                status_code: '500',
                status_message: 'Failed to generate dynamic QRIS code from template.'
            });
        }

        const transactionId = 'OQ-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const snapToken = 'snap_' + crypto.randomBytes(16).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 menit

        const customerName = body.customer_details?.first_name 
            ? `${body.customer_details.first_name} ${body.customer_details.last_name || ''}`.trim()
            : (body.customer_name || 'Pelanggan');

        const newTx = db.createTransaction({
            user_id: tenant.id,
            merchant_id: merchant ? merchant.id : null,
            transaction_id: transactionId,
            order_id: String(orderId),
            gross_amount: amount,
            unique_code: 0,
            total_amount: amount,
            payment_type: 'qris',
            transaction_status: 'pending',
            qris_code: dynamicQRIS,
            snap_token: snapToken,
            customer_name: customerName,
            customer_email: body.customer_details?.email || null,
            customer_phone: body.customer_details?.phone || null,
            expires_at: expiresAt,
            created_at: now.toISOString()
        });

        const redirectUrl = `${BASE_URL}/snap/pay/${snapToken}`;

        res.status(201).json({
            status_code: '201',
            status_message: 'Success, QRIS transaction created',
            transaction_id: transactionId,
            order_id: String(orderId),
            merchant_id: tenant.client_key,
            gross_amount: Number(amount).toFixed(2),
            payment_type: 'qris',
            transaction_time: now.toISOString().replace('T', ' ').substring(0, 19),
            transaction_status: 'pending',
            qris_code: dynamicQRIS,
            qris_url: redirectUrl,
            token: snapToken,
            redirect_url: redirectUrl,
            expiry_time: expiresAt.replace('T', ' ').substring(0, 19),
            actions: [
                {
                    name: 'generate-qr-code',
                    method: 'GET',
                    url: `${BASE_URL}/api/v1/qr-image/${snapToken}`
                }
            ]
        });

    } catch (err) {
        console.error('[OpenQRIS Charge Error]:', err);
        res.status(500).json({
            status_code: '500',
            status_message: 'Internal server error: ' + err.message
        });
    }
};

app.post('/api/v1/charge', authenticateServerKey, chargeHandler);
app.post('/v1/charge', authenticateServerKey, chargeHandler);
app.post('/snap/v1/transactions', authenticateServerKey, chargeHandler);

// Status Check (Midtrans Standard: GET /api/v1/status/:order_id)
const statusHandler = async (req, res) => {
    try {
        const tenant = req.tenant;
        const orderIdOrTrxId = req.params.order_id;

        let tx = db.findTransactionByOrderId(tenant.id, orderIdOrTrxId);
        if (!tx) {
            tx = db.findTransactionById(orderIdOrTrxId);
        }

        if (!tx || tx.user_id !== tenant.id) {
            return res.status(404).json({
                status_code: '404',
                status_message: `Transaction with Order ID / Trx ID ${orderIdOrTrxId} not found.`
            });
        }

        // If still pending, check live settlement
        if (tx.transaction_status === 'pending') {
            const now = Date.now();
            const expires = new Date(tx.expires_at).getTime();

            if (now > expires) {
                db.updateTransactionStatus(tx.transaction_id, 'expire');
                tx.transaction_status = 'expire';
            } else {
                const merchant = db.getMerchantByUserId(tenant.id);
                const result = await checkPaymentSettlement(tx, merchant);
                if (result.settled) {
                    db.updateTransactionStatus(tx.transaction_id, 'settlement', result.paid_at);
                    tx.transaction_status = 'settlement';
                    tx.paid_at = result.paid_at;

                    // Trigger Webhook
                    dispatchWebhook(tx, tenant, tenant);
                }
            }
        }

        const statusCode = tx.transaction_status === 'settlement' ? '200' : (tx.transaction_status === 'pending' ? '201' : '407');

        res.json({
            status_code: statusCode,
            status_message: `OpenQRIS transaction ${tx.transaction_status}`,
            transaction_id: tx.transaction_id,
            order_id: tx.order_id,
            merchant_id: tenant.client_key,
            gross_amount: Number(tx.gross_amount).toFixed(2),
            payment_type: 'qris',
            transaction_time: tx.created_at,
            transaction_status: tx.transaction_status,
            fraud_status: 'accept',
            settlement_time: tx.paid_at || null,
            expiry_time: tx.expires_at
        });

    } catch (err) {
        console.error('[OpenQRIS Status Check Error]:', err);
        res.status(500).json({ status_code: '500', status_message: err.message });
    }
};

app.get('/api/v1/status/:order_id', authenticateServerKey, statusHandler);
app.get('/v1/:order_id/status', authenticateServerKey, statusHandler);

// ----------------------------------------------------
// Embeddable Snap Popup Routes
// ----------------------------------------------------

// Serve checkout HTML page
app.get('/snap/pay/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// Serve Snap JS SDK
app.get('/snap/snap.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'snap.js'));
});
app.get('/snap.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'snap.js'));
});

// JSON details for the checkout page
app.get('/snap/data/:token', (req, res) => {
    const tx = db.findTransactionBySnapToken(req.params.token);
    if (!tx) {
        return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    const merchant = db.getMerchantByUserId(tx.user_id);
    const storeName = merchant?.store_name || 'OpenQRIS Merchant';

    res.json({
        success: true,
        data: {
            transaction_id: tx.transaction_id,
            order_id: tx.order_id,
            gross_amount: tx.gross_amount,
            qris_code: tx.qris_code,
            transaction_status: tx.transaction_status,
            store_name: storeName,
            expires_at: tx.expires_at,
            created_at: tx.created_at
        }
    });
});

// Polling endpoint from checkout UI
app.get('/snap/poll/:token', async (req, res) => {
    try {
        const tx = db.findTransactionBySnapToken(req.params.token);
        if (!tx) {
            return res.status(404).json({ status: 'not_found' });
        }

        if (tx.transaction_status === 'settlement') {
            return res.json({ status: 'settlement', paid_at: tx.paid_at });
        }

        const now = Date.now();
        const expires = new Date(tx.expires_at).getTime();
        if (now > expires) {
            db.updateTransactionStatus(tx.transaction_id, 'expire');
            return res.json({ status: 'expired' });
        }

        // Live check against GoBiz
        const user = db.findUserById(tx.user_id);
        const merchant = db.getMerchantByUserId(tx.user_id);
        const result = await checkPaymentSettlement(tx, merchant);

        if (result.settled) {
            db.updateTransactionStatus(tx.transaction_id, 'settlement', result.paid_at);
            tx.transaction_status = 'settlement';
            tx.paid_at = result.paid_at;

            // Trigger Webhook
            const apiKey = db.getApiKeysByUserId(tx.user_id)[0];
            dispatchWebhook(tx, user, apiKey);

            return res.json({ status: 'settlement', paid_at: result.paid_at, payer: result.payer_name });
        }

        return res.json({ status: 'pending' });

    } catch (err) {
        res.json({ status: 'pending', error: err.message });
    }
});

// ----------------------------------------------------
// Merchant Dashboard Authentication & API Endpoints
// ----------------------------------------------------

app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, name, whatsapp } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'Email, password, dan nama wajib diisi.' });
        }

        const existing = db.findUserByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
        }

        const user = db.createUser(email, password, name, whatsapp);
        const token = crypto.randomBytes(24).toString('hex');
        activeSessions.set(token, { userId: user.id });

        res.json({
            success: true,
            message: 'Registrasi berhasil! Selamat datang di OpenQRIS.',
            token,
            user
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/auth/login', rateLimitLogin, (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.findUserByEmail(email);
        if (!user) {
            if (req.loginRecord) req.loginRecord.count++;
            return res.status(401).json({ success: false, message: 'Email atau password salah.' });
        }

        const pwdHash = db.hashPassword(password);
        if (user.password_hash !== pwdHash) {
            if (req.loginRecord) req.loginRecord.count++;
            return res.status(401).json({ success: false, message: 'Email atau password salah.' });
        }

        if (req.clientIp) loginAttempts.delete(req.clientIp);

        const token = crypto.randomBytes(24).toString('hex');
        activeSessions.set(token, { userId: user.id });

        const safeUser = db.findUserById(user.id);
        res.json({
            success: true,
            message: 'Login berhasil.',
            token,
            user: safeUser
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Dashboard Overview Data
app.get('/api/dashboard/overview', authenticateDashboard, (req, res) => {
    const user = req.currentUser;
    const stats = db.getStats(user.id);
    const keys = db.getApiKeysByUserId(user.id);
    const merchant = db.getMerchantByUserId(user.id);
    const recentTx = db.getRecentTransactions(user.id, 10);

    res.json({
        success: true,
        data: {
            user,
            stats,
            keys,
            merchant,
            recentTransactions: recentTx
        }
    });
});

// Update Merchant BYOM Settings
app.post('/api/merchant/update', authenticateDashboard, (req, res) => {
    try {
        const user = req.currentUser;
        const { store_name, merchant_id, qris_static, session_json, mode } = req.body;

        db.updateMerchant(user.id, {
            store_name,
            merchant_id,
            qris_static,
            session_json,
            mode
        });

        res.json({ success: true, message: 'Pengaturan Merchant GoBiz berhasil diperbarui.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update Webhook URL (with SSRF defense)
app.post('/api/merchant/update-webhook', authenticateDashboard, (req, res) => {
    try {
        const user = req.currentUser;
        const { webhook_url } = req.body;

        if (webhook_url && !isSafeWebhookUrl(webhook_url)) {
            return res.status(400).json({
                success: false,
                message: 'URL Webhook dilarang: target tidak boleh mengarah ke IP internal/private, localhost, atau protokol non-HTTP.'
            });
        }

        db.updateWebhook(user.id, webhook_url);
        res.json({ success: true, message: 'Webhook URL berhasil disimpan.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Test Webhook Dispatcher
app.post('/api/merchant/test-webhook', authenticateDashboard, async (req, res) => {
    try {
        const user = req.currentUser;
        const keys = db.getApiKeysByUserId(user.id);
        const prodKey = keys.find(k => k.environment === 'production') || keys[0];

        if (!prodKey || !prodKey.webhook_url) {
            return res.status(400).json({ success: false, message: 'Belum ada Webhook URL yang disimpan.' });
        }

        const dummyTx = {
            transaction_id: 'OQ-TEST-' + Date.now(),
            order_id: 'ORDER-TEST-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
            gross_amount: 10000,
            transaction_status: 'settlement',
            created_at: new Date().toISOString(),
            paid_at: new Date().toISOString()
        };

        const success = await dispatchWebhook(dummyTx, user, prodKey);
        res.json({
            success,
            message: success ? 'Webhook uji coba berhasil diterima server Anda (200 OK)!' : 'Webhook dikirim namun server tujuan merespons error / timeout.'
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Transaction History
app.get('/api/transactions', authenticateDashboard, (req, res) => {
    const user = req.currentUser;
    const limit = parseInt(req.query.limit || 50, 10);
    const list = db.getRecentTransactions(user.id, limit);
    res.json({ success: true, data: list });
});

// ----------------------------------------------------
// Public Web Navigation Routes
// ----------------------------------------------------

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'OpenQRIS Payment Gateway',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 OpenQRIS Payment Gateway (Model A - BYOM) Ready!`);
    console.log(`📍 Listening on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Public URL: ${BASE_URL}`);
    console.log(`====================================================`);
});

process.on('uncaughtException', (err) => {
    console.error('[OpenQRIS UncaughtException]', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[OpenQRIS UnhandledRejection]', reason);
});

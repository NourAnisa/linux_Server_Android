const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'openqris.db');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & foreign keys for performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'merchant',
            plan TEXT DEFAULT 'free',
            plan_expires_at TEXT,
            whatsapp TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            store_name TEXT NOT NULL,
            merchant_id TEXT,
            qris_static TEXT,
            session_json TEXT,
            mode TEXT DEFAULT 'shared',
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            environment TEXT DEFAULT 'production',
            client_key TEXT UNIQUE NOT NULL,
            server_key TEXT UNIQUE NOT NULL,
            webhook_url TEXT,
            webhook_secret TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            merchant_id INTEGER,
            transaction_id TEXT UNIQUE NOT NULL,
            order_id TEXT NOT NULL,
            gross_amount INTEGER NOT NULL,
            unique_code INTEGER DEFAULT 0,
            total_amount INTEGER NOT NULL,
            payment_type TEXT DEFAULT 'qris',
            transaction_status TEXT DEFAULT 'pending',
            qris_code TEXT NOT NULL,
            snap_token TEXT UNIQUE NOT NULL,
            customer_name TEXT,
            customer_email TEXT,
            customer_phone TEXT,
            webhook_status TEXT DEFAULT 'pending',
            webhook_attempts INTEGER DEFAULT 0,
            paid_at TEXT,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS webhook_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT NOT NULL,
            url TEXT NOT NULL,
            payload TEXT NOT NULL,
            response_status INTEGER,
            response_body TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan TEXT NOT NULL,
            price INTEGER NOT NULL,
            payment_status TEXT DEFAULT 'pending',
            order_id TEXT UNIQUE,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // Seed default admin / demo merchant if not exists
    seedDefaultData();
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'OPENQRIS_SALT_2026').digest('hex');
}

function seedDefaultData() {
    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get('anisa@openqris.id');
    if (!checkUser) {
        const now = new Date().toISOString();
        const pwdHash = hashPassword('bansos123');

        // Insert Admin User
        const insertUser = db.prepare(`
            INSERT INTO users (email, password_hash, name, role, plan, whatsapp, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const userResult = insertUser.run(
            'anisa@openqris.id',
            pwdHash,
            'Bu Anisa (Noura Studio)',
            'admin',
            'enterprise',
            '085155133070',
            now
        );
        const userId = Number(userResult.lastInsertRowid);

        // Insert Default Merchant (Bit & Bean Coffee Master QRIS)
        const staticQRIS = '00020101021126670016ID.CO.GOPAY.WWW01189360091438902534570215G890253457813580303UME51440014ID.CO.QRIS.WWW0215ID10243455928170303UME5204581253033605802ID5917BIT & BEAN COFFEE6015KOTA BANJARMASIN61057012362070703A01630489CE';
        const insertMerchant = db.prepare(`
            INSERT INTO merchants (user_id, store_name, merchant_id, qris_static, mode, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertMerchant.run(
            userId,
            'Bit & Bean Coffee (Master Noura)',
            'G89025345781358',
            staticQRIS,
            'shared',
            'active',
            now
        );

        // Insert Sandbox & Production API Keys
        const insertKeys = db.prepare(`
            INSERT INTO api_keys (user_id, environment, client_key, server_key, webhook_url, webhook_secret, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        // Production Key
        insertKeys.run(
            userId,
            'production',
            'OQ-client-live-nouranisa',
            'OQ-server-live-nouranisa',
            'https://webhook.site/openqris-test',
            crypto.randomBytes(16).toString('hex'),
            now
        );

        // Sandbox Key
        insertKeys.run(
            userId,
            'sandbox',
            'OQ-client-sandbox-demo123',
            'OQ-server-sandbox-demo123',
            'https://webhook.site/openqris-test',
            crypto.randomBytes(16).toString('hex'),
            now
        );

        console.log('[OpenQRIS DB] Default admin, merchant, and API keys seeded.');
    }
}

// User Helpers
function findUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
    return db.prepare('SELECT id, email, name, role, plan, plan_expires_at, whatsapp, created_at FROM users WHERE id = ?').get(id);
}

function createUser(email, password, name, whatsapp = '') {
    const now = new Date().toISOString();
    const pwdHash = hashPassword(password);
    const insert = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, plan, whatsapp, created_at)
        VALUES (?, ?, ?, 'merchant', 'free', ?, ?)
    `);
    const res = insert.run(email, pwdHash, name, whatsapp, now);
    const userId = Number(res.lastInsertRowid);

    // Auto-generate API keys
    const clientKey = 'OQ-client-live-' + crypto.randomBytes(8).toString('hex');
    const serverKey = 'OQ-server-live-' + crypto.randomBytes(12).toString('hex');
    const webhookSecret = crypto.randomBytes(16).toString('hex');

    db.prepare(`
        INSERT INTO api_keys (user_id, environment, client_key, server_key, webhook_secret, created_at)
        VALUES (?, 'production', ?, ?, ?, ?)
    `).run(userId, clientKey, serverKey, webhookSecret, now);

    // Create default merchant entry
    db.prepare(`
        INSERT INTO merchants (user_id, store_name, mode, status, created_at)
        VALUES (?, ?, 'shared', 'active', ?)
    `).run(userId, name + ' Store', now);

    return findUserById(userId);
}

// Merchant & API Key Helpers
function getApiKeysByUserId(userId) {
    return db.prepare('SELECT * FROM api_keys WHERE user_id = ?').all(userId);
}

function findUserByServerKey(serverKey) {
    return db.prepare(`
        SELECT u.*, k.id as key_id, k.environment, k.client_key, k.server_key, k.webhook_url, k.webhook_secret
        FROM api_keys k
        JOIN users u ON u.id = k.user_id
        WHERE k.server_key = ?
    `).get(serverKey);
}

function findUserByClientKey(clientKey) {
    return db.prepare(`
        SELECT u.*, k.id as key_id, k.environment, k.client_key, k.server_key, k.webhook_url, k.webhook_secret
        FROM api_keys k
        JOIN users u ON u.id = k.user_id
        WHERE k.client_key = ?
    `).get(clientKey);
}

function getMerchantByUserId(userId) {
    return db.prepare('SELECT * FROM merchants WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(userId);
}

function updateMerchant(userId, { store_name, merchant_id, qris_static, session_json, mode }) {
    return db.prepare(`
        UPDATE merchants
        SET store_name = COALESCE(?, store_name),
            merchant_id = COALESCE(?, merchant_id),
            qris_static = COALESCE(?, qris_static),
            session_json = COALESCE(?, session_json),
            mode = COALESCE(?, mode)
        WHERE user_id = ?
    `).run(store_name, merchant_id, qris_static, session_json, mode, userId);
}

function updateWebhook(userId, webhook_url) {
    return db.prepare(`
        UPDATE api_keys
        SET webhook_url = ?
        WHERE user_id = ?
    `).run(webhook_url, userId);
}

// Transaction Helpers
function createTransaction(data) {
    const insert = db.prepare(`
        INSERT INTO transactions (
            user_id, merchant_id, transaction_id, order_id, gross_amount, unique_code, total_amount,
            payment_type, transaction_status, qris_code, snap_token, customer_name,
            customer_email, customer_phone, expires_at, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        )
    `);
    insert.run(
        data.user_id,
        data.merchant_id || null,
        data.transaction_id,
        data.order_id,
        data.gross_amount,
        data.unique_code || 0,
        data.total_amount,
        data.payment_type || 'qris',
        data.transaction_status || 'pending',
        data.qris_code,
        data.snap_token,
        data.customer_name || null,
        data.customer_email || null,
        data.customer_phone || null,
        data.expires_at,
        data.created_at
    );
    return findTransactionById(data.transaction_id);
}

function findTransactionById(transactionId) {
    return db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(transactionId);
}

function findTransactionByOrderId(userId, orderId) {
    return db.prepare('SELECT * FROM transactions WHERE user_id = ? AND order_id = ? ORDER BY id DESC LIMIT 1').get(userId, orderId);
}

function findTransactionBySnapToken(snapToken) {
    return db.prepare('SELECT * FROM transactions WHERE snap_token = ?').get(snapToken);
}

function updateTransactionStatus(transactionId, status, paidAt = null) {
    return db.prepare(`
        UPDATE transactions
        SET transaction_status = ?,
            paid_at = COALESCE(?, paid_at)
        WHERE transaction_id = ?
    `).run(status, paidAt, transactionId);
}

function getRecentTransactions(userId, limit = 20) {
    return db.prepare(`
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
    `).all(userId, limit);
}

function getStats(userId) {
    const totalVolume = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total_volume,
               COUNT(id) as total_trx,
               COALESCE(SUM(CASE WHEN transaction_status = 'settlement' THEN total_amount ELSE 0 END), 0) as settled_volume,
               COALESCE(SUM(CASE WHEN transaction_status = 'settlement' THEN 1 ELSE 0 END), 0) as settled_count,
               COALESCE(SUM(CASE WHEN transaction_status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count
        FROM transactions
        WHERE user_id = ?
    `).get(userId);

    return totalVolume;
}

module.exports = {
    db,
    initDatabase,
    hashPassword,
    findUserByEmail,
    findUserById,
    createUser,
    getApiKeysByUserId,
    findUserByServerKey,
    findUserByClientKey,
    getMerchantByUserId,
    updateMerchant,
    updateWebhook,
    createTransaction,
    findTransactionById,
    findTransactionByOrderId,
    findTransactionBySnapToken,
    updateTransactionStatus,
    getRecentTransactions,
    getStats
};

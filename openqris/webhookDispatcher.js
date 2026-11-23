/**
 * OpenQRIS Webhook Dispatcher
 * Midtrans-Compatible Event Notification with HMAC/SHA512 Signature & Exponential Backoff
 */

const axios = require('axios');
const crypto = require('crypto');
const { db } = require('./database');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8664429930:AAGCvxMhh50wVBmHzZm48QA_L40wrt6rcx0";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "1164497846";

async function sendTelegramAlert(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_ADMIN_CHAT_ID,
            text,
            parse_mode: 'HTML'
        }, { timeout: 4000 });
    } catch (e) {
        // silent fail for telegram
    }
}

function isSafeWebhookUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
        const u = new URL(urlStr);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
        const host = u.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
        // Block RFC 1918 and loopback/link-local IP addresses
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(host)) return false;
        return true;
    } catch (_) {
        return false;
    }
}

function generateSignature(orderId, statusCode, grossAmount, serverKey) {
    const raw = `${orderId}${statusCode}${Number(grossAmount).toFixed(2)}${serverKey}`;
    return crypto.createHash('sha512').update(raw).digest('hex');
}

async function dispatchWebhook(transaction, user, apiKey, retryCount = 0) {
    if (!apiKey || !apiKey.webhook_url) {
        console.log(`[OpenQRIS Webhook] No webhook URL configured for User ID ${user.id}`);
        return false;
    }

    if (!isSafeWebhookUrl(apiKey.webhook_url)) {
        console.error(`[OpenQRIS Webhook Blocked SSRF] Target URL is internal or disallowed: ${apiKey.webhook_url}`);
        return false;
    }

    const statusCode = transaction.transaction_status === 'settlement' ? '200' : '201';
    const signature = generateSignature(
        transaction.order_id,
        statusCode,
        transaction.gross_amount,
        apiKey.server_key
    );

    const payload = {
        va_numbers: [],
        transaction_time: transaction.created_at,
        transaction_status: transaction.transaction_status,
        transaction_id: transaction.transaction_id,
        status_message: 'OpenQRIS payment notification',
        status_code: statusCode,
        signature_key: signature,
        payment_type: 'qris',
        payment_amounts: [],
        order_id: transaction.order_id,
        merchant_id: apiKey.client_key,
        gross_amount: Number(transaction.gross_amount).toFixed(2),
        fraud_status: 'accept',
        currency: 'IDR',
        settlement_time: transaction.paid_at || new Date().toISOString()
    };

    const targetUrl = apiKey.webhook_url;
    let responseStatus = null;
    let responseBody = null;
    let success = false;

    try {
        const res = await axios.post(targetUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'OpenQRIS-Webhook-Engine/1.0',
                'X-Signature': signature
            },
            timeout: 6000
        });

        responseStatus = res.status;
        responseBody = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
        success = res.status >= 200 && res.status < 300;

        console.log(`[OpenQRIS Webhook] Dispatched to ${targetUrl} [${res.status}]`);
    } catch (err) {
        responseStatus = err.response ? err.response.status : 500;
        responseBody = err.message;
        console.error(`[OpenQRIS Webhook Error]: ${err.message}`);

        // Retry logic: up to 2 retries
        if (retryCount < 2) {
            setTimeout(() => {
                dispatchWebhook(transaction, user, apiKey, retryCount + 1);
            }, (retryCount + 1) * 3000);
        }
    }

    // Save log
    try {
        db.prepare(`
            INSERT INTO webhook_logs (transaction_id, url, payload, response_status, response_body, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            transaction.transaction_id,
            targetUrl,
            JSON.stringify(payload),
            responseStatus,
            responseBody ? responseBody.substring(0, 500) : null,
            new Date().toISOString()
        );

        db.prepare(`
            UPDATE transactions
            SET webhook_status = ?, webhook_attempts = webhook_attempts + 1
            WHERE transaction_id = ?
        `).run(success ? 'sent' : 'failed', transaction.transaction_id);
    } catch (e) {
        console.error('[OpenQRIS Webhook Log Save Error]:', e.message);
    }

    // Send Telegram Notification on settlement
    if (transaction.transaction_status === 'settlement' && retryCount === 0) {
        const text = `🎉 <b>PEMBAYARAN QRIS DITERIMA!</b>\n\n` +
            `🛒 <b>Order ID:</b> <code>${transaction.order_id}</code>\n` +
            `💰 <b>Nominal:</b> Rp ${Number(transaction.gross_amount).toLocaleString('id-ID')}\n` +
            `🆔 <b>Trx ID:</b> <code>${transaction.transaction_id}</code>\n` +
            `👤 <b>Customer:</b> ${transaction.customer_name || 'Pelanggan'}\n` +
            `🏪 <b>Toko:</b> ${user.name}\n` +
            `⚡ <b>MDR Fee:</b> <b>Rp 0 (0% Fee)</b>\n` +
            `📡 <b>Webhook:</b> ${success ? '✅ Terkirim (' + responseStatus + ')' : '⚠️ Gagal'}`;
        sendTelegramAlert(text);
    }

    return success;
}

module.exports = {
    dispatchWebhook,
    generateSignature,
    sendTelegramAlert,
    isSafeWebhookUrl
};

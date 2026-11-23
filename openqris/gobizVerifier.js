/**
 * OpenQRIS GoBiz Verifier
 * Multi-Tenant Transaction Settlement Engine (BYOM + Shared)
 */

const axios = require('axios');
const path = require('path');

const MASTER_GATEWAY_URL = process.env.MASTER_GATEWAY_URL || 'http://127.0.0.1:3005';
const MASTER_GATEWAY_KEY = process.env.MASTER_GATEWAY_KEY || 'openplag_gopay_bitnbean_2026_secret';
const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';

// Anti-duplicate settlement claim map
const claimedTransactions = new Map();

async function checkPaymentSettlement(transaction, merchant) {
    const targetAmount = parseInt(transaction.total_amount, 10);
    const startTimeISO = new Date(transaction.created_at).toISOString();
    const trxId = transaction.transaction_id;

    // Check if merchant has dedicated session (BYOM Model)
    let isDedicated = merchant && merchant.mode === 'dedicated' && merchant.session_json;

    if (isDedicated) {
        try {
            const session = JSON.parse(merchant.session_json);
            const headers = session.headers || {
                'Authorization': `Bearer ${session.access_token || session.token}`,
                'User-Agent': 'okhttp/4.9.0'
            };
            const merchantId = merchant.merchant_id || session.merchant_id;

            const response = await axios.get(GOJEK_TRANSACTIONS_URL, {
                headers,
                params: {
                    from: 0,
                    size: 20,
                    statuses: 'SETTLEMENT,CAPTURE',
                    payment_types: 'QRIS,GOPAY',
                    start_time: startTimeISO,
                    end_time: new Date().toISOString(),
                    merchant_ids: merchantId
                },
                timeout: 8000
            });

            const txList = response.data?.transactions || response.data?.data?.transactions || [];
            for (const tx of txList) {
                const txAmount = parseInt(tx.gross_amount || tx.real_gross_amount || tx.amount || 0, 10);
                const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;

                const isMatched = (txAmount === targetAmount) ||
                                  (txAmount === targetAmount * 100) ||
                                  (Math.round(txAmount / 100) === targetAmount);

                if (isMatched) {
                    if (claimedTransactions.has(txId) && claimedTransactions.get(txId) !== trxId) {
                        continue;
                    }
                    claimedTransactions.set(txId, trxId);
                    return {
                        settled: true,
                        paid_at: tx.transaction_time || tx.created_at || new Date().toISOString(),
                        tx_id: txId,
                        payer_name: tx.customer_name || tx.payer_name || 'Pelanggan GoPay'
                    };
                }
            }
            return { settled: false };
        } catch (err) {
            console.error('[OpenQRIS BYOM Verifier Error]:', err.message);
            // Fallback to shared gateway if dedicated failed
        }
    }

    // Shared Gateway Mode (via 127.0.0.1:3005)
    try {
        const response = await axios.get(`${MASTER_GATEWAY_URL}/check-payment`, {
            params: {
                amount: targetAmount,
                start_time: startTimeISO,
                trx_id: trxId
            },
            headers: {
                'x-api-key': MASTER_GATEWAY_KEY
            },
            timeout: 8000
        });

        if (response.data && response.data.paid) {
            return {
                settled: true,
                paid_at: response.data.transaction?.time || new Date().toISOString(),
                tx_id: response.data.transaction?.id || trxId,
                payer_name: response.data.transaction?.payer || 'Pelanggan QRIS'
            };
        }
    } catch (err) {
        console.error('[OpenQRIS Shared Gateway Verifier Error]:', err.message);
    }

    return { settled: false };
}

module.exports = {
    checkPaymentSettlement
};

/**
 * OpenQRIS EMVCo Engine
 * Parser & Generator QRIS Dinamis ISO 20022 / EMVCo Standar Bank Indonesia (ASPI)
 */

function calculateCRC16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseEMVCo(qrisString) {
    if (!qrisString) return null;
    let payload = qrisString.trim();

    // Remove old CRC Tag 63 if present at end
    const idx63 = payload.indexOf('6304');
    if (idx63 !== -1) {
        payload = payload.substring(0, idx63);
    }

    const tags = [];
    let i = 0;
    try {
        while (i < payload.length) {
            const tag = payload.substring(i, i + 2);
            const length = parseInt(payload.substring(i + 2, i + 4), 10);
            if (isNaN(length)) break;
            const val = payload.substring(i + 4, i + 4 + length);
            tags.push({ tag, val });
            i += 4 + length;
        }
    } catch (e) {
        return null;
    }
    return tags;
}

function generateDynamicQRIS(staticTemplate, amount) {
    if (!staticTemplate || !amount) return null;

    const tags = parseEMVCo(staticTemplate);
    if (!tags || tags.length === 0) return null;

    const amountStr = parseInt(amount, 10).toString();
    const newTags = [];
    let hasTag54 = false;

    for (const item of tags) {
        if (item.tag === '01') {
            // Ubah Static QR (11) menjadi Dynamic QR (12)
            newTags.push({ tag: '01', val: '12' });
        } else if (item.tag === '54') {
            // Nominal pembayaran
            newTags.push({ tag: '54', val: amountStr });
            hasTag54 = true;
        } else if (item.tag === '58' && !hasTag54) {
            // Tag 54 harus berada sebelum Tag 58 (Country Code)
            newTags.push({ tag: '54', val: amountStr });
            hasTag54 = true;
            newTags.push(item);
        } else {
            newTags.push(item);
        }
    }

    if (!hasTag54) {
        newTags.push({ tag: '54', val: amountStr });
    }

    let result = '';
    for (const item of newTags) {
        const lenStr = item.val.length.toString().padStart(2, '0');
        result += `${item.tag}${lenStr}${item.val}`;
    }

    result += '6304';
    const checksum = calculateCRC16(result);
    return result + checksum;
}

function getMerchantInfo(qrisString) {
    const tags = parseEMVCo(qrisString);
    if (!tags) return { merchantName: 'Merchant QRIS', city: 'Indonesia' };

    let merchantName = 'Merchant QRIS';
    let city = 'Indonesia';
    let postalCode = '';

    for (const t of tags) {
        if (t.tag === '59') merchantName = t.val;
        if (t.tag === '60') city = t.val;
        if (t.tag === '61') postalCode = t.val;
    }

    return { merchantName, city, postalCode };
}

module.exports = {
    calculateCRC16,
    parseEMVCo,
    generateDynamicQRIS,
    getMerchantInfo
};

import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode standard Base32 string to Buffer
 */
export function base32Decode(str: string): Buffer {
    const clean = str.replace(/=+$/, '').toUpperCase().replace(/[\s-]/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < clean.length; i++) {
        const idx = BASE32_CHARS.indexOf(clean[i]);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(output);
}

/**
 * Calculate expected 6-digit TOTP code for a secret at a counter offset
 * Standard RFC 6238 (HMAC-SHA1, 30-second time step)
 */
export function generateTOTPCode(secret: string, windowOffset = 0): string {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30) + windowOffset;

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const key = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
}

/**
 * Verify candidate 6-digit code against secret with a +/- window for clock skew
 */
export function verifyTOTPCode(secret: string, candidateCode: string, window = 1): boolean {
    if (!secret || !candidateCode) return false;
    const cleanCode = candidateCode.trim().replace(/\s+/g, '');
    for (let offset = -window; offset <= window; offset++) {
        const generated = generateTOTPCode(secret, offset);
        if (generated === cleanCode) return true;
    }
    return false;
}

import QRCode from 'qrcode';

/**
 * Standard RFC 3548 Base32 Alphabet
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret string (16 characters / 80 bits of entropy)
 */
export function generateBase32Secret(length = 16): string {
    const randomBytes = new Uint8Array(length);
    window.crypto.getRandomValues(randomBytes);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += BASE32_CHARS[randomBytes[i] % BASE32_CHARS.length];
    }
    return result;
}

/**
 * Decode Base32 string to Uint8Array
 */
export function base32Decode(str: string): Uint8Array {
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

    return new Uint8Array(output);
}

/**
 * Generate an RFC 6238 standard TOTP URI for Authenticator apps
 * (Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.)
 */
export function getTotpUri(issuer: string, account: string, secret: string): string {
    const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate a real, high-resolution scannable QR Code DataURL
 */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, {
        width: 240,
        margin: 2,
        color: {
            dark: '#0F172A',
            light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
    });
}

/**
 * Calculate the expected 6-digit TOTP code for a given secret at time offset window
 * Standard RFC 6238 / RFC 4226 implementation using Web Crypto API (HMAC-SHA1)
 */
export async function generateCurrentTOTP(secret: string, windowOffset = 0): Promise<string> {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30) + windowOffset;

    // 8-byte big-endian counter
    const counterBytes = new Uint8Array(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
        counterBytes[i] = tmp & 0xff;
        tmp = Math.floor(tmp / 256);
    }

    const keyBytes = base32Decode(secret);
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes.buffer as ArrayBuffer,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBytes.buffer as ArrayBuffer);
    const hmac = new Uint8Array(signature);

    // Dynamic truncation
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
 * Verify user code against TOTP secret with drift tolerance window [-1, 0, +1] (90 seconds)
 */
export async function verifyTOTPCode(secret: string, userCode: string): Promise<boolean> {
    const clean = userCode.trim().replace(/\s/g, '');
    if (clean.length !== 6) return false;

    // Check current window and +/- 1 window (for slight clock drift)
    for (const offset of [0, -1, 1]) {
        try {
            const expected = await generateCurrentTOTP(secret, offset);
            if (expected === clean) {
                return true;
            }
        } catch (e) {
            console.error('Error verifying TOTP code:', e);
        }
    }
    return false;
}

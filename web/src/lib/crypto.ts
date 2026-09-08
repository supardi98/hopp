/**
 * End-to-End Encryption (E2EE) Module using Web Crypto API (AES-256-GCM)
 */

// Helper to check if Web Crypto API subtle is supported in current environment
export function isSubtleCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.crypto) && Boolean(window.crypto.subtle);
}

// Generate a random secret key string
export function generateSecretKey(): string {
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Generate a friendly 6-character room sync code e.g. HOPP-7891
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HOPP-${code}`;
}

// Derive CryptoKey from user passphrase
async function deriveKey(secretKey: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext -> Base64 string containing salt + IV + ciphertext
export async function encryptContent(plaintext: string, secretKey: string, roomCode?: string): Promise<string> {
  if (!plaintext) return '';

  // Fallback for non-secure HTTP context where Web Crypto API subtle is disabled by browser
  if (!isSubtleCryptoAvailable()) {
    console.warn('[Web Crypto] crypto.subtle is disabled on non-secure HTTP origin. Sending plaintext.');
    return plaintext;
  }

  try {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cleanKey = (secretKey || '').trim().toUpperCase();
    const cleanRoom = roomCode ? roomCode.trim().toUpperCase() : '';
    const effectivePassphrase = cleanRoom ? `${cleanKey}_${cleanRoom}` : cleanKey;
    const key = await deriveKey(effectivePassphrase, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    // Buffer structure: [16 bytes salt][12 bytes iv][ciphertext]
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    return plaintext;
  }
}

// Decrypt Base64 string -> plaintext
export async function decryptContent(encryptedBase64: string, secretKey: string, roomCode?: string): Promise<string> {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return encryptedBase64 || '';

  // Safely decode Base64 string
  let binary: string;
  try {
    binary = atob(encryptedBase64.trim());
  } catch (err) {
    // If not a valid Base64 string, return raw content directly
    return encryptedBase64;
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Must have at least 16 (salt) + 12 (iv) = 28 bytes
  if (bytes.length < 28) {
    return encryptedBase64;
  }

  // Fallback for non-secure HTTP context where Web Crypto API subtle is disabled by browser
  if (!isSubtleCryptoAvailable()) {
    return '[Membuka via HTTP - Membutuhkan HTTPS / Localhost untuk Dekripsi E2EE]';
  }

  try {
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ciphertext = bytes.slice(28);

    const cleanKey = (secretKey || '').trim().toUpperCase();
    const cleanRoom = roomCode ? roomCode.trim().toUpperCase() : '';
    const effectivePassphrase = cleanRoom ? `${cleanKey}_${cleanRoom}` : cleanKey;
    const key = await deriveKey(effectivePassphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // Mismatch expected when keys don't match; silent fallback
    return '[Encrypted content - Secret Key / Room mismatch]';
  }
}

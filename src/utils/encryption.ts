import CryptoJS from 'crypto-js';

/**
 * A static key for obfuscation at rest.
 * ⚠️ SECURITY WARNING: In a production environment, this key MUST be unique and
 * stored securely in an environment variable. Using a hardcoded fallback is
 * only intended for development/preview environments.
 */
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'noosphere-architect-fallback-dev-key-2026';

export const encryptData = (data: string): string => {
  if (!data) return '';
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Failed to decrypt data', error);
    return '';
  }
};

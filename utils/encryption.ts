import CryptoJS from 'crypto-js';

// A static key for obfuscation at rest. In a real-world scenario, 
// this should be derived from a user password or a more secure mechanism.
const SECRET_KEY = 'noosphere-architect-secure-key-2026';

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

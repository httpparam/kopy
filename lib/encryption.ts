import CryptoJS from 'crypto-js'

// Generate a random encryption key
export function generateKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString()
}

// Encrypt text with a key
export function encrypt(text: string, key: string): string {
  return CryptoJS.AES.encrypt(text, key).toString()
}

// Decrypt text with a key
export function decrypt(encryptedText: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Generate a unique ID for the paste
export function generatePasteId(): string {
  return CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Hex)
}

// Hash a password using SHA-256
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

// Verify a password against its hash
export function verifyPassword(password: string, hash: string): boolean {
  return CryptoJS.SHA256(password).toString() === hash
}

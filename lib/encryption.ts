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
  // Validate inputs
  if (!encryptedText || !key) {
    throw new Error('Invalid decryption parameters')
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    
    // Validate decryption result
    if (!decrypted || decrypted.length === 0) {
      throw new Error('Decryption failed - invalid key or corrupted data')
    }
    
    return decrypted
  } catch (error) {
    // Re-throw with generic message to prevent information leakage
    throw new Error('Decryption failed')
  }
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

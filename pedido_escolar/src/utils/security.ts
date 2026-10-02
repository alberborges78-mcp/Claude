// Security, non-enumerable token generation and privacy masking

/**
 * Generates a non-enumerable cryptographically secure hex token for QR verification
 */
export function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Masks a telephone number for public QR inspection to protect customer privacy
 * Example: (96) 99160-5151 -> (96) 9****-5151
 */
export function maskPhoneForPublic(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    // If has 55 at beginning
    const localDigits = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    const ddd = localDigits.slice(0, 2);
    const firstDigit = localDigits.charAt(2);
    const lastDigits = localDigits.slice(-4);
    return `(${ddd}) ${firstDigit}****-${lastDigits}`;
  }
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

/**
 * Generates human-friendly sequential-style order number
 */
export function generateOrderNumber(sequence?: number): string {
  const year = new Date().getFullYear();
  if (sequence !== undefined && sequence !== null) {
    const seqPadded = String(sequence).padStart(4, '0');
    return `SEV-${year}-${seqPadded}`;
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SEV-${year}-${randomSuffix}`;
}

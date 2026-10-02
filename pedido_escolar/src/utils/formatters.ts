// Formatting utilities for currency, dates, and Brazilian phone numbers

export function formatCurrency(cents: number): string {
  if (isNaN(cents)) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '--/--/----';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '--/--/---- --:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Normalizes any Brazilian phone number into E.164 format: +5596991605151
 */
export function normalizePhoneE164(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return '';

  // If already starts with 55 and has 12 or 13 digits
  if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
    return `+${digitsOnly}`;
  }

  // If standard 10 or 11 digits without country code (e.g. 96991605151 or 9691605151)
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

/**
 * Validates whether a phone number is a valid Brazilian cell phone (11 digits with DDD)
 */
export function validateBrazilianPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handled with 55 prefix (13 digits: 55 + 2 DDD + 9 digits)
  if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
    const ddd = parseInt(digitsOnly.substring(2, 4), 10);
    const ninthDigit = digitsOnly.charAt(4);
    return ddd >= 11 && ddd <= 99 && (ninthDigit === '9' || ninthDigit === '8');
  }

  // Handled without country code (10 or 11 digits: 2 DDD + 8/9 digits)
  if (digitsOnly.length === 11) {
    const ddd = parseInt(digitsOnly.substring(0, 2), 10);
    const ninthDigit = digitsOnly.charAt(2);
    return ddd >= 11 && ddd <= 99 && (ninthDigit === '9' || ninthDigit === '8');
  }

  if (digitsOnly.length === 10) {
    const ddd = parseInt(digitsOnly.substring(0, 2), 10);
    return ddd >= 11 && ddd <= 99;
  }

  return false;
}

/**
 * Formats a raw or E.164 phone number for visual display, e.g. +55 (96) 99160-5151 or (96) 99160-5151
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.substring(2, 4);
    const part1 = digits.substring(4, 9);
    const part2 = digits.substring(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  }

  if (digits.length === 11) {
    const ddd = digits.substring(0, 2);
    const part1 = digits.substring(2, 7);
    const part2 = digits.substring(7, 11);
    return `(${ddd}) ${part1}-${part2}`;
  }

  if (digits.length === 10) {
    const ddd = digits.substring(0, 2);
    const part1 = digits.substring(2, 6);
    const part2 = digits.substring(6, 10);
    return `(${ddd}) ${part1}-${part2}`;
  }

  return phone;
}

/**
 * Mask Brazilian phone input in real time as user types
 */
export function maskPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

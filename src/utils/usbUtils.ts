/**
 * Helper utilities for Hex formatting, ASCII parsing, and USB descriptor processing
 */

export const KNOWN_VENDORS: Record<number, string> = {
  0x3344: 'WCH 沁恒 (CH554 Bulk Vendor Device)',
  0x1a86: 'WCH 沁恒 (CH340/CH341/CH55x)',
  0x0483: 'STMicroelectronics (STM32 USB / DFU)',
  0x2341: 'Arduino SA',
  0x303a: 'Espressif Systems (ESP32-S2/S3/C3 USB)',
  0x2e8a: 'Raspberry Pi Ltd (RP2040 / Pico)',
  0x0403: 'FTDI (Future Technology Devices)',
  0x10c4: 'Silicon Labs (CP2102/CP2104)',
  0x057e: 'Nintendo Co., Ltd.',
  0x054c: 'Sony Corp.',
  0x045e: 'Microsoft Corp.',
  0x046d: 'Logitech, Inc.',
  0x0b05: 'ASUSTek Computer Inc.',
  0x18d1: 'Google LLC (Android ADB / Fastboot)',
};

/**
 * Clean and convert a Hex string into Uint8Array
 * Accepts formats: "01 02 03", "0x01, 0x02", "01020304", "01,02,03"
 */
export function hexToUint8Array(hexStr: string): Uint8Array {
  if (!hexStr) return new Uint8Array(0);
  
  // Strip 0x prefixes, commas, brackets, spaces
  const cleaned = hexStr
    .replace(/0x/gi, '')
    .replace(/[,;\[\]\s]/g, '')
    .trim();

  if (cleaned.length % 2 !== 0) {
    // If odd length, append 0 to last byte
    const formatted = cleaned.slice(0, -1) + '0' + cleaned.slice(-1);
    const bytes = new Uint8Array(formatted.length / 2);
    for (let i = 0; i < formatted.length; i += 2) {
      bytes[i / 2] = parseInt(formatted.substring(i, i + 2), 16) || 0;
    }
    return bytes;
  }

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16) || 0;
  }
  return bytes;
}

/**
 * Convert Uint8Array to Hex string with spacing
 */
export function bytesToHexString(bytes: Uint8Array, uppercase = true): string {
  if (!bytes || bytes.length === 0) return '';
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
  return uppercase ? hex.toUpperCase() : hex;
}

/**
 * Convert Uint8Array to ASCII string (replacing non-printable characters with dots)
 */
export function bytesToAsciiString(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) return '';
  return Array.from(bytes)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');
}

/**
 * Format Hex and ASCII side by side
 */
export function formatHexAndAscii(bytes: Uint8Array): string {
  const hex = bytesToHexString(bytes);
  const ascii = bytesToAsciiString(bytes);
  return `${hex}  [${ascii}]`;
}

/**
 * Pad Uint8Array to specific packet length
 */
export function padByteArray(
  bytes: Uint8Array,
  targetLength: number,
  fillValue = 0x00
): Uint8Array {
  if (bytes.length >= targetLength) return bytes;
  const padded = new Uint8Array(targetLength);
  padded.set(bytes);
  if (fillValue !== 0x00) {
    padded.fill(fillValue, bytes.length);
  }
  return padded;
}

/**
 * Convert string to Uint8Array (UTF-8)
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert number to Hex string e.g. 0x3344 -> "0x3344"
 */
export function toHex4(val?: number): string {
  if (val === undefined || val === null) return '0x0000';
  return '0x' + val.toString(16).padStart(4, '0').toUpperCase();
}

/**
 * Convert number to Hex byte string e.g. 0x02 -> "0x02"
 */
export function toHex2(val?: number): string {
  if (val === undefined || val === null) return '0x00';
  return '0x' + val.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Vendor lookup
 */
export function getVendorName(vid?: number, fallbackVendorName?: string): string {
  if (!vid) return fallbackVendorName || '未知厂商';
  if (KNOWN_VENDORS[vid]) return KNOWN_VENDORS[vid];
  if (fallbackVendorName) return `${fallbackVendorName} (${toHex4(vid)})`;
  return `Vendor ID: ${toHex4(vid)}`;
}

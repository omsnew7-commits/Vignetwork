/**
 * Vigenère Secret Network - Cryptographic Engine
 * Supports ASCII range 32-126 (95 characters)
 */

export const CHAR_MIN = 32;
export const CHAR_MAX = 126;
export const RANGE = CHAR_MAX - CHAR_MIN + 1;

export enum CipherType {
  HYBRID = 'HYBRID',
  ATBASH = 'ATBASH',
  REVERSE = 'REVERSE',
  BASE64 = 'BASE64',
  MORSE = 'MORSE',
  ROT13 = 'ROT13',
  RAILFENCE = 'RAILFENCE',
  VIGENERE = 'VIGENERE',
  CAESAR = 'CAESAR',
  BACONIAN = 'BACONIAN',
}

const BACON_MAP: Record<string, string> = {
  'A': 'aaaaa', 'B': 'aaaab', 'C': 'aaaba', 'D': 'aaabb', 'E': 'aabaa',
  'F': 'aabab', 'G': 'aabba', 'H': 'aabbb', 'I': 'abaaa', 'J': 'abaab',
  'K': 'ababa', 'L': 'ababb', 'M': 'abbaa', 'N': 'abbab', 'O': 'abbba',
  'P': 'abbbb', 'Q': 'baaaa', 'R': 'baaab', 'S': 'baaba', 'T': 'baabb',
  'U': 'babaa', 'V': 'babab', 'W': 'babba', 'X': 'babbb', 'Y': 'bbaaa',
  'Z': 'bbaab'
};

const REVERSE_BACON_MAP = Object.fromEntries(
  Object.entries(BACON_MAP).map(([k, v]) => [v, k])
);

const MORSE_MAP: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.', '0': '-----', ' ': '/'
};

const REVERSE_MORSE_MAP = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
);

export const Cipher = {
  /**
   * Caesar cipher for ASCII range 32-126
   */
  caesar: (text: string, shift: number, decrypt = false): string => {
    let res = "";
    const offset = decrypt ? (RANGE - (shift % RANGE)) % RANGE : shift % RANGE;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c >= CHAR_MIN && c <= CHAR_MAX) {
        res += String.fromCharCode(((c - CHAR_MIN + offset) % RANGE) + CHAR_MIN);
      } else {
        res += text.charAt(i);
      }
    }
    return res;
  },

  /**
   * Vigenère cipher for ASCII range 32-126
   */
  vigenere: (text: string, key: string, decrypt = false): string => {
    if (!key) return text;
    let res = "";
    const kStr = key.toUpperCase();
    for (let i = 0, j = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c >= CHAR_MIN && c <= CHAR_MAX) {
        const k = kStr.charCodeAt(j % kStr.length) - CHAR_MIN;
        const shift = decrypt ? (RANGE - (k % RANGE)) % RANGE : k % RANGE;
        res += String.fromCharCode(((c - CHAR_MIN + shift) % RANGE) + CHAR_MIN);
        j++;
      } else {
        res += text.charAt(i);
      }
    }
    return res;
  },

  atbash: (text: string): string => {
    let res = "";
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c >= 65 && c <= 90) res += String.fromCharCode(155 - c); // A-Z
      else if (c >= 97 && c <= 122) res += String.fromCharCode(219 - c); // a-z
      else res += text.charAt(i);
    }
    return res;
  },

  reverse: (text: string): string => text.split('').reverse().join(''),

  base64: (text: string, decrypt = false): string => {
    try {
      return decrypt ? atob(text) : btoa(text);
    } catch (e) {
      return text;
    }
  },

  morse: (text: string, decrypt = false): string => {
    if (decrypt) {
      return text.split(' ').map(symbol => REVERSE_MORSE_MAP[symbol] || symbol).join('');
    } else {
      return text.toUpperCase().split('').map(char => MORSE_MAP[char] || char).join(' ');
    }
  },

  rot13: (text: string): string => {
    return text.replace(/[a-zA-Z]/g, (c: string) => {
      const b = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(b + (c.charCodeAt(0) - b + 13) % 26);
    });
  },

  baconian: (text: string, decrypt = false): string => {
    if (decrypt) {
      // Remove spaces and non-a/b chars for processing
      const clean = text.toLowerCase().replace(/[^ab]/g, '');
      let res = "";
      for (let i = 0; i < clean.length; i += 5) {
        const chunk = clean.substring(i, i + 5);
        if (chunk.length === 5) {
          res += REVERSE_BACON_MAP[chunk] || '?';
        }
      }
      return res;
    } else {
      return text.toUpperCase().replace(/[^A-Z ]/g, '').split('').map(char => {
        if (char === ' ') return ' ';
        return BACON_MAP[char] || char;
      }).join(' ');
    }
  },

  railfence: (text: string, rails = 3, decrypt = false): string => {
    if (!text || rails <= 1) return text;
    
    if (!decrypt) {
      const fence: string[][] = Array.from({ length: rails }, () => []);
      let rail = 0;
      let direction = 1;
      
      for (const char of text) {
        fence[rail].push(char);
        rail += direction;
        if (rail === 0 || rail === rails - 1) direction *= -1;
      }
      
      return fence.flat().join('');
    } else {
      // Basic 3-rail decryption
      const cycle = 2 * (rails - 1);
      const res = new Array(text.length);
      let idx = 0;
      for (let r = 0; r < rails; r++) {
        for (let j = 0; j + r < text.length; j += cycle) {
          res[j + r] = text[idx++];
          if (r !== 0 && r !== rails - 1 && j + cycle - r < text.length) {
            res[j + cycle - r] = text[idx++];
          }
        }
      }
      return res.join('');
    }
  },

  encrypt: (text: string, key: string, shift: number, type: CipherType = CipherType.HYBRID): string => {
    switch (type) {
      case CipherType.ATBASH: return Cipher.atbash(text);
      case CipherType.REVERSE: return Cipher.reverse(text);
      case CipherType.BASE64: return Cipher.base64(text, false);
      case CipherType.MORSE: return Cipher.morse(text, false);
      case CipherType.ROT13: return Cipher.rot13(text);
      case CipherType.RAILFENCE: return Cipher.railfence(text, 3, false);
      case CipherType.VIGENERE: return Cipher.vigenere(text, key, false);
      case CipherType.CAESAR: return Cipher.caesar(text, shift, false);
      case CipherType.BACONIAN: return Cipher.baconian(text, false);
      default:
        const step1 = Cipher.vigenere(text, key, false);
        return Cipher.caesar(step1, shift, false);
    }
  },

  decrypt: (text: string, key: string, shift: number, type: CipherType = CipherType.HYBRID): string => {
    switch (type) {
      case CipherType.ATBASH: return Cipher.atbash(text);
      case CipherType.REVERSE: return Cipher.reverse(text);
      case CipherType.BASE64: return Cipher.base64(text, true);
      case CipherType.MORSE: return Cipher.morse(text, true);
      case CipherType.ROT13: return Cipher.rot13(text);
      case CipherType.RAILFENCE: return Cipher.railfence(text, 3, true);
      case CipherType.VIGENERE: return Cipher.vigenere(text, key, true);
      case CipherType.CAESAR: return Cipher.caesar(text, shift, true);
      case CipherType.BACONIAN: return Cipher.baconian(text, true);
      default:
        const step1 = Cipher.caesar(text, shift, true);
        return Cipher.vigenere(step1, key, true);
    }
  },
};

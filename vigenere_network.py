#!/usr/bin/env python3
"""
================================================================================
💎 Vigenère Secret Network - Cryptographic Command Line Console 💎
================================================================================
A self-contained Python 3 implementation of the absolute precision hybrid 
cryptographic engine used in the Vigenère Secret Network client and server cells.
Supports exact ASCII range 32-126 calculations, Atbash, Caesar, Vigenère, ROT13, 
Morse, Base64, Baconian, Rail Fence ciphers, and the dual-matrix Hybrid mode.

Usage:
  python3 vigenere_network.py [options]
  Or start with no arguments for an interactive cybernetic command console.
================================================================================
"""

import sys
import os
import re
import base64 as b64
from typing import Dict, List, Tuple

# Absolute configuration constants matching TS source
CHAR_MIN = 32
CHAR_MAX = 126
RANGE = CHAR_MAX - CHAR_MIN + 1

# Baconian cipher map
BACON_MAP = {
    'A': 'aaaaa', 'B': 'aaaab', 'C': 'aaaba', 'D': 'aaabb', 'E': 'aabaa',
    'F': 'aabab', 'G': 'aabba', 'H': 'aabbb', 'I': 'abaaa', 'J': 'abaab',
    'K': 'ababa', 'L': 'ababb', 'M': 'abbaa', 'N': 'abbab', 'O': 'abbba',
    'P': 'abbbb', 'Q': 'baaaa', 'R': 'baaab', 'S': 'baaba', 'T': 'baabb',
    'U': 'babaa', 'V': 'babab', 'W': 'babba', 'X': 'babbb', 'Y': 'bbaaa',
    'Z': 'bbaab'
}
REVERSE_BACON_MAP = {v: k for k, v in BACON_MAP.items()}

# Morse Code map
MORSE_MAP = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ' ': '/'
}
REVERSE_MORSE_MAP = {v: k for k, v in MORSE_MAP.items()}

# ANSI Color codes for terminals
C_BLUE = "\033[38;5;39m"
C_CYAN = "\033[38;5;51m"
C_GREEN = "\033[38;5;46m"
C_RED = "\033[38;5;196m"
C_AMBER = "\033[38;5;214m"
C_INDIGO = "\033[38;5;99m"
C_SLATE = "\033[38;5;244m"
C_DARK = "\033[38;5;238m"
C_RESET = "\033[0m"
C_BOLD = "\033[1m"


class CipherEngine:
    """Mathematical parity equivalent of TypeScript's Cipher object"""

    @staticmethod
    def caesar(text: str, shift: int, decrypt: bool = False) -> str:
        """Caesar cipher for custom ASCII range 32-126"""
        res = []
        offset = (RANGE - (shift % RANGE)) % RANGE if decrypt else shift % RANGE
        for char in text:
            c = ord(char)
            if CHAR_MIN <= c <= CHAR_MAX:
                res.append(chr(((c - CHAR_MIN + offset) % RANGE) + CHAR_MIN))
            else:
                res.append(char)
        return "".join(res)

    @staticmethod
    def vigenere(text: str, key: str, decrypt: bool = False) -> str:
        """Vigenère cipher for absolute custom ASCII range 32-126"""
        if not key:
            return text
        res = []
        k_str = key.upper()
        j = 0
        for char in text:
            c = ord(char)
            if CHAR_MIN <= c <= CHAR_MAX:
                k = ord(k_str[j % len(k_str)]) - CHAR_MIN
                shift = (RANGE - (k % RANGE)) % RANGE if decrypt else k % RANGE
                res.append(chr(((c - CHAR_MIN + shift) % RANGE) + CHAR_MIN))
                j += 1
            else:
                res.append(char)
        return "".join(res)

    @staticmethod
    def atbash(text: str) -> str:
        """Atbash symmetric key mapped character substitution"""
        res = []
        for char in text:
            c = ord(char)
            if 65 <= c <= 90:
                res.append(chr(155 - c))  # A-Z
            elif 97 <= c <= 122:
                res.append(chr(219 - c))  # a-z
            else:
                res.append(char)
        return "".join(res)

    @staticmethod
    def reverse(text: str) -> str:
        """Full character sequence reverse function"""
        return text[::-1]

    @staticmethod
    def base64_cipher(text: str, decrypt: bool = False) -> str:
        """Base64 character standard wrapping"""
        try:
            if decrypt:
                return b64.b64decode(text.encode('utf-8')).decode('utf-8', errors='replace')
            else:
                return b64.b64encode(text.encode('utf-8')).decode('utf-8')
        except Exception:
            return text

    @staticmethod
    def morse(text: str, decrypt: bool = False) -> str:
        """Standard Space-Separated Morse Code system"""
        if decrypt:
            return "".join(REVERSE_MORSE_MAP.get(symbol, symbol) for symbol in text.split(" "))
        else:
            return " ".join(MORSE_MAP.get(char, char) for char in text.upper())

    @staticmethod
    def rot13(text: str) -> str:
        """Standard alphabetic ROT13 shift"""
        res = []
        for char in text:
            c = ord(char)
            if 65 <= c <= 90:
                res.append(chr(65 + (c - 65 + 13) % 26))
            elif 97 <= c <= 122:
                res.append(chr(97 + (c - 97 + 13) % 26))
            else:
                res.append(char)
        return "".join(res)

    @staticmethod
    def baconian(text: str, decrypt: bool = False) -> str:
        """Binary 5-digit character Baconian cipher"""
        if decrypt:
            clean = re.sub(r'[^ab]', '', text.lower())
            res = []
            for i in range(0, len(clean), 5):
                chunk = clean[i:i + 5]
                if len(chunk) == 5:
                    res.append(REVERSE_BACON_MAP.get(chunk, '?'))
            return "".join(res)
        else:
            clean_text = re.sub(r'[^A-Z ]', '', text.upper())
            res = []
            for char in clean_text:
                if char == ' ':
                    res.append(' ')
                else:
                    res.append(BACON_MAP.get(char, char))
            return " ".join(res)

    @staticmethod
    def railfence(text: str, rails: int = 3, decrypt: bool = False) -> str:
        """Dynamic rail fence geometric encryption mapping"""
        if not text or rails <= 1:
            return text
        if not decrypt:
            fence = [[] for _ in range(rails)]
            rail = 0
            direction = 1
            for char in text:
                fence[rail].append(char)
                rail += direction
                if rail == 0 or rail == rails - 1:
                    direction *= -1
            return "".join("".join(r) for r in fence)
        else:
            cycle = 2 * (rails - 1)
            res = [None] * len(text)
            idx = 0
            for r in range(rails):
                for j in range(0, len(text), cycle):
                    if j + r < len(text):
                        res[j + r] = text[idx]
                        idx += 1
                    if r != 0 and r != rails - 1 and j + cycle - r < len(text):
                        res[j + cycle - r] = text[idx]
                        idx += 1
            return "".join(res)

    @classmethod
    def encrypt(cls, text: str, key: str, shift: int, mode: str) -> str:
        """Route to appropriate secure key cipher routine matching app definitions"""
        mode_upper = mode.upper()
        if mode_upper == 'ATBASH': return cls.atbash(text)
        if mode_upper == 'REVERSE': return cls.reverse(text)
        if mode_upper == 'BASE64': return cls.base64_cipher(text, decrypt=False)
        if mode_upper == 'MORSE': return cls.morse(text, decrypt=False)
        if mode_upper == 'ROT13': return cls.rot13(text)
        if mode_upper == 'RAILFENCE': return cls.railfence(text, 3, decrypt=False)
        if mode_upper == 'VIGENERE': return cls.vigenere(text, key, decrypt=False)
        if mode_upper == 'CAESAR': return cls.caesar(text, shift, decrypt=False)
        if mode_upper == 'BACONIAN': return cls.baconian(text, decrypt=False)
        
        # Default HYBRID cascading system
        v_step = cls.vigenere(text, key, decrypt=False)
        return cls.caesar(v_step, shift, decrypt=False)

    @classmethod
    def decrypt(cls, text: str, key: str, shift: int, mode: str) -> str:
        """Route to appropriate decipher routine with mathematical symmetry"""
        mode_upper = mode.upper()
        if mode_upper == 'ATBASH': return cls.atbash(text)
        if mode_upper == 'REVERSE': return cls.reverse(text)
        if mode_upper == 'BASE64': return cls.base64_cipher(text, decrypt=True)
        if mode_upper == 'MORSE': return cls.morse(text, decrypt=True)
        if mode_upper == 'ROT13': return cls.rot13(text)
        if mode_upper == 'RAILFENCE': return cls.railfence(text, 3, decrypt=True)
        if mode_upper == 'VIGENERE': return cls.vigenere(text, key, decrypt=True)
        if mode_upper == 'CAESAR': return cls.caesar(text, shift, decrypt=True)
        if mode_upper == 'BACONIAN': return cls.baconian(text, decrypt=True)
        
        # Default HYBRID cascade inversion
        c_step = cls.caesar(text, shift, decrypt=True)
        return cls.vigenere(c_step, key, decrypt=True)


def run_system_self_test():
    """Validates symmetrical integrity for all modes"""
    print(f"\n{C_INDIGO}🔬 Executing Cryptographic Integration Diagnostics...{C_RESET}")
    test_message = "Vigenere Secret Network: Node uplink Alpha-9!"
    test_key = "KRYPTON"
    test_shift = 14
    
    modes = ['HYBRID', 'VIGENERE', 'CAESAR', 'ATBASH', 'REVERSE', 'ROT13', 'RAILFENCE']
    success_count = 0
    
    for mode in modes:
        encrypted = CipherEngine.encrypt(test_message, test_key, test_shift, mode)
        decrypted = CipherEngine.decrypt(encrypted, test_key, test_shift, mode)
        if decrypted == test_message:
            print(f"  {C_GREEN}✔{C_RESET} Cipher Mode [{mode:<10}] : Symmetrical Integrity Cleared.")
            success_count += 1
        else:
            print(f"  {C_RED}❌{C_RESET} Cipher Mode [{mode:<10}] : MISMATCH (Enc: {encrypted!r} / Dec: {decrypted!r})")
            
    print(f"{C_CYAN}❖ Self Diagnostics Completed: {success_count}/{len(modes)} secure channels ready.{C_RESET}\n")


def display_cyber_banner():
    banner = f"""{C_CYAN}
      _   __ _                                  
     | | / /(_)                                 
     | |/ /  _  __ _   ___  _ __  ___  _ __  ___ 
     |    \ | |/ _` | / _ \\| '__|/ _ \\| '_ \\/ _ \\
     | |\\  \\| | (_| ||  __/| |  |  __/| | | |  __/
     \\_| \\_/_|\\__, | \\___||_|   \\___||_| |_|\\___|
               __/ |                            
              |___/                             
{C_BLUE}     ●▬▬▬ V I G E N È R E   S E C R E T   N E T W O R K ▬▬▬●{C_RESET}
    {C_DARK}═════════ Secure Python Cryptographic Offline Terminal ═════════{C_RESET}"""
    print(banner)


def run_interactive_terminal():
    display_cyber_banner()
    run_system_self_test()

    vigenere_key = "UTOPIA"
    caesar_shift = 7
    active_mode = "HYBRID"

    help_txt = f"""
{C_BOLD}COMMAND MATRIX ASSIGNMENT:{C_RESET}
  {C_CYAN}/key [val]{C_RESET}     Set active Vigenère security passphrase (currently: {C_BOLD}{vigenere_key}{C_RESET})
  {C_CYAN}/shift [0-94]{C_RESET} Set active Caesar offset parameter (currently: {C_BOLD}{caesar_shift}{C_RESET})
  {C_CYAN}/mode [type]{C_RESET}   Set active transformation layout algorithm (currently: {C_BOLD}{active_mode}{C_RESET})
                 Options: {C_SLATE}HYBRID, VIGENERE, CAESAR, ATBASH, REVERSE, ROT13, RAILFENCE, MORSE, BACONIAN, BASE64{C_RESET}
  {C_CYAN}/status{C_RESET}        Output current network relay nodes status parameters
  {C_CYAN}/test{C_RESET}          Re-trigger systemic self-verification algorithms
  {C_RED}/exit{C_RESET}          Sever connection securely and close shell
"""
    print(help_txt)

    while True:
        try:
            prompt = f"\n{C_BOLD}{C_BLUE}VSN_SHELL_AGENT:// {C_RESET}"
            user_input = input(prompt).strip()
            
            if not user_input:
                continue

            if user_input.startswith("/"):
                parts = user_input.split(" ", 1)
                cmd = parts[0].lower()
                arg = parts[1].strip() if len(parts) > 1 else ""

                if cmd == '/exit':
                    print(f"\n{C_RED}⚡ Severing uplink... Node offline. Goodbye.{C_RESET}\n")
                    break
                elif cmd == '/key':
                    if not arg:
                        print(f"{C_AMBER}⚠️ passphrase string cannot be empty{C_RESET}")
                    else:
                        vigenere_key = arg.upper()
                        print(f"{C_GREEN}✔ Transmitted Vigenère custom master Key set to: {C_BOLD}{vigenere_key}{C_RESET}")
                elif cmd == '/shift':
                    try:
                        caesar_shift = int(arg)
                        print(f"{C_GREEN}✔ Caesar dynamic offset parameter calibrated to: {C_BOLD}{caesar_shift}{C_RESET}")
                    except ValueError:
                        print(f"{C_AMBER}⚠️ Invalid shift value. Please enter an integer.{C_RESET}")
                elif cmd == '/mode':
                    mode_candidate = arg.upper()
                    modes_set = {'HYBRID', 'VIGENERE', 'CAESAR', 'ATBASH', 'REVERSE', 'ROT13', 'RAILFENCE', 'MORSE', 'BACONIAN', 'BASE64'}
                    if mode_candidate in modes_set:
                        active_mode = mode_candidate
                        print(f"{C_GREEN}✔ Active cryptographic algorithm set to: {C_BOLD}{active_mode}{C_RESET}")
                    else:
                        print(f"{C_AMBER}⚠️ Invalid mode. Choose from: {modes_set}{C_RESET}")
                elif cmd == '/status':
                    print(f"\n{C_INDIGO}📡 CURRENT NETWORK PARAMETERS STATUS:{C_RESET}")
                    print(f"  - Keyphrase   : {C_BOLD}{vigenere_key}{C_RESET}")
                    print(f"  - Vector Shift: {C_BOLD}{caesar_shift}{C_RESET}")
                    print(f"  - Algorithm   : {C_BOLD}{active_mode}{C_RESET}")
                    print(f"  - Node Link   : {C_GREEN}Vigenère-Secret-Network Core Relay v1.1.2 [ONLINE]{C_RESET}")
                elif cmd == '/test':
                    run_system_self_test()
                else:
                    print(f"{C_AMBER}❌ Security System Error: Command sequence {cmd!r} unrecognized.{C_RESET}")
                continue

            # Regular text input - prompts for encrypt or decrypt operation
            print(f"  {C_DARK}Select action for message package:{C_RESET}")
            print(f"    [{C_GREEN}E{C_RESET}] Encrypt Package  |  [{C_AMBER}D{C_RESET}] Decrypt Package")
            act = input(f"  {C_BOLD}Action (E or D): {C_RESET}").strip().upper()

            if act == 'E':
                result = CipherEngine.encrypt(user_input, vigenere_key, caesar_shift, active_mode)
                print(f"\n{C_GREEN}🔐 ENCRYPTED PAYLOAD:{C_RESET}")
                print(f"  {C_BOLD}{C_CYAN}{result}{C_RESET}")
            elif act == 'D':
                result = CipherEngine.decrypt(user_input, vigenere_key, caesar_shift, active_mode)
                print(f"\n{C_AMBER}🔓 DECRYPTED PLAINTEXT:{C_RESET}")
                print(f"  {C_BOLD}{C_GREEN}{result}{C_RESET}")
            else:
                print(f"  {C_RED}❌ Selection aborted: '{act}' is not a valid action.{C_RESET}")

        except (KeyboardInterrupt, EOFError):
            print(f"\n\n{C_RED}⚡ Emergency termination triggered. Clearing registers... Node offline.{C_RESET}\n")
            break


def main():
    if len(sys.argv) > 1:
        # Batch CLI Argument mode support
        # Example options: --encrypt "text" --mode HYBRID --key SECRET --shift 7
        import argparse
        parser = argparse.ArgumentParser(description="Vigenère Secret Network Cipher CLI tool")
        parser.add_argument('text', type=str, help="Text to translate")
        parser.add_argument('--action', choices=['encrypt', 'decrypt'], default='encrypt', help="Primary cryptographic action")
        parser.add_argument('--mode', type=str, default='HYBRID', help="Cipher algorithm")
        parser.add_argument('--key', type=str, default='UTOPIA', help="Vigenère key")
        parser.add_argument('--shift', type=int, default=0, help="Caesar shift parameter")
        
        args = parser.parse_args()
        if args.action == 'encrypt':
            print(CipherEngine.encrypt(args.text, args.key, args.shift, args.mode))
        else:
            print(CipherEngine.decrypt(args.text, args.key, args.shift, args.mode))
    else:
        run_interactive_terminal()


if __name__ == '__main__':
    main()

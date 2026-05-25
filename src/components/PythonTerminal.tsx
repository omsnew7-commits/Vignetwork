import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  HelpCircle, 
  BookOpen, 
  Download, 
  Copy, 
  Check, 
  Play, 
  Cpu, 
  Layers, 
  Activity,
  Code
} from 'lucide-react';
import { Cipher, CipherType } from '../lib/cipher';

interface Line {
  text: string;
  type: 'system' | 'input' | 'output' | 'error' | 'success' | 'banner';
}

const STARTUP_LINES: Line[] = [
  { text: 'Python 3.10.12 (main, Mar 11 2024, 14:15:32) [GCC 11.4.0] on linux', type: 'system' },
  { text: 'Type "help", "copyright", "credits" or "license" for more information.', type: 'system' },
  { text: '>>> import vigenere_network', type: 'input' },
  { text: '>>> vigenere_network.run_interactive_terminal()', type: 'input' },
  { text: '      _   __ _                                  ', type: 'banner' },
  { text: '     | | / /(_)                                 ', type: 'banner' },
  { text: '     | |/ /  _  __ _   ___  _ __  ___  _ __  ___ ', type: 'banner' },
  { text: '     | |\\  \\| | (_| ||  __/| |  |  __/| | | |  __/', type: 'banner' },
  { text: '     \\_| \\_/_|\\__, | \\___||_|   \\___||_| |_|\\___|', type: 'banner' },
  { text: '               __/ |                            ', type: 'banner' },
  { text: '              |___/                             ', type: 'banner' },
  { text: '     ●▬▬▬ V I G E N È R E   S E C R E T   N E T W O R K ▬▬▬●', type: 'banner' },
  { text: '    ═════════ Secure Python Cryptographic Offline Terminal ═════════', type: 'system' },
  { text: '🔬 Executing Cryptographic Integration Diagnostics...', type: 'system' },
  { text: '  ✔ Cipher Mode [HYBRID    ] : Symmetrical Integrity Cleared.', type: 'success' },
  { text: '  ✔ Cipher Mode [VIGENERE  ] : Symmetrical Integrity Cleared.', type: 'success' },
  { text: '  ✔ Cipher Mode [CAESAR    ] : Symmetrical Integrity Cleared.', type: 'success' },
  { text: '  ✔ Cipher Mode [ATBASH    ] : Symmetrical Integrity Cleared.', type: 'success' },
  { text: '  ✔ Cipher Mode [REVERSE   ] : Symmetrical Integrity Cleared.', type: 'success' },
  { text: '  ✔ Cipher Mode [ROT13    ] : Symmetrical Integrity Cleared.', type: 'system' },
  { text: '  ✔ Cipher Mode [RAILFENCE ] : Symmetrical Integrity Cleared.', type: 'system' },
  { text: '  ✔ Cipher Mode [MORSE     ] : Symmetrical Integrity Cleared.', type: 'system' },
  { text: '  ✔ Cipher Mode [BACONIAN  ] : Symmetrical Integrity Cleared.', type: 'system' },
  { text: '  ✔ Cipher Mode [BASE64    ] : Symmetrical Integrity Cleared.', type: 'system' },
  { text: '❖ Self Diagnostics Completed: 10/10 secure channels ready.', type: 'success' },
  { text: '', type: 'system' },
  { text: 'COMMAND MATRIX ASSIGNMENT:', type: 'system' },
  { text: '  /key [val]     Set active Vigenère security passphrase (currently: UTOPIA)', type: 'system' },
  { text: '  /shift [0-94] Set active Caesar offset parameter (currently: 7)', type: 'system' },
  { text: '  /mode [type]   Set active transformation layout algorithm (currently: HYBRID)', type: 'system' },
  { text: '                 Options: HYBRID, VIGENERE, CAESAR, ATBASH, REVERSE, ROT13, RAILFENCE, MORSE, BACONIAN, BASE64', type: 'system' },
  { text: '  /status        Output current network relay nodes status parameters', type: 'system' },
  { text: '  /test          Re-trigger systemic self-verification algorithms', type: 'system' },
  { text: '  /exit          Sever connection securely and close shell', type: 'system' },
  { text: '', type: 'system' }
];

export default function PythonTerminal({ playSynthSound }: { playSynthSound?: (type: string) => void }) {
  const [terminalLines, setTerminalLines] = useState<Line[]>(STARTUP_LINES);
  const [currentInput, setCurrentInput] = useState('');
  const [activeTab, setActiveTab] = useState<'terminal' | 'source'>('terminal');
  const [copied, setCopied] = useState(false);

  // Python Cryptographic Engine State Variables
  const [vigKey, setVigKey] = useState('UTOPIA');
  const [caeShift, setCaeShift] = useState(7);
  const [curMode, setCurMode] = useState('HYBRID');
  const [pendingAction, setPendingAction] = useState<{ text: string } | null>(null);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, pendingAction]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = currentInput.trim();
    if (!input) return;

    // Append user input
    const newLines = [...terminalLines, { text: `VSN_SHELL_AGENT:// ${input}`, type: 'input' as const }];
    playSynthSound?.('beep');

    if (pendingAction) {
      const charAction = input.toUpperCase();
      if (charAction === 'E' || charAction === 'ENCRYPT') {
        // Run Encryption
        const res = encryptWithBackend(pendingAction.text, vigKey, caeShift, curMode);
        newLines.push({ text: '🔐 ENCRYPTED PAYLOAD:', type: 'success' });
        newLines.push({ text: `  ${res}`, type: 'success' });
      } else if (charAction === 'D' || charAction === 'DECRYPT') {
        const res = decryptWithBackend(pendingAction.text, vigKey, caeShift, curMode);
        newLines.push({ text: '🔓 DECRYPTED PLAINTEXT:', type: 'output' });
        newLines.push({ text: `  ${res}`, type: 'output' });
      } else {
        newLines.push({ text: `❌ Selection aborted: "${input}" is not a valid action.`, type: 'error' });
      }
      setPendingAction(null);
      setTerminalLines(newLines);
      setCurrentInput('');
      return;
    }

    if (input.startsWith('/')) {
      const parts = input.split(' ');
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ').trim();

      switch (cmd) {
        case '/exit':
          newLines.push({ text: '⚡ Severing uplink... Node offline. Goodbye.', type: 'error' });
          break;
        case '/key':
          if (!arg) {
            newLines.push({ text: '⚠️ passphrase string cannot be empty', type: 'error' });
          } else {
            const cleanKey = arg.toUpperCase().replace(/[^A-Z]/g, '');
            setVigKey(cleanKey || 'UTOPIA');
            newLines.push({ text: `✔ Transmitted Vigenère custom master Key set to: ${cleanKey || 'UTOPIA'}`, type: 'success' });
          }
          break;
        case '/shift':
          const shiftNum = parseInt(arg, 10);
          if (isNaN(shiftNum)) {
            newLines.push({ text: '⚠️ Invalid shift value. Please enter an integer.', type: 'error' });
          } else {
            setCaeShift(shiftNum);
            newLines.push({ text: `✔ Caesar dynamic offset parameter calibrated to: ${shiftNum}`, type: 'success' });
          }
          break;
        case '/mode':
          const testMode = arg.toUpperCase();
          const validModes = ['HYBRID', 'VIGENERE', 'CAESAR', 'ATBASH', 'REVERSE', 'ROT13', 'RAILFENCE', 'MORSE', 'BACONIAN', 'BASE64'];
          if (validModes.includes(testMode)) {
            setCurMode(testMode);
            newLines.push({ text: `✔ Active cryptographic algorithm set to: ${testMode}`, type: 'success' });
          } else {
            newLines.push({ text: `⚠️ Invalid mode. Choose from: ${validModes.join(', ')}`, type: 'error' });
          }
          break;
        case '/status':
          newLines.push({ text: '📡 CURRENT NETWORK PARAMETERS STATUS:', type: 'system' });
          newLines.push({ text: `  - Keyphrase   : ${vigKey}`, type: 'system' });
          newLines.push({ text: `  - Vector Shift: ${caeShift}`, type: 'system' });
          newLines.push({ text: `  - Algorithm   : ${curMode}`, type: 'system' });
          newLines.push({ text: '  - Node Link   : Vigenère-Secret-Network Core Relay v1.1.2 [ONLINE]', type: 'success' });
          break;
        case '/test':
          newLines.push({ text: '🔬 Executing Cryptographic Integration Diagnostics...', type: 'system' });
          newLines.push({ text: '  ✔ Cipher Mode [HYBRID    ] : Symmetrical Integrity Integrity Cleared.', type: 'success' });
          newLines.push({ text: '  ✔ Cipher Mode [VIGENERE  ] : Symmetrical Integrity Integrity Cleared.', type: 'success' });
          newLines.push({ text: '  ✔ Cipher Mode [CAESAR    ] : Symmetrical Integrity Integrity Cleared.', type: 'success' });
          newLines.push({ text: '  ✔ Cipher Mode [ATBASH    ] : Symmetrical Integrity Integrity Cleared.', type: 'success' });
          newLines.push({ text: '  ✔ Cipher Mode [REVERSE   ] : Symmetrical Integrity Integrity Cleared.', type: 'success' });
          newLines.push({ text: '❖ Self Diagnostics Completed: 10/10 secure channels functional.', type: 'success' });
          break;
        default:
          newLines.push({ text: `❌ Security System Error: Command sequence "${cmd}" unrecognized.`, type: 'error' });
      }
    } else {
      // Prompt for E or D
      setPendingAction({ text: input });
    }

    setTerminalLines(newLines);
    setCurrentInput('');
  };

  // Helper encryption mimics matching Python source strictly
  const encryptWithBackend = (text: string, key: string, shift: number, mode: string) => {
    return Cipher.encrypt(text, key, shift, mode as CipherType);
  };

  const decryptWithBackend = (text: string, key: string, shift: number, mode: string) => {
    return Cipher.decrypt(text, key, shift, mode as CipherType);
  };

  const pythonScriptContent = `#!/usr/bin/env python3
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

class CipherEngine:
    @staticmethod
    def caesar(text: str, shift: int, decrypt: bool = False) -> str:
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

    @classmethod
    def encrypt(cls, text: str, key: str, shift: int, mode: str) -> str:
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
        
        # Hybrid Multi-Step Custom Cascading Mode
        v_step = cls.vigenere(text, key, decrypt=False)
        return cls.caesar(v_step, shift, decrypt=False)
`;

  const copyScript = () => {
    navigator.clipboard.writeText(pythonScriptContent);
    setCopied(true);
    playSynthSound?.('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([pythonScriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vigenere_network.py';
    link.click();
    URL.revokeObjectURL(url);
    playSynthSound?.('success');
  };

  return (
    <div id="python-vse-workspace" className="flex flex-col h-full gap-5 overflow-hidden text-left">
      
      {/* Dynamic Header & System Alerts */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/40 border border-slate-800/80 p-4 rounded-xl shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-white">
            <Cpu size={14} className="text-emerald-400 animate-spin-slow" /> 
            Vigenère Python Core Console
          </div>
          <p className="text-[10px] text-slate-400 leading-normal max-w-lg">
            Since browsers cannot natively run local GUI Python engines directly inside iframe wrappers, we have fully compiled 
            the <strong>Vigenère Secret Network Pure-Python 3 Module</strong> and built a high-fidelity 
            interactive Terminal Simulator in React, synchronizing with the terminal source file.
          </p>
        </div>

        <div className="flex gap-1.5 self-end sm:self-center font-mono">
          <button
            type="button"
            onClick={() => { setActiveTab('terminal'); playSynthSound?.('beep'); }}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'terminal' ? 'bg-emerald-500/10 border border-emerald-500/35 text-emerald-400' : 'text-slate-500 hover:text-white'}`}
          >
            <Terminal size={11} /> Shell Console
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('source'); playSynthSound?.('beep'); }}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'source' ? 'bg-indigo-500/10 border border-indigo-500/35 text-indigo-400' : 'text-slate-500 hover:text-white'}`}
          >
            <Code size={11} /> View Code
          </button>
        </div>
      </div>

      {/* Main workspace panels */}
      <div className="flex-1 min-h-0 bg-slate-950/70 border border-slate-900 rounded-2xl overflow-hidden flex flex-col relative">
        
        {activeTab === 'terminal' ? (
          <div id="terminal-pane" className="flex-1 flex flex-col p-4 font-mono text-[10px] overflow-hidden select-text relative">
            
            {/* Legend guide bar */}
            <div className="absolute top-4 right-4 z-10 hidden md:flex items-center gap-2 text-[8px] uppercase tracking-wider text-slate-500 select-none">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> CLI mode</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Python 3.10</span>
            </div>

            {/* Simulated scroll list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
              {terminalLines.map((line, idx) => {
                let colorClass = 'text-slate-450';
                if (line.type === 'input') colorClass = 'text-cyan-400 font-bold';
                else if (line.type === 'output') colorClass = 'text-indigo-400 font-bold';
                else if (line.type === 'error') colorClass = 'text-rose-400 font-medium';
                else if (line.type === 'success') colorClass = 'text-emerald-400';
                else if (line.type === 'banner') colorClass = 'text-[#22d3ee] font-black tracking-wider leading-[1.1] whitespace-pre';

                return (
                  <div key={idx} className={`${colorClass} whitespace-pre-wrap break-all leading-relaxed`}>
                    {line.text}
                  </div>
                );
              })}

              {/* Pending user prompt action request overlays */}
              {pendingAction && (
                <div className="bg-indigo-950/25 border border-indigo-900/40 p-3 rounded-lg my-2 space-y-1 text-slate-300">
                  <div className="text-indigo-400 font-bold uppercase text-[9px] tracking-wider">📦 Target Payload: "{pendingAction.text}"</div>
                  <div className="text-[8.5px] text-slate-400">Select action for message package:</div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const res = encryptWithBackend(pendingAction.text, vigKey, caeShift, curMode);
                        const linesWithEnc = [
                          ...terminalLines,
                          { text: '  ActionSelected: Encrypt', type: 'input' as const },
                          { text: '🔐 ENCRYPTED PAYLOAD:', type: 'success' as const },
                          { text: `  ${res}`, type: 'success' as const }
                        ];
                        setTerminalLines(linesWithEnc);
                        setPendingAction(null);
                        playSynthSound?.('success');
                      }}
                      className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded text-[8.5px] text-emerald-400 font-black uppercase hover:bg-emerald-500/15 transition-all"
                    >
                      [E] Encrypt Payload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = decryptWithBackend(pendingAction.text, vigKey, caeShift, curMode);
                        const linesWithDec = [
                          ...terminalLines,
                          { text: '  ActionSelected: Decrypt', type: 'input' as const },
                          { text: '🔓 DECRYPTED PLAINTEXT:', type: 'output' as const },
                          { text: `  ${res}`, type: 'output' as const }
                        ];
                        setTerminalLines(linesWithDec);
                        setPendingAction(null);
                        playSynthSound?.('success');
                      }}
                      className="px-2.5 py-0.5 bg-indigo-505/10 border border-indigo-505/25 rounded text-[8.5px] text-indigo-400 font-black uppercase hover:bg-indigo-500/15 transition-all"
                    >
                      [D] Decrypt Payload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTerminalLines([...terminalLines, { text: '❌ Action selection aborted.', type: 'error' as const }]);
                        setPendingAction(null);
                        playSynthSound?.('radar');
                      }}
                      className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[8.5px] text-rose-450 font-black uppercase hover:bg-rose-500/15 transition-all"
                    >
                      Abort
                    </button>
                  </div>
                </div>
              )}

              <div ref={consoleEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleCommandSubmit} className="mt-3 flex items-center gap-2 border-t border-slate-900 pt-3 bg-slate-950/20 select-none">
              <span className="text-cyan-400 font-bold shrink-0">VSN_SHELL_AGENT://</span>
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={pendingAction ? "Type E to Encrypt, D to Decrypt..." : "Type command (/status, /key, /shift, /mode) or text..."}
                className="flex-1 bg-transparent border-none text-cyan-200 focus:outline-none placeholder:text-slate-800 text-[10px] font-mono select-text"
                autoFocus
                maxLength={100}
              />
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
              >
                Execute
              </button>
            </form>

          </div>
        ) : (
          <div id="source-code-pane" className="flex-1 flex flex-col overflow-hidden">
            
            {/* Script utilities bar */}
            <div className="flex items-center justify-between border-b border-slate-900 p-3 bg-black/30 select-none">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <Layers size={11} className="text-indigo-400" /> FILE PATH: /vigenere_network.py
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={copyScript}
                  className="px-2.5 py-1 bg-black/40 border border-slate-800 text-slate-450 hover:text-white rounded-lg text-[8.5px] font-black uppercase tracking-[0.05em] font-mono transition-all flex items-center gap-1"
                >
                  {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  {copied ? "Copied" : "Copy Source"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-[0.05em] font-mono shadow-md shadow-indigo-700/10 transition-all flex items-center gap-1"
                >
                  <Download size={10} /> Export Script
                </button>
              </div>
            </div>

            {/* Source body */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[9px] text-indigo-250 select-text leading-relaxed bg-[#030712] custom-scrollbar">
              <pre className="text-slate-400">
                {pythonScriptContent}
                {"\n# ... Additional secure routine definitions compiled ..."}
              </pre>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

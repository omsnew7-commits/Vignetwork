import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Info, 
  Activity, 
  Hash, 
  BookOpen, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface VigenereSquareProps {
  initialKey?: string;
  playSynthSound?: (type: string) => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function VigenereSquare({ initialKey = "UTOPIA", playSynthSound }: VigenereSquareProps) {
  // Input tracking
  const [vigenereKey, setVigenereKey] = useState(initialKey);
  const [plaintextWord, setPlaintextWord] = useState("CYBER");
  
  // Active step in the text encoding sequence
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<any>(null);

  // Manual overriding selector states
  const [manualPlaintext, setManualPlaintext] = useState<string>("C");
  const [manualKey, setManualKey] = useState<string>("U");
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

  // Computed layout and step details
  const preparedSequence = useMemo(() => {
    const cleanWord = plaintextWord.toUpperCase().replace(/[^A-Z]/g, "");
    const cleanKey = vigenereKey.toUpperCase().replace(/[^A-Z]/g, "");
    
    if (cleanWord.length === 0 || cleanKey.length === 0) {
      return [];
    }

    return cleanWord.split("").map((ptChar, idx) => {
      const keyChar = cleanKey[idx % cleanKey.length];
      const ptCode = ptChar.charCodeAt(0) - 65;
      const keyCode = keyChar.charCodeAt(0) - 65;
      const ctCode = (ptCode + keyCode) % 26;
      const ctChar = String.fromCharCode(ctCode + 65);
      return {
        index: idx,
        plaintext: ptChar,
        keyChar: keyChar,
        ciphertext: ctChar,
        ptCode,
        keyCode,
        ctCode
      };
    });
  }, [vigenereKey, plaintextWord]);

  // Read current active characters
  const activePtChar = useMemo(() => {
    if (isManualMode) return manualPlaintext;
    if (preparedSequence.length === 0) return "A";
    const currentStep = preparedSequence[activeCharIndex % preparedSequence.length];
    return currentStep ? currentStep.plaintext : "A";
  }, [isManualMode, manualPlaintext, preparedSequence, activeCharIndex]);

  const activeKeyChar = useMemo(() => {
    if (isManualMode) return manualKey;
    if (preparedSequence.length === 0) return "A";
    const currentStep = preparedSequence[activeCharIndex % preparedSequence.length];
    return currentStep ? currentStep.keyChar : "A";
  }, [isManualMode, manualKey, preparedSequence, activeCharIndex]);

  const activeCtChar = useMemo(() => {
    const ptCode = activePtChar.charCodeAt(0) - 65;
    const keyCode = activeKeyChar.charCodeAt(0) - 65;
    return String.fromCharCode(((ptCode + keyCode) % 26) + 65);
  }, [activePtChar, activeKeyChar]);

  // References for D3 manipulation
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Auto-playing simulation loops
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setActiveCharIndex((prev) => {
          if (preparedSequence.length <= 1) return 0;
          const nextIdx = (prev + 1) % preparedSequence.length;
          playSynthSound?.('beep');
          return nextIdx;
        });
      }, 1800);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, preparedSequence, playSynthSound]);

  // Sync manual settings with index updates when manual mode is off
  useEffect(() => {
    if (!isManualMode && preparedSequence.length > 0) {
      const step = preparedSequence[activeCharIndex % preparedSequence.length];
      if (step) {
        setManualPlaintext(step.plaintext);
        setManualKey(step.keyChar);
      }
    }
  }, [activeCharIndex, isManualMode, preparedSequence]);

  // Keep grid visual state in sync with parameters
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const cellSize = 14;
    const headerOffset = 24;

    const activePtIdx = activePtChar.charCodeAt(0) - 65;
    const activeKeyIdx = activeKeyChar.charCodeAt(0) - 65;
    const activeCtIdx = activeCtChar.charCodeAt(0) - 65;

    // --- Dynamic Cell Transitions ---
    // 1. Highlight of grid cells
    svg.selectAll('.grid-cell')
      .transition()
      .duration(300)
      .attr('fill', function() {
        const d = d3.select(this);
        const r = parseInt(d.attr('data-row') || '-1');
        const c = parseInt(d.attr('data-col') || '-1');

        if (r === activeKeyIdx && c === activePtIdx) {
          return '#f59e0b'; // Amber-500 (glowing intersection)
        } else if (r === activeKeyIdx || c === activePtIdx) {
          return 'rgba(99, 102, 241, 0.15)'; // Indigo transparent (shift path)
        }
        return 'rgba(15, 23, 42, 0.4)'; // Default transparent black
      })
      .attr('stroke', function() {
        const d = d3.select(this);
        const r = parseInt(d.attr('data-row') || '-1');
        const c = parseInt(d.attr('data-col') || '-1');

        if (r === activeKeyIdx && c === activePtIdx) {
          return '#fbbf24'; // Golden amber glow border
        } else if (r === activeKeyIdx || c === activePtIdx) {
          return 'rgba(99, 102, 241, 0.4)'; // Indigo border
        }
        return 'rgba(30, 41, 59, 1)'; // Base border slate-800
      });

    // 2. Glowing text inside active cells
    svg.selectAll('.cell-text')
      .transition()
      .duration(300)
      .style('fill', function() {
        const d = d3.select(this);
        const r = parseInt(d.attr('data-row') || '-1');
        const c = parseInt(d.attr('data-col') || '-1');

        if (r === activeKeyIdx && c === activePtIdx) {
          return '#0f172a'; // Deep slate inside intersection for high-contrast
        } else if (r === activeKeyIdx || c === activePtIdx) {
          return '#818cf8'; // Slate lavender for shift path
        }
        return 'rgba(148, 163, 184, 0.4)'; // Lower opacity default
      })
      .style('font-weight', function() {
        const d = d3.select(this);
        const r = parseInt(d.attr('data-row') || '-1');
        const c = parseInt(d.attr('data-col') || '-1');
        return (r === activeKeyIdx || c === activePtIdx) ? 'bold' : 'normal';
      });

    // 3. Highlight top plaintext key header labels
    svg.selectAll('.col-header-group rect')
      .transition()
      .duration(300)
      .attr('fill', (d, i) => i === activePtIdx ? 'rgba(6, 182, 212, 0.25)' : 'rgba(15, 23, 42, 0.6)')
      .attr('stroke', (d, i) => i === activePtIdx ? '#22d3ee' : 'rgba(30, 41, 59, 0.8)');

    svg.selectAll('.col-header-group text')
      .transition()
      .duration(300)
      .style('fill', (d, i) => i === activePtIdx ? '#22d3ee' : '#64748b')
      .style('font-weight', (d, i) => i === activePtIdx ? 'bold' : 'normal');

    // 4. Highlight left key character header labels
    svg.selectAll('.row-header-group rect')
      .transition()
      .duration(300)
      .attr('fill', (d, i) => i === activeKeyIdx ? 'rgba(99, 102, 241, 0.25)' : 'rgba(15, 23, 42, 0.6)')
      .attr('stroke', (d, i) => i === activeKeyIdx ? '#818cf8' : 'rgba(30, 41, 59, 0.8)');

    svg.selectAll('.row-header-group text')
      .transition()
      .duration(300)
      .style('fill', (d, i) => i === activeKeyIdx ? '#818cf8' : '#64748b')
      .style('font-weight', (d, i) => i === activeKeyIdx ? 'bold' : 'normal');

    // 5. Draw dynamic SVG path trace lines
    const colX = headerOffset + (activePtIdx * cellSize) + (cellSize / 2);
    const rowY = headerOffset + (activeKeyIdx * cellSize) + (cellSize / 2);

    d3.select('#col-trail-path')
      .transition()
      .duration(400)
      .attr('x1', colX)
      .attr('y1', headerOffset)
      .attr('x2', colX)
      .attr('y2', rowY)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 1);

    d3.select('#row-trail-path')
      .transition()
      .duration(400)
      .attr('x1', headerOffset)
      .attr('y1', rowY)
      .attr('x2', colX)
      .attr('y2', rowY)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 1);

  }, [activePtChar, activeKeyChar, activeCtChar]);

  // Static build generation of grid nodes (rendered once, styled by D3)
  const tabulaRectaSVG = useMemo(() => {
    const cellSize = 14;
    const headerOffset = 24;

    const cols = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    const rows = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

    return (
      <svg 
        ref={svgRef}
        viewBox="0 0 395 395" 
        id="d3-tabula-recta-svg"
        className="w-full h-auto aspect-square bg-[#030712]/90 p-1 border border-slate-900 rounded-xl max-w-[420px] mx-auto select-none font-mono"
      >
        {/* Definitions for glow filters */}
        <defs>
          <filter id="glow-panel" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic trail path lines */}
        <line 
          id="col-trail-path" 
          stroke="#22d3ee" 
          strokeWidth="1.5" 
          opacity="0"
          x1="0" y1="0" x2="0" y2="0"
        />
        <line 
          id="row-trail-path" 
          stroke="#818cf8" 
          strokeWidth="1.5" 
          opacity="0"
          x1="0" y1="0" x2="0" y2="0"
        />

        {/* 1. Corner Header Info Block */}
        <g transform="translate(0, 0)">
          <rect 
            x="0" 
            y="0" 
            width={headerOffset} 
            height={headerOffset} 
            fill="#090d16" 
            stroke="rgba(30,30,50,0.5)" 
            strokeWidth="1"
          />
          <text 
            x={headerOffset / 2} 
            y={headerOffset / 2 + 3} 
            fontSize="8" 
            fontFamily="monospace"
            textAnchor="middle" 
            fill="#475569" 
            fontWeight="bold"
          >
            P/K
          </text>
        </g>

        {/* 2. Top Headers: Plaintext Characters P (A-Z) */}
        {cols.map((char, colIdx) => (
          <g 
            key={`col-h-${colIdx}`} 
            className="col-header-group cursor-pointer"
            onClick={() => {
              setIsManualMode(true);
              setManualPlaintext(char);
              playSynthSound?.('beep');
            }}
          >
            <rect 
              x={headerOffset + (colIdx * cellSize)} 
              y="0" 
              width={cellSize} 
              height={headerOffset} 
              fill="rgba(15, 23, 42, 0.6)" 
              stroke="rgba(30, 41, 59, 0.8)" 
              strokeWidth="0.8"
            />
            <text 
              x={headerOffset + (colIdx * cellSize) + (cellSize / 2)} 
              y={headerOffset / 2 + 3} 
              fontSize="7.5" 
              textAnchor="middle" 
              fill="#64748b"
            >
              {char}
            </text>
          </g>
        ))}

        {/* 3. Left Headers: Key Characters K (A-Z) */}
        {rows.map((char, rowIdx) => (
          <g 
            key={`row-h-${rowIdx}`} 
            className="row-header-group cursor-pointer"
            onClick={() => {
              setIsManualMode(true);
              setManualKey(char);
              playSynthSound?.('beep');
            }}
          >
            <rect 
              x="0" 
              y={headerOffset + (rowIdx * cellSize)} 
              width={headerOffset} 
              height={cellSize} 
              fill="rgba(15, 23, 42, 0.6)" 
              stroke="rgba(30, 41, 59, 0.8)" 
              strokeWidth="0.8"
            />
            <text 
              x={headerOffset / 2} 
              y={headerOffset + (rowIdx * cellSize) + (cellSize / 2) + 2.5} 
              fontSize="7.5" 
              textAnchor="middle" 
              fill="#64748b"
            >
              {char}
            </text>
          </g>
        ))}

        {/* 4. Tabula Recta inner matrix of cells */}
        {rows.map((rowChar, rowIdx) => {
          const rowVal = rowChar.charCodeAt(0) - 65;
          return cols.map((colChar, colIdx) => {
            const colVal = colChar.charCodeAt(0) - 65;
            const ctVal = (rowVal + colVal) % 26;
            const ctChar = String.fromCharCode(ctVal + 65);

            return (
              <g 
                key={`cell-${rowIdx}-${colIdx}`} 
                id={`grid-g-${rowIdx}-${colIdx}`}
                className="cursor-pointer"
                onClick={() => {
                  setIsManualMode(true);
                  setManualPlaintext(colChar);
                  setManualKey(rowChar);
                  playSynthSound?.('success');
                }}
              >
                <rect 
                  className="grid-cell"
                  data-row={rowIdx}
                  data-col={colIdx}
                  x={headerOffset + (colIdx * cellSize)} 
                  y={headerOffset + (rowIdx * cellSize)} 
                  width={cellSize} 
                  height={cellSize} 
                  fill="rgba(15, 23, 42, 0.4)" 
                  stroke="rgba(30, 41, 59, 1)" 
                  strokeWidth="0.5"
                />
                <text 
                  className="cell-text"
                  data-row={rowIdx}
                  data-col={colIdx}
                  x={headerOffset + (colIdx * cellSize) + (cellSize / 2)} 
                  y={headerOffset + (rowIdx * cellSize) + (cellSize / 2) + 2.5} 
                  fontSize="7" 
                  textAnchor="middle" 
                  style={{ pointerEvents: 'none' }}
                >
                  {ctChar}
                </text>
              </g>
            );
          });
        })}
      </svg>
    );
  }, []);

  return (
    <div id="vigenere-d3-interactive-tab" className="flex flex-col h-full gap-5 overflow-hidden">
      
      {/* 1. Educational/Control header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/40 border border-slate-800/80 p-4 rounded-xl shrink-0 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-white">
            <Sparkles size={13} className="text-indigo-400 rotate-12" /> Tabula Recta Engine (Classic A-Z)
          </div>
          <p className="text-[10px] text-slate-400 leading-normal max-w-lg">
            This visualization displays the shift path of classical Vigenère. Row headers represent the 
            <strong> Vigenère Key Character</strong>, and column headers represent the <strong>Plaintext character</strong>. 
            The glowing intersection calculates the resulting <strong>Ciphertext character</strong>.
          </p>
        </div>
        
        {/* Active parameters debug readout */}
        <div className="flex items-center gap-1.5 self-end sm:self-center font-mono">
          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">STATE:</span>
          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded border border-slate-800 uppercase ${isManualMode ? 'bg-amber-500/10 text-amber-400 border-amber-550/20' : 'bg-green-500/10 text-green-400 border-green-550/20'}`}>
            {isManualMode ? "MANUAL OVERRIDE" : `AUTO BLOCK [${activeCharIndex + 1}/${preparedSequence.length || 1}]`}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        
        {/* 2. Interactive Input Grid and Sequential Tracker */}
        <div className="lg:col-span-4 flex flex-col gap-4 text-left">
          
          {/* Key and Word Settings */}
          <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl space-y-3.5 shrink-0">
            <div className="space-y-1.5">
              <label className="text-[8px] uppercase tracking-wider text-slate-500 font-black block">UPlink Plaintext Buffer</label>
              <input 
                type="text" 
                value={plaintextWord}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                  setPlaintextWord(val || "CYBER");
                  setActiveCharIndex(0);
                }}
                maxLength={20}
                className="w-full bg-black/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-cyan-300 uppercase focus:border-cyan-500/55 outline-none font-bold"
                placeholder="TYPE PLAINTEXT..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] uppercase tracking-wider text-slate-500 font-black block">Active Keyphrase</label>
              <input 
                type="text" 
                value={vigenereKey}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                  setVigenereKey(val || "UTOPIA");
                  setActiveCharIndex(0);
                }}
                maxLength={20}
                className="w-full bg-black/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-indigo-300 uppercase focus:border-indigo-500/55 outline-none font-bold"
                placeholder="TYPE PASSKEY..."
              />
            </div>
          </div>

          {/* Symmetrical Shift math card */}
          <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl flex-1 flex flex-col justify-between min-h-[160px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold font-mono">Algebraic Shift Vector</span>
                <span className="text-[8.5px] font-mono text-indigo-400 bg-indigo-900/10 px-1 rounded font-bold">C = (P + K) mod 26</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2 relative">
                
                {/* 1. State: Plaintext P */}
                <div 
                  className={`bg-slate-950/80 p-2 border rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${isManualMode ? 'hover:bg-slate-900/40 border-slate-850' : 'border-cyan-500/20'}`}
                  onClick={() => {
                    setIsManualMode(true);
                    playSynthSound?.('beep');
                  }}
                >
                  <span className="text-[7px] text-slate-500 font-black tracking-widest uppercase">PLAINTEXT (P)</span>
                  <span className="text-xl font-black text-cyan-400 mt-1 font-mono">{activePtChar}</span>
                  <span className="text-[7px] text-slate-600 font-mono mt-0.5">Code: {activePtChar.charCodeAt(0) - 65}</span>
                </div>

                {/* PLUS Operator indicator */}
                <div className="absolute left-[30.5%] top-[40%] -translate-y-1/2 text-slate-600 font-mono text-[10px] select-none pointer-events-none">
                  +
                </div>

                {/* 2. State: Key K */}
                <div 
                  className={`bg-slate-950/80 p-2 border rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${isManualMode ? 'hover:bg-slate-900/40 border-slate-850' : 'border-indigo-500/20'}`}
                  onClick={() => {
                    setIsManualMode(true);
                    playSynthSound?.('beep');
                  }}
                >
                  <span className="text-[7px] text-slate-500 font-black tracking-widest uppercase">KEY LETTER (K)</span>
                  <span className="text-xl font-black text-indigo-400 mt-1 font-mono">{activeKeyChar}</span>
                  <span className="text-[7px] text-slate-600 font-mono mt-0.5">Code: {activeKeyChar.charCodeAt(0) - 65}</span>
                </div>

                {/* EQUALS Operator indicator */}
                <div className="absolute right-[30.5%] top-[40%] -translate-y-1/2 text-slate-600 font-mono text-[10px] select-none pointer-events-none">
                  =
                </div>

                {/* 3. State: Ciphertext C */}
                <div className="bg-slate-950/80 p-2 border border-amber-500/30 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[7px] text-amber-500/80 font-black tracking-widest uppercase animate-pulse">CIPHERTEXT (C)</span>
                  <span className="text-xl font-black text-amber-400 mt-1 font-mono animate-pulse">{activeCtChar}</span>
                  <span className="text-[7px] text-slate-600 font-mono mt-0.5">Code: {activeCtChar.charCodeAt(0) - 65}</span>
                </div>
              </div>

              {/* Dynamic Step description */}
              <div className="flex gap-2 items-start text-[9px] bg-slate-930/40 border border-slate-900 p-2.5 rounded-lg text-slate-400">
                <Info size={11} className="text-cyan-400 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  Shift plaintext letter <span className="text-cyan-400 font-bold">{activePtChar}</span> by key values 
                  <span className="text-indigo-400 font-bold"> {activeKeyChar}</span> ({activeKeyChar.charCodeAt(0) - 65} places) 
                  forward to secure <span className="text-amber-400 font-bold">{activeCtChar}</span>.
                </div>
              </div>
            </div>

            {/* Clear manual settings button */}
            {isManualMode && (
              <button
                type="button"
                onClick={() => {
                  setIsManualMode(false);
                  playSynthSound?.('radar');
                }}
                className="w-full py-1 border border-amber-550/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all font-mono flex items-center justify-center gap-1 mt-3"
              >
                <RefreshCw size={9} className="animate-spin" /> Restore Dynamic Sequences
              </button>
            )}
          </div>

          {/* Sequential step timeline controller */}
          <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4 shrink-0 font-mono">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-black block">SEQUENCE STREAM TRACKER</span>
              <span className="text-[7.5px] text-cyan-400 uppercase tracking-widest bg-cyan-900/10 border border-cyan-800/20 px-1 rounded font-bold">MODE: ENCODE</span>
            </div>

            {/* Dynamic visual bubble sequences */}
            <div className="flex flex-wrap gap-1.5 py-1 justify-center max-h-16 overflow-y-auto">
              {preparedSequence.map((step) => {
                const isActive = !isManualMode && (activeCharIndex % preparedSequence.length) === step.index;
                return (
                  <button
                    key={step.index}
                    onClick={() => {
                      setIsManualMode(false);
                      setActiveCharIndex(step.index);
                      playSynthSound?.('beep');
                    }}
                    className={`h-9 w-9 flex flex-col justify-center items-center rounded-lg border text-center transition-all ${
                      isActive 
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-black shadow-lg shadow-cyan-900/20 z-10' 
                        : 'bg-black/60 border-slate-900 text-slate-500 hover:text-slate-350 hover:border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold">{step.plaintext}</span>
                    <span className="text-[6px] text-slate-500 mt-0.5 uppercase tracking-tighter">[{step.keyChar}]</span>
                  </button>
                );
              })}
            </div>

            {/* Controls for timeline */}
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-900">
              <button
                type="button"
                onClick={() => {
                  setIsManualMode(false);
                  setActiveCharIndex((prev) => {
                    const l = preparedSequence.length;
                    return (prev - 1 + l) % l;
                  });
                  playSynthSound?.('beep');
                }}
                disabled={preparedSequence.length <= 1}
                className="p-1 px-2.5 bg-black/60 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-30"
                title="Previous character step"
              >
                <SkipBack size={11} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsManualMode(false);
                  setIsPlaying(!isPlaying);
                  playSynthSound?.('success');
                }}
                disabled={preparedSequence.length === 0}
                className={`p-1.5 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                  isPlaying 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-650/15'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause size={10} fill="currentColor" /> Pause Stream
                  </>
                ) : (
                  <>
                    <Play size={10} fill="currentColor" /> Play Stream
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsManualMode(false);
                  setActiveCharIndex((prev) => (prev + 1) % preparedSequence.length);
                  playSynthSound?.('beep');
                }}
                disabled={preparedSequence.length <= 1}
                className="p-1 px-2.5 bg-black/60 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-30"
                title="Next character step"
              >
                <SkipForward size={11} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsManualMode(false);
                  setIsPlaying(false);
                  setActiveCharIndex(0);
                  playSynthSound?.('radar');
                }}
                className="p-1.5 bg-black/60 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all ml-1"
                title="Reset sequence timeline"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>

        </div>

        {/* 3. Vigenère D3 Vector Tabula Recta Panel (Right Column) */}
        <div className="lg:col-span-8 flex items-center justify-center min-h-[380px] select-none relative bg-black/20 border border-slate-900 rounded-2xl p-4">
          <div className="absolute top-4 right-4 z-10 flex gap-1 font-mono select-none">
            {/* Interactive Legend displays */}
            <span className="text-[7.5px] uppercase font-bold text-cyan-400 bg-cyan-900/10 border border-cyan-800/20 px-1.5 py-0.5 rounded">
              Col: Plaintext P ({activePtChar})
            </span>
            <span className="text-[7.5px] uppercase font-bold text-indigo-400 bg-indigo-900/10 border border-indigo-800/20 px-1.5 py-0.5 rounded">
              Row: Passkey K ({activeKeyChar})
            </span>
            <span className="text-[7.5px] uppercase font-bold text-amber-400 bg-amber-900/10 border border-amber-800/20 px-1.5 py-0.5 rounded">
              Cell: Result C ({activeCtChar})
            </span>
          </div>

          <div className="w-full flex justify-center items-center">
            {tabulaRectaSVG}
          </div>
        </div>

      </div>
    </div>
  );
}

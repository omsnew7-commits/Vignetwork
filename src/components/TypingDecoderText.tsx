import React, { useEffect, useState, useRef } from 'react';

interface TypingDecoderTextProps {
  text: string;
  className?: string;
}

const GLYPHS = "01XZ#%@$&*+?<>[]{}▒▓█⚡";

export default function TypingDecoderText({ text, className }: TypingDecoderTextProps) {
  const [displayText, setDisplayText] = useState("");
  const currentTargetRef = useRef(text);
  const frameRef = useRef<any>(null);

  useEffect(() => {
    currentTargetRef.current = text;
    if (!text) {
      setDisplayText("");
      return;
    }

    const length = text.length;
    let iteration = 0;
    const maxIterations = Math.max(10, Math.min(60, length * 1.5));
    
    const tick = () => {
      iteration++;
      const progress = iteration / maxIterations;
      const revealCount = Math.floor(progress * length);

      let currentText = "";
      for (let i = 0; i < length; i++) {
        if (i < revealCount) {
          currentText += currentTargetRef.current[i] || "";
        } else if (i < revealCount + 3) {
          // Glitching character buffer frontier
          const randGlyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          currentText += randGlyph;
        } else {
          // Unreached sequence padding
          currentText += ".";
        }
      }

      setDisplayText(currentText);

      if (iteration < maxIterations && currentTargetRef.current === text) {
        frameRef.current = setTimeout(tick, 30);
      } else if (currentTargetRef.current === text) {
        setDisplayText(text);
      }
    };

    // Begin rapid decoding effect sequence
    tick();

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, [text]);

  const baseClassName = className || "text-emerald-400 font-bold";

  return (
    <span className={`font-mono text-[10px] select-all whitespace-pre-wrap break-all tracking-wider relative block ${baseClassName}`}>
      {displayText}
      {displayText !== text && (
        <span className="ml-1 inline-block h-3.5 w-1.5 bg-current animate-pulse align-middle" />
      )}
    </span>
  );
}

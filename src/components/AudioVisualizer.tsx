import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface AudioVisualizerProps {
  isListening: boolean;
}

export function AudioVisualizer({ isListening }: AudioVisualizerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!isListening) return;

    let animationId: number;
    let audioCtx: AudioContext | null = null;
    let micStream: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        micStream = stream;
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Gives 32 frequency bins

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const numBars = 12;
        const barWidth = 2;
        const barGap = 2;
        const svgHeight = 16;
        const svgWidth = numBars * (barWidth + barGap) - barGap;

        // Set up SVG container
        const svg = d3.select(svgRef.current)
          .attr('width', svgWidth)
          .attr('height', svgHeight);

        // Clear children
        svg.selectAll('*').remove();

        // Glow filter and linear gradient for styling
        const defs = svg.append('defs');

        // Linear gradient (Cyberpunk Rose/Violet theme matching mic state)
        const gradient = defs.append('linearGradient')
          .attr('id', 'visualizerGrad')
          .attr('x1', '0%')
          .attr('y1', '100%')
          .attr('x2', '0%')
          .attr('y2', '0%');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', '#fda4af') // rose-300
          .attr('stop-opacity', 0.6);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', '#f43f5e') // rose-500
          .attr('stop-opacity', 1);

        const barsGroup = svg.append('g');

        const bars = barsGroup.selectAll('rect')
          .data(new Array(numBars).fill(0))
          .enter()
          .append('rect')
          .attr('x', (_, i) => i * (barWidth + barGap))
          .attr('width', barWidth)
          .attr('rx', 1)
          .attr('ry', 1)
          .attr('fill', 'url(#visualizerGrad)');

        const renderFrame = () => {
          if (!isListening) return;

          analyser.getByteFrequencyData(dataArray);

          // Downsample block to match visual bars count
          const barData = Array.from({ length: numBars }, (_, i) => {
            const index = Math.floor((i / numBars) * bufferLength);
            return dataArray[index] || 0;
          });

          bars.data(barData)
            .attr('height', (d) => {
              // Map frequency data [0, 255] to visual height of [2, svgHeight]
              const height = (d / 255) * svgHeight;
              return Math.max(2, height);
            })
            .attr('y', (d) => {
              const height = Math.max(2, (d / 255) * svgHeight);
              return (svgHeight - height) / 2; // vertically centered alignment
            });

          // Dynamic Voice Recognition Button Pulse
          const avgIntensity = barData.reduce((sum, val) => sum + val, 0) / (numBars || 1);
          const intensity = Math.min(1.0, avgIntensity / 150); // Normalized with high reactivity

          const btn = document.getElementById('voice-recognition-btn');
          if (btn) {
            // Colors shift from vibrant rose-500/rose-400 to electric cyber purple/cyan on high volume
            const r = Math.floor(244 - intensity * 160);
            const g = Math.floor(63 + intensity * 140);
            const b = Math.floor(94 + intensity * 150);
            
            const opacity = 0.2 + intensity * 0.45;
            const borderOpacity = 0.45 + intensity * 0.55;
            const shadowSpread = intensity * 14;

            btn.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            btn.style.borderColor = `rgba(${r}, ${g}, ${b}, ${borderOpacity})`;
            btn.style.color = intensity > 0.35 ? '#ffffff' : '#f43f5e';
            btn.style.transform = `scale(${1 + intensity * 0.16})`; // tight responsive pulse
            btn.style.boxShadow = intensity > 0.1 
              ? `0 0 ${shadowSpread}px rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.45})` 
              : 'none';
          }

          animationId = requestAnimationFrame(renderFrame);
        };

        renderFrame();
      })
      .catch((err) => {
        console.error('AudioVisualizer media access failed:', err);
      });

    return () => {
      cancelAnimationFrame(animationId);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close();
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }

      // Reset voice recognition button styles to clean defaults
      const btn = document.getElementById('voice-recognition-btn');
      if (btn) {
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.style.transform = '';
        btn.style.boxShadow = '';
      }
    };
  }, [isListening]);

  return (
    <div className="flex items-center justify-center animate-fade-in" style={{ height: '24px' }}>
      <svg ref={svgRef} className="overflow-visible opacity-80" />
    </div>
  );
}

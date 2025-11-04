
import React from 'react';
import type { Diagram, Instrument } from '../types';

export const getChordColor = (chordName: string): string => {
  const root = chordName.charAt(0).toUpperCase();
  switch (root) {
    case 'C': return 'var(--chord-c)';
    case 'D': return 'var(--chord-d)';
    case 'E': return 'var(--chord-e)';
    case 'F': return 'var(--chord-f)';
    case 'G': return 'var(--chord-g)';
    case 'A': return 'var(--chord-a)';
    case 'B': return 'var(--chord-b)';
    default: return 'var(--border)';
  }
};

const ChordDiagram: React.FC<{ diagram: Diagram; chordName: string; voicingIndex: number; viewMode: 'standard' | 'rotated', playingNoteIndices?: number[], instrument: Instrument }> = ({ diagram, chordName, voicingIndex, viewMode, playingNoteIndices, instrument }) => {
  const titleId = `chord-title-${chordName.replace(/[^a-zA-Z0-9]/g, '-')}-${voicingIndex}`;
  const FRET_COUNT = 5;
  const stringCount = diagram.frets.length;
  const isUkulele = instrument === 'ukulele';


  if (viewMode === 'rotated') {
    // Rotated 90 degrees CCW: W > H
    const W = isUkulele ? 200 : 240;
    const H = isUkulele ? 160 : 180;
    const PAD_Y = 30, PAD_X_LEFT = 40, PAD_X_RIGHT = 20;

    const FRETBOARD_W = W - PAD_X_LEFT - PAD_X_RIGHT;
    const FRETBOARD_H = H - PAD_Y * 2;

    const FRET_W = FRETBOARD_W / FRET_COUNT;
    const STRING_H = FRETBOARD_H / (stringCount - 1);

    // Y coordinates for each of the strings (horizontal)
    const stringYs = Array.from({ length: stringCount }, (_, i) => PAD_Y + i * STRING_H);
    // X coordinates for each of the 6 fret lines (vertical)
    const fretXs = Array.from({ length: FRET_COUNT + 1 }, (_, i) => PAD_X_LEFT + i * FRET_W);

    // High-to-low string order for display
    const stringNames = isUkulele ? ['A', 'E', 'C', 'G'] : ['e', 'B', 'G', 'D', 'A', 'E'];

    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="system-ui, sans-serif" fontSize="16px" fill="#e7ebf0" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{`${chordName} chord, voicing ${voicingIndex + 1} (rotated view)`}</title>
        
        {/* String names (on the left) */}
        {stringNames.map((name, i) => (
          <text key={`string-name-${i}`} x={PAD_X_LEFT - 30} y={stringYs[i]} textAnchor="middle" dominantBaseline="middle" fontSize="15px" fill="#8a99ab">{name}</text>
        ))}

        {/* Fret numbers (on top) */}
        {Array.from({ length: FRET_COUNT }, (_, i) => {
          const fretNumber = diagram.startFret + i;
          if (fretNumber < 1) return null;
          const xPos = fretXs[i] + FRET_W / 2;
          return <text key={`fret-num-${i}`} x={xPos} y={PAD_Y - 15} textAnchor="middle" dominantBaseline="middle" fontSize="14px" fill="#8a99ab">{fretNumber}</text>;
        })}

        {/* Frets (vertical lines) */}
        {fretXs.map((x, i) => {
          const isNut = diagram.startFret === 1 && i === 0;
          return <line key={`fret-line-${i}`} x1={x} y1={PAD_Y} x2={x} y2={H - PAD_Y} stroke={isNut ? '#e7ebf0' : '#334155'} strokeWidth={isNut ? 5 : 2} />;
        })}

        {/* Strings (horizontal lines) */}
        {stringYs.map((y, i) => (
          <line key={`string-line-${i}`} x1={PAD_X_LEFT} y1={y} x2={W - PAD_X_RIGHT} y2={y} stroke="#334155" strokeWidth="2" />
        ))}
        
        {/* Barres (vertical) */}
        {diagram.barres?.map((barre, i) => {
          const fretIndex = barre.fret - diagram.startFret;
          if (fretIndex >= 0 && fretIndex < FRET_COUNT) {
            const x = fretXs[fretIndex] + FRET_W / 2;
            const y1 = stringYs[barre.strings[0]];
            const y2 = stringYs[barre.strings[1]];
            return <line key={`barre-${i}`} x1={x} y1={y1} x2={x} y2={y2} stroke="currentColor" strokeWidth="13" strokeLinecap="round" />;
          }
          return null;
        })}

        {/* Frets (dots and open/muted strings) and Fingerings */}
        {diagram.frets.map((fret, stringIndex) => {
          const y = stringYs[stringIndex];
          const fingerVal = diagram.fingering[stringIndex];
          const key = `marker-${stringIndex}`;
          const isPlaying = playingNoteIndices?.includes(stringIndex);

          if (fret === 'x') {
            return <text key={key} x={PAD_X_LEFT - 12} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="14px" fill="#8a99ab">x</text>;
          }
          if (fret === 0) {
            return <circle key={key} cx={PAD_X_LEFT - 12} cy={y} r={isPlaying ? 6: 5} stroke={isPlaying ? 'var(--ok)' : "#8a99ab"} strokeWidth={isPlaying ? 3 : 2} fill={isPlaying ? 'rgba(104, 211, 145, 0.3)' : 'none'} />;
          }
          if (typeof fret === 'number' && fret > 0) {
            const fretIndex = fret - diagram.startFret;
            if (fretIndex >= 0 && fretIndex < FRET_COUNT) {
              const x = fretXs[fretIndex] + FRET_W / 2;
              const isBarred = diagram.barres?.some(b => 
                  b.fret === fret && 
                  stringIndex >= b.strings[0] && 
                  stringIndex <= b.strings[1]
              );
              if (!isBarred) {
                return (
                  <g key={key}>
                    {isPlaying && <circle cx={x} cy={y} r="14" fill="var(--ok)" opacity="0.6" />}
                    <circle cx={x} cy={y} r="9" fill="currentColor" />
                    {typeof fingerVal === 'number' && (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11px" fill="#12161b">{fingerVal}</text> 
                    )}
                  </g>
                );
              } else {
                if (typeof fingerVal === 'number') {
                  return (
                    <g key={key}>
                      {isPlaying && <circle cx={x} cy={y} r="14" fill="var(--ok)" opacity="0.6" />}
                      <circle cx={x} cy={y} r="9" fill="currentColor" opacity="0.7" />
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11px" fill="#12161b">{fingerVal}</text>
                    </g>
                  );
                }
              }
            }
          }
          return null;
        })}
      </svg>
    );
  } else {
    // Standard (vertical) view logic
    const W = isUkulele ? 160 : 200;
    const H = isUkulele ? 200 : 220;
    const PAD_X = 25, PAD_Y_TOP = 40, PAD_Y_BOTTOM = 20;

    const FRETBOARD_W = W - PAD_X * 2;
    const FRETBOARD_H = H - PAD_Y_TOP - PAD_Y_BOTTOM;

    const STRING_W = FRETBOARD_W / (stringCount - 1);
    const FRET_H = FRETBOARD_H / FRET_COUNT;

    const stringXs = Array.from({ length: stringCount }, (_, i) => PAD_X + i * STRING_W);
    const fretYs = Array.from({ length: FRET_COUNT + 1 }, (_, i) => PAD_Y_TOP + i * FRET_H);
    
    // Transform data back to standard low-to-high string order
    const frets = [...diagram.frets].reverse();
    const fingering = [...diagram.fingering].reverse();
    const barres = diagram.barres?.map(barre => ({
        ...barre,
        strings: [(stringCount - 1) - barre.strings[1], (stringCount - 1) - barre.strings[0]] as [number, number]
    }));

    const stringNames = isUkulele ? ['G', 'C', 'E', 'A'] : ['E', 'A', 'D', 'G', 'B', 'e'];

    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" fontFamily="system-ui, sans-serif" fontSize="16px" fill="#e7ebf0" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{`${chordName} chord, voicing ${voicingIndex + 1} (standard view)`}</title>
        
        {/* String names (on the bottom) */}
        {stringNames.map((name, i) => (
          <text key={`string-name-${i}`} x={stringXs[i]} y={H - (PAD_Y_BOTTOM - 16)} textAnchor="middle" dominantBaseline="middle" fontSize="15px" fill="#8a99ab">{name}</text>
        ))}

        {/* Fret numbers (on the left) */}
        {Array.from({ length: FRET_COUNT }, (_, i) => {
          const fretNumber = diagram.startFret + i;
          if (fretNumber < 1) return null;
          const yPos = fretYs[i] + FRET_H / 2;
          return <text key={`fret-num-${i}`} x={PAD_X - 16} y={yPos} textAnchor="middle" dominantBaseline="middle" fontSize="14px" fill="#8a99ab">{fretNumber}</text>;
        })}

        {/* Frets (horizontal lines) */}
        {fretYs.map((y, i) => {
          const isNut = diagram.startFret === 1 && i === 0;
          return <line key={`fret-line-${i}`} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke={isNut ? '#e7ebf0' : '#334155'} strokeWidth={isNut ? 5 : 2} />;
        })}

        {/* Strings (vertical lines) */}
        {stringXs.map((x, i) => (
          <line key={`string-line-${i}`} x1={x} y1={PAD_Y_TOP} x2={x} y2={H - PAD_Y_BOTTOM} stroke="#334155" strokeWidth="2" />
        ))}
        
        {/* Barres (horizontal) */}
        {barres?.map((barre, i) => {
          const fretIndex = barre.fret - diagram.startFret;
          if (fretIndex >= 0 && fretIndex < FRET_COUNT) {
            const y = fretYs[fretIndex] + FRET_H / 2;
            const x1 = stringXs[barre.strings[0]];
            const x2 = stringXs[barre.strings[1]];
            return <line key={`barre-${i}`} x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth="13" strokeLinecap="round" />;
          }
          return null;
        })}

        {/* Markers (dots, open/muted) and Fingerings */}
        {frets.map((fret, stringIndex) => {
          const x = stringXs[stringIndex];
          const fingerVal = fingering[stringIndex];
          const key = `marker-${stringIndex}`;
          const highToLowIndex = (stringCount - 1) - stringIndex;
          const isPlaying = playingNoteIndices?.includes(highToLowIndex);

          if (fret === 'x') {
            return <text key={key} x={x} y={PAD_Y_TOP - 10} textAnchor="middle" dominantBaseline="middle" fontSize="14px" fill="#8a99ab">x</text>;
          }
          if (fret === 0) {
            return <circle key={key} cx={x} cy={PAD_Y_TOP - 10} r={isPlaying ? 6: 5} stroke={isPlaying ? 'var(--ok)' : "#8a99ab"} strokeWidth={isPlaying ? 3 : 2} fill={isPlaying ? 'rgba(104, 211, 145, 0.3)' : 'none'} />;
          }
          if (typeof fret === 'number' && fret > 0) {
            const fretIndex = fret - diagram.startFret;
            if (fretIndex >= 0 && fretIndex < FRET_COUNT) {
              const y = fretYs[fretIndex] + FRET_H / 2;
              const isBarred = barres?.some(b => 
                  b.fret === fret && 
                  stringIndex >= b.strings[0] && 
                  stringIndex <= b.strings[1]
              );
              if (!isBarred) {
                return (
                  <g key={key}>
                    {isPlaying && <circle cx={x} cy={y} r="14" fill="var(--ok)" opacity="0.6" />}
                    <circle cx={x} cy={y} r="9" fill="currentColor" />
                    {typeof fingerVal === 'number' && (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11px" fill="#12161b">{fingerVal}</text> 
                    )}
                  </g>
                );
              } else {
                if (typeof fingerVal === 'number') {
                  return (
                    <g key={key}>
                      {isPlaying && <circle cx={x} cy={y} r="14" fill="var(--ok)" opacity="0.6" />}
                      <circle cx={x} cy={y} r="9" fill="currentColor" opacity="0.7" />
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11px" fill="#12161b">{fingerVal}</text>
                    </g>
                  );
                }
              }
            }
          }
          return null;
        })}
      </svg>
    );
  }
};

export default ChordDiagram;

import { getFingeringForVoicing } from './music';
import type { Diagram, VoicingData, ChordFromJSON, DisplayChord, Barre, Instrument } from './types';

function calculateStartFret(frets: (number | 'x')[]): number {
  const positiveFrets = frets.filter((f): f is number => typeof f === 'number' && f > 0);

  if (positiveFrets.length === 0) {
    return 1; // Only open/muted strings
  }

  const minPositiveFret = Math.min(...positiveFrets);
  const maxFret = Math.max(...positiveFrets);

  // If the highest fret is within the first 4 frets, always start at fret 1.
  if (maxFret <= 4) {
    return 1;
  }
  
  // Otherwise, start the diagram at the lowest fret used in the chord to ensure visibility.
  return minPositiveFret;
}

function reverseBarres(barres: Barre[] | undefined, stringCount: number): Barre[] | undefined {
    if (!barres) return undefined;
    const lastStringIndex = stringCount - 1;
    return barres.map(barre => {
        // A barre from old `s_start` to `s_end` becomes a barre from new `(count-1)-s_end` to `(count-1)-s_start`.
        return {
            ...barre,
            strings: [lastStringIndex - barre.strings[1], lastStringIndex - barre.strings[0]] as [number, number]
        };
    });
}

export function transformChordData(allChords: ChordFromJSON[], instrument: Instrument): DisplayChord[] {
  if (!allChords) return [];

  return allChords.reduce((acc: DisplayChord[], chord) => {
    // Filter out null or invalid voicings first
    const validVoicings = chord.voicings.filter((v): v is VoicingData => {
      if (!v) return false;
      if (!v.frets || !Array.isArray(v.frets) || v.frets.length === 0) return false;
      return v.frets.some(fret => fret != null);
    });

    // Heuristic: If the chord name is just a root note (e.g., 'A', 'Bb'),
    // it might be a container for both major and minor chords.
    const isAmbiguousRoot = /^[A-G][#b]?$/.test(chord.chord);

    const createDiagrams = (voicings: VoicingData[]): Diagram[] => {
        return voicings.map(v => {
            const stringCount = v.frets.length;
            const fingering = v.fingering && v.fingering.length ? v.fingering : getFingeringForVoicing(v.frets);
            
            // For display, high-pitched string is usually on top/right.
            // JSON is low-to-high. We reverse for visual consistency.
            return {
                frets: [...v.frets].reverse(),
                barres: reverseBarres(v.barres, stringCount),
                fingering: [...fingering].reverse(),
                startFret: calculateStartFret(v.frets),
                position: v.position,
                intervals: [...v.intervals].reverse(),
            };
        });
    };

    if (instrument === 'ukulele' && isAmbiguousRoot) {
      const majorVoicings: VoicingData[] = [];
      const minorVoicings: VoicingData[] = [];

      validVoicings.forEach(v => {
        // A voicing is minor if its intervals array includes a minor third ('m3')
        if (v.intervals?.includes('m3')) {
          minorVoicings.push(v);
        } else if (v.intervals?.includes('3')) {
          // It's major if it has a major third.
          majorVoicings.push(v);
        }
      });

      // Create a DisplayChord for Major voicings if they exist
      if (majorVoicings.length > 0) {
        acc.push({
          name: chord.chord,
          aliases: chord.aliases.filter(a => !/min/i.test(a) && !/m$/i.test(a)),
          tuning: chord.tuning,
          diagrams: createDiagrams(majorVoicings),
        });
      }

      // Create a DisplayChord for Minor voicings if they exist
      if (minorVoicings.length > 0) {
        acc.push({
          name: `${chord.chord}m`,
          aliases: chord.aliases.filter(a => /min/i.test(a)),
          tuning: chord.tuning,
          diagrams: createDiagrams(minorVoicings),
        });
      }
    } else {
      // For chords with explicit quality (e.g., 'A7', 'C#m'), process as a single group.
      if(validVoicings.length > 0) {
        acc.push({
          name: chord.chord,
          aliases: chord.aliases,
          tuning: chord.tuning,
          diagrams: createDiagrams(validVoicings),
        });
      }
    }
    return acc;
  }, []);
}
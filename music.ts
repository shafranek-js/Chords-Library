import { type StrummingPattern, type ArpeggioPattern, type RhythmPattern, type StrumCell, type ArpeggioCell, TimeSignature, Instrument } from './types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; // Canonical sharps
const FLAT_NOTES_DISPLAY = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']; // Preferred flats for display

const UKULELE_TUNING = ['G', 'C', 'E', 'A']; // G4, C4, E4, A4 - Standard Ukulele Tuning
const TUNING_INDICES = UKULELE_TUNING.map(note => NOTES.indexOf(note));

/**
 * Maps a note string (e.g., 'C', 'C#', 'Db') to its canonical semitone index (0-11).
 * Handles both sharp (#) and flat (b) notations.
 */
const noteToIndex = (note: string): number => {
  const normalizedNote = note.replace('♯', '#').replace('♭', 'b'); // Normalize sharp/flat symbols
  
  // Check if it's a natural or sharp note in our canonical NOTES array
  const index = NOTES.indexOf(normalizedNote);
  if (index !== -1) return index;

  // Check for flat notes
  if (normalizedNote.endsWith('b')) {
    const baseNote = normalizedNote.slice(0, -1);
    const baseIndex = NOTES.indexOf(baseNote);
    if (baseIndex !== -1) {
      // A flat note is one semitone below its natural counterpart.
      // E.g., Cb is B, Db is C#, Eb is D#, etc.
      return (baseIndex + 11) % 12;
    }
  }
  return -1; // Not a recognized note
};

/**
 * Gets the canonical note name (using sharps) played on a specific string and fret.
 */
const getNoteFromFret = (stringIndex: number, fret: number): string => {
  if (stringIndex < 0 || stringIndex >= TUNING_INDICES.length) {
    throw new Error('Invalid string index');
  }
  const openNoteIndex = TUNING_INDICES[stringIndex];
  const finalNoteIndex = (openNoteIndex + fret) % 12;
  return NOTES[finalNoteIndex]; // Always return canonical sharp/natural from internal NOTES array
};

const UKULELE_TUNING_MIDI = [79, 60, 64, 69]; // G4, C4, E4, A4 in GCEA order
const GUITAR_TUNING_MIDI = [64, 59, 55, 50, 45, 40]; // EADGBe from low E to high e, standard tuning MIDI notes E2, A2, D3, G3, B3, E4 -> 40, 45, 50, 55, 59, 64
const GUITAR_TUNING_MIDI_STD = [40, 45, 50, 55, 59, 64];

export const getNotesWithOctavesFromFrets = (frets: (number | 'x')[], instrument: Instrument): string[] => {
    const playedNotes: string[] = [];
    const tuning = instrument === 'ukulele' ? UKULELE_TUNING_MIDI : GUITAR_TUNING_MIDI_STD;

    frets.forEach((fret, i) => {
        if (typeof fret === 'number' && fret >= 0) {
            const midi = tuning[i] + fret;
            const octave = Math.floor(midi / 12) - 1;
            const noteName = NOTES[midi % 12];
            playedNotes.push(`${noteName}${octave}`);
        }
    });
    return playedNotes;
};

/**
 * Provides a heuristic-based fingering for a given set of frets if one isn't provided.
 * This is a simple fallback and may not always produce the most ergonomic fingering.
 * The logic is: lowest fret gets finger 1, next lowest gets finger 2, etc.
 * All strings at the same fret get the same finger, implying a barre or single-finger press.
 * @param frets An array representing the frets for strings G, C, E, A.
 * @returns An array of fingerings.
 */
export const getFingeringForVoicing = (frets: (number | 'x')[]): (number | 'O' | 'x' | null)[] => {
  const positiveFretsSet = new Set<number>();
  frets.forEach(fret => {
    if (typeof fret === 'number' && fret > 0) {
      positiveFretsSet.add(fret);
    }
  });

  const sortedUniqueFrets = Array.from(positiveFretsSet).sort((a, b) => a - b);
  
  const fretToFingerMap = new Map<number, number>();
  sortedUniqueFrets.forEach((fret, index) => {
    if (index < 4) { // Only assign up to 4 fingers
      fretToFingerMap.set(fret, index + 1);
    }
  });

  return frets.map(fret => {
    if (fret === 'x') {
      return 'x';
    }
    if (fret === 0) {
      return 'O';
    }
    if (typeof fret === 'number' && fret > 0) {
      return fretToFingerMap.get(fret) || null; // Return number or null if >4 fingers needed
    }
    return null; // Default for invalid fret values
  });
};


export const PRESET_PATTERNS: RhythmPattern[] = [
    { id: 'down-up-16th', name: 'Down-Up (16ths)', timeSignature: '4/4', type: 'strum', pattern: Array(16).fill(0).map((_, i) => ({ type: i % 2 === 0 ? 'down' : 'up', accent: false, duration: 1 })) },
    { id: 'down-up-8th', name: 'Down-Up (8ths)', timeSignature: '4/4', type: 'strum', pattern: Array(16).fill(0).map((_, i) => ({ type: (i%4 === 0) ? 'down' : (i%4 === 2) ? 'up' : 'rest', accent: i%4 === 0, duration: 2 })) },
    { id: 'island-strum', name: 'Island Strum', timeSignature: '4/4', type: 'strum', pattern: [
        { type: 'down', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'up', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'up', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 1 },
        { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
    ].flatMap(c => c.type !== 'rest' ? [c, ...Array(c.duration - 1).fill({ type: 'rest', accent: false, duration: 1 })] : c) },
    { id: 'slow-ballad', name: 'Slow Ballad', timeSignature: '4/4', type: 'strum', pattern: [
        { type: 'down', accent: true, duration: 4 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: true, duration: 4 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 4 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }
    ]},
    { id: 'swing-strum', name: 'Swing Strum', timeSignature: '4/4', type: 'strum', pattern: [
        { type: 'down', accent: true, duration: 3 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 1 },
        { type: 'down', accent: true, duration: 3 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 1 },
        { type: 'down', accent: true, duration: 3 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 1 },
        { type: 'down', accent: true, duration: 3 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 1 }
    ]},
    { id: 'down-4th', name: 'Down (4ths)', timeSignature: '4/4', type: 'strum', pattern: Array(16).fill(0).map((_, i) => ({ type: i % 4 === 0 ? 'down' : 'rest', accent: i % 4 === 0, duration: 4 })) },
    { id: 'reggae-skank', name: 'Reggae Skank', timeSignature: '4/4', type: 'strum', pattern: Array(16).fill(0).map((_, i) => ({ type: i % 4 === 2 ? 'up' : 'rest', accent: true, duration: 2 })) },
    { id: 'waltz', name: 'Waltz Strum', timeSignature: '3/4', type: 'strum', pattern: [
        { type: 'down', accent: true, duration: 4}, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2}, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 2}, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2}, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 2}, { type: 'rest', accent: false, duration: 1 },
    ]},
    {
      id: 'ascending-8th', name: 'Ascending Arp (8ths)', timeSignature: '4/4', type: 'arpeggio',
      pattern: [
          // G-string
          [{ active: true, accent: true, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: true, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
          // C-string
          [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
          // E-string
          [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
          // A-string
          [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, {active: false, accent: false, duration: 1}, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, {active: false, accent: false, duration: 1}]
      ]
    },
    {
      id: 'syncopated-8ths', name: 'Syncopated 8ths', timeSignature: '4/4', type: 'arpeggio',
      pattern: [
          // G-string
          [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
          // C-string
          [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, { active: false, accent: false, duration: 1 }],
          // E-string
          [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
          // A-string
          [{ active: true, accent: true, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: true, duration: 2 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }]
      ]
    },
    {
        id: 'waltz-arp-3-4', name: 'Waltz Arp (3/4)', timeSignature: '3/4', type: 'arpeggio',
        pattern: [
            // G-string
            [{ active: true, accent: true, duration: 4 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: true, duration: 4 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
            // C-string
            [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 4 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
            // E-string
            [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: true, accent: false, duration: 4 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }],
            // A-string
            [{ active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }, { active: false, accent: false, duration: 1 }]
        ]
    },
    { id: 'folk-strum', name: 'Folk Strum', timeSignature: '4/4', type: 'strum', pattern: [
        { type: 'down', accent: true, duration: 4 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'rest', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: true, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }
    ]},
    { id: 'bossa-nova', name: 'Bossa Nova', timeSignature: '4/4', type: 'strum', pattern: [
        { type: 'down', accent: true, duration: 3 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'up', accent: true, duration: 2 }, { type: 'rest', accent: false, duration: 1 },
        { type: 'down', accent: false, duration: 2 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }, { type: 'rest', accent: false, duration: 1 }
    ]},
    { id: 'classical-arp', name: 'Classical Arp', timeSignature: '4/4', type: 'arpeggio', pattern: [
        [{ active: true, accent: true, duration: 4 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 }],
        [{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 }],
        [{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 }],
        [{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: true, duration: 4 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 }]
    ]},
    { id: 'syncopated-picking', name: 'Syncopated Picking', timeSignature: '4/4', type: 'arpeggio', pattern: [
        [{ active: true, accent: true, duration: 3 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: true, duration: 3 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 }],
        [{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 }],
        [{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 2 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 }],
        [{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: true, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 },{ active: false, accent: false, duration: 1 }]
    ]}
];

export const getTimeSignatureInfo = (timeSignature: TimeSignature): { beatsPerMeasure: number, beatUnit: number, subdivisions: number, totalSubdivisions: number } => {
  switch (timeSignature) {
    // Simple Time - now subdivided into 16ths
    case '2/2': // 2 half-note beats
      return { beatsPerMeasure: 2, beatUnit: 2, subdivisions: 8, totalSubdivisions: 16 };
    case '2/4': // 2 quarter-note beats
      return { beatsPerMeasure: 2, beatUnit: 4, subdivisions: 4, totalSubdivisions: 8 };
    case '3/4': // 3 quarter-note beats
      return { beatsPerMeasure: 3, beatUnit: 4, subdivisions: 4, totalSubdivisions: 12 };
    case '4/4': // 4 quarter-note beats
      return { beatsPerMeasure: 4, beatUnit: 4, subdivisions: 4, totalSubdivisions: 16 };
    
    // Compound Time - now subdivided into 16ths
    case '3/8': // 3 eighth-note beats. Already was 16th notes.
      return { beatsPerMeasure: 3, beatUnit: 8, subdivisions: 2, totalSubdivisions: 6 };
    case '6/8': // 2 dotted-quarter beats. Now subdivided into 16ths
      return { beatsPerMeasure: 2, beatUnit: 8, subdivisions: 6, totalSubdivisions: 12 };
    case '9/8': // 3 dotted-quarter beats. Now subdivided into 16ths
      return { beatsPerMeasure: 3, beatUnit: 8, subdivisions: 6, totalSubdivisions: 18 };
    case '12/8': // 4 dotted-quarter beats. Now subdivided into 16ths
      return { beatsPerMeasure: 4, beatUnit: 8, subdivisions: 6, totalSubdivisions: 24 };
    default: // Default to 4/4
      return { beatsPerMeasure: 4, beatUnit: 4, subdivisions: 4, totalSubdivisions: 16 };
  }
};

export const getCustomPatterns = (): RhythmPattern[] => {
  try {
    const saved = localStorage.getItem('ukuleleCustomPatterns');
    if (!saved) return [];
    const patterns: RhythmPattern[] = JSON.parse(saved);
    // Migration for arpeggio patterns to add duration property and filter out old strum patterns
    return patterns.map(p => {
      if (p.type === 'strum' && Array.isArray(p.pattern) && p.pattern.length > 0 && typeof (p.pattern as any)[0] === 'string') {
        return null;
      }
      if (p.type === 'arpeggio' && p.pattern[0]?.[0] && p.pattern[0][0].duration === undefined) {
        return {
          ...p,
          pattern: (p.pattern as any).map((row: any) => row.map((cell: any) => ({ ...cell, duration: 1 })))
        };
      }
      return p;
    }).filter((p): p is RhythmPattern => p !== null);
  } catch (error) {
    console.error('Could not load custom patterns (might be old format):', error);
    return [];
  }
};

export const saveCustomPatterns = (patterns: RhythmPattern[]): void => {
  try {
    localStorage.setItem('ukuleleCustomPatterns', JSON.stringify(patterns));
  } catch (error) {
    console.error('Could not save custom patterns:', error);
  }
};

export const getNewStrumGrid = (timeSignature: TimeSignature): StrumCell[] => {
    const { totalSubdivisions } = getTimeSignatureInfo(timeSignature);
    return Array.from({ length: totalSubdivisions }, () => ({ type: 'rest', accent: false, duration: 1 }));
};

export const getNewArpeggioGrid = (timeSignature: TimeSignature, instrument: Instrument): ArpeggioCell[][] => {
    const { totalSubdivisions } = getTimeSignatureInfo(timeSignature);
    const stringCount = instrument === 'ukulele' ? 4 : 6;
    return Array.from({ length: stringCount }, () => Array.from({ length: totalSubdivisions }, () => ({ active: false, accent: false, duration: 1 })));
};
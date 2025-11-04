export type Instrument = 'ukulele' | 'guitar';

export interface Barre {
  fret: number;
  strings: [number, number]; // Start and end string indices (e.g., [0, 2])
}

export interface Diagram {
  startFret: number;
  frets: (number | 'x')[];
  barres?: Barre[];
  fingering: (number | 'O' | 'x' | null)[];
  position: string;
  intervals: string[];
}

// Data shape from JSON file
export interface VoicingData {
    frets: (number | 'x')[];
    barres?: Barre[];
    fingering: (number | 'O' | 'x')[];
    notes: string[];
    intervals: string[];
    position: string;
}

export interface ChordFromJSON {
    chord: string;
    aliases: string[];
    tuning: string;
    voicings: (VoicingData | null)[];
}

// Processed data shape for display
export interface DisplayChord {
  name: string;
  aliases: string[];
  tuning: string;
  diagrams: Diagram[];
}

// New types for practice sets
export interface PracticeSetItem {
  id: string;
  chordName: string;
  diagram: Diagram;
}

export interface SavedSet {
  name: string;
  voicings: PracticeSetItem[];
}


export type StrumGridEvent = 'rest' | 'down' | 'up' | 'mute';

export interface StrumCell {
  type: StrumGridEvent;
  accent: boolean;
  duration: number;
}

// Arpeggio Types
export type ArpeggioCell = { active: boolean; accent: boolean; duration: number; };
export type ArpeggioGrid = ArpeggioCell[][]; // 4 or 6 strings x N steps

export type TimeSignature = '4/4' | '3/4' | '2/4' | '2/2' | '6/8' | '3/8' | '9/8' | '12/8';

// Base interface for all rhythm patterns
interface BasePattern {
  id: string;
  name: string;
  timeSignature: TimeSignature;
}

// Specific pattern types
export interface StrummingPattern extends BasePattern {
  type: 'strum';
  pattern: StrumCell[];
}

export interface ArpeggioPattern extends BasePattern {
  type: 'arpeggio';
  pattern: ArpeggioGrid;
}

// A union of all possible rhythm pattern types
export type RhythmPattern = StrummingPattern | ArpeggioPattern;

// Custom patterns can be either type
export type CustomPattern = RhythmPattern;
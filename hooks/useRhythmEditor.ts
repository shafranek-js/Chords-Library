
import { useState, useMemo, useRef, Dispatch, SetStateAction } from 'react';
import type { Diagram, DisplayChord, RhythmPattern, TimeSignature, ArpeggioGrid, StrumCell, Instrument } from '../types';
import { PRESET_PATTERNS, getNewArpeggioGrid, getNewStrumGrid } from '../music';
import { RhythmEditorModalProps } from '../components/RhythmEditorModal';

interface UseRhythmEditorProps {
    allPatterns: RhythmPattern[];
    customPatterns: RhythmPattern[];
    setCustomPatterns: (patterns: RhythmPattern[]) => void;
    setActivePatternId: Dispatch<SetStateAction<string>>;
    chords: DisplayChord[];
    viewMode: 'standard' | 'rotated';
    instrument: Instrument;
}

export const useRhythmEditor = ({ allPatterns, customPatterns, setCustomPatterns, setActivePatternId, chords, viewMode, instrument }: UseRhythmEditorProps) => {
    // Rhythm Editor State
    const [isRhythmEditorOpen, setRhythmEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<'new' | 'edit' | 'clone'>('new');
    const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
    const [editorPatternName, setEditorPatternName] = useState('New Pattern');
    const [editorTimeSignature, setEditorTimeSignature] = useState<TimeSignature>('4/4');
    const [editorPatternType, setEditorPatternType] = useState<'strum' | 'arpeggio'>('strum');
    const [editorStrumGrid, setEditorStrumGrid] = useState<StrumCell[]>([]);
    const [editorArpeggioGrid, setEditorArpeggioGrid] = useState<ArpeggioGrid>([]);

    // Editor Preview State
    const [editorPreviewChord, setEditorPreviewChord] = useState<string>('C');
    const [editorBPM, setEditorBPM] = useState<number>(120);
    const [isEditorPlaying, setIsEditorPlaying] = useState<boolean>(false);
    const [editorPlayingNoteIndices, setEditorPlayingNoteIndices] = useState<number[]>([]);
    const editorPlayheadRef = useRef<HTMLDivElement>(null);

    const editorPreviewDiagram = useMemo(() => {
        const chord = chords.find(c => c.name === editorPreviewChord);
        return chord?.diagrams[0];
    }, [editorPreviewChord, chords]);

    const handleOpenRhythmEditor = (patternIdToEdit?: string) => {
        if (isEditorPlaying) {
            setIsEditorPlaying(false);
        }
        if (patternIdToEdit) {
            const pattern = allPatterns.find(p => p.id === patternIdToEdit);
            if (pattern) {
                const isPreset = PRESET_PATTERNS.some(p => p.id === pattern.id);
                setEditorMode(isPreset ? 'clone' : 'edit');
                setEditingPatternId(pattern.id);
                setEditorPatternName(isPreset ? `Copy of ${pattern.name}` : pattern.name);
                setEditorTimeSignature(pattern.timeSignature);
                setEditorPatternType(pattern.type);

                if (pattern.type === 'strum') {
                    setEditorStrumGrid(pattern.pattern.map(cell => ({...cell})));
                    setEditorArpeggioGrid(getNewArpeggioGrid(pattern.timeSignature, instrument));
                } else { // arpeggio
                    const patternToLoad = pattern.pattern as ArpeggioGrid;
                    const newStringCount = instrument === 'ukulele' ? 4 : 6;
                    
                    if (patternToLoad.length !== newStringCount) {
                        const newGrid = getNewArpeggioGrid(pattern.timeSignature, instrument);
                        
                        // Copy from highest string down
                        const stringsToCopy = Math.min(patternToLoad.length, newGrid.length);
                        for(let i = 0; i < stringsToCopy; i++) {
                            const sourceIndex = patternToLoad.length - 1 - i;
                            const destIndex = newGrid.length - 1 - i;
                            
                            if (patternToLoad[sourceIndex] && newGrid[destIndex]) {
                                 const stepsToCopy = Math.min(patternToLoad[sourceIndex].length, newGrid[destIndex].length);
                                 for (let j = 0; j < stepsToCopy; j++) {
                                    if (patternToLoad[sourceIndex][j]) {
                                        newGrid[destIndex][j] = { ...patternToLoad[sourceIndex][j] };
                                    }
                                 }
                            }
                        }
                        setEditorArpeggioGrid(newGrid);
                    } else {
                        setEditorArpeggioGrid(patternToLoad.map(row => row.map(cell => ({...cell}))));
                    }
                    
                    setEditorStrumGrid(getNewStrumGrid(pattern.timeSignature));
                }
            }
        } else {
            // New pattern
            setEditorMode('new');
            setEditingPatternId(null);
            setEditorPatternName('New Pattern');
            const defaultTimeSig: TimeSignature = '4/4';
            const defaultType = 'arpeggio';
            setEditorTimeSignature(defaultTimeSig);
            setEditorPatternType(defaultType);
            setEditorStrumGrid(getNewStrumGrid(defaultTimeSig));
            setEditorArpeggioGrid(getNewArpeggioGrid(defaultTimeSig, instrument));
        }
        setRhythmEditorOpen(true);
    };

    const handleSavePattern = (asNew: boolean) => {
        let patternToSave: RhythmPattern;

        if (editorPatternType === 'strum') {
            patternToSave = {
                id: (editorMode === 'edit' && !asNew) ? editingPatternId! : `custom_${Date.now()}`,
                name: editorPatternName || 'Unnamed Pattern',
                timeSignature: editorTimeSignature,
                type: 'strum',
                pattern: editorStrumGrid,
            };
        } else {
            patternToSave = {
                id: (editorMode === 'edit' && !asNew) ? editingPatternId! : `custom_${Date.now()}`,
                name: editorPatternName || 'Unnamed Pattern',
                timeSignature: editorTimeSignature,
                type: 'arpeggio',
                pattern: editorArpeggioGrid,
            };
        }

        let newPatterns: RhythmPattern[];
        if (editorMode === 'edit' && !asNew) {
            newPatterns = customPatterns.map(p => p.id === editingPatternId ? patternToSave : p);
        } else {
            newPatterns = [...customPatterns, patternToSave];
        }

        setCustomPatterns(newPatterns);
        setActivePatternId(patternToSave.id);
        setRhythmEditorOpen(false);
    };
    
    const rhythmEditorProps: RhythmEditorModalProps = {
        isOpen: isRhythmEditorOpen,
        onClose: () => {
            setIsEditorPlaying(false); // Ensure playback stops on close
            setRhythmEditorOpen(false);
        },
        mode: editorMode,
        patternName: editorPatternName,
        setPatternName: setEditorPatternName,
        timeSignature: editorTimeSignature,
        setTimeSignature: setEditorTimeSignature,
        patternType: editorPatternType,
        setPatternType: setEditorPatternType,
        strumGrid: editorStrumGrid,
        setStrumGrid: setEditorStrumGrid,
        arpeggioGrid: editorArpeggioGrid,
        setArpeggioGrid: setEditorArpeggioGrid,
        onSave: handleSavePattern,
        previewChord: editorPreviewChord,
        setPreviewChord: setEditorPreviewChord,
        bpm: editorBPM,
        setBPM: setEditorBPM,
        isPlaying: isEditorPlaying,
        setIsPlaying: setIsEditorPlaying,
        playheadRef: editorPlayheadRef,
        previewDiagram: editorPreviewDiagram,
        playingNoteIndices: editorPlayingNoteIndices,
        setPlayingNoteIndices: setEditorPlayingNoteIndices,
        viewMode: viewMode,
        instrument: instrument,
    };

    return {
        rhythmEditorProps,
        handleOpenRhythmEditor,
    };
};

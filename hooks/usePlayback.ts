import { useState, useRef, useEffect, useCallback } from 'react';
import type { PracticeSetItem, RhythmPattern, Instrument } from '../types';
import { audio } from '../audio';
import { getNotesWithOctavesFromFrets, getTimeSignatureInfo } from '../music';

interface UsePlaybackProps {
    practiceSet: PracticeSetItem[];
    allPatterns: RhythmPattern[];
    activePatternId: string;
    bpm: number;
    instrument: Instrument;
}

export const usePlayback = ({ practiceSet, allPatterns, activePatternId, bpm, instrument }: UsePlaybackProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [playingChordId, setPlayingChordId] = useState<string | null>(null);
    const [playingNoteIndices, setPlayingNoteIndices] = useState<number[]>([]);

    const schedulerIntervalRef = useRef<number | null>(null);
    const nextNoteTime = useRef(0);
    const currentStep = useRef(0);
    const currentChordIndex = useRef(0);
    const isPlayingRef = useRef(false);
    const scheduledUITimeouts = useRef<number[]>([]);

    const handleStopSet = useCallback(() => {
        isPlayingRef.current = false;
        if (schedulerIntervalRef.current) {
            clearInterval(schedulerIntervalRef.current);
            schedulerIntervalRef.current = null;
        }
        scheduledUITimeouts.current.forEach(clearTimeout);
        scheduledUITimeouts.current = [];
        audio.stop();
        setIsPlaying(false);
        setPlayingChordId(null);
        setPlayingNoteIndices([]);
    }, []);
    
    useEffect(() => {
        return () => {
            handleStopSet();
        };
    }, [handleStopSet]);

    const scheduler = useCallback(() => {
        const context = audio.getContext();
        if (!isPlayingRef.current || !context) {
            return;
        }

        const lookahead = 0.1; // 100ms
        
        while (nextNoteTime.current < context.currentTime + lookahead) {
            const currentPattern = allPatterns.find(p => p.id === activePatternId)!;
            const { totalSubdivisions, subdivisions } = getTimeSignatureInfo(currentPattern.timeSignature);
            const stepDuration = (60 / bpm) / subdivisions;

            const currentChord = practiceSet[currentChordIndex.current];
            // diagram.frets is in high-to-low visual order, reverse it for low-to-high tuning order
            const fretsForAudio = [...currentChord.diagram.frets].reverse();
            const notes = getNotesWithOctavesFromFrets(fretsForAudio, instrument);
            
            const scheduledTime = nextNoteTime.current;
            const chordIdToPlay = currentChord.id;
            const stepToPlay = currentStep.current;
            
            const uiTimeout = window.setTimeout(() => {
                if (!isPlayingRef.current) return;
                setPlayingChordId(chordIdToPlay);
                
                if (currentPattern.type === 'arpeggio') {
                    const playedIndices: number[] = [];
                    currentPattern.pattern.forEach((row, stringIdx) => {
                        if (row[stepToPlay]?.active) {
                            // stringIdx is low-to-high, diagram wants high-to-low
                            playedIndices.push((notes.length - 1) - stringIdx);
                        }
                    });
                    setPlayingNoteIndices(playedIndices);
                } else {
                    setPlayingNoteIndices([]);
                }
            }, (scheduledTime - context.currentTime) * 1000);
            scheduledUITimeouts.current.push(uiTimeout);

            if (currentPattern.type === 'strum') {
                const cell = currentPattern.pattern[stepToPlay];
                if (cell && cell.type !== 'rest') {
                    const noteDuration = stepDuration * cell.duration;
                    if (cell.type === 'mute') {
                        audio.playMute(noteDuration, scheduledTime);
                    } else {
                        audio.playStrum(notes, cell.type, noteDuration, cell.accent, scheduledTime);
                    }
                }
            } else { // Arpeggio
                 const notesToPlay: { note: string; accent: boolean; duration: number; }[] = [];
                 currentPattern.pattern.forEach((stringRow, stringIndex) => {
                     const cell = stringRow[stepToPlay];
                     if (cell?.active && notes[stringIndex]) {
                         const noteDuration = stepDuration * (cell.duration || 1);
                         notesToPlay.push({ note: notes[stringIndex], accent: cell.accent, duration: noteDuration });
                     }
                 });
                 if (notesToPlay.length > 0) {
                     audio.playNotes(notesToPlay, scheduledTime);
                 }
            }
            
            nextNoteTime.current += stepDuration;
            currentStep.current++;
            if (currentStep.current >= totalSubdivisions) {
                currentStep.current = 0;
                currentChordIndex.current = (currentChordIndex.current + 1) % practiceSet.length;
            }
        }
    }, [allPatterns, activePatternId, bpm, practiceSet, instrument]);


    const handlePlaySet = async () => {
        if (isPlayingRef.current) return;

        if (!audio.isReady()) {
            await audio.init(setIsAudioLoading);
        }
        const context = audio.getContext();
        if (!audio.isReady() || practiceSet.length === 0 || !context) return;
        if (context.state === 'suspended') {
            await context.resume();
        }
        
        isPlayingRef.current = true;
        setIsPlaying(true);
        audio.stop();

        currentChordIndex.current = 0;
        currentStep.current = 0;
        nextNoteTime.current = context.currentTime + 0.1;

        const scheduleInterval = 25; // ms
        schedulerIntervalRef.current = window.setInterval(scheduler, scheduleInterval);
    };

    return {
        isPlaying,
        isAudioLoading,
        playingChordId,
        playingNoteIndices,
        handlePlaySet,
        handleStopSet,
    };
};
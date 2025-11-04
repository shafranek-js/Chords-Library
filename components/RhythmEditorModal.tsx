
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Diagram, TimeSignature, StrumGridEvent, ArpeggioGrid, StrumCell, Instrument } from '../types';
import { getTimeSignatureInfo, getNewArpeggioGrid, getNewStrumGrid, getNotesWithOctavesFromFrets } from '../music';
import { audio } from '../audio';
import ChordDiagram from './ChordDiagram';

const getNoteDurationText = (duration: number): string => {
    switch (duration) {
        case 1: return "1/16";
        case 2: return "1/8";
        case 3: return "1/8.";
        case 4: return "1/4";
        case 6: return "1/4.";
        case 8: return "1/2";
        case 12: return "1/2.";
        case 16: return "1";
        default: {
            const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
            const commonDivisor = gcd(duration, 16);
            const num = duration / commonDivisor;
            const den = 16 / commonDivisor;

            if (den === 1) {
                return num.toString();
            }
            return `${num}/${den}`;
        }
    }
};

export interface RhythmEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'new' | 'edit' | 'clone';
    patternName: string;
    setPatternName: (name: string) => void;
    timeSignature: TimeSignature;
    setTimeSignature: (ts: TimeSignature) => void;
    patternType: 'strum' | 'arpeggio';
    setPatternType: (type: 'strum' | 'arpeggio') => void;
    strumGrid: StrumCell[];
    setStrumGrid: (grid: StrumCell[]) => void;
    arpeggioGrid: ArpeggioGrid;
    setArpeggioGrid: (grid: ArpeggioGrid) => void;
    onSave: (asNew: boolean) => void;
    previewChord: string;
    setPreviewChord: (chord: string) => void;
    bpm: number;
    setBPM: (bpm: number) => void;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    playheadRef: React.RefObject<HTMLDivElement>;
    previewDiagram: Diagram | undefined;
    playingNoteIndices: number[];
    setPlayingNoteIndices: (indices: number[]) => void;
    viewMode: 'standard' | 'rotated';
    instrument: Instrument;
}

const RhythmEditorModal: React.FC<RhythmEditorModalProps> = (props) => {
    if (!props.isOpen) return null;

    const {
        onClose, mode, patternName, setPatternName, timeSignature, setTimeSignature, patternType, setPatternType,
        strumGrid, setStrumGrid, arpeggioGrid, setArpeggioGrid, onSave,
        previewChord, setPreviewChord, bpm, setBPM, isPlaying, setIsPlaying,
        playheadRef,
        previewDiagram, playingNoteIndices, setPlayingNoteIndices, viewMode, instrument
    } = props;
    
    const { totalSubdivisions, beatsPerMeasure } = getTimeSignatureInfo(timeSignature);
    const isNew = mode === 'new';

    const gridRef = useRef<HTMLDivElement>(null);
    const [dragInfo, setDragInfo] = useState<{
        stringIndex: number;
        stepIndex: number;
        startX: number;
        cellWidth: number;
        initialDuration: number;
    } | null>(null);
    
    const [isDrawingStrum, setIsDrawingStrum] = useState(false);
    const drawTypeRef = useRef<StrumGridEvent>('down');

    // Scheduler state
    const schedulerIntervalRef = useRef<number | null>(null);
    const nextNoteTime = useRef(0);
    const currentStep = useRef(0);
    const isPlayingRef = useRef(isPlaying);
    const scheduledUITimeouts = useRef<number[]>([]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // Stop playback and clean up
    const stopPlayback = useCallback(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (schedulerIntervalRef.current) {
            clearInterval(schedulerIntervalRef.current);
            schedulerIntervalRef.current = null;
        }
        scheduledUITimeouts.current.forEach(clearTimeout);
        scheduledUITimeouts.current = [];
        audio.stop();
        setPlayingNoteIndices([]);
        if (playheadRef.current) {
            playheadRef.current.style.opacity = '0';
        }
    }, [setIsPlaying, setPlayingNoteIndices, playheadRef]);

    useEffect(() => {
        return () => stopPlayback();
    }, [stopPlayback]);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragInfo) return;
            
            const deltaX = e.clientX - dragInfo.startX;
            const durationChange = Math.round(deltaX / dragInfo.cellWidth);
            let newDuration = dragInfo.initialDuration + durationChange;

            if (newDuration < 1) newDuration = 1;

            const maxDuration = totalSubdivisions - dragInfo.stepIndex;
            if (newDuration > maxDuration) newDuration = maxDuration;
            
            if (dragInfo.stringIndex === -1) { // Strum grid
                const newGrid = [...strumGrid];
                for (let i = 1; i < newDuration; i++) {
                    if (newGrid[dragInfo.stepIndex + i]?.type !== 'rest') {
                        newDuration = i;
                        break;
                    }
                }
                const cell = newGrid[dragInfo.stepIndex];
                if (cell.duration !== newDuration) {
                    const oldDuration = cell.duration;
                    cell.duration = newDuration;
                    for (let i = newDuration; i < oldDuration; i++) {
                        newGrid[dragInfo.stepIndex + i] = { type: 'rest', accent: false, duration: 1 };
                    }
                    setStrumGrid(newGrid);
                }
            } else { // Arpeggio grid
                const newGrid = arpeggioGrid.map(row => row.map(cell => ({...cell})));
                for (let i = 1; i < newDuration; i++) {
                    if (newGrid[dragInfo.stringIndex][dragInfo.stepIndex + i]?.active) {
                        newDuration = i;
                        break;
                    }
                }
                const cell = newGrid[dragInfo.stringIndex][dragInfo.stepIndex];
                if (cell.duration !== newDuration) {
                    cell.duration = newDuration;
                    setArpeggioGrid(newGrid);
                }
            }
        };

        const handleMouseUp = () => {
            setDragInfo(null);
        };
        
        if (dragInfo) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragInfo, arpeggioGrid, setArpeggioGrid, strumGrid, setStrumGrid, totalSubdivisions]);


    const handleTimeSignatureChange = (ts: TimeSignature) => {
        if (ts === timeSignature) return;
        setTimeSignature(ts);
        setStrumGrid(getNewStrumGrid(ts));
        setArpeggioGrid(getNewArpeggioGrid(ts, instrument));
    };

    const handlePatternTypeChange = (type: 'strum' | 'arpeggio') => {
        if (type === patternType) return;
        setPatternType(type);
        setStrumGrid(getNewStrumGrid(timeSignature));
        setArpeggioGrid(getNewArpeggioGrid(timeSignature, instrument));
    };

    const handleStrumGridMouseDown = (e: React.MouseEvent, stepIndex: number) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setIsDrawingStrum(true);

        let targetStep = stepIndex;
        for (let i = 1; i <= stepIndex; i++) {
            const prevStepIndex = stepIndex - i;
            const prevCell = strumGrid[prevStepIndex];
            if (prevCell && prevCell.type !== 'rest' && prevCell.duration > i) {
                targetStep = prevStepIndex;
                break;
            }
        }

        const newGrid = [...strumGrid];
        const cell = newGrid[targetStep];
        if (!cell) return;

        const oldDuration = cell.duration;
        if (cell.type !== 'rest' && oldDuration > 1) {
            for (let i = 1; i < oldDuration; i++) {
                if (newGrid[targetStep + i]) {
                    newGrid[targetStep + i] = { type: 'rest', accent: false, duration: 1 };
                }
            }
        }
        
        switch (cell.type) {
            case 'rest':
                if (targetStep !== stepIndex) return;
                cell.type = 'down';
                drawTypeRef.current = 'down';
                cell.duration = 1;
                cell.accent = false;
                break;
            case 'down':
                cell.type = 'up';
                drawTypeRef.current = 'up';
                cell.duration = 1;
                break;
            case 'up':
                cell.type = 'mute';
                drawTypeRef.current = 'mute';
                cell.duration = 1;
                cell.accent = false;
                break;
            case 'mute':
                cell.type = 'rest';
                drawTypeRef.current = 'rest';
                cell.duration = 1;
                cell.accent = false;
                break;
        }
        setStrumGrid(newGrid);
    };
    
    const handleStrumGridMouseEnter = (stepIndex: number) => {
        if (!isDrawingStrum) return;

        const newGrid = [...strumGrid];
        const cell = newGrid[stepIndex];
        
        if (cell.type === 'rest') {
            const typeToDraw = drawTypeRef.current;
            cell.type = typeToDraw;
            cell.duration = 1;
            cell.accent = (typeToDraw === 'down' || typeToDraw === 'up') ? false : cell.accent; 
            setStrumGrid(newGrid);
        }
    };


    const handleStrumGridRightClick = (stepIndex: number) => {
        let targetStep = stepIndex;
        for (let i = 1; i <= stepIndex; i++) {
            const prevStepIndex = stepIndex - i;
            if (strumGrid[prevStepIndex].type !== 'rest' && strumGrid[prevStepIndex].duration > i) {
                targetStep = prevStepIndex;
                break;
            }
        }
        const newGrid = [...strumGrid];
        const cell = newGrid[targetStep];
        if (cell.type === 'down' || cell.type === 'up') {
            cell.accent = !cell.accent;
            setStrumGrid(newGrid);
        }
    };
    
    const handleArpeggioGridMouseDown = async (e: React.MouseEvent, stringIndex: number, stepIndex: number) => {
        if (e.button !== 0) return;

        let targetStep = stepIndex;
        for (let i = 1; i <= stepIndex; i++) {
            const prevStepIndex = stepIndex - i;
            const prevCell = arpeggioGrid[stringIndex][prevStepIndex];
            if (prevCell.active && (prevCell.duration || 1) > i) {
                targetStep = prevStepIndex;
                break;
            }
        }
    
        const newGrid = arpeggioGrid.map(row => row.map(cell => ({...cell})));
        const cell = newGrid[stringIndex][targetStep];
        const wasActive = cell.active;
        
        if (wasActive) {
            cell.active = false;
            cell.duration = 1;
            cell.accent = false;
            setArpeggioGrid(newGrid);
        } else {
            if (targetStep !== stepIndex) return;
            const newCell = newGrid[stringIndex][stepIndex];
            newCell.active = true;
            setArpeggioGrid(newGrid);
            
            if (!audio.isReady()) await audio.init(() => {});

            if (!previewDiagram) return;
            const baseFrets = [...previewDiagram.frets].reverse();
            const notes = getNotesWithOctavesFromFrets(baseFrets, instrument);
            const noteToPlay = notes[stringIndex];

            if (noteToPlay && audio.getContext()) {
                audio.playNotes([{ note: noteToPlay, accent: false, duration: 0.5 }], audio.getContext()!.currentTime);
            }
        }
    };
    
    const handleArpeggioGridRightClick = (stringIndex: number, stepIndex: number) => {
        let targetStep = stepIndex;
        for (let i = 1; i <= stepIndex; i++) {
            const prevStepIndex = stepIndex - i;
            if (arpeggioGrid[stringIndex][prevStepIndex].active && (arpeggioGrid[stringIndex][prevStepIndex].duration || 1) > i) {
                targetStep = prevStepIndex;
                break;
            }
        }

        const newGrid = arpeggioGrid.map(row => row.map(cell => ({...cell})));
        const cell = newGrid[stringIndex][targetStep];
        if (cell.active) {
            cell.accent = !cell.accent;
            setArpeggioGrid(newGrid);
        }
    }
    
    const handleResizeStart = (e: React.MouseEvent, stringIndex: number, stepIndex: number) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (gridRef.current) {
            const cellWidth = gridRef.current.clientWidth / totalSubdivisions;
            const cell = stringIndex === -1 ? strumGrid[stepIndex] : arpeggioGrid[stringIndex][stepIndex];
            setDragInfo({
                stringIndex,
                stepIndex: stepIndex,
                startX: e.clientX,
                cellWidth,
                initialDuration: cell.duration || 1,
            });
        }
    };
    
    const startPlayback = async () => {
        if (!audio.isReady()) await audio.init(() => {});
        const context = audio.getContext();
        if (!audio.isReady() || !context) return;
        if (context.state === 'suspended') await context.resume();

        setIsPlaying(true);
        isPlayingRef.current = true;
        audio.stop();

        const lookahead = 0.1;
        const scheduleInterval = 25;
        
        currentStep.current = 0;
        nextNoteTime.current = context.currentTime + 0.1;
        
        const scheduler = () => {
            if (!isPlayingRef.current || !context) return;

            while (nextNoteTime.current < context.currentTime + lookahead) {
                const { totalSubdivisions, subdivisions } = getTimeSignatureInfo(timeSignature);
                const stepDuration = (60 / bpm) / subdivisions;

                if (!previewDiagram) {
                    stopPlayback();
                    return;
                }
                const fretsForAudio = [...previewDiagram.frets].reverse();
                const notes = getNotesWithOctavesFromFrets(fretsForAudio, instrument);
                
                const scheduledTime = nextNoteTime.current;
                const stepToPlay = currentStep.current;

                const uiTimeout = window.setTimeout(() => {
                    if (!isPlayingRef.current) return;
                    if (playheadRef.current) {
                        const cellWidthPercentage = 100 / totalSubdivisions;
                        playheadRef.current.style.transition = 'none'; 
                        playheadRef.current.style.width = `${cellWidthPercentage}%`;
                        playheadRef.current.style.left = `${stepToPlay * cellWidthPercentage}%`;
                        playheadRef.current.style.opacity = '0.4';
                    }
                    if (patternType === 'arpeggio') {
                        const playedIndices: number[] = [];
                        const stringCount = arpeggioGrid.length;
                        arpeggioGrid.forEach((row, stringIdx) => {
                            if (row[stepToPlay]?.active) playedIndices.push((stringCount - 1) - stringIdx);
                        });
                        setPlayingNoteIndices(playedIndices);
                    }
                }, (scheduledTime - context.currentTime) * 1000);
                scheduledUITimeouts.current.push(uiTimeout);
                
                if (patternType === 'strum') {
                    const cell = strumGrid[stepToPlay];
                    if (cell && cell.type !== 'rest') {
                        const noteDuration = stepDuration * cell.duration;
                        if (cell.type === 'mute') audio.playMute(noteDuration, scheduledTime);
                        else audio.playStrum(notes, cell.type, noteDuration, cell.accent, scheduledTime);
                    }
                } else {
                    const notesToPlay: { note: string; accent: boolean; duration: number; }[] = [];
                    arpeggioGrid.forEach((stringRow, stringIndex) => {
                        const cell = stringRow[stepToPlay];
                        if (cell?.active && notes[stringIndex]) {
                            const noteDuration = stepDuration * (cell.duration || 1);
                            notesToPlay.push({ note: notes[stringIndex], accent: cell.accent, duration: noteDuration });
                        }
                    });
                    if (notesToPlay.length > 0) audio.playNotes(notesToPlay, scheduledTime);
                }
                
                nextNoteTime.current += stepDuration;
                currentStep.current = (currentStep.current + 1) % totalSubdivisions;
            }
        };

        schedulerIntervalRef.current = window.setInterval(scheduler, scheduleInterval);
    };

    const handleTogglePlayback = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    };
    
    const handleClose = () => {
      stopPlayback();
      onClose();
    };
    
    const handleClearPattern = () => {
        if (isPlaying) stopPlayback();
        if (patternType === 'strum') setStrumGrid(getNewStrumGrid(timeSignature));
        else setArpeggioGrid(getNewArpeggioGrid(timeSignature, instrument));
    };
    
    const getStrumIcon = (type: StrumGridEvent, accent: boolean) => {
        switch(type) {
            case 'down': return accent ? '⬇' : '↓';
            case 'up': return accent ? '⬆' : '↑';
            case 'mute': return 'x';
            default: return '·';
        }
    };

    const stringLabelsHighToLow = instrument === 'ukulele' ? ['A', 'E', 'C', 'G'] : ['e', 'B', 'G', 'D', 'A', 'E'];
    const stringNamesLowToHigh = instrument === 'ukulele' ? ['G','C','E','A'] : ['E','A','D','G','B','e'];
    
    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content rhythm-editor" onClick={e => e.stopPropagation()} onMouseUp={() => setIsDrawingStrum(false)}>
                <div className="modal-header">
                    <h3>Rhythm Editor</h3>
                    <button onClick={handleClose} className="close-btn" aria-label="Close modal">&times;</button>
                </div>
                <div className="editor-controls">
                    <div className="form-group">
                        <label htmlFor="pattern-name">Pattern Name</label>
                        <input id="pattern-name" type="text" value={patternName} onChange={e => setPatternName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="pattern-type">Pattern Type</label>
                        <select id="pattern-type" value={patternType} onChange={e => handlePatternTypeChange(e.target.value as 'strum' | 'arpeggio')} disabled={!isNew}>
                            <option value="strum">Strum</option>
                            <option value="arpeggio">Arpeggio</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="time-signature">Time Signature</label>
                        <select id="time-signature" value={timeSignature} onChange={e => handleTimeSignatureChange(e.target.value as TimeSignature)}>
                            <optgroup label="Simple">
                                <option value="2/4">2/4</option>
                                <option value="3/4">3/4</option>
                                <option value="4/4">4/4</option>
                                <option value="2/2">2/2</option>
                            </optgroup>
                            <optgroup label="Compound">
                                <option value="3/8">3/8</option>
                                <option value="6/8">6/8</option>
                                <option value="9/8">9/8</option>
                                <option value="12/8">12/8</option>
                            </optgroup>
                        </select>
                    </div>
                </div>
                
                {patternType === 'strum' ? (
                     <div className="rhythm-grid-container" onMouseLeave={() => setIsDrawingStrum(false)}>
                        <div ref={gridRef} className="rhythm-grid" style={{gridTemplateColumns: `repeat(${totalSubdivisions}, 1fr)`}}>
                            <div ref={playheadRef} className="rhythm-editor-playhead"></div>
                            {Array.from({ length: totalSubdivisions }).map((_, stepIndex) => {
                                let isHeldByPrevious = false;
                                for (let i = 1; i <= stepIndex; i++) {
                                    const prevCell = strumGrid[stepIndex - i];
                                    if (prevCell && prevCell.type !== 'rest' && prevCell.duration > i) {
                                        isHeldByPrevious = true;
                                        break;
                                    }
                                }
                                if(isHeldByPrevious) return null;
                                
                                const cell = strumGrid[stepIndex];
                                return (
                                    <button 
                                        key={stepIndex} 
                                        className={`grid-cell strum-cell ${cell.type} ${cell.accent ? 'accent' : ''}`} 
                                        style={{ gridColumn: `span ${cell.duration}`}}
                                        onMouseDown={(e) => handleStrumGridMouseDown(e, stepIndex)}
                                        onMouseEnter={() => handleStrumGridMouseEnter(stepIndex)}
                                        onContextMenu={(e) => { e.preventDefault(); handleStrumGridRightClick(stepIndex); }}
                                        aria-label={`Step ${stepIndex+1}, Type: ${cell.type}, Accent: ${cell.accent}, Duration: ${cell.duration}`}
                                    >
                                        {getStrumIcon(cell.type, cell.accent)}
                                        {cell.type !== 'rest' && 
                                            <>
                                              <span className="duration-text">{getNoteDurationText(cell.duration)}</span>
                                              <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, -1, stepIndex)}></div>
                                            </>
                                        }
                                    </button>
                                );
                            })}
                        </div>
                        <div className="beat-markers" style={{gridTemplateColumns: `repeat(${beatsPerMeasure}, 1fr)`}}>
                            {Array.from({ length: beatsPerMeasure }).map((_, i) => <div key={i}>{i+1}</div>)}
                        </div>
                    </div>
                ) : (
                    <div className="arpeggio-grid-wrapper">
                        <div className="string-labels">
                            {stringLabelsHighToLow.map(s => <div key={s}>{s}</div>)}
                        </div>
                        <div className="rhythm-grid-container">
                            <div ref={gridRef} className="arpeggio-grid" style={{gridTemplateColumns: `repeat(${totalSubdivisions}, 1fr)`, gridTemplateRows: `repeat(${arpeggioGrid.length}, 1fr)`}}>
                                <div ref={playheadRef} className="rhythm-editor-playhead"></div>
                                {arpeggioGrid.length > 0 && [...arpeggioGrid].reverse().map((stringRow, reversedStringIndex) => {
                                    const stringCount = arpeggioGrid.length;
                                    const stringIndex = (stringCount - 1) - reversedStringIndex;
                                    return Array.from({ length: totalSubdivisions }).map((_, stepIndex) => {
                                        let isHeldByPrevious = false;
                                        for (let i = 1; i <= stepIndex; i++) {
                                            const prevCell = stringRow[stepIndex - i];
                                            if (prevCell.active && (prevCell.duration || 1) > i) {
                                                isHeldByPrevious = true;
                                                break;
                                            }
                                        }
                                        if (isHeldByPrevious) {
                                            return null;
                                        }

                                        const cell = stringRow[stepIndex];
                                        return (
                                            <button 
                                                key={`${stringIndex}-${stepIndex}`} 
                                                className={`grid-cell arpeggio-cell ${cell.active ? 'active' : ''} ${cell.accent ? 'accent' : ''}`}
                                                style={{ gridColumn: `span ${cell.duration}`}}
                                                onMouseDown={(e) => handleArpeggioGridMouseDown(e, stringIndex, stepIndex)}
                                                onContextMenu={(e) => { e.preventDefault(); handleArpeggioGridRightClick(stringIndex, stepIndex); }}
                                                aria-label={`String ${stringNamesLowToHigh[stringIndex]}, Step ${stepIndex+1}, Active: ${cell.active}, Accent: ${cell.accent}, Duration: ${cell.duration}`}
                                            >
                                              {cell.active && 
                                                <>
                                                  {getNoteDurationText(cell.duration)}
                                                  <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, stringIndex, stepIndex)}></div>
                                                </>
                                              }
                                            </button>
                                        )
                                    })
                                })}
                            </div>
                             <div className="beat-markers" style={{gridTemplateColumns: `repeat(${beatsPerMeasure}, 1fr)`}}>
                                {Array.from({ length: beatsPerMeasure }).map((_, i) => <div key={i}>{i+1}</div>)}
                            </div>
                        </div>
                    </div>
                )}


                <div className="editor-preview-controls">
                    <div className="editor-preview-controls-group">
                      <label htmlFor="preview-chord">Chord:</label>
                      <select id="preview-chord" value={previewChord} onChange={e => setPreviewChord(e.target.value)}>
                          <option>C</option>
                          <option>G</option>
                          <option>Am</option>
                      </select>
                      <label htmlFor="preview-bpm">BPM:</label>
                      <input id="preview-bpm" type="number" value={bpm} onChange={e => setBPM(parseInt(e.target.value, 10))} min="40" max="240" />
                      <button onClick={handleTogglePlayback} className={isPlaying ? 'danger' : 'primary'}>
                          {isPlaying ? 'Stop' : 'Play'}
                      </button>
                       <button onClick={handleClearPattern} className="secondary">
                            Clear
                        </button>
                    </div>
                    {previewDiagram && (
                        <div className="preview-diagram">
                            <div className="svg-wrapper">
                              <ChordDiagram 
                                  diagram={previewDiagram}
                                  chordName={previewChord}
                                  voicingIndex={0}
                                  viewMode={viewMode}
                                  playingNoteIndices={playingNoteIndices}
                                  instrument={instrument}
                              />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="modal-actions">
                    <button onClick={handleClose} className="secondary">Cancel</button>
                    {mode === 'edit' && <button onClick={() => onSave(true)} className="secondary">Save As New...</button>}
                    <button onClick={() => onSave(false)} className="primary">
                        {mode === 'edit' ? 'Update Pattern' : 'Save Pattern'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RhythmEditorModal;

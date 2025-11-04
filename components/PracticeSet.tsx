import React, { useRef, useState } from 'react';
import type { PracticeSetItem, RhythmPattern, Instrument } from '../types';
import ChordDiagram, { getChordColor } from './ChordDiagram';

const PracticeSet: React.FC<{
  practiceSet: PracticeSetItem[];
  setPracticeSet: React.Dispatch<React.SetStateAction<PracticeSetItem[]>>;
  onRemoveFromSet: (id: string) => void;
  onClearSet: () => void;
  onSaveSet: () => void;
  viewMode: 'standard' | 'rotated';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onPlaySet: () => void;
  onStopSet: () => void;
  isPlaying: boolean;
  isAudioLoading: boolean;
  playingChordId: string | null;
  playingNoteIndices: number[];
  patterns: RhythmPattern[];
  activePatternId: string;
  onPatternChange: (id: string) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onOpenRhythmEditor: (id?: string) => void;
  instrument: Instrument;
}> = ({ 
  practiceSet, setPracticeSet, onRemoveFromSet, onClearSet, onSaveSet, viewMode, isCollapsed, onToggleCollapse, 
  onPlaySet, onStopSet, isPlaying, isAudioLoading, playingChordId, playingNoteIndices,
  patterns, activePatternId, onPatternChange, bpm, onBpmChange, onOpenRhythmEditor,
  instrument
}) => {
  const practiceGridRef = useRef<HTMLDivElement>(null);
  const [dropIndicator, setDropIndicator] = useState<{ targetId: string; position: 'before' | 'after' } | null>(null);


  if (practiceSet.length === 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = e.altKey ? 'copy' : 'move';
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = () => {
    practiceGridRef.current?.querySelectorAll('.diagram-container').forEach(el => {
      el.classList.remove('dragging');
    });
    setDropIndicator(null);
  };
  
  const handleItemDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.altKey) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const position = e.clientX < midpoint ? 'before' : 'after';

    if (!dropIndicator || dropIndicator.targetId !== id || dropIndicator.position !== position) {
      setDropIndicator({ targetId: id, position });
    }
  };

  const handleGridDragLeave = (e: React.DragEvent) => {
    if (!practiceGridRef.current?.contains(e.relatedTarget as Node)) {
        setDropIndicator(null);
    }
  }

  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const finalDropIndicator = dropIndicator;
    setDropIndicator(null);
    
    const draggedItemId = e.dataTransfer.getData('text/plain');
    
    if (!draggedItemId || !finalDropIndicator) return;
    
    if (finalDropIndicator.targetId !== dropTargetId) return;

    const fromIndex = practiceSet.findIndex(item => item.id === draggedItemId);
    let toIndex = practiceSet.findIndex(item => item.id === dropTargetId);
    
    if (fromIndex === -1 || toIndex === -1) return;

    if (finalDropIndicator.position === 'after') {
      toIndex++;
    }

    if (e.altKey) { // Duplicate logic
        const itemToDuplicate = practiceSet[fromIndex];
        if (!itemToDuplicate) return;

        const newItem: PracticeSetItem = {
            ...itemToDuplicate,
            id: `${itemToDuplicate.id}-clone-${Date.now()}` // Unique ID
        };
        
        const newSet = [...practiceSet];
        newSet.splice(toIndex, 0, newItem); 
        setPracticeSet(newSet);
    } else { // Move logic
        const correctedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;

        if (fromIndex === correctedToIndex) return;
        
        const newSet = [...practiceSet];
        const [movedItem] = newSet.splice(fromIndex, 1);
        newSet.splice(correctedToIndex, 0, movedItem);
        
        setPracticeSet(newSet);
    }
  };

  const strumPatterns = patterns.filter(p => p.type === 'strum');
  const arpeggioPatterns = patterns.filter(p => p.type === 'arpeggio');

  return (
    <div className={`practice-set-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div
        className="practice-set-header"
        onClick={onToggleCollapse}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-controls="practice-grid-wrapper"
      >
        <h2>Practice Set ({practiceSet.length})</h2>
        <div className="practice-set-actions" onClick={e => e.stopPropagation()}>
          <div className="playback-controls">
            <label htmlFor="pattern-select">Rhythm:</label>
            <select 
              id="pattern-select" 
              value={activePatternId} 
              onChange={e => onPatternChange(e.target.value)}
              disabled={isPlaying}
            >
              <optgroup label="Strumming">
                {strumPatterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
              {arpeggioPatterns.length > 0 && <optgroup label="Arpeggio">
                {arpeggioPatterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>}
            </select>
            <button onClick={() => onOpenRhythmEditor(activePatternId)} disabled={isPlaying} className="secondary">Customize</button>
            <label htmlFor="bpm-input">BPM:</label>
            <input 
              id="bpm-input"
              type="number"
              value={bpm}
              onChange={e => onBpmChange(parseInt(e.target.value, 10) || 120)}
              min="40"
              max="240"
              disabled={isPlaying}
            />
          </div>
          {isAudioLoading ? (
                <span className="audio-loading">Loading audio...</span>
            ) : (
                <button 
                    onClick={(e) => { e.stopPropagation(); isPlaying ? onStopSet() : onPlaySet(); }}
                    disabled={practiceSet.length === 0}
                    className={isPlaying ? 'danger' : 'primary'}
                >
                    {isPlaying ? 'Stop' : 'Play All'}
                </button>
            )}
          <button onClick={(e) => { e.stopPropagation(); onSaveSet(); }} disabled={practiceSet.length === 0} className="primary">Save Set</button>
          <button onClick={(e) => { e.stopPropagation(); onClearSet(); }} disabled={practiceSet.length === 0} className="danger">Clear Set</button>
          <span className="collapse-toggle-icon" aria-hidden="true">{isCollapsed ? '▲' : '▼'}</span>
        </div>
      </div>
      <div id="practice-grid-wrapper" className="practice-grid-wrapper">
        <div 
          className="svg-grid practice-grid" 
          ref={practiceGridRef}
          onDragLeave={handleGridDragLeave}
        >
          {practiceSet.map((item) => {
            const indicatorClass = dropIndicator?.targetId === item.id ? `drop-${dropIndicator.position}` : '';
            return (
              <div 
                  key={item.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleItemDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className={`diagram-container ${item.id === playingChordId ? 'playing' : ''} ${indicatorClass}`} 
                  style={{ '--chord-color': getChordColor(item.chordName) } as React.CSSProperties}
              >
                <button className="remove-btn" onClick={() => onRemoveFromSet(item.id)} aria-label="Remove voicing">&times;</button>
                <div className="svg-wrapper">
                  <ChordDiagram 
                    diagram={item.diagram} 
                    chordName={item.chordName} 
                    voicingIndex={0} 
                    viewMode={viewMode}
                    playingNoteIndices={item.id === playingChordId ? playingNoteIndices : undefined}
                    instrument={instrument}
                  />
                </div>
                <div className="voicing-info">
                    <div className="voicing-position">{item.chordName} - {item.diagram.position}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default PracticeSet;
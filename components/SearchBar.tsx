import React from 'react';
import { getChordColor } from './ChordDiagram';
import type { Instrument } from '../types';

const SearchBar: React.FC<{ 
  search: string; 
  onSearch: (value: string) => void; 
  viewMode: 'standard' | 'rotated'; 
  setViewMode: (mode: 'standard' | 'rotated') => void;
  onOpenSets: () => void;
  onOpenRhythmEditor: (id?: string) => void;
  onExport: () => void;
  onQuickFilterClick: (chordRoot: string) => void;
  instrument: Instrument;
  setInstrument: (instrument: Instrument) => void;
  onLoadFromFile: () => void;
  onLoadFromUrl: () => void;
}> = ({ search, onSearch, viewMode, setViewMode, onOpenSets, onOpenRhythmEditor, onExport, onQuickFilterClick, instrument, setInstrument, onLoadFromFile, onLoadFromUrl }) => {
  const chordRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  return (
    <div className="panel">
      <div className="quick-filters">
        <span className="quick-filters-label">Jump to:</span>
        {chordRoots.map(root => (
          <button
            key={root}
            onClick={() => onQuickFilterClick(root)}
            style={{ '--chord-color': getChordColor(root) } as React.CSSProperties}
            className="quick-filter-btn"
          >
            {root}
          </button>
        ))}
      </div>

      <input
        id="search"
        type="text"
        placeholder="Find a chord (e.g., C, Am, G7...)"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Find a chord"
      />
      
      <div className="instrument-toggle">
          <span>Instrument:</span>
          <button 
              className={instrument === 'ukulele' ? 'active' : ''} 
              onClick={() => setInstrument('ukulele')}
              aria-pressed={instrument === 'ukulele'}
          >
              Ukulele
          </button>
          <button 
              className={instrument === 'guitar' ? 'active' : ''} 
              onClick={() => setInstrument('guitar')}
              aria-pressed={instrument === 'guitar'}
          >
              Guitar
          </button>
      </div>
      
      <div className="view-mode-toggle">
          <span>View:</span>
          <button 
              className={viewMode === 'standard' ? 'active' : ''} 
              onClick={() => setViewMode('standard')}
              aria-pressed={viewMode === 'standard'}
          >
              Standard
          </button>
          <button 
              className={viewMode === 'rotated' ? 'active' : ''} 
              onClick={() => setViewMode('rotated')}
              aria-pressed={viewMode === 'rotated'}
          >
              Rotated
          </button>
      </div>

      <div className="action-buttons">
        <button onClick={onLoadFromFile} className="secondary">Load File</button>
        <button onClick={onLoadFromUrl} className="secondary">Load URL</button>
        <button onClick={() => onOpenRhythmEditor()} className="secondary">Rhythm Editor</button>
        <button onClick={onOpenSets} className="secondary">My Saved Sets</button>
        <button onClick={onExport} className="secondary">Export</button>
      </div>
    </div>
  );
};

export default SearchBar;
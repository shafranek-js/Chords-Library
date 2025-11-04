
import React from 'react';
import type { Diagram, DisplayChord, PracticeSetItem, Instrument } from '../types';
import ChordDiagram, { getChordColor } from './ChordDiagram';
import Tooltip from './Tooltip';
import { intervalExplanations } from '../tooltipContent';

const ChordList: React.FC<{ 
  chords: DisplayChord[]; 
  search: string; 
  viewMode: 'standard' | 'rotated';
  onVoicingSelect: (chordName: string, diagram: Diagram) => void;
  practiceSet: PracticeSetItem[];
  instrument: Instrument;
}> = ({ chords, search, viewMode, onVoicingSelect, practiceSet, instrument }) => {
  
  const getVoicingId = (chordName: string, diag: Diagram) => {
    return `${chordName}-${diag.startFret}-${diag.frets.join('')}-${diag.barres?.map(b => `${b.fret}${b.strings.join('')}`).join('') ?? ''}`;
  };

  if (chords.length > 0) {
    return (
      <div className="chords-container">
        <div className="svg-grid">
          {chords.map((chord) => (
            <React.Fragment key={chord.name}>
              {chord.diagrams.map((diag, index) => {
                const id = getVoicingId(chord.name, diag);
                const isSelected = practiceSet.some(item => item.id === id);

                return (
                  <div 
                    key={id} 
                    id={index === 0 ? `chord-group-${chord.name}` : undefined}
                    className={`diagram-container ${isSelected ? 'selected' : ''}`} 
                    onClick={() => onVoicingSelect(chord.name, diag)} 
                    style={{ '--chord-color': getChordColor(chord.name) } as React.CSSProperties}
                  >
                    <div className="voicing-heading">
                      <span className="chord-name">{chord.name}</span>
                      {chord.aliases.length > 0 && (
                        <Tooltip title="Aliases" description={chord.aliases.join(', ')}>
                          <span className="alias-icon">i</span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="svg-wrapper">
                      <ChordDiagram diagram={diag} chordName={chord.name} voicingIndex={index} viewMode={viewMode} instrument={instrument} />
                    </div>
                    <div className="voicing-info">
                      <div className="voicing-position">{diag.position}</div>
                      <div className="voicing-intervals">
                        {(viewMode === 'standard' ? [...diag.intervals].reverse() : diag.intervals).map((interval, i) => {
                          const explanation = intervalExplanations[interval];
                          if (explanation) {
                            return (
                              <Tooltip key={`${id}-interval-${i}`} title={explanation.title} description={explanation.description}>
                                <span className="interval-item">{interval}</span>
                              </Tooltip>
                            );
                          }
                          return <span key={`${id}-interval-${i}`} className="interval-item">{interval}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <p>No chords found for "{search}".</p>
    </div>
  );
};

export default ChordList;
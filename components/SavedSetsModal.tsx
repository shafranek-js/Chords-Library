
import React from 'react';
import type { SavedSet } from '../types';

const SavedSetsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  savedSets: SavedSet[];
  onLoadSet: (set: SavedSet) => void;
  onDeleteSet: (setName: string) => void;
}> = ({ isOpen, onClose, savedSets, onLoadSet, onDeleteSet }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>My Saved Sets</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">&times;</button>
        </div>
        {savedSets.length > 0 ? (
          <ul className="saved-sets-list">
            {savedSets.map((set, index) => (
              <li key={`${set.name}-${index}`}>
                <span className="saved-set-name">{set.name}</span>
                <div className="saved-set-actions">
                  <button onClick={() => onLoadSet(set)}>Load</button>
                  <button onClick={() => onDeleteSet(set.name)} className="danger">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">You have no saved sets. Create a set below and click "Save Set".</p>
        )}
      </div>
    </div>
  );
};

export default SavedSetsModal;

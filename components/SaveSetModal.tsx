
import React, { useState } from 'react';

const SaveSetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (setName: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [setName, setSetName] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (setName.trim()) {
      onSave(setName.trim());
      setSetName('');
      onClose();
    } else {
      alert('Please enter a name for the set.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Save Practice Set</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">&times;</button>
        </div>
        <div className="form-group">
          <label htmlFor="set-name-input">Set Name</label>
          <input
            id="set-name-input"
            type="text"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., My Favorite Song"
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="secondary">Cancel</button>
          <button onClick={handleSave} className="primary">Save</button>
        </div>
      </div>
    </div>
  );
};

export default SaveSetModal;

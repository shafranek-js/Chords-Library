import React, { useState } from 'react';

const LoadFromUrlModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onLoad: (url: string) => void;
}> = ({ isOpen, onClose, onLoad }) => {
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const handleLoad = () => {
    if (url.trim()) {
      onLoad(url.trim());
    } else {
      alert('Please enter a URL.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Load Chords from URL</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">&times;</button>
        </div>
        <div className="form-group">
          <label htmlFor="url-input">JSON File URL</label>
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://.../chords.json"
            autoFocus
          />
          <p className="muted" style={{fontSize: '12px', marginTop: '8px'}}>
            Paste a URL to a raw JSON file (e.g., from GitHub). The file must be a JSON array of chord objects.
          </p>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="secondary">Cancel</button>
          <button onClick={handleLoad} className="primary">Load</button>
        </div>
      </div>
    </div>
  );
};

export default LoadFromUrlModal;

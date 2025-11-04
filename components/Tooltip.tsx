
import React from 'react';

const Tooltip: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => {
  return (
    <span className="tooltip-container">
      {children}
      <div className="tooltip-content">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </span>
  );
};

export default Tooltip;

'use client';
import * as React from 'react';

export function Dialog({
  open,
  onClose,
  title,
  footer,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog" style={wide ? { maxWidth: 720 } : undefined}>
        {title && (
          <div className="dialog-header">
            <div className="dialog-title">{title}</div>
            <button className="icon-btn" onClick={onClose} aria-label="סגור">
              ✕
            </button>
          </div>
        )}
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

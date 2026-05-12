import * as React from 'react';

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      {label && (
        <label className="field-label">
          {label}
          {required && <span style={{ color: 'var(--danger)', marginInlineStart: 2 }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="field-error">{error}</div>
      ) : hint ? (
        <div className="field-hint">{hint}</div>
      ) : null}
    </div>
  );
}

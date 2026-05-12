'use client';
import * as React from 'react';

export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="switch"
      data-on={checked ? 'true' : 'false'}
      onClick={() => !disabled && onChange(!checked)}
      aria-checked={checked}
      role="switch"
      disabled={disabled}
    />
  );
}

export function SwitchRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="switch-row">
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

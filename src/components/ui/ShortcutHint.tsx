"use client";

interface ShortcutHintProps {
  shortcut: string;
  children: React.ReactNode;
  className?: string;
}

export function ShortcutHint({ shortcut, children, className = "" }: ShortcutHintProps) {
  return (
    <span className={`shortcut-anchor ${className}`}>
      {children}
      <span className="shortcut-hint">{shortcut}</span>
    </span>
  );
}

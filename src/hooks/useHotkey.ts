"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useShortcutStore } from "@/stores/shortcut-store";

export function useHotkey(
  key: string,
  label: string,
  description: string,
  callback: () => void,
  scope?: string
) {
  const registerShortcut = useShortcutStore((s) => s.registerShortcut);

  // Keep ref up-to-date without triggering re-registration
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // stable wrapper — never changes identity, always calls latest callback
    const stable = () => callbackRef.current();
    const unregister = registerShortcut({ key, label, description, callback: stable, scope });
    return unregister;
  }, [key, label, description, scope, registerShortcut]); // callback ref excluded intentionally
}

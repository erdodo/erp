"use client";

import { useEffect } from "react";
import { useShortcutStore } from "@/stores/shortcut-store";

function codeToKey(code: string): string {
  const letter = code.match(/^Key([A-Z])$/);
  if (letter) return letter[1].toLowerCase();
  const digit = code.match(/^Digit(\d)$/);
  if (digit) return digit[1];
  const map: Record<string, string> = {
    Slash: "/",
    Space: " ",
    Enter: "enter",
    Backslash: "\\",
    Period: ".",
    Comma: ",",
    Semicolon: ";",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Minus: "-",
    Equal: "=",
    Backquote: "`",
  };
  return map[code] ?? code.toLowerCase();
}

export function useKeyboardShortcuts() {
  const { setAltPressed, triggerShortcut } = useShortcutStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isOption = e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight";
      if (isOption) {
        e.preventDefault();
        setAltPressed(true);
      }
      if (e.altKey && !isOption) {
        const key = codeToKey(e.code);
        if (triggerShortcut(key)) {
          e.preventDefault();
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
        setAltPressed(false);
      }
    }

    function onBlur() {
      setAltPressed(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [setAltPressed, triggerShortcut]);
}

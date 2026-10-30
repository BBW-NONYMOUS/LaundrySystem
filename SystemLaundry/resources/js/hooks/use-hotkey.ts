import { useEffect, useRef } from 'react';

type HotkeyOptions = {
    /** Fire even while the user is typing in an input (e.g. Ctrl+Enter to save). */
    allowInInputs?: boolean;
    enabled?: boolean;
};

/**
 * Keyboard shortcut, e.g. useHotkey('mod+k', open). "mod" = Ctrl on Windows, ⌘ on Mac.
 * Combos: mod, ctrl, alt, shift + a key name ("k", "enter", "/", "escape").
 */
export function useHotkey(
    combo: string,
    handler: (event: KeyboardEvent) => void,
    { allowInInputs = false, enabled = true }: HotkeyOptions = {},
) {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const parts = combo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const wants = {
            mod: parts.includes('mod'),
            ctrl: parts.includes('ctrl'),
            alt: parts.includes('alt'),
            shift: parts.includes('shift'),
        };

        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing =
                target?.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');

            if (typing && !allowInInputs) {
                return;
            }

            const mod = event.metaKey || event.ctrlKey;

            if (
                event.key.toLowerCase() === key &&
                mod === (wants.mod || wants.ctrl) &&
                event.altKey === wants.alt &&
                event.shiftKey === wants.shift
            ) {
                event.preventDefault();
                handlerRef.current(event);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [combo, allowInInputs, enabled]);
}

import { useEffect } from 'react';

/** Ctrl+Shift+M / ⌘⇧M — toggle panel. Esc — close when open. */
export function usePanelHotkeys(options: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}): void {
  const { open, onToggle, onClose } = options;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isToggle =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.key === 'M' || event.key === 'm');

      if (isToggle) {
        event.preventDefault();
        onToggle();
        return;
      }

      if (open && event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onToggle, onClose]);
}

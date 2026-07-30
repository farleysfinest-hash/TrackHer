import { createPortal } from 'react-dom';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { FOCUSABLE_SELECTOR, trapTabKey } from '../../lib/focusTrap';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-[400px] max-h-[85dvh]',
  md: 'max-w-[560px] max-h-[85dvh]',
  lg: 'max-w-[720px] max-h-[85dvh]',
  full: 'h-[100dvh] w-[100dvw] max-h-none max-w-none rounded-none border-0 shadow-none',
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const keyboardInset = useKeyboardBottomInset();

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const panel = contentRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      trapTabKey(e, contentRef.current);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isFullScreen = size === 'full';

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-50 flex',
        isFullScreen
          ? 'items-stretch justify-stretch p-0'
          : 'items-end justify-center p-0 sm:items-center sm:p-4',
      ].join(' ')}
      style={
        !isFullScreen && keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined
      }
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        data-keyboard-scroll
        className={[
          'relative z-10 flex w-full flex-col overflow-hidden bg-sand-50 outline-none',
          isFullScreen ? '' : 'rounded-t-xl border border-sand-200 shadow-xl sm:rounded-xl',
          sizeClasses[size],
        ].join(' ')}
        style={
          !isFullScreen && keyboardInset > 0
            ? { maxHeight: `calc(100dvh - ${keyboardInset}px - 1rem)` }
            : undefined
        }
      >
        {(title || showCloseButton) && (
          <div
            className={[
              'flex shrink-0 items-center justify-between border-b border-sand-200 pb-3',
              isFullScreen ? 'safe-area-modal-header' : 'px-4 pt-4 sm:px-6',
            ].join(' ')}
          >
            {title && (
              <h2 id={titleId} className="font-display text-xl text-sage-800">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-sage-400 hover:bg-sage-50 hover:text-sage-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div
          className={[
            'min-h-0 flex-1 overflow-y-auto',
            isFullScreen ? 'safe-area-modal-body pt-4' : 'p-6',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

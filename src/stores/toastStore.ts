import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
  dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (message, variant = 'info', action) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, action }] }));
    const duration = action ? 8000 : 4000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export function useToast() {
  const show = useToastStore((s) => s.show);
  return {
    toast: show,
    success: (message: string, action?: ToastAction) => show(message, 'success', action),
    error: (message: string, action?: ToastAction) => show(message, 'error', action),
    warning: (message: string, action?: ToastAction) => show(message, 'warning', action),
    info: (message: string, action?: ToastAction) => show(message, 'info', action),
  };
}

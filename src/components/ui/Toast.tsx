import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastVariant } from '../../stores/toastStore';

const variantStyles: Record<
  ToastVariant,
  { bg: string; icon: typeof CheckCircle }
> = {
  success: { bg: 'bg-sand-50 border-success/30 text-sage-800', icon: CheckCircle },
  error: { bg: 'bg-sand-50 border-danger/30 text-sage-800', icon: AlertCircle },
  warning: { bg: 'bg-sand-50 border-amber-200 text-sage-800', icon: AlertTriangle },
  info: { bg: 'bg-sand-50 border-info/30 text-sage-800', icon: Info },
};

const iconColors: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-amber-600',
  info: 'text-info',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={[
              'flex min-w-[280px] max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-fade-in',
              style.bg,
            ].join(' ')}
            role="alert"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColors[toast.variant]}`} />
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-sm">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="self-start text-sm font-medium text-sage-700 underline hover:text-sage-900"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-sage-400 hover:text-sage-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

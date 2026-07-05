import { AlertCircle } from 'lucide-react';

interface MedicalDisclaimerProps {
  variant?: 'inline' | 'block';
  className?: string;
}

const disclaimerText =
  'This app is for educational and personal record-keeping purposes only. It is not intended to provide medical advice or replace the guidance of your physician or healthcare provider. Always consult your healthcare professional before starting, stopping, or changing any medication.';

export function MedicalDisclaimer({ variant = 'inline', className = '' }: MedicalDisclaimerProps) {
  if (variant === 'block') {
    return (
      <div
        className={[
          'flex gap-3 rounded-xl border border-sand-200 bg-sand-50 p-4',
          className,
        ].join(' ')}
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sage-400" />
        <p className="text-sm italic text-sage-400">{disclaimerText}</p>
      </div>
    );
  }

  return <p className={['text-sm italic text-sage-400', className].join(' ')}>{disclaimerText}</p>;
}

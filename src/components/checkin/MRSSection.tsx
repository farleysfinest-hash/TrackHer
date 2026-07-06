import { useAuthStore } from '../../stores/authStore';
import { getPrimaryInstrument } from '../../data/instruments/registry';
import { InstrumentSection } from './InstrumentSection';

interface MRSSectionProps {
  onNext: () => void;
  onBack: () => void;
}

/** Renders the primary validated instrument for the user's STRAW+10 stage (Phase 1: always MRS). */
export function MRSSection({ onNext, onBack }: MRSSectionProps) {
  const strawStage = useAuthStore((s) => s.profile?.straw_stage ?? '-2');
  const instrument = getPrimaryInstrument(strawStage);

  return <InstrumentSection instrument={instrument} onNext={onNext} onBack={onBack} />;
}

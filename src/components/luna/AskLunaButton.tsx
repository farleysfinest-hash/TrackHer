import { Moon } from 'lucide-react';
import type { OpenLunaRequest } from './LunaProvider';
import { useLuna } from './LunaProvider';
import { Button } from '../ui/Button';

interface AskLunaButtonProps {
  label: string;
  request: OpenLunaRequest;
  className?: string;
  onBeforeOpen?: () => void;
}

export function AskLunaButton({
  label,
  request,
  className = '',
  onBeforeOpen,
}: AskLunaButtonProps) {
  const { openLuna } = useLuna();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        onBeforeOpen?.();
        void openLuna(request);
      }}
    >
      <Moon className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}

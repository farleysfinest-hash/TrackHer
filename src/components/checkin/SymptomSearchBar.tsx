import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

interface SymptomSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SymptomSearchBar({ value, onChange }: SymptomSearchBarProps) {
  return (
    <Input
      label=""
      placeholder="Search symptoms..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      leftIcon={<Search className="h-4 w-4" />}
      aria-label="Search symptoms"
    />
  );
}

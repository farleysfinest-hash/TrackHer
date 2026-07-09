import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FlaskConical,
  Pill,
  Lightbulb,
  Sparkles,
  CalendarClock,
  Activity,
  Eye,
} from 'lucide-react';
import type { InsightCategory } from '../../engine/types';

interface InsightIconProps {
  category: InsightCategory;
  className?: string;
}

export function InsightIcon({ category, className = 'h-5 w-5' }: InsightIconProps) {
  switch (category) {
    case 'dose_correlation':
      return <Pill className={className} />;
    case 'symptom_cluster':
      return <Activity className={className} />;
    case 'lab_discordance':
      return <FlaskConical className={className} />;
    case 'trend_alert':
      return <TrendingDown className={className} />;
    case 'positive_trend':
      return <TrendingUp className={className} />;
    case 'new_symptom':
      return <AlertTriangle className={className} />;
    case 'medication_note':
      return <Pill className={className} />;
    case 'lab_due':
      return <CalendarClock className={className} />;
    case 'observation':
      return <Eye className={className} />;
    default:
      return <Lightbulb className={className} />;
  }
}

export function InsightSparkleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return <Sparkles className={className} />;
}

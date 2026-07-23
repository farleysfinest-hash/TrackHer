import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface GhostChartFrameProps {
  title: string;
  caption: string;
  children?: ReactNode;
}

export function GhostChartFrame({ title, caption, children }: GhostChartFrameProps) {
  return (
    <Card variant="outlined" padding="lg">
      <h3 className="font-display text-lg text-sage-800">{title}</h3>
      <div className="mt-4">
        {children ?? (
          <svg
            viewBox="0 0 320 160"
            className="h-40 w-full"
            aria-hidden
            focusable="false"
          >
            {[40, 80, 120].map((y) => (
              <line
                key={y}
                x1="8"
                x2="312"
                y1={y}
                y2={y}
                stroke="var(--color-sand-200)"
                strokeWidth="1"
              />
            ))}
            <polyline
              fill="none"
              stroke="var(--color-sand-300)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="16,110 56,95 96,118 136,72 176,88 216,58 256,78 304,48"
            />
            <polyline
              fill="none"
              stroke="var(--color-sage-200)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="16,128 56,120 96,132 136,108 176,116 216,98 256,112 304,90"
            />
            <polyline
              fill="none"
              stroke="var(--color-sand-300)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
              points="16,70 56,78 96,62 136,90 176,68 216,84 256,54 304,66"
            />
          </svg>
        )}
      </div>
      <p className="mt-3 text-sm text-sage-500">{caption}</p>
    </Card>
  );
}

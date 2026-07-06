import type { StrawStageCode } from '../../lib/strawStaging';
import {
  STRAW_TIMELINE_STAGES,
  SPECIAL_STAGES,
  isTimelineStage,
  getTimelineHighlightIndex,
} from '../../lib/strawStaging';

interface StrawTimelineProps {
  stage: StrawStageCode;
  stageLabel: string;
  description: string;
}

export function StrawTimeline({ stage, stageLabel, description }: StrawTimelineProps) {
  const onTimeline = isTimelineStage(stage);
  const highlightIndex = getTimelineHighlightIndex(stage);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-sand-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-400">
          Your stage
        </p>
        <h2 className="mt-1 font-display text-2xl text-sage-800">{stageLabel}</h2>
        <p className="mt-1 text-sm font-medium text-sage-500">Stage {stage}</p>
        <p className="mt-3 text-sm leading-relaxed text-sage-600">{description}</p>
      </div>

      {onTimeline ? (
        <div className="rounded-xl border border-sand-200 bg-sage-50/50 p-4">
          <p className="mb-4 text-xs font-medium text-sage-500">STRAW+10 timeline</p>
          <div className="relative">
            <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-sand-200" />
            <div
              className="absolute top-4 h-1 rounded-full bg-sage-400 transition-all duration-500"
              style={{
                left: 0,
                width: `${(highlightIndex / (STRAW_TIMELINE_STAGES.length - 1)) * 100}%`,
              }}
            />
            <div className="relative flex justify-between">
              {STRAW_TIMELINE_STAGES.map((s, i) => {
                const isActive = s.code === stage;
                const isPast = i <= highlightIndex;
                return (
                  <div key={s.code} className="flex flex-col items-center" style={{ width: '12.5%' }}>
                    <div
                      className={[
                        'z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-colors',
                        isActive
                          ? 'border-sage-600 bg-sage-600 text-white shadow-md ring-4 ring-sage-200'
                          : isPast
                            ? 'border-sage-400 bg-sage-100 text-sage-600'
                            : 'border-sand-300 bg-white text-sage-400',
                      ].join(' ')}
                    >
                      {s.shortLabel}
                    </div>
                    {isActive && (
                      <span className="mt-2 hidden text-center text-[9px] leading-tight text-sage-600 sm:block">
                        {s.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-sage-400">
            <span>Late Reproductive</span>
            <span>Late Postmenopause</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-sage-50/50 p-4">
          <p className="mb-2 text-xs font-medium text-sage-500">Special classification</p>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_STAGES.map((s) => (
              <span
                key={s.code}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium',
                  s.code === stage
                    ? 'bg-sage-600 text-white'
                    : 'bg-white text-sage-500 border border-sand-200',
                ].join(' ')}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="rounded-lg bg-sage-50 px-4 py-3 text-sm leading-relaxed text-sage-600">
        This is based on your answers today. As you track with PredictHer, we may suggest
        updates to your stage based on your data.
      </p>
    </div>
  );
}

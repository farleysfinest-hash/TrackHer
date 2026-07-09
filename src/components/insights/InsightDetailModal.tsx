import type { Insight } from '../../engine/types';
import type { StageProfile } from '../../engine/stageProfile';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { formatDateLong } from '../../utils/formatters';
import { getCategoryLabel, getPriorityLabel, getPriorityBadgeVariant } from '../../utils/insightHelpers';

interface InsightDetailModalProps {
  insight: Insight;
  isOpen: boolean;
  onClose: () => void;
  /** Stage context for future insight copy — plumbing only in this slice. */
  stageProfile?: StageProfile | null;
}

export function InsightDetailModal({
  insight,
  isOpen,
  onClose,
  stageProfile,
}: InsightDetailModalProps) {
  void stageProfile;
  const { supportingData } = insight;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={insight.title} size="lg">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant={getPriorityBadgeVariant(insight.priority)}>
            {getPriorityLabel(insight.priority)}
          </Badge>
          <Badge variant="info">{getCategoryLabel(insight.category)}</Badge>
        </div>

        <p className="text-sm text-sage-600">{insight.body}</p>

        {supportingData.beforePeriod && supportingData.afterPeriod && (
          <section>
            <h4 className="font-display text-base text-sage-800">Before vs after</h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-sand-50 p-3 text-sm">
                <p className="font-medium text-sage-700">Before</p>
                <p className="text-sage-500">
                  {formatDateLong(supportingData.beforePeriod.startDate)} –{' '}
                  {formatDateLong(supportingData.beforePeriod.endDate)}
                </p>
                {supportingData.beforePeriod.avgScore !== undefined && (
                  <p className="mt-1 text-sage-800">
                    Avg MRS: {supportingData.beforePeriod.avgScore}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-sand-50 p-3 text-sm">
                <p className="font-medium text-sage-700">After</p>
                <p className="text-sage-500">
                  {formatDateLong(supportingData.afterPeriod.startDate)} –{' '}
                  {formatDateLong(supportingData.afterPeriod.endDate)}
                </p>
                {supportingData.afterPeriod.avgScore !== undefined && (
                  <p className="mt-1 text-sage-800">
                    Avg MRS: {supportingData.afterPeriod.avgScore}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {supportingData.symptomScores && supportingData.symptomScores.length > 0 && (
          <section>
            <h4 className="font-display text-base text-sage-800">Symptom changes</h4>
            <ul className="mt-2 space-y-2">
              {supportingData.symptomScores.map((s) => (
                <li
                  key={s.symptomKey}
                  className="flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2 text-sm"
                >
                  <span className="text-sage-700">{s.label}</span>
                  <span className={s.delta < 0 ? 'text-success' : s.delta > 0 ? 'text-danger' : 'text-sage-500'}>
                    {s.avgBefore.toFixed(1)} → {s.avgAfter.toFixed(1)} ({s.delta > 0 ? '+' : ''}
                    {s.delta.toFixed(1)})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {supportingData.matchedSymptoms && supportingData.matchedSymptoms.length > 0 && (
          <section>
            <h4 className="font-display text-base text-sage-800">Matched symptoms</h4>
            {supportingData.matchConfidence !== undefined && (
              <p className="mt-1 text-sm text-sage-500">
                Confidence: {Math.round(supportingData.matchConfidence * 100)}%
              </p>
            )}
            <ul className="mt-2 space-y-1 text-sm text-sage-700">
              {supportingData.matchedSymptoms.map((s) => (
                <li key={s.key}>
                  {s.label} — severity {s.severity}
                </li>
              ))}
            </ul>
          </section>
        )}

        {supportingData.labValue && (
          <section>
            <h4 className="font-display text-base text-sage-800">Lab value</h4>
            <p className="mt-1 text-sm text-sage-600">
              {supportingData.labValue.biomarker}: {supportingData.labValue.value} (range:{' '}
              {supportingData.labValue.range})
            </p>
          </section>
        )}

        {supportingData.trendData && supportingData.trendData.length > 0 && (
          <section>
            <h4 className="font-display text-base text-sage-800">Trend over time</h4>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-sage-600">
              {supportingData.trendData.map((point) => (
                <li key={point.date} className="flex justify-between">
                  <span>{formatDateLong(point.date)}</span>
                  <span className="font-medium text-sage-800">{point.score}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {insight.actionSuggestion && (
          <section className="rounded-lg bg-sage-50 p-4">
            <h4 className="font-display text-base text-sage-800">Suggested next step</h4>
            <p className="mt-2 whitespace-pre-line text-sm text-sage-700">
              {insight.actionSuggestion}
            </p>
          </section>
        )}

        <p className="text-xs text-sage-400">{insight.disclaimer}</p>
      </div>
    </Modal>
  );
}

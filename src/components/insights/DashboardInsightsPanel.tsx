import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { Insight } from '../../engine/types';
import { Card } from '../ui/Card';
import { InsightCard } from './InsightCard';

interface DashboardInsightsPanelProps {
  insights: Insight[];
}

export function DashboardInsightsPanel({ insights }: DashboardInsightsPanelProps) {
  const topInsights = insights.slice(0, 3);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-sage-500" />
          <h2 className="font-display text-xl text-sage-800">Insights</h2>
        </div>
        {insights.length > 0 && (
          <Link
            to="/insights"
            className="flex items-center gap-1 text-sm font-medium text-sage-600 hover:text-sage-800"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {topInsights.length === 0 ? (
        <Card variant="outlined" padding="md">
          <p className="text-sm text-sage-500">
            Not enough data for insights yet. Keep tracking check-ins, medications, and labs.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {topInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} compact />
          ))}
        </div>
      )}
    </section>
  );
}

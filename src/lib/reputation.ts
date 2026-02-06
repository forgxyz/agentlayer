import type { Agent } from './types';

export function computeReputationScore(agent: {
  total_received_usd: number;
  unique_requesters: number;
  tx_count: number;
  avg_feedback_score?: number;
}): number {
  // Economic score: log10(total_usd_received + 1), normalized 0-1
  // Max expected ~$23M for top agent → log10(23000000) ≈ 7.36
  const economicScore = Math.min(Math.log10(agent.total_received_usd + 1) / 7.4, 1);

  // Diversity score: unique_requesters / 100, capped at 1
  const diversityScore = Math.min(agent.unique_requesters / 100, 1);

  // Activity score: log10(tx_count + 1), normalized 0-1
  // Max expected ~24M tx → log10(24000000) ≈ 7.38
  const activityScore = Math.min(Math.log10(agent.tx_count + 1) / 7.4, 1);

  // Reputation score: ERC-8004 avg feedback / 100, clamped 0-1
  const reputationScore = agent.avg_feedback_score
    ? Math.min(agent.avg_feedback_score / 100, 1.0)
    : 0.5;

  const rawScore =
    0.3 * economicScore +
    0.3 * diversityScore +
    0.2 * activityScore +
    0.2 * reputationScore;

  return Math.min(Math.round(rawScore * 100), 100);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00F5FF'; // Cyan glow
  if (score >= 60) return '#0EA5E9'; // Sky blue
  if (score >= 40) return '#8B5CF6'; // Purple
  return '#6366F1'; // Indigo
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Low';
}

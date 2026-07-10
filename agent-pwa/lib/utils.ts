export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-NG').format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function incidentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    violence: 'Violence',
    ballot_snatching: 'Ballot Snatching',
    intimidation: 'Intimidation',
    late_materials: 'Late Materials',
    result_falsification: 'Result Falsification',
    agent_harassment: 'Agent Harassment',
    underage_voting: 'Underage Voting',
    vote_buying: 'Vote Buying',
    other: 'Other',
  };
  return map[type] ?? type;
}

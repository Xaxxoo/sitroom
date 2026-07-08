export enum IncidentType {
  VIOLENCE = 'violence',
  BALLOT_SNATCHING = 'ballot_snatching',
  INTIMIDATION = 'intimidation',
  LATE_MATERIALS = 'late_materials',
  RESULT_FALSIFICATION = 'result_falsification',
  AGENT_HARASSMENT = 'agent_harassment',
  UNDERAGE_VOTING = 'underage_voting',
  VOTE_BUYING = 'vote_buying',
  OTHER = 'other',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
}

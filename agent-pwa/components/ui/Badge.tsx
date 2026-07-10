import { ResultStatus, IncidentSeverity, IncidentStatus, Role } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gray';
  className?: string;
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  const styles: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

export function ResultStatusBadge({ status }: { status: ResultStatus }) {
  const map: Record<ResultStatus, { label: string; variant: BadgeProps['variant'] }> = {
    [ResultStatus.DRAFT]: { label: 'Draft', variant: 'gray' },
    [ResultStatus.SUBMITTED]: { label: 'Submitted', variant: 'info' },
    [ResultStatus.FLAGGED]: { label: 'Flagged', variant: 'danger' },
    [ResultStatus.VERIFIED]: { label: 'Verified', variant: 'success' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge label={label} variant={variant} />;
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const map: Record<IncidentSeverity, { label: string; variant: BadgeProps['variant'] }> = {
    [IncidentSeverity.LOW]: { label: 'Low', variant: 'success' },
    [IncidentSeverity.MEDIUM]: { label: 'Medium', variant: 'warning' },
    [IncidentSeverity.HIGH]: { label: 'High', variant: 'danger' },
    [IncidentSeverity.CRITICAL]: { label: 'Critical', variant: 'danger' },
  };
  const { label, variant } = map[severity] ?? { label: severity, variant: 'default' };
  return <Badge label={label} variant={variant} />;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const map: Record<IncidentStatus, { label: string; variant: BadgeProps['variant'] }> = {
    [IncidentStatus.OPEN]: { label: 'Open', variant: 'warning' },
    [IncidentStatus.ESCALATED]: { label: 'Escalated', variant: 'danger' },
    [IncidentStatus.RESOLVED]: { label: 'Resolved', variant: 'success' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge label={label} variant={variant} />;
}

export function RoleBadge({ role }: { role: Role }) {
  const labels: Record<Role, string> = {
    [Role.ADMIN]: 'Admin',
    [Role.EXECUTIVE]: 'Executive',
    [Role.STATE_COORDINATOR]: 'State Coord.',
    [Role.LGA_COORDINATOR]: 'LGA Coord.',
    [Role.WARD_COORDINATOR]: 'Ward Coord.',
    [Role.AGENT]: 'Agent',
  };
  return <Badge label={labels[role] ?? role} variant="info" />;
}

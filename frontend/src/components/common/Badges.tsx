import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusType = 'taken' | 'skipped' | 'missed' | 'snoozed' | 'active' | 'inactive' | 'pending' |
  'paused' | 'completed' | 'discontinued' | 'uploaded' | 'under_review' | 'processed' | 'revoked' |
  'reviewed' | 'needs_clarification';

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  taken: { label: 'Taken', className: 'bg-success/10 text-success border-success/20' },
  skipped: { label: 'Skipped', className: 'bg-warning/10 text-warning border-warning/20' },
  missed: { label: 'Missed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  snoozed: { label: 'Snoozed', className: 'bg-primary/10 text-primary border-primary/20' },
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-border' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  discontinued: { label: 'Discontinued', className: 'bg-muted text-muted-foreground border-border' },
  uploaded: { label: 'Uploaded', className: 'bg-primary/10 text-primary border-primary/20' },
  under_review: { label: 'Under Review', className: 'bg-warning/10 text-warning border-warning/20' },
  processed: { label: 'Processed', className: 'bg-success/10 text-success border-success/20' },
  revoked: { label: 'Revoked', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  reviewed: { label: 'Reviewed', className: 'bg-success/10 text-success border-success/20' },
  needs_clarification: { label: 'Needs Clarification', className: 'bg-warning/10 text-warning border-warning/20' },
};

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', config.className, className)}>
      {config.label}
    </Badge>
  );
}

const riskConfig = {
  low: { label: 'Low Risk', className: 'bg-success/10 text-success border-success/20' },
  medium: { label: 'Medium Risk', className: 'bg-warning/10 text-warning border-warning/20' },
  high: { label: 'High Risk', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function RefillRiskBadge({ risk, className }: { risk: 'low' | 'medium' | 'high'; className?: string }) {
  const config = riskConfig[risk];
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', config.className, className)}>
      {config.label}
    </Badge>
  );
}

const roleConfig: Record<string, { label: string; className: string }> = {
  patient: { label: 'Patient', className: 'bg-primary/10 text-primary border-primary/20' },
  caregiver: { label: 'Caregiver', className: 'bg-accent/10 text-accent border-accent/20' },
  doctor: { label: 'Doctor', className: 'bg-primary/10 text-primary border-primary/20' },
  pharmacist: { label: 'Pharmacist', className: 'bg-success/10 text-success border-success/20' },
  nurse: { label: 'Nurse', className: 'bg-warning/10 text-warning border-warning/20' },
  care_coordinator: { label: 'Care Coordinator', className: 'bg-accent/10 text-accent border-accent/20' },
  admin: { label: 'Admin', className: 'bg-foreground/10 text-foreground border-foreground/20' },
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const config = roleConfig[role] || { label: role, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('font-medium text-xs capitalize', config.className, className)}>
      {config.label}
    </Badge>
  );
}

const sourceConfig: Record<string, string> = {
  app: 'bg-primary/10 text-primary border-primary/20',
  caregiver: 'bg-accent/10 text-accent border-accent/20',
  provider: 'bg-success/10 text-success border-success/20',
  system: 'bg-muted text-muted-foreground border-border',
  whatsapp: 'bg-success/10 text-success border-success/20',
  ivr: 'bg-warning/10 text-warning border-warning/20',
};

export function SourceBadge({ source, className }: { source: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium text-xs capitalize', sourceConfig[source] || '', className)}>
      {source}
    </Badge>
  );
}

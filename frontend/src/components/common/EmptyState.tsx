import { LucideIcon, FileText, Users, Pill, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: 'default' | 'medications' | 'patients' | 'prescriptions' | 'activity';
  className?: string;
}

const variantIcons: Record<string, LucideIcon> = {
  medications: Pill,
  patients: Users,
  prescriptions: FileText,
  activity: ClipboardList,
};

export function EmptyState({ icon, title, description, action, variant = 'default', className }: EmptyStateProps) {
  const Icon = icon || variantIcons[variant] || FileText;
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="rounded-2xl bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

import { Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, RoleBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { mockProviderAccess } from '@/lib/mock-data';

export default function ProviderAccessPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Provider Access</h1>
          <p className="text-muted-foreground mt-1">Manage which healthcare providers can view patient data</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Provider</Button>
      </div>

      {mockProviderAccess.length === 0 ? (
        <EmptyState icon={Shield} title="No provider access configured"
          description="Grant access to doctors, pharmacists, or care coordinators to view patient adherence data."
          action={<Button><Plus className="h-4 w-4 mr-2" />Add Provider</Button>} />
      ) : (
        <div className="space-y-3">
          {mockProviderAccess.map(pa => (
            <div key={pa.id} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {pa.provider.full_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{pa.provider.full_name}</p>
                <p className="text-sm text-muted-foreground">{pa.provider.email}</p>
              </div>
              <RoleBadge role={pa.provider_role} />
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground capitalize">{pa.access_level.replace('_', ' ')}</span>
              <div className="text-sm text-muted-foreground">
                Patient: <span className="font-medium text-foreground">{pa.patient.user.full_name}</span>
              </div>
              <StatusBadge status={pa.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

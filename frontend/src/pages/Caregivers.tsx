import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { mockCaregiverLinks } from '@/lib/mock-data';

export default function Caregivers() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Caregivers</h1>
          <p className="text-muted-foreground mt-1">Manage caregiver relationships and alert preferences</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Caregiver</Button>
      </div>

      {mockCaregiverLinks.length === 0 ? (
        <EmptyState icon={Users} title="No caregiver linked yet"
          description="Add someone who can help monitor medication adherence. They'll receive alerts for missed doses and refill reminders."
          action={<Button><Plus className="h-4 w-4 mr-2" />Invite Caregiver</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {mockCaregiverLinks.map(link => (
            <div key={link.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                  {link.caregiver.full_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{link.caregiver.full_name}</p>
                  <p className="text-sm text-muted-foreground">{link.relationship} · {link.caregiver.email}</p>
                </div>
                <StatusBadge status={link.status} />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Users className="h-4 w-4" />
                <span>Caring for <span className="font-medium text-foreground">{link.patient.user.full_name}</span></span>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${link.alert_on_missed ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                  <span className="text-muted-foreground">Missed dose alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${link.alert_on_refill ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                  <span className="text-muted-foreground">Refill alerts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

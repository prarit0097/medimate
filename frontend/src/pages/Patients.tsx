import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdherenceRing } from '@/components/common/AdherenceRing';
import { RefillRiskBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { mockPatients } from '@/lib/mock-data';

export default function Patients() {
  const [search, setSearch] = useState('');
  const filtered = mockPatients.filter(p =>
    p.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.conditions.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor patient profiles</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Patient</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or condition..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState variant="patients" title="No patients found" description="No patients match your search. Try adjusting your filters or add a new patient." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(patient => (
            <Link key={patient.id} to={`/app/patients/${patient.id}`}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {patient.user.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">{patient.user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{patient.user.email}</p>
                  </div>
                </div>
                <AdherenceRing score={patient.adherence_score} size="sm" showLabel={false} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {patient.conditions.map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{patient.active_medications_count} meds</span>
                </div>
                <RefillRiskBadge risk={patient.refill_risk} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

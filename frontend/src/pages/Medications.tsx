import { useState } from 'react';
import { Search, Plus, Pill, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, RefillRiskBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { mockMedications } from '@/lib/mock-data';

export default function Medications() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = mockMedications.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Medications</h1>
          <p className="text-muted-foreground mt-1">View and manage all medication records</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Medication</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search medications..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState variant="medications" title="No medications found" description="No medications match your search. Try adjusting your filters or add a new medication." />
      ) : (
        <div className="space-y-3">
          {filtered.map(med => (
            <div key={med.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-lg">{med.name}</p>
                    {med.is_high_risk && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">High Risk</span>}
                    <StatusBadge status={med.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {med.dosage} · {med.form} · {med.frequency}
                    {med.meal_relation !== 'anytime' && ` · ${med.meal_relation.replace('_', ' ')}`}
                  </p>
                  {med.instructions && <p className="text-xs text-muted-foreground mt-1">{med.instructions}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {med.stock_remaining !== undefined && (
                    <p className={`text-sm font-medium ${med.stock_remaining <= 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {med.stock_remaining} doses left
                    </p>
                  )}
                  {med.estimated_refill_date && (
                    <p className="text-xs text-muted-foreground">
                      Refill: {new Date(med.estimated_refill_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

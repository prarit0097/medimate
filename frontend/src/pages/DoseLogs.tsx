import { useState } from 'react';
import { Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, SourceBadge } from '@/components/common/Badges';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { mockDoseLogs } from '@/lib/mock-data';
import { Activity, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function DoseLogs() {
  const [statusFilter, setStatusFilter] = useState('all');
  const logs = mockDoseLogs.filter(l => statusFilter === 'all' || l.status === statusFilter);

  const stats = {
    taken: mockDoseLogs.filter(l => l.status === 'taken').length,
    missed: mockDoseLogs.filter(l => l.status === 'missed').length,
    skipped: mockDoseLogs.filter(l => l.status === 'skipped').length,
    total: mockDoseLogs.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dose Logs</h1>
          <p className="text-muted-foreground mt-1">Track all dose activity across patients</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Doses" value={stats.total} icon={Activity} />
        <StatCard title="Taken" value={stats.taken} icon={CheckCircle2} variant="success" />
        <StatCard title="Missed" value={stats.missed} icon={XCircle} variant="danger" />
        <StatCard title="Skipped" value={stats.skipped} icon={AlertTriangle} variant="warning" />
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="taken">Taken</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <EmptyState variant="activity" title="No dose activity found" description="No dose logs match your current filter. Try adjusting your selection." />
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <StatusBadge status={log.status} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{log.medication.name} <span className="text-muted-foreground font-normal text-sm">· {log.medication.dosage}</span></p>
                {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
              </div>
              <SourceBadge source={log.source} />
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">
                  {new Date(log.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

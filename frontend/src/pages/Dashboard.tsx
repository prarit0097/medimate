import { Activity, Pill, AlertTriangle, TrendingUp, CheckCircle2, Clock, XCircle, Bell } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { AdherenceRing } from '@/components/common/AdherenceRing';
import { StatusBadge, RefillRiskBadge, SourceBadge } from '@/components/common/Badges';
import { Button } from '@/components/ui/button';
import { mockDashboard, mockMedications } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DOSE_COLORS: Record<string, string> = {
  taken: 'hsl(152, 55%, 42%)',
  missed: 'hsl(0, 72%, 51%)',
  skipped: 'hsl(38, 92%, 50%)',
  snoozed: 'hsl(192, 65%, 38%)',
};

export default function Dashboard() {
  const data = mockDashboard;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Good morning, Priya</h1>
        <p className="text-muted-foreground mt-1">Here's your care summary for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Adherence Score" value={`${data.adherence_score}%`} icon={TrendingUp}
          variant="success" trend={{ value: 3, label: 'vs last week' }} />
        <StatCard title="Today's Doses" value={data.todays_doses.length} icon={Pill}
          subtitle={`${data.todays_doses.filter(d => d.status === 'taken').length} completed`} />
        <StatCard title="Missed Doses" value={data.missed_doses_count} icon={AlertTriangle}
          variant={data.missed_doses_count > 0 ? 'warning' : 'default'} subtitle="This week" />
        <StatCard title="Active Medications" value={data.active_medications_count} icon={Activity} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Today's Schedule</h2>
            <span className="text-sm text-muted-foreground">
              {data.todays_doses.filter(d => d.status === 'taken').length}/{data.todays_doses.length} done
            </span>
          </div>
          <div className="space-y-3">
            {data.todays_doses.map((dose) => (
              <div key={dose.id} className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  dose.status === 'taken' ? 'bg-success/10' : dose.status === 'missed' ? 'bg-destructive/10' : 'bg-muted'
                }`}>
                  {dose.status === 'taken' ? <CheckCircle2 className="h-5 w-5 text-success" /> :
                    dose.status === 'missed' ? <XCircle className="h-5 w-5 text-destructive" /> :
                    <Clock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{dose.medication.name}</p>
                  <p className="text-sm text-muted-foreground">{dose.medication.dosage} · {dose.medication.instructions || dose.medication.frequency}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">
                    {new Date(dose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <StatusBadge status={dose.status} />
                </div>
                {dose.status !== 'taken' && dose.status !== 'missed' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs h-8">Skip</Button>
                    <Button size="sm" className="text-xs h-8">Taken</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Adherence + Distribution */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 self-start">Weekly Adherence</h3>
            <AdherenceRing score={data.adherence_score} size="lg" />
            <p className="text-sm text-muted-foreground mt-3">You're on track this week.</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Dose Distribution</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.dose_distribution} dataKey="count" nameKey="status" cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65} strokeWidth={2}>
                    {data.dose_distribution.map((entry) => (
                      <Cell key={entry.status} fill={DOSE_COLORS[entry.status] || '#ccc'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {data.dose_distribution.map(d => (
                <div key={d.status} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: DOSE_COLORS[d.status] }} />
                  <span className="capitalize text-muted-foreground">{d.status} ({d.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Weekly Adherence Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekly_adherence}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis hide domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(192, 65%, 38%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Refill Risk */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Refill Alerts</h3>
            <Bell className="h-4 w-4 text-warning" />
          </div>
          {data.refill_risk_medications.length > 0 ? (
            <div className="space-y-3">
              {data.refill_risk_medications.map(med => (
                <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/15">
                  <div>
                    <p className="font-medium">{med.name}</p>
                    <p className="text-sm text-muted-foreground">{med.stock_remaining} doses remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Refill by</p>
                    <p className="text-sm font-medium text-warning">
                      {med.estimated_refill_date ? new Date(med.estimated_refill_date).toLocaleDateString() : 'Soon'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No refill concerns right now. Good progress.</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {data.recent_activity.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <StatusBadge status={log.status} />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{log.medication.name}</span>
                <span className="text-muted-foreground text-sm"> · {log.medication.dosage}</span>
              </div>
              <SourceBadge source={log.source} />
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

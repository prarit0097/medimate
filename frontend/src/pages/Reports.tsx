import { TrendingUp, Pill, AlertTriangle, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { AdherenceRing } from '@/components/common/AdherenceRing';
import { mockDashboard, mockMedications } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(152,55%,42%)', 'hsl(0,72%,51%)', 'hsl(38,92%,50%)', 'hsl(192,65%,38%)'];

export default function Reports() {
  const data = mockDashboard;
  const highRiskMeds = mockMedications.filter(m => m.is_high_risk);
  const refillDue = mockMedications.filter(m => m.stock_remaining !== undefined && m.stock_remaining <= 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Summary</h1>
          <p className="text-muted-foreground mt-1">Adherence insights, refill tracking, and care summaries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overall Adherence" value={`${data.adherence_score}%`} icon={TrendingUp} variant="success" />
        <StatCard title="Active Medications" value={data.active_medications_count} icon={Pill} />
        <StatCard title="Refill Due Soon" value={refillDue.length} icon={AlertTriangle} variant={refillDue.length > 0 ? 'warning' : 'default'} />
        <StatCard title="High Risk Meds" value={highRiskMeds.length} icon={AlertTriangle} variant={highRiskMeds.length > 0 ? 'danger' : 'default'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Adherence Ring + Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Adherence Overview</h3>
          <div className="flex items-center gap-8">
            <AdherenceRing score={data.adherence_score} size="lg" />
            <div className="flex-1 h-48">
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
        </div>

        {/* Dose Distribution */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Dose Status Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.dose_distribution} dataKey="count" nameKey="status" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80} strokeWidth={2}>
                  {data.dose_distribution.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {data.dose_distribution.map((d, i) => (
              <div key={d.status} className="flex items-center gap-1.5 text-sm">
                <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />
                <span className="capitalize text-muted-foreground">{d.status}: {d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refill Due */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Medications Due for Refill</h3>
        {refillDue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medications need refilling right now. Good progress.</p>
        ) : (
          <div className="space-y-3">
            {refillDue.map(med => (
              <div key={med.id} className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/15">
                <div>
                  <p className="font-medium">{med.name}</p>
                  <p className="text-sm text-muted-foreground">{med.dosage} · {med.frequency}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-warning">{med.stock_remaining} doses left</p>
                  {med.estimated_refill_date && (
                    <p className="text-xs text-muted-foreground">Refill by {new Date(med.estimated_refill_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medication Burden */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Medication Burden Summary</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-3xl font-bold">{mockMedications.length}</p>
            <p className="text-sm text-muted-foreground">Total Medications</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-3xl font-bold">{mockMedications.filter(m => m.status === 'active').length}</p>
            <p className="text-sm text-muted-foreground">Currently Active</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-3xl font-bold">{highRiskMeds.length}</p>
            <p className="text-sm text-muted-foreground">High-Risk Medications</p>
          </div>
        </div>
      </div>
    </div>
  );
}

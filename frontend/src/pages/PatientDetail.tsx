import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Globe, Clock, Pill, Activity, FileText, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/common/StatCard';
import { AdherenceRing } from '@/components/common/AdherenceRing';
import { StatusBadge, RefillRiskBadge, RoleBadge, SourceBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { mockPatients, mockMedications, mockDoseLogs, mockPrescriptions, mockCaregiverLinks, mockProviderAccess, mockDashboard } from '@/lib/mock-data';

export default function PatientDetail() {
  const { id } = useParams();
  const patient = mockPatients.find(p => p.id === id) || mockPatients[0];
  const meds = mockMedications.filter(m => m.patient_id === patient.id);
  const logs = mockDoseLogs.filter(l => l.patient_id === patient.id);
  const rxs = mockPrescriptions.filter(p => p.patient_id === patient.id);
  const caregivers = mockCaregiverLinks.filter(c => c.patient.id === patient.id);
  const providers = mockProviderAccess.filter(p => p.patient.id === patient.id);
  const dashboard = mockDashboard;

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/app/patients">
          <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {patient.user.full_name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{patient.user.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {age && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{age} years</span>}
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{patient.user.preferred_language.toUpperCase()}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{patient.user.timezone}</span>
              </div>
            </div>
          </div>
        </div>
        <AdherenceRing score={patient.adherence_score} size="md" />
      </div>

      {/* Conditions */}
      <div className="flex flex-wrap gap-2">
        {patient.conditions.map(c => (
          <span key={c} className="text-sm px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">{c}</span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Adherence" value={`${patient.adherence_score}%`} icon={Activity} variant="success" />
        <StatCard title="Active Meds" value={meds.filter(m => m.status === 'active').length} icon={Pill} />
        <StatCard title="Missed This Week" value={dashboard.missed_doses_count} icon={Activity} variant={dashboard.missed_doses_count > 0 ? 'warning' : 'default'} />
        <StatCard title="Refill Risk" value={patient.refill_risk === 'high' ? 'High' : patient.refill_risk === 'medium' ? 'Medium' : 'Low'} icon={Activity} variant={patient.refill_risk === 'high' ? 'danger' : patient.refill_risk === 'medium' ? 'warning' : 'success'} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="history">Dose History</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="care-team">Care Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Refill Risk Meds */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Refill Alerts</h3>
            {dashboard.refill_risk_medications.length > 0 ? (
              <div className="space-y-3">
                {dashboard.refill_risk_medications.map(med => (
                  <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/15">
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-muted-foreground">{med.stock_remaining} doses left</p>
                    </div>
                    <p className="text-sm font-medium text-warning">
                      {med.estimated_refill_date ? `Refill by ${new Date(med.estimated_refill_date).toLocaleDateString()}` : 'Refill soon'}
                    </p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No refill concerns. Good progress.</p>}
          </div>
          {/* Recent Activity */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <StatusBadge status={log.status} />
                  <span className="font-medium">{log.medication.name}</span>
                  <span className="text-sm text-muted-foreground">{log.medication.dosage}</span>
                  <SourceBadge source={log.source} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="medications">
          {meds.length === 0 ? (
            <EmptyState variant="medications" title="No medications yet" description="No medications have been added for this patient." />
          ) : (
            <div className="space-y-3">
              {meds.map(med => (
                <div key={med.id} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{med.name}</p>
                      {med.is_high_risk && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">High Risk</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{med.dosage} · {med.form} · {med.frequency}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={med.status} />
                    {med.stock_remaining !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">{med.stock_remaining} doses left</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {logs.length === 0 ? (
            <EmptyState variant="activity" title="No dose activity" description="No dose logs found for this patient." />
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <div className="flex-1">
                    <p className="font-medium">{log.medication.name} <span className="text-muted-foreground font-normal">· {log.medication.dosage}</span></p>
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                  </div>
                  <SourceBadge source={log.source} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.scheduled_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions">
          {rxs.length === 0 ? (
            <EmptyState variant="prescriptions" title="No prescriptions" description="No prescriptions have been uploaded for this patient." />
          ) : (
            <div className="space-y-3">
              {rxs.map(rx => (
                <div key={rx.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{rx.file_name}</p>
                    <p className="text-xs text-muted-foreground">Uploaded by {rx.uploaded_by}</p>
                  </div>
                  <StatusBadge status={rx.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(rx.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="care-team" className="space-y-6">
          {/* Caregivers */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Caregivers</h3>
            {caregivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No caregiver linked yet. Add someone who can help monitor adherence.</p>
            ) : (
              <div className="space-y-3">
                {caregivers.map(cg => (
                  <div key={cg.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                      {cg.caregiver.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{cg.caregiver.full_name}</p>
                      <p className="text-xs text-muted-foreground">{cg.relationship} · {cg.caregiver.email}</p>
                    </div>
                    <StatusBadge status={cg.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Providers */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4" />Providers</h3>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No providers have access to this patient.</p>
            ) : (
              <div className="space-y-3">
                {providers.map(pa => (
                  <div key={pa.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {pa.provider.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{pa.provider.full_name}</p>
                      <p className="text-xs text-muted-foreground">{pa.provider.email}</p>
                    </div>
                    <RoleBadge role={pa.provider_role} />
                    <StatusBadge status={pa.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

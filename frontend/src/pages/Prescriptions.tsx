import { Upload, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { mockPrescriptions } from '@/lib/mock-data';

export default function Prescriptions() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground mt-1">Upload and manage prescription documents</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Upload Prescription</Button>
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed border-border rounded-xl p-10 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium">Drag and drop prescription files here</p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse. Supports PDF, JPG, PNG up to 10MB.</p>
      </div>

      {mockPrescriptions.length === 0 ? (
        <EmptyState variant="prescriptions" title="No prescriptions uploaded yet" description="Upload a prescription document to get started." />
      ) : (
        <div className="space-y-3">
          {mockPrescriptions.map(rx => (
            <div key={rx.id} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{rx.file_name}</p>
                <p className="text-sm text-muted-foreground">Uploaded by {rx.uploaded_by}</p>
                {rx.notes && <p className="text-xs text-muted-foreground mt-0.5">{rx.notes}</p>}
              </div>
              <StatusBadge status={rx.status} />
              <span className="text-sm text-muted-foreground shrink-0">
                {new Date(rx.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

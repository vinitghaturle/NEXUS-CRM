import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { FileText, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ReportRecord {
  reportId: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  generatedBy: string;
  summary: string;
  reportUrl: string;
}

export const ReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Queries
  const { data: reports = [], isLoading, error, refetch } = useQuery<ReportRecord[]>({
    queryKey: ['reports'],
    queryFn: () => callApi('reports.list'),
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: (payload: any) => callApi('reports.generate', payload),
    onSuccess: () => {
      setIsGenerateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canGenerate = role === 'PRESIDENT' || role === 'VP';

  if (isLoading) return <Loading message="Syncing reports archive..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Archive</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">System Reports</h1>
          <p className="text-caption-spec text-ink-muted48">Generate, inspect, and export compiled snapshots of operational activity.</p>
        </div>
        {canGenerate && (
          <button 
            onClick={() => setIsGenerateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <RefreshCw className="w-4 h-4" /> Generate
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <EmptyState title="No system reports generated yet" description="Generate Weekly or Monthly summary reports from current operations." />
      ) : (
        <div className="space-y-md">
          {reports.map(rep => {
            const isExpanded = expandedReportId === rep.reportId;
            return (
              <div key={rep.reportId} className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
                <div 
                  onClick={() => setExpandedReportId(isExpanded ? null : rep.reportId)}
                  className="p-md hover:bg-canvas-parchment/10 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div className="flex items-center gap-md">
                    <div className="w-9 h-9 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-body-strong font-bold text-ink flex items-center gap-xs">
                        {rep.reportType} Snapshot
                        <span className="text-[10px] font-mono text-ink-muted32 font-bold">{rep.reportId}</span>
                      </h4>
                      <p className="text-caption-spec text-ink-muted48 text-[12px] font-mono">
                        Period: {new Date(rep.periodStart).toLocaleDateString('en-IN')} to {new Date(rep.periodEnd).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="text-[11px] text-ink-muted48 font-mono hidden sm:inline">
                      Generated: {new Date(rep.generatedAt).toLocaleString('en-IN')}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-muted48" /> : <ChevronDown className="w-4 h-4 text-ink-muted48" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-lg pb-lg border-t border-hairline bg-canvas-parchment/10 animate-fade-in text-[13px] text-ink-muted80 space-y-md text-left pt-md">
                    <div className="bg-canvas border border-hairline rounded-md p-md font-mono text-[12px] whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner text-ink">
                      {rep.summary}
                    </div>
                    <div className="flex justify-end gap-sm text-[12px]">
                      <span className="text-ink-muted48 py-[6px]">Evaluated By: {rep.generatedBy}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Modal */}
      {isGenerateOpen && (
        <GenerateReportModal 
          onSubmit={(data) => generateMutation.mutate(data)} 
          onClose={() => setIsGenerateOpen(false)} 
        />
      )}
    </div>
  );
};

/* --- GENERATE MODAL COMPONENT --- */
const GenerateReportModal: React.FC<{ onSubmit: (data: any) => void; onClose: () => void }> = ({ onSubmit, onClose }) => {
  const [reportType, setReportType] = useState('WEEKLY');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ reportType, periodStart, periodEnd });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Generate System Snapshot</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Report Interval *</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-semibold">
              <option value="WEEKLY">Weekly operations report</option>
              <option value="MONTHLY">Monthly status summary</option>
              <option value="SEMESTER">Semester financial/milestones overview</option>
              <option value="ANNUAL">Annual session log</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Start Date *</label>
              <input type="date" required value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">End Date *</label>
              <input type="date" required value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Compile Snapshot</button>
          </div>
        </form>
      </div>
    </div>
  );
};

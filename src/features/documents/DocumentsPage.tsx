import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, ExternalLink } from 'lucide-react';

interface DocumentItem {
  documentId: string;
  eventId: string;
  documentType: string;
  documentName: string;
  driveUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  description: string;
}

interface User {
  userId: string;
  name: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const DocumentsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Queries
  const { data: documents = [], isLoading, error, refetch } = useQuery<DocumentItem[]>({
    queryKey: ['documents'],
    queryFn: () => callApi('documents.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  const { data: events = [] } = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: () => callApi('events.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('documents.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  if (isLoading) return <Loading message="Loading documents catalog..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Knowledge base</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Documents Registry</h1>
          <p className="text-caption-spec text-ink-muted48">Index Google Drive assets, templates, permission certificates, and event bills.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Link Asset
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState title="No documents indexed" description="Add a direct Google Drive folder or document reference link." />
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas-parchment/40 text-ink-muted48 font-semibold uppercase tracking-wider select-none">
                  <th className="py-md px-lg font-semibold">Document Name</th>
                  <th className="py-md px-lg font-semibold">Type</th>
                  <th className="py-md px-lg font-semibold">Linked Event</th>
                  <th className="py-md px-lg font-semibold">Indexed By</th>
                  <th className="py-md px-lg font-semibold">Date Added</th>
                  <th className="py-md px-lg font-semibold text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {documents.map(doc => {
                  const eventName = events.find(e => e.eventId === doc.eventId)?.eventName || 'General branding';
                  const uploaderName = users.find(u => u.userId === doc.uploadedBy)?.name || 'System';
                  return (
                    <tr key={doc.documentId} className="hover:bg-canvas-parchment/10 transition-colors">
                      <td className="py-md px-lg font-bold text-ink truncate max-w-[200px]" title={doc.documentName}>
                        {doc.documentName}
                      </td>
                      <td className="py-md px-lg">
                        <span className="px-xs py-[2px] text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/50 rounded-sm font-mono">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="py-md px-lg text-ink-muted80 truncate max-w-[150px]" title={eventName}>{eventName}</td>
                      <td className="py-md px-lg text-ink-muted80">{uploaderName}</td>
                      <td className="py-md px-lg font-mono text-ink-muted80">
                        {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-md px-lg text-right">
                        <a 
                          href={doc.driveUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-xxs text-primary hover:underline font-semibold"
                        >
                          Drive Link <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateDocumentModal 
          events={events}
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateDocumentModal: React.FC<{ events: EventItem[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ events, onSubmit, onClose }) => {
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('TEMPLATE');
  const [eventId, setEventId] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ documentName, documentType, eventId, driveUrl, description });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Link Google Drive Asset</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Document / Folder Name *</label>
            <input type="text" required placeholder="e.g. Master Proposal PDF" value={documentName} onChange={e => setDocumentName(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Asset Category</label>
              <select value={documentType} onChange={e => setDocumentType(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="TEMPLATE">Official Template</option>
                <option value="PROPOSAL">Proposal / MoA</option>
                <option value="CERTIFICATE">Certificate Design</option>
                <option value="BILL">Event Bills & Accounts</option>
                <option value="OTHER">Other Link</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Linked Event</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">None / General</option>
                {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Google Drive URL *</label>
            <input type="url" required placeholder="https://drive.google.com/..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Brief Description</label>
            <input type="text" placeholder="e.g. Final signed copy of sponsor contract." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Link Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
};

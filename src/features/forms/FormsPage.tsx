import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, ExternalLink, Edit3 } from 'lucide-react';

interface FormItem {
  formId: string;
  formName: string;
  eventId: string;
  ownerId: string;
  creationDeadline: string;
  launchDate: string;
  closingDate: string;
  responseCount: number;
  status: string;
  formUrl: string;
  responseSheetUrl: string;
}

interface User {
  userId: string;
  name: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const FormsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);

  // Queries
  const { data: forms = [], isLoading, error, refetch } = useQuery<FormItem[]>({
    queryKey: ['forms'],
    queryFn: () => callApi('forms.list'),
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
    mutationFn: (payload: any) => callApi('forms.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ formId, payload }: { formId: string; payload: any }) => 
      callApi('forms.update', { formId, ...payload }),
    onSuccess: () => {
      setSelectedForm(null);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  if (isLoading) return <Loading message="Loading operational forms..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Audience & Feedback</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Forms Registry</h1>
          <p className="text-caption-spec text-ink-muted48">Log Google response sheets, feedback registrations, and event registrations.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Form Link
          </button>
        )}
      </div>

      {forms.length === 0 ? (
        <EmptyState title="No forms indexed" description="Register a new registration form or feedback sheet URL." />
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas-parchment/40 text-ink-muted48 font-semibold uppercase tracking-wider select-none">
                  <th className="py-md px-lg font-semibold">Form Name</th>
                  <th className="py-md px-lg font-semibold">Event Context</th>
                  <th className="py-md px-lg font-semibold">Responsible Owner</th>
                  <th className="py-md px-lg font-semibold text-center">Responses</th>
                  <th className="py-md px-lg font-semibold">Form Link</th>
                  <th className="py-md px-lg font-semibold">Responses Sheet</th>
                  <th className="py-md px-lg font-semibold">Status</th>
                  {canEdit && <th className="py-md px-lg font-semibold text-right">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {forms.map(f => {
                  const eventName = events.find(e => e.eventId === f.eventId)?.eventName || 'General Branding';
                  const ownerName = users.find(u => u.userId === f.ownerId)?.name || 'Unassigned';
                  return (
                    <tr key={f.formId} className="hover:bg-canvas-parchment/10 transition-colors">
                      <td className="py-md px-lg font-bold text-ink truncate max-w-[200px]" title={f.formName}>
                        {f.formName}
                      </td>
                      <td className="py-md px-lg text-ink-muted80 truncate max-w-[150px]" title={eventName}>{eventName}</td>
                      <td className="py-md px-lg text-ink-muted80">{ownerName}</td>
                      <td className="py-md px-lg text-center font-bold text-primary font-mono">{f.responseCount || 0}</td>
                      <td className="py-md px-lg">
                        {f.formUrl ? (
                          <a href={f.formUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-xxs text-primary hover:underline">
                            Open Form <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : <span className="text-ink-muted32">-</span>}
                      </td>
                      <td className="py-md px-lg">
                        {f.responseSheetUrl ? (
                          <a href={f.responseSheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-xxs text-slate-600 hover:underline">
                            Sheet link <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : <span className="text-ink-muted32">-</span>}
                      </td>
                      <td className="py-md px-lg">
                        <span className={`px-xs py-[2px] text-[10px] font-semibold rounded-pill ${
                          f.status === 'LIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-md px-lg text-right">
                          <button 
                            onClick={() => setSelectedForm(f)}
                            className="p-xxs hover:bg-ink-muted8 rounded-md text-primary"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
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
        <CreateFormModal 
          events={events}
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedForm && (
        <EditFormModal 
          formItem={selectedForm}
          onSubmit={(payload) => updateMutation.mutate({ formId: selectedForm.formId, payload })} 
          onClose={() => setSelectedForm(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateFormModal: React.FC<{ events: EventItem[]; users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ events, users, onSubmit, onClose }) => {
  const [formName, setFormName] = useState('');
  const [eventId, setEventId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [responseSheetUrl, setResponseSheetUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ formName, eventId, ownerId, formUrl, responseSheetUrl });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Index Operational Form</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Form Name *</label>
            <input type="text" required placeholder="e.g. Workshop Feedback Form" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Linked Event</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">None / General</option>
                {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Form Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Owner</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Google Form link URL</label>
            <input type="url" placeholder="https://docs.google.com/forms/..." value={formUrl} onChange={e => setFormUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Response Spreadsheet URL</label>
            <input type="url" placeholder="https://docs.google.com/spreadsheets/..." value={responseSheetUrl} onChange={e => setResponseSheetUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Save Index</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditFormModal: React.FC<{ formItem: FormItem; onSubmit: (data: any) => void; onClose: () => void }> = ({ formItem, onSubmit, onClose }) => {
  const [status, setStatus] = useState(formItem.status);
  const [responseCount, setResponseCount] = useState(formItem.responseCount);
  const [responseSheetUrl, setResponseSheetUrl] = useState(formItem.responseSheetUrl || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ status, responseCount: Number(responseCount), responseSheetUrl });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Form Status</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="PLANNING">Planning</option>
                <option value="LIVE">Live / Accepting Responses</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Response Count</label>
              <input type="number" min="0" value={responseCount} onChange={e => setResponseCount(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Responses Spreadsheet URL</label>
            <input type="url" value={responseSheetUrl} onChange={e => setResponseSheetUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Update Form</button>
          </div>
        </form>
      </div>
    </div>
  );
};

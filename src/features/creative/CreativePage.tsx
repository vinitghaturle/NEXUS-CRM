import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Calendar } from 'lucide-react';

interface CreativeBrief {
  creativeId: string;
  eventId: string;
  creativeType: string;
  title: string;
  designerId: string;
  contentOwnerId: string;
  contentReceived: string;
  designStarted: string;
  reviewStatus: string;
  approved: string;
  published: string;
  deadline: string;
  postingDate: string;
  assetUrl: string;
  remarks: string;
}

interface User {
  userId: string;
  name: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const CreativePage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<CreativeBrief | null>(null);

  // Queries
  const { data: briefs = [], isLoading, error, refetch } = useQuery<CreativeBrief[]>({
    queryKey: ['creatives'],
    queryFn: () => callApi('creative.list'),
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
    mutationFn: (payload: any) => callApi('creative.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ creativeId, payload }: { creativeId: string; payload: any }) => 
      callApi('creative.update', { creativeId, ...payload }),
    onSuccess: () => {
      setSelectedBrief(null);
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  const getStatusStyle = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return 'bg-green-500/10 text-green-700 border-green-200/50';
    if (s === 'REVIEW') return 'bg-amber-500/10 text-amber-700 border-amber-200/50';
    if (s === 'DESIGN_STARTED') return 'bg-blue-500/10 text-blue-700 border-blue-200/50';
    if (s === 'CONTENT_RECEIVED') return 'bg-indigo-500/10 text-indigo-700 border-indigo-200/50';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (isLoading) return <Loading message="Loading Creative briefs..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Content Engine</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Creative Briefs & Assets</h1>
          <p className="text-caption-spec text-ink-muted48">Track posters, brochures, and asset creation pipelines.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Brief
          </button>
        )}
      </div>

      {briefs.length === 0 ? (
        <EmptyState title="No briefs logged" description="Add a new poster brief to start tasking designers." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {briefs.map(brief => {
            const eventName = events.find(e => e.eventId === brief.eventId)?.eventName || 'General Branding';
            const designerName = users.find(u => u.userId === brief.designerId)?.name || 'Unassigned';
            return (
              <div 
                key={brief.creativeId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer relative"
                onClick={() => canEdit && setSelectedBrief(brief)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-ink-muted32 font-bold">{brief.creativeId}</span>
                  <span className={`px-xs py-[2px] text-[10px] font-semibold border rounded-sm font-mono ${getStatusStyle(brief.reviewStatus)}`}>
                    {brief.reviewStatus}
                  </span>
                </div>

                <div className="space-y-xxs">
                  <h3 className="text-body-strong font-bold text-ink line-clamp-1">{brief.title}</h3>
                  <p className="text-caption-spec text-ink-muted48 line-clamp-2">{brief.remarks || 'No brief description.'}</p>
                </div>

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80">
                  <span>🎨 {designerName}</span>
                  {brief.deadline && (
                    <span className="flex items-center gap-xxs font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(brief.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-primary bg-primary/5 px-xxs py-[2px] rounded-sm truncate">
                  🎯 {eventName}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateBriefModal 
          events={events} 
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedBrief && (
        <EditBriefModal 
          brief={selectedBrief}
          onSubmit={(payload) => updateMutation.mutate({ creativeId: selectedBrief.creativeId, payload })} 
          onClose={() => setSelectedBrief(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateBriefModal: React.FC<{ events: EventItem[]; users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ events, users, onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [creativeType, setCreativeType] = useState('POSTER');
  const [designerId, setDesignerId] = useState('');
  const [contentOwnerId, setContentOwnerId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, eventId, creativeType, designerId, contentOwnerId, deadline, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Create Poster Brief</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Title *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Event Link</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">None / General</option>
                {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Asset Type</label>
              <select value={creativeType} onChange={e => setCreativeType(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="POSTER">Poster / Banner</option>
                <option value="BROCHURE">Brochure / Booklet</option>
                <option value="VIDEO">Teaser / Video</option>
                <option value="OTHER">ID Card / Certificate</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Lead Designer</label>
              <select value={designerId} onChange={e => setDesignerId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Designer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Content Owner</label>
              <select value={contentOwnerId} onChange={e => setContentOwnerId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Owner</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Design Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks / Specs</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Submit Brief</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditBriefModal: React.FC<{ brief: CreativeBrief; onSubmit: (data: any) => void; onClose: () => void }> = ({ brief, onSubmit, onClose }) => {
  const [reviewStatus, setReviewStatus] = useState(brief.reviewStatus);
  const [contentReceived, setContentReceived] = useState(brief.contentReceived);
  const [designStarted, setDesignStarted] = useState(brief.designStarted);
  const [published, setPublished] = useState(brief.published);
  const [assetUrl, setAssetUrl] = useState(brief.assetUrl || '');
  const [remarks, setRemarks] = useState(brief.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ reviewStatus, contentReceived, designStarted, published, assetUrl, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Creative Brief Status</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Content Received</label>
              <select value={contentReceived} onChange={e => setContentReceived(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="FALSE">No</option>
                <option value="TRUE">Yes</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Design Started</label>
              <select value={designStarted} onChange={e => setDesignStarted(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="FALSE">No</option>
                <option value="TRUE">Yes</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Review Status</label>
              <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="PENDING">Pending</option>
                <option value="DESIGN_STARTED">In Design</option>
                <option value="REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Published</label>
              <select value={published} onChange={e => setPublished(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="FALSE">No</option>
                <option value="TRUE">Yes</option>
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Asset Link (Drive URL)</label>
            <input type="url" placeholder="https://drive.google.com/..." value={assetUrl} onChange={e => setAssetUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Brief Specs / Remarks</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Save Updates</button>
          </div>
        </form>
      </div>
    </div>
  );
};

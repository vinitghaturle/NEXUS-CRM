import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, ExternalLink } from 'lucide-react';

interface RecognitionRecord {
  recognitionId: string;
  userId: string;
  recognitionType: string;
  month: string;
  year: string;
  reason: string;
  eventId: string;
  volunteerHours: number;
  approvedBy: string;
  certificateUrl: string;
  createdAt: string;
}

interface User {
  userId: string;
  name: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const RecognitionPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRecognition, setSelectedRecognition] = useState<RecognitionRecord | null>(null);

  // Queries
  const { data: recognitions = [], isLoading, error, refetch } = useQuery<RecognitionRecord[]>({
    queryKey: ['recognitions'],
    queryFn: () => callApi('recognition.list'),
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
    mutationFn: (payload: any) => callApi('recognition.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ recognitionId, payload }: { recognitionId: string; payload: any }) => 
      callApi('recognition.update', { recognitionId, ...payload }),
    onSuccess: () => {
      setSelectedRecognition(null);
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP';

  if (isLoading) return <Loading message="Syncing recognition awards..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Accolades</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Recognition Board</h1>
          <p className="text-caption-spec text-ink-muted48">Log volunteer milestones, hours logged, and digital certificates.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Award
          </button>
        )}
      </div>

      {recognitions.length === 0 ? (
        <EmptyState title="No volunteer awards cataloged" description="Approve volunteer hours or recognition certificates for core members." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {recognitions.map(rec => {
            const userName = users.find(u => u.userId === rec.userId)?.name || 'Unknown User';
            const eventName = events.find(e => e.eventId === rec.eventId)?.eventName || 'General Contribution';
            return (
              <div 
                key={rec.recognitionId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer text-left relative"
                onClick={() => canEdit && setSelectedRecognition(rec)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-semibold bg-pink-500/5 text-pink-700 border border-pink-200/50 px-xs py-[2px] rounded-pill font-mono">
                    🎖️ {rec.recognitionType}
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted32 font-bold">{rec.recognitionId}</span>
                </div>

                <div className="space-y-xxs">
                  <h3 className="text-body-strong font-bold text-ink">{userName}</h3>
                  <p className="text-caption-spec text-ink-muted48 line-clamp-2">Reason: "{rec.reason || 'No description provided.'}"</p>
                </div>

                <div className="bg-canvas-parchment/60 border border-hairline rounded-md p-sm text-[12px] flex justify-between items-center">
                  <span className="text-ink-muted80">Volunteer Hours:</span>
                  <span className="font-bold text-primary font-mono">{rec.volunteerHours || 0} Hours</span>
                </div>

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80 font-mono text-[11px]">
                  <span className="truncate max-w-[150px]">🎯 {eventName}</span>
                  {rec.certificateUrl ? (
                    <a 
                      href={rec.certificateUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-xxs text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      Certificate <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : <span className="text-ink-muted32">No Cert</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateRecognitionModal 
          users={users}
          events={events}
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedRecognition && (
        <EditRecognitionModal 
          recognition={selectedRecognition}
          onSubmit={(payload) => updateMutation.mutate({ recognitionId: selectedRecognition.recognitionId, payload })} 
          onClose={() => setSelectedRecognition(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateRecognitionModal: React.FC<{ users: User[]; events: EventItem[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ users, events, onSubmit, onClose }) => {
  const [userId, setUserId] = useState('');
  const [recognitionType, setRecognitionType] = useState('STAR_VOLUNTEER');
  const [reason, setReason] = useState('');
  const [eventId, setEventId] = useState('');
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [month, setMonth] = useState('January');
  const [year, setYear] = useState('2026');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ userId, recognitionType, reason, eventId, volunteerHours, month, year });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Log Volunteer Recognition</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Select Member *</label>
            <select required value={userId} onChange={e => setUserId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
              <option value="">Select Core Member</option>
              {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Award Category *</label>
              <select value={recognitionType} onChange={e => setRecognitionType(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-semibold">
                <option value="STAR_VOLUNTEER">Star Volunteer</option>
                <option value="TEAM_PLAYER">Team Player</option>
                <option value="BEST_LEAD">Best Lead</option>
                <option value="MILESTONE">Milestone Accomplishment</option>
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
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Volunteer Hours Logged</label>
            <input type="number" min="0" value={volunteerHours} onChange={e => setVolunteerHours(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Award Reason</label>
            <input type="text" placeholder="e.g. Excellent Stage coordination in TechFest" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Confirm Award</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditRecognitionModal: React.FC<{ recognition: RecognitionRecord; onSubmit: (payload: any) => void; onClose: () => void }> = ({ recognition, onSubmit, onClose }) => {
  const [recognitionType, setRecognitionType] = useState(recognition.recognitionType);
  const [volunteerHours, setVolunteerHours] = useState(recognition.volunteerHours);
  const [reason, setReason] = useState(recognition.reason || '');
  const [certificateUrl, setCertificateUrl] = useState(recognition.certificateUrl || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ recognitionType, volunteerHours: Number(volunteerHours), reason, certificateUrl });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Recognition Award</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Award Category</label>
              <select value={recognitionType} onChange={e => setRecognitionType(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-semibold">
                <option value="STAR_VOLUNTEER">Star Volunteer</option>
                <option value="TEAM_PLAYER">Team Player</option>
                <option value="BEST_LEAD">Best Lead</option>
                <option value="MILESTONE">Milestone Accomplishment</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Volunteer Hours</label>
              <input type="number" min="0" value={volunteerHours} onChange={e => setVolunteerHours(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Certificate Link (Drive PDF link)</label>
            <input type="url" placeholder="https://drive.google.com/..." value={certificateUrl} onChange={e => setCertificateUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks / Accolade Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
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

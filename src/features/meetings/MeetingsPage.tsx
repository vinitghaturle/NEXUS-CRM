import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Calendar, Clipboard } from 'lucide-react';

interface MeetingLog {
  meetingId: string;
  meetingDate: string;
  meetingType: string;
  agenda: string;
  decision: string;
  responsiblePerson: string;
  deadline: string;
  status: string;
  remarks: string;
  createdBy: string;
}

interface User {
  userId: string;
  name: string;
}

export const MeetingsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingLog | null>(null);

  // Queries
  const { data: meetings = [], isLoading, error, refetch } = useQuery<MeetingLog[]>({
    queryKey: ['meetings'],
    queryFn: () => callApi('meetings.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('meetings.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ meetingId, payload }: { meetingId: string; payload: any }) => 
      callApi('meetings.update', { meetingId, ...payload }),
    onSuccess: () => {
      setSelectedMeeting(null);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  if (isLoading) return <Loading message="Loading meeting logs..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Decisions & Minutes</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Meetings Manager</h1>
          <p className="text-caption-spec text-ink-muted48">Log meeting agendas, decisions, deadlines, and official action items.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Minutes
          </button>
        )}
      </div>

      {meetings.length === 0 ? (
        <EmptyState title="No meetings logged" description="Document your first minutes of meeting (MoM) to track team resolutions." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {meetings.map(m => {
            const ownerName = users.find(u => u.userId === m.responsiblePerson)?.name || 'Unassigned';
            return (
              <div 
                key={m.meetingId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer text-left relative"
                onClick={() => canEdit && setSelectedMeeting(m)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-semibold bg-primary/5 text-primary px-xs py-[2px] rounded-pill font-mono">
                    📅 {new Date(m.meetingDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted32 font-bold">{m.meetingId}</span>
                </div>

                <div className="space-y-xxs">
                  <h4 className="text-[10px] font-bold text-ink-muted48 uppercase tracking-wider">Agenda</h4>
                  <p className="text-body-strong font-bold text-ink line-clamp-2">{m.agenda}</p>
                </div>

                {m.decision && (
                  <div className="bg-canvas-parchment border border-hairline rounded-md p-sm text-[12px] space-y-xxs">
                    <h5 className="font-bold text-[9px] uppercase tracking-wider text-ink-muted48 flex items-center gap-xxs">
                      <Clipboard className="w-3.5 h-3.5" /> Resolution Decisions
                    </h5>
                    <p className="text-ink">{m.decision}</p>
                  </div>
                )}

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80 font-mono text-[11px]">
                  <span>👤 Lead Owner: {ownerName}</span>
                  {m.deadline && (
                    <span className="flex items-center gap-xxs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(m.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateMeetingModal 
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedMeeting && (
        <EditMeetingModal 
          meeting={selectedMeeting}
          onSubmit={(payload) => updateMutation.mutate({ meetingId: selectedMeeting.meetingId, payload })} 
          onClose={() => setSelectedMeeting(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateMeetingModal: React.FC<{ users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ users, onSubmit, onClose }) => {
  const [agenda, setAgenda] = useState('');
  const [meetingType, setMeetingType] = useState('GENERAL');
  const [meetingDate, setMeetingDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [deadline, setDeadline] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ agenda, meetingType, meetingDate, responsiblePerson, deadline, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Log Meeting Minutes</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Meeting Agenda / Topic *</label>
            <input type="text" required placeholder="e.g. Budget Allocation & Media Guidelines" value={agenda} onChange={e => setAgenda(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting Type</label>
              <select value={meetingType} onChange={e => setMeetingType(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="GENERAL">General Body MoM</option>
                <option value="CORE">Core Committee</option>
                <option value="DEPARTMENTAL">Department Sync</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting Date</label>
              <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Resolution Owner</label>
              <select value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Member</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Action Item Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Meeting Remarks</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Log MoM</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditMeetingModal: React.FC<{ meeting: MeetingLog; onSubmit: (data: any) => void; onClose: () => void }> = ({ meeting, onSubmit, onClose }) => {
  const [decision, setDecision] = useState(meeting.decision || '');
  const [status, setStatus] = useState(meeting.status);
  const [remarks, setRemarks] = useState(meeting.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ decision, status, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Log Decisions & Resolutions</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Official Decisions / Resolutions</label>
            <textarea placeholder="Write finalized MoM resolutions and decision briefs..." value={decision} onChange={e => setDecision(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Resolution Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="OPEN">Open Actions</option>
                <option value="RESOLVED">Resolved MoM</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Remarks</label>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Update Minutes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

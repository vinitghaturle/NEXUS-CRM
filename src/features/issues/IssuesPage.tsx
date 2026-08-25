import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, AlertTriangle } from 'lucide-react';

interface IssueItem {
  issueId: string;
  issueTitle: string;
  eventId: string;
  teamId: string;
  severity: string;
  dateRaised: string;
  actionRequired: string;
  ownerId: string;
  deadline: string;
  resolution: string;
  status: string;
  createdBy: string;
}

interface User {
  userId: string;
  name: string;
}

interface Team {
  teamId: string;
  teamName: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const IssuesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);

  // Queries
  const { data: issues = [], isLoading, error, refetch } = useQuery<IssueItem[]>({
    queryKey: ['issues'],
    queryFn: () => callApi('issues.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => callApi('teams.list'),
  });

  const { data: events = [] } = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: () => callApi('events.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('issues.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ issueId, payload }: { issueId: string; payload: any }) => 
      callApi('issues.update', { issueId, ...payload }),
    onSuccess: () => {
      setSelectedIssue(null);
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const getSeverityStyle = (severity: string) => {
    const s = severity?.toUpperCase();
    if (s === 'CRITICAL') return 'bg-red-500/10 text-red-700 border-red-200/50';
    if (s === 'HIGH') return 'bg-orange-500/10 text-orange-700 border-orange-200/50';
    if (s === 'MEDIUM') return 'bg-amber-500/10 text-amber-700 border-amber-200/50';
    return 'bg-blue-500/10 text-blue-700 border-blue-200/50';
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'RESOLVED') return 'bg-green-100 text-green-800';
    return 'bg-amber-100 text-amber-800';
  };

  if (isLoading) return <Loading message="Loading tickets..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Operations Helpdesk</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Issues Ticket Tracker</h1>
          <p className="text-caption-spec text-ink-muted48">Log session blockages, sound desk bugs, and operational issues.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg animate-scale-up"
        >
          <Plus className="w-4 h-4" /> Raise Ticket
        </button>
      </div>

      {issues.length === 0 ? (
        <EmptyState title="No active operational issues" description="Every operational desk is running fine. Click above to log a bug." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {issues.map(issue => {
            const eventName = events.find(e => e.eventId === issue.eventId)?.eventName || 'General Operations';
            const ownerName = users.find(u => u.userId === issue.ownerId)?.name || 'Unassigned';
            return (
              <div 
                key={issue.issueId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer text-left relative"
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-semibold bg-slate-100 px-xs py-[2px] rounded-pill font-mono">
                    {issue.issueId}
                  </span>
                  <span className={`px-xs py-[2px] text-[10px] font-semibold border rounded-pill ${getSeverityStyle(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>

                <div className="space-y-xxs">
                  <h3 className="text-body-strong font-bold text-ink flex items-center gap-xs">
                    <AlertTriangle className={`w-4 h-4 ${issue.status === 'RESOLVED' ? 'text-green-500' : 'text-amber-500'}`} />
                    {issue.issueTitle}
                  </h3>
                  <p className="text-caption-spec text-ink-muted48 line-clamp-2">{issue.actionRequired || 'No specs.'}</p>
                </div>

                {issue.resolution && (
                  <div className="bg-green-500/5 border border-green-500/10 rounded-sm p-sm text-[12px] text-green-800">
                    <p className="font-semibold text-[10px] uppercase">Resolution Notes</p>
                    <p className="italic mt-xxs">"{issue.resolution}"</p>
                  </div>
                )}

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80 font-mono text-[11px]">
                  <span>👤 Assignee: {ownerName}</span>
                  <span className={`px-[6px] py-[2px] rounded-sm text-[9px] font-bold ${getStatusStyle(issue.status)}`}>
                    {issue.status}
                  </span>
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
        <CreateIssueModal 
          events={events}
          teams={teams}
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedIssue && (
        <EditIssueModal 
          issue={selectedIssue}
          users={users} 
          onSubmit={(payload) => updateMutation.mutate({ issueId: selectedIssue.issueId, payload })} 
          onClose={() => setSelectedIssue(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateIssueModal: React.FC<{ events: EventItem[]; teams: Team[]; users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ events, teams, users, onSubmit, onClose }) => {
  const [issueTitle, setIssueTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [actionRequired, setActionRequired] = useState('');
  const [ownerId, setOwnerId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ issueTitle, eventId, teamId, severity, actionRequired, ownerId });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Raise Operational Ticket</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Issue / Blockage Title *</label>
            <input type="text" required placeholder="e.g. Sound system mic feedback" value={issueTitle} onChange={e => setIssueTitle(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
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
              <label className="font-semibold text-caption-strong">Responsible Department</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Team</option>
                {teams.map(t => <option key={t.teamId} value={t.teamId}>{t.teamName}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Ticket Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Assignee</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Member</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Required Action Description</label>
            <textarea placeholder="Describe the bugs and what needs to be done..." value={actionRequired} onChange={e => setActionRequired(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none min-h-[50px]" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Submit Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditIssueModal: React.FC<{ issue: IssueItem; users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ issue, users, onSubmit, onClose }) => {
  const [status, setStatus] = useState(issue.status);
  const [resolution, setResolution] = useState(issue.resolution || '');
  const [ownerId, setOwnerId] = useState(issue.ownerId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ status, resolution, ownerId });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Issue Resolution</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Ticket Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Re-assign Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Member</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Resolution Action Report</label>
            <textarea placeholder="Outline how this ticket was resolved..." value={resolution} onChange={e => setResolution(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none min-h-[50px]" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Update Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
};

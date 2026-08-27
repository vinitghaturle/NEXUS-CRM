import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Search, 
  Edit3, 
  FileCheck,
  Video,
  X,
  Copy,
  Check
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

// Helper to convert display time (e.g. "10:00 AM" or "02:30 PM") to input type="time" 24h string ("10:00" or "14:30")
function toTimeInputValue(timeStr?: string): string {
  if (!timeStr) return '';
  var trimmed = String(timeStr).trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  var match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    var hours = parseInt(match[1], 10);
    var minutes = match[2];
    var modifier = match[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return '';
}

// Helper to convert input type="time" ("14:30") to standard human-readable format ("02:30 PM")
function toDisplayTime(timeInputValue?: string): string {
  if (!timeInputValue) return '';
  var match = String(timeInputValue).trim().match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    var hours = parseInt(match[1], 10);
    var minutes = match[2];
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour 0 is 12
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeInputValue;
}

// Helper to generate a realistic Google Meet URL
function generateGoogleMeetLink(): string {
  var chars = 'abcdefghijklmnopqrstuvwxyz';
  var seg = function(len: number) {
    var str = '';
    for (var i = 0; i < len; i++) {
      str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
  };
  return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
}

interface Meeting {
  meetingId: string;
  title?: string;
  meetingDate: string;
  startTime?: string;
  endTime?: string;
  meetingType: 'GENERAL' | 'CORE' | 'DEPARTMENTAL' | 'EMERGENCY' | string;
  location?: string;
  agenda: string;
  decision?: string;
  responsiblePerson?: string;
  momAssigneeId?: string;
  momAssigneeName?: string;
  momDocUrl?: string;
  deadline?: string;
  targetTeamIds?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED' | string;
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
}

interface User {
  userId: string;
  name: string;
  role: string;
  teamId?: string;
  position?: string;
}

interface Team {
  teamId: string;
  teamName: string;
}

export const MeetingsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const myUserId = profile?.userId || '';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST' | 'ALL'>('UPCOMING');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedMeetingForEdit, setSelectedMeetingForEdit] = useState<Meeting | null>(null);
  const [selectedMeetingForMom, setSelectedMeetingForMom] = useState<Meeting | null>(null);

  // Queries
  const { data: meetings = [], isLoading, error, refetch } = useQuery<Meeting[]>({
    queryKey: ['meetings'],
    queryFn: () => callApi('meetings.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => callApi('teams.list'),
  });

  // Deep-link meetingId handler
  useEffect(() => {
    const directMeetingId = searchParams.get('meetingId');
    if (directMeetingId && meetings.length > 0) {
      const match = meetings.find(m => m.meetingId === directMeetingId);
      if (match) {
        // If user is MoM assignee, open MoM modal, otherwise open edit/view modal
        if (match.momAssigneeId === myUserId || match.responsiblePerson === myUserId) {
          setSelectedMeetingForMom(match);
        } else {
          setSelectedMeetingForEdit(match);
        }
      }
    }
  }, [searchParams, meetings, myUserId]);

  // Mutations
  const scheduleMutation = useMutation({
    mutationFn: (payload: any) => callApi('meetings.create', payload),
    onSuccess: () => {
      setIsScheduleOpen(false);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      alert('Meeting scheduled successfully! Invitations have been dispatched.');
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Failed to schedule meeting')
  });

  const updateMutation = useMutation({
    mutationFn: ({ meetingId, payload }: { meetingId: string; payload: any }) => 
      callApi('meetings.update', { meetingId, ...payload }),
    onSuccess: () => {
      setSelectedMeetingForEdit(null);
      setSelectedMeetingForMom(null);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Failed to update meeting')
  });

  const canSchedule = role === 'PRESIDENT' || role === 'VP' || role === 'ADMIN';

  // Date filtering logic
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredMeetings = meetings.filter(m => {
    // Search query filter
    const titleMatch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const agendaMatch = (m.agenda || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSearch = !searchQuery || titleMatch || agendaMatch;

    // Type filter
    const matchType = filterType === 'ALL' || m.meetingType === filterType;

    // Tab filter
    const mDate = new Date(m.meetingDate);
    mDate.setHours(0, 0, 0, 0);
    const isUpcoming = mDate >= now && m.status !== 'RESOLVED' && m.status !== 'CANCELLED';
    const isPast = mDate < now || m.status === 'RESOLVED' || m.status === 'CANCELLED';

    if (activeTab === 'UPCOMING') return matchSearch && matchType && isUpcoming;
    if (activeTab === 'PAST') return matchSearch && matchType && isPast;
    return matchSearch && matchType;
  });

  if (isLoading) return <Loading message="Loading scheduled meetings and MoM logs..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error loading meetings'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in font-text pb-xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-hairline pb-md">
        <div className="space-y-xxs">
          <div className="flex items-center gap-xs">
            <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Operations & Governance</span>
            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-xs py-[2px] rounded-pill"></span>
          </div>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Meetings & Schedule</h1>
          <p className="text-caption-spec text-ink-muted48 max-w-[620px]">
            Schedule official sessions, manage participant invites, and track Minutes of Meeting (MoM) documents in real-time.
          </p>
        </div>

        {canSchedule && (
          <button 
            onClick={() => setIsScheduleOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Control Bar: Tabs + Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        {/* Navigation Tabs */}
        <div className="flex items-center p-[3px] bg-ink-muted8 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-md py-[6px] text-[13px] font-semibold rounded-md transition-all ${
              activeTab === 'UPCOMING'
                ? 'bg-canvas text-ink shadow-xs'
                : 'text-ink-muted48 hover:text-ink'
            }`}
          >
            Upcoming Meetings
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`px-md py-[6px] text-[13px] font-semibold rounded-md transition-all ${
              activeTab === 'PAST'
                ? 'bg-canvas text-ink shadow-xs'
                : 'text-ink-muted48 hover:text-ink'
            }`}
          >
            Past & MoM Logs
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-md py-[6px] text-[13px] font-semibold rounded-md transition-all ${
              activeTab === 'ALL'
                ? 'bg-canvas text-ink shadow-xs'
                : 'text-ink-muted48 hover:text-ink'
            }`}
          >
            All ({meetings.length})
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-sm">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-sm top-1/2 -translate-y-1/2 text-ink-muted48" />
            <input
              type="text"
              placeholder="Search meetings / agenda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md pl-[32px] pr-sm py-[7px] text-[13px] text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-canvas border border-hairline rounded-md px-sm py-[7px] text-[13px] text-ink focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="GENERAL">General Body</option>
            <option value="CORE">Core Committee</option>
            <option value="DEPARTMENTAL">Departmental Sync</option>
            <option value="EMERGENCY">Emergency Meeting</option>
          </select>
        </div>
      </div>

      {/* Meetings Grid / Cards */}
      {filteredMeetings.length === 0 ? (
        <EmptyState 
          title={activeTab === 'UPCOMING' ? "No upcoming meetings scheduled" : "No meetings found"} 
          description={canSchedule ? "Tap 'Schedule Meeting' above to set an agenda and notify members." : "Check back later or view past meeting logs."} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
          {filteredMeetings.map((m) => {
            const momAssignee = users.find(u => u.userId === (m.momAssigneeId || m.responsiblePerson));
            const momAssigneeName = momAssignee?.name || m.momAssigneeName || 'Unassigned';
            const isAssignedToMe = (m.momAssigneeId === myUserId || m.responsiblePerson === myUserId);
            const isResolved = m.status === 'RESOLVED';
            const isCancelled = m.status === 'CANCELLED';

            return (
              <div 
                key={m.meetingId}
                className="bg-canvas border border-hairline rounded-xl p-md sm:p-lg shadow-product-surface space-y-md hover:shadow-md transition-all text-left relative flex flex-col justify-between"
              >
                <div className="space-y-sm">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-xs">
                    <div className="flex items-center gap-xs">
                      <span className="text-[11.5px] font-semibold bg-primary/8 text-primary px-sm py-[3px] rounded-pill font-mono flex items-center gap-xxs">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(m.meetingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>

                      {m.startTime && (
                        <span className="text-[11px] font-medium bg-ink-muted8 text-ink px-xs py-[2px] rounded-md flex items-center gap-xxs font-mono">
                          <Clock className="w-3 h-3 text-ink-muted48" />
                          {m.startTime} {m.endTime ? `- ${m.endTime}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-xs">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-xs py-[2px] rounded-md ${
                        m.meetingType === 'EMERGENCY' ? 'bg-red-500/10 text-red-600 border border-red-200' :
                        m.meetingType === 'CORE' ? 'bg-purple-500/10 text-purple-600 border border-purple-200' :
                        'bg-ink-muted8 text-ink-muted80'
                      }`}>
                        {m.meetingType}
                      </span>

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-xs py-[2px] rounded-md ${
                        isResolved ? 'bg-green-500/10 text-green-700' :
                        isCancelled ? 'bg-red-500/10 text-red-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {m.status || 'SCHEDULED'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Agenda */}
                  <div className="space-y-xxs">
                    <h3 className="text-body-strong font-bold text-ink text-[16px] leading-snug">
                      {m.title || m.agenda}
                    </h3>
                    {m.agenda && m.title && (
                      <p className="text-[13px] text-ink-muted80 line-clamp-2">
                        {m.agenda}
                      </p>
                    )}
                  </div>

                  {/* Location / Meet Link */}
                  {m.location && (
                    <div className="flex items-center gap-xs text-[12px] text-ink-muted80">
                      {m.location.startsWith('http') ? (
                        <a 
                          href={m.location} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-xxs text-primary hover:underline font-semibold bg-primary/5 px-sm py-[4px] rounded-md border border-primary/20"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Virtual Meeting
                          <ExternalLink className="w-3 h-3 ml-xxs" />
                        </a>
                      ) : (
                        <span className="flex items-center gap-xxs bg-ink-muted8 px-sm py-[3px] rounded-md font-mono text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-ink-muted48" />
                          {m.location}
                        </span>
                      )}
                    </div>
                  )}

                  {/* MoM Section Box */}
                  <div className="bg-canvas-parchment/60 border border-hairline rounded-lg p-sm space-y-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-xxs text-[11px] font-semibold text-ink-muted80">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>MoM Recorder:</span>
                        <strong className="text-ink">{momAssigneeName}</strong>
                        {isAssignedToMe && (
                          <span className="bg-amber-500/15 text-amber-700 text-[9px] font-bold px-xs py-[1px] rounded-pill ml-xxs">
                            You
                          </span>
                        )}
                      </div>

                      {m.momDocUrl ? (
                        <span className="inline-flex items-center gap-xxs text-green-700 bg-green-500/10 font-bold text-[10px] px-xs py-[2px] rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> MoM Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-xxs text-amber-700 bg-amber-500/10 font-bold text-[10px] px-xs py-[2px] rounded-md">
                          <AlertCircle className="w-3 h-3" /> MoM Pending
                        </span>
                      )}
                    </div>

                    {/* Google Doc Button if attached */}
                    {m.momDocUrl && (
                      <div className="pt-xxs">
                        <a
                          href={m.momDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-xs bg-canvas border border-hairline px-sm py-[6px] rounded-md text-[12px] font-semibold text-primary hover:bg-primary/5 transition w-full justify-center shadow-xs"
                        >
                          <FileCheck className="w-4 h-4 text-primary" /> Open Official Google Doc MoM
                          <ExternalLink className="w-3.5 h-3.5 ml-auto text-ink-muted48" />
                        </a>
                      </div>
                    )}

                    {/* Decision Brief snippet */}
                    {m.decision && (
                      <div className="text-[12px] text-ink-muted80 border-t border-hairline pt-xs mt-xs">
                        <strong className="text-[10px] uppercase tracking-wider text-ink-muted48 block mb-xxs">Resolutions / Brief:</strong>
                        <p className="text-ink line-clamp-2">{m.decision}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="border-t border-hairline pt-sm flex items-center justify-between gap-sm text-[12px]">
                  <span className="text-[11px] font-mono text-ink-muted48">
                    ID: {m.meetingId}
                  </span>

                  <div className="flex items-center gap-xs">
                    {/* Submit / Edit MoM Button (for assigned person or executive) */}
                    {(isAssignedToMe || canSchedule) && (
                      <button
                        onClick={() => setSelectedMeetingForMom(m)}
                        className="apple-btn-secondary py-[6px] px-sm text-[12px] flex items-center gap-xxs font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {m.momDocUrl ? 'Edit MoM' : 'Submit MoM Doc'}
                      </button>
                    )}

                    {/* Edit Meeting Button (Admin / VP / President) */}
                    {canSchedule && (
                      <button
                        onClick={() => setSelectedMeetingForEdit(m)}
                        className="p-xs text-ink-muted48 hover:text-ink hover:bg-ink-muted8 rounded-md transition"
                        title="Edit Meeting Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. SCHEDULE MEETING MODAL (Admin / President / VP) */}
      {isScheduleOpen && (
        <ScheduleMeetingModal
          users={users}
          teams={teams}
          onSubmit={(data) => scheduleMutation.mutate(data)}
          isSubmitting={scheduleMutation.isPending}
          onClose={() => setIsScheduleOpen(false)}
        />
      )}

      {/* 2. SUBMIT / EDIT MOM GOOGLE DOC MODAL */}
      {selectedMeetingForMom && (
        <SubmitMomModal
          meeting={selectedMeetingForMom}
          onSubmit={(payload) => updateMutation.mutate({ meetingId: selectedMeetingForMom.meetingId, payload })}
          isSubmitting={updateMutation.isPending}
          onClose={() => {
            setSelectedMeetingForMom(null);
            if (searchParams.get('meetingId')) {
              searchParams.delete('meetingId');
              setSearchParams(searchParams);
            }
          }}
        />
      )}

      {/* 3. EDIT MEETING DETAILS MODAL (Admin / President / VP) */}
      {selectedMeetingForEdit && (
        <EditMeetingModal
          meeting={selectedMeetingForEdit}
          users={users}
          onSubmit={(payload) => updateMutation.mutate({ meetingId: selectedMeetingForEdit.meetingId, payload })}
          isSubmitting={updateMutation.isPending}
          onClose={() => {
            setSelectedMeetingForEdit(null);
            if (searchParams.get('meetingId')) {
              searchParams.delete('meetingId');
              setSearchParams(searchParams);
            }
          }}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 1. SCHEDULE MEETING MODAL COMPONENT
 * ------------------------------------------------------------- */
interface ScheduleModalProps {
  users: User[];
  teams: Team[];
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

const ScheduleMeetingModal: React.FC<ScheduleModalProps> = ({ users, teams, onSubmit, isSubmitting, onClose }) => {
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('GENERAL');
  const [meetingDate, setMeetingDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('11:00 AM');
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState(() => generateGoogleMeetLink());
  const [agenda, setAgenda] = useState('');
  const [momAssigneeId, setMomAssigneeId] = useState('');
  const [targetTeamIds, setTargetTeamIds] = useState('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (location) {
      navigator.clipboard.writeText(location).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !meetingDate || !agenda) {
      alert('Please fill all mandatory fields (Title, Meeting Date, and Agenda).');
      return;
    }
    const momUser = users.find(u => u.userId === momAssigneeId);
    onSubmit({
      title,
      meetingType,
      meetingDate,
      startTime,
      endTime,
      location,
      agenda,
      momAssigneeId,
      momAssigneeName: momUser ? momUser.name : '',
      responsiblePerson: momAssigneeId,
      targetTeamIds,
      status: 'SCHEDULED'
    });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-xl shadow-product-surface max-w-[540px] w-full p-md sm:p-lg space-y-md animate-scale-up text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-hairline pb-xs">
          <div>
            <h3 className="text-body-strong font-bold text-ink text-[16px]">Schedule Official Meeting</h3>
            <p className="text-[11px] text-ink-muted48">Invites participants & assigns designated MoM recorder.</p>
          </div>
          <button onClick={onClose} className="p-xxs hover:bg-ink-muted8 rounded-md transition">
            <X className="w-4 h-4 text-ink-muted48" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Meeting Topic / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Budget Allocation & Media Guidelines"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting Type</label>
              <select
                value={meetingType}
                onChange={e => setMeetingType(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
              >
                <option value="GENERAL">General Body Meeting</option>
                <option value="CORE">Core Committee Meeting</option>
                <option value="DEPARTMENTAL">Departmental Sync</option>
                <option value="EMERGENCY">Emergency Meeting</option>
              </select>
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting Date *</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Time pickers (Start Time & End Time) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex items-center justify-between">
                <span className="flex items-center gap-xxs">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Start Time *
                </span>
                <span className="text-[10px] text-ink-muted48 font-mono">{startTime}</span>
              </label>
              <input
                type="time"
                required
                value={toTimeInputValue(startTime) || '10:00'}
                onChange={e => setStartTime(toDisplayTime(e.target.value))}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[7px] focus:outline-none focus:border-primary font-mono text-[13px]"
              />
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex items-center justify-between">
                <span className="flex items-center gap-xxs">
                  <Clock className="w-3.5 h-3.5 text-primary" /> End Time
                </span>
                <span className="text-[10px] text-ink-muted48 font-mono">{endTime}</span>
              </label>
              <input
                type="time"
                value={toTimeInputValue(endTime) || '11:00'}
                onChange={e => setEndTime(toDisplayTime(e.target.value))}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[7px] focus:outline-none focus:border-primary font-mono text-[13px]"
              />
            </div>
          </div>

          {/* Online vs Offline Meeting Format Toggle */}
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Meeting Mode</label>
            <div className="grid grid-cols-2 gap-xs bg-canvas-parchment/60 p-[3px] rounded-lg border border-hairline">
              <button
                type="button"
                onClick={() => {
                  setIsOnline(true);
                  if (!location || !location.startsWith('http')) {
                    setLocation(generateGoogleMeetLink());
                  }
                }}
                className={`flex items-center justify-center gap-xs py-[7px] text-[12px] font-semibold rounded-md transition-all ${
                  isOnline 
                    ? 'bg-canvas text-primary shadow-xs border border-hairline' 
                    : 'text-ink-muted48 hover:text-ink'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> 🌐 Online (Google Meet)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOnline(false);
                  if (location && location.includes('meet.google.com')) {
                    setLocation('');
                  }
                }}
                className={`flex items-center justify-center gap-xs py-[7px] text-[12px] font-semibold rounded-md transition-all ${
                  !isOnline 
                    ? 'bg-canvas text-primary shadow-xs border border-hairline' 
                    : 'text-ink-muted48 hover:text-ink'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> 🏢 Offline (In-Person)
              </button>
            </div>
          </div>

          {/* Location / Google Meet URL field */}
          <div className="space-y-xxs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-caption-strong">
                {isOnline ? 'Google Meet Video Link *' : 'Venue / Room Location *'}
              </label>
              {isOnline && (
                <div className="flex items-center gap-sm">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-[11px] text-ink-muted80 hover:text-ink flex items-center gap-[2px]"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation(generateGoogleMeetLink())}
                    className="text-[11px] text-primary hover:underline font-normal"
                  >
                    Generate New Link
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type={isOnline ? 'url' : 'text'}
                required={!isOnline}
                placeholder={isOnline ? 'https://meet.google.com/xxx-yyyy-zzz' : 'e.g. Main Auditorium / Lab 301'}
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md pl-sm pr-[36px] py-[8px] focus:outline-none focus:border-primary font-mono text-[12px]"
              />
              {isOnline ? (
                <Video className="w-4 h-4 text-primary absolute right-sm top-1/2 -translate-y-1/2" />
              ) : (
                <MapPin className="w-4 h-4 text-ink-muted48 absolute right-sm top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Meeting Agenda & Discussion Items *</label>
            <textarea
              required
              rows={3}
              placeholder="1. Review timeline for Tech Symposium&#10;2. Design assets handover&#10;3. Sponsorship updates"
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Assign MoM Recorder *</label>
              <select
                value={momAssigneeId}
                onChange={e => setMomAssigneeId(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-semibold text-primary"
              >
                <option value="">Select Member to record MoM</option>
                {users.map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Invited Participants</label>
              <select
                value={targetTeamIds}
                onChange={e => setTargetTeamIds(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
              >
                <option value="ALL">All Organization Members</option>
                {teams.map(t => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName} Department Only
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-md p-sm text-[11px] text-ink-muted80 flex items-start gap-xs">
            <Users className="w-4 h-4 text-primary shrink-0 mt-[2px]" />
            <span>
              All participants will immediately receive an email invitation with the meeting details, and an automated 1-hour pre-meeting reminder will be scheduled.
            </span>
          </div>

          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="apple-btn-secondary py-[8px] px-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="apple-btn-primary py-[8px] px-lg"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule & Send Invites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 2. SUBMIT / EDIT MOM GOOGLE DOC MODAL
 * ------------------------------------------------------------- */
interface SubmitMomModalProps {
  meeting: Meeting;
  onSubmit: (payload: any) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

const SubmitMomModal: React.FC<SubmitMomModalProps> = ({ meeting, onSubmit, isSubmitting, onClose }) => {
  const [momDocUrl, setMomDocUrl] = useState(meeting.momDocUrl || '');
  const [decision, setDecision] = useState(meeting.decision || '');
  const [status, setStatus] = useState(meeting.status === 'SCHEDULED' ? 'RESOLVED' : meeting.status);
  const [remarks, setRemarks] = useState(meeting.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!momDocUrl && !decision) {
      alert('Please provide either a Google Docs URL or official meeting decisions summary.');
      return;
    }
    onSubmit({
      momDocUrl,
      decision,
      status,
      remarks
    });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-xl shadow-product-surface max-w-[500px] w-full p-md sm:p-lg space-y-md animate-scale-up text-left">
        <div className="flex items-center justify-between border-b border-hairline pb-xs">
          <div>
            <h3 className="text-body-strong font-bold text-ink text-[16px]">Submit Minutes of Meeting (MoM)</h3>
            <p className="text-[11px] text-ink-muted48">Topic: {meeting.title || meeting.agenda}</p>
          </div>
          <button onClick={onClose} className="p-xxs hover:bg-ink-muted8 rounded-md transition">
            <X className="w-4 h-4 text-ink-muted48" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Official MoM Google Docs Link *</label>
            <div className="relative">
              <input
                type="url"
                required={!decision}
                placeholder="https://docs.google.com/document/d/..."
                value={momDocUrl}
                onChange={e => setMomDocUrl(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md pl-sm pr-[36px] py-[8px] focus:outline-none focus:border-primary text-primary font-mono text-[12px]"
              />
              <FileCheck className="w-4 h-4 absolute right-sm top-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="text-[10px] text-ink-muted48">Ensure the Google Doc sharing permission is set to viewable by organization members.</p>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Key Resolutions & Action Brief</label>
            <textarea
              rows={3}
              placeholder="Summarize agreed resolutions, deadlines, and responsible owners..."
              value={decision}
              onChange={e => setDecision(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting State</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
              >
                <option value="RESOLVED">Resolved / MoM Finalized</option>
                <option value="IN_PROGRESS">In Progress / Draft MoM</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Internal Remarks</label>
              <input
                type="text"
                placeholder="Optional notes"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="apple-btn-secondary py-[8px] px-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="apple-btn-primary py-[8px] px-lg"
            >
              {isSubmitting ? 'Uploading...' : 'Save MoM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 3. EDIT MEETING DETAILS MODAL (Admin / President / VP)
 * ------------------------------------------------------------- */
interface EditMeetingModalProps {
  meeting: Meeting;
  users: User[];
  onSubmit: (payload: any) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

const EditMeetingModal: React.FC<EditMeetingModalProps> = ({ meeting, users, onSubmit, isSubmitting, onClose }) => {
  const [title, setTitle] = useState(meeting.title || meeting.agenda);
  const [meetingType, setMeetingType] = useState(meeting.meetingType || 'GENERAL');
  const [meetingDate, setMeetingDate] = useState(meeting.meetingDate ? new Date(meeting.meetingDate).toISOString().split('T')[0] : '');
  const [startTime, setStartTime] = useState(meeting.startTime || '10:00 AM');
  const [endTime, setEndTime] = useState(meeting.endTime || '11:00 AM');
  const [isOnline, setIsOnline] = useState(() => (meeting.location || '').startsWith('http') || (meeting.location || '').includes('meet.google.com'));
  const [location, setLocation] = useState(meeting.location || '');
  const [agenda, setAgenda] = useState(meeting.agenda || '');
  const [momAssigneeId, setMomAssigneeId] = useState(meeting.momAssigneeId || meeting.responsiblePerson || '');
  const [status, setStatus] = useState(meeting.status || 'SCHEDULED');
  const [remarks, setRemarks] = useState(meeting.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const momUser = users.find(u => u.userId === momAssigneeId);
    onSubmit({
      title,
      meetingType,
      meetingDate,
      startTime,
      endTime,
      location,
      agenda,
      momAssigneeId,
      momAssigneeName: momUser ? momUser.name : '',
      responsiblePerson: momAssigneeId,
      status,
      remarks
    });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-xl shadow-product-surface max-w-[500px] w-full p-md sm:p-lg space-y-md animate-scale-up text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-hairline pb-xs">
          <h3 className="text-body-strong font-bold text-ink text-[16px]">Edit Meeting Details</h3>
          <button onClick={onClose} className="p-xxs hover:bg-ink-muted8 rounded-md transition">
            <X className="w-4 h-4 text-ink-muted48" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting Type</label>
              <select
                value={meetingType}
                onChange={e => setMeetingType(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
              >
                <option value="GENERAL">General Body Meeting</option>
                <option value="CORE">Core Committee Meeting</option>
                <option value="DEPARTMENTAL">Departmental Sync</option>
                <option value="EMERGENCY">Emergency Meeting</option>
              </select>
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Date</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Time selectors (Start Time & End Time) */}
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex items-center justify-between">
                <span className="flex items-center gap-xxs">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Start Time
                </span>
                <span className="text-[10px] text-ink-muted48 font-mono">{startTime}</span>
              </label>
              <input
                type="time"
                value={toTimeInputValue(startTime) || '10:00'}
                onChange={e => setStartTime(toDisplayTime(e.target.value))}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[7px] focus:outline-none font-mono text-[13px]"
              />
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex items-center justify-between">
                <span className="flex items-center gap-xxs">
                  <Clock className="w-3.5 h-3.5 text-primary" /> End Time
                </span>
                <span className="text-[10px] text-ink-muted48 font-mono">{endTime}</span>
              </label>
              <input
                type="time"
                value={toTimeInputValue(endTime) || '11:00'}
                onChange={e => setEndTime(toDisplayTime(e.target.value))}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[7px] focus:outline-none font-mono text-[13px]"
              />
            </div>
          </div>

          {/* Online vs Offline Toggle */}
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Meeting Mode</label>
            <div className="grid grid-cols-2 gap-xs bg-canvas-parchment/60 p-[3px] rounded-lg border border-hairline">
              <button
                type="button"
                onClick={() => {
                  setIsOnline(true);
                  if (!location || !location.startsWith('http')) {
                    setLocation(generateGoogleMeetLink());
                  }
                }}
                className={`flex items-center justify-center gap-xs py-[7px] text-[12px] font-semibold rounded-md transition-all ${
                  isOnline 
                    ? 'bg-canvas text-primary shadow-xs border border-hairline' 
                    : 'text-ink-muted48 hover:text-ink'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> 🌐 Online (Google Meet)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOnline(false);
                  if (location && location.includes('meet.google.com')) {
                    setLocation('');
                  }
                }}
                className={`flex items-center justify-center gap-xs py-[7px] text-[12px] font-semibold rounded-md transition-all ${
                  !isOnline 
                    ? 'bg-canvas text-primary shadow-xs border border-hairline' 
                    : 'text-ink-muted48 hover:text-ink'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> 🏢 Offline (In-Person)
              </button>
            </div>
          </div>

          {/* Location / Google Meet URL field */}
          <div className="space-y-xxs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-caption-strong">
                {isOnline ? 'Google Meet URL' : 'Location / Room'}
              </label>
              {isOnline && (
                <button
                  type="button"
                  onClick={() => setLocation(generateGoogleMeetLink())}
                  className="text-[11px] text-primary hover:underline font-normal"
                >
                  Generate New Link
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={isOnline ? 'url' : 'text'}
                placeholder={isOnline ? 'https://meet.google.com/xxx-yyyy-zzz' : 'e.g. Auditorium 2'}
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md pl-sm pr-[36px] py-[8px] focus:outline-none font-mono text-[12px]"
              />
              {isOnline ? (
                <Video className="w-4 h-4 text-primary absolute right-sm top-1/2 -translate-y-1/2" />
              ) : (
                <MapPin className="w-4 h-4 text-ink-muted48 absolute right-sm top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Agenda</label>
            <textarea
              rows={2}
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">MoM Recorder</label>
              <select
                value={momAssigneeId}
                onChange={e => setMomAssigneeId(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none text-primary font-semibold"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.userId} value={u.userId}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="RESOLVED">Resolved / Concluded</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks</label>
            <input
              type="text"
              placeholder="Internal meeting remarks"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="apple-btn-secondary py-[8px] px-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="apple-btn-primary py-[8px] px-lg"
            >
              {isSubmitting ? 'Updating...' : 'Update Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

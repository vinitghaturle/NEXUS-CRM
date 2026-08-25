import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { CreateEventDialog } from './CreateEventDialog';
import { EditEventDialog } from './EditEventDialog';
import { 
  Plus, 
  List, 
  Calendar as CalendarIcon, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Activity,
  Pencil
} from 'lucide-react';

interface EventItem {
  eventId: string;
  eventName: string;
  eventCategory?: string;
  eventDate: string;
  venue: string;
  leadTeamId?: string;
  eventStatus: string;
  description?: string;
  driveFolderUrl?: string;
  budgetAllocation?: number;
  remarks?: string;
}

interface Task {
  taskId: string;
  taskTitle: string;
  deadline: string;
  status: string;
  teamId: string;
  assignedTo?: string;
  assignedToName?: string;
  priority?: string;
  eventId?: string;
}

interface Team {
  teamId: string;
  teamName: string;
}

// Compute event health from task data
function getEventHealth(eventTasks: Task[]): { label: string; color: string; dot: string } {
  if (eventTasks.length === 0) return { label: 'No Tasks', color: 'text-ink-muted48', dot: '⚪' };
  const overdue = eventTasks.filter(t => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
    if (!t.deadline) return false;
    return new Date(t.deadline) < new Date();
  }).length;
  const blocked = eventTasks.filter(t => t.status === 'BLOCKED').length;
  const completed = eventTasks.filter(t => t.status === 'COMPLETED').length;
  const pct = Math.round((completed / eventTasks.length) * 100);

  if (overdue > 2 || blocked > 1 || pct < 40) return { label: 'BEHIND', color: 'text-red-600 bg-red-50 border-red-200', dot: '🔴' };
  if (overdue > 0 || blocked > 0 || pct < 70) return { label: 'AT RISK', color: 'text-amber-600 bg-amber-50 border-amber-200', dot: '🟡' };
  return { label: 'ON TRACK', color: 'text-green-700 bg-green-50 border-green-200', dot: '🟢' };
}

export const EventsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  // Navigation / View states
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Calendar Date Navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Queries
  const { data: events = [], isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: () => callApi('events.list'),
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => callApi('tasks.list'),
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => callApi('teams.list'),
  });

  // Mutate create event
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => callApi('events.create', eventData),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => {
      alert(`Failed to create event: ${err instanceof Error ? err.message : 'Unauthorized action'}`);
    }
  });

  // Mutate update event
  const updateEventMutation = useMutation({
    mutationFn: (eventData: any) => callApi('events.update', eventData),
    onSuccess: (updated: any) => {
      setIsEditOpen(false);
      setEditingEvent(null);
      if (selectedEvent && updated && (updated.eventId === selectedEvent.eventId || !updated.eventId)) {
        setSelectedEvent(prev => prev ? ({ ...prev, ...updated }) : null);
      }
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => {
      alert(`Failed to update event: ${err instanceof Error ? err.message : 'Unauthorized action'}`);
    }
  });

  const canManageEvents = role === 'PRESIDENT' || role === 'VP' || role === 'ADMIN' || role === 'LEAD';

  // Calendar Helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Format Helper
  const getCategoryColor = (category?: string) => {
    const cat = category?.toUpperCase();
    if (cat === 'WORKSHOP') return 'bg-blue-500/10 text-blue-700 border-blue-200/50';
    if (cat === 'WEBINAR') return 'bg-purple-500/10 text-purple-700 border-purple-200/50';
    if (cat === 'COMPETITION') return 'bg-pink-500/10 text-pink-700 border-pink-200/50';
    if (cat === 'SOCIAL') return 'bg-green-500/10 text-green-700 border-green-200/50';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PLANNING') return 'bg-slate-100 text-slate-800';
    if (s === 'COMPLETED') return 'bg-green-100 text-green-800';
    if (s === 'CANCELLED') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (eventsLoading) {
    return <Loading message="Syncing Events Schedule..." />;
  }

  if (eventsError) {
    return (
      <ErrorState 
        title="Failed to load events" 
        message={eventsError instanceof Error ? eventsError.message : 'Error communicating with sheet repository.'} 
        onRetry={refetchEvents}
      />
    );
  }

  // ─── EVENT COMMAND CENTER ─────────────────────────────────────────────────
  if (selectedEvent) {
    const eventTasks = tasks.filter(t => t.eventId === selectedEvent.eventId);
    const teamIds = [...new Set(eventTasks.map(t => t.teamId).filter(Boolean))];

    const total = eventTasks.length;
    const completed = eventTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = eventTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const notStarted = eventTasks.filter(t => t.status === 'NOT_STARTED').length;
    const blocked = eventTasks.filter(t => t.status === 'BLOCKED').length;
    const delayed = eventTasks.filter(t => t.status === 'DELAYED').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const now = new Date();

    const overdueTasks = eventTasks.filter(t => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) < now;
    });

    const upcomingTasks = eventTasks
      .filter(t => {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);

    const blockedTasks = eventTasks.filter(t => t.status === 'BLOCKED');
    const recentlyUpdated = [...eventTasks]
      .filter(t => t.status === 'IN_PROGRESS' || t.status === 'DELAYED')
      .slice(0, 5);

    const health = getEventHealth(eventTasks);

    // Per-team progress
    const teamProgress = teamIds.map(tid => {
      const teamTasks = eventTasks.filter(t => t.teamId === tid);
      const teamName = teams.find(t => t.teamId === tid)?.teamName || tid;
      const tCompleted = teamTasks.filter(t => t.status === 'COMPLETED').length;
      const tPct = teamTasks.length > 0 ? Math.round((tCompleted / teamTasks.length) * 100) : 0;
      return { tid, teamName, total: teamTasks.length, completed: tCompleted, pct: tPct };
    });

    const needsAttention = [
      ...overdueTasks.map(t => ({ ...t, reason: 'Overdue', urgency: 'high' as const })),
      ...blockedTasks.map(t => ({ ...t, reason: 'Blocked', urgency: 'high' as const })),
      ...upcomingTasks.map(t => ({ ...t, reason: 'Due soon', urgency: 'medium' as const })),
    ].filter((item, idx, arr) => arr.findIndex(x => x.taskId === item.taskId) === idx).slice(0, 8);

    return (
      <div className="space-y-lg animate-fade-in text-left">
        {/* Back nav & Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedEvent(null)}
            className="inline-flex items-center gap-xs text-[13px] text-ink-muted48 hover:text-primary transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </button>

          {canManageEvents && (
            <button
              onClick={() => {
                setEditingEvent(selectedEvent);
                setIsEditOpen(true);
              }}
              className="inline-flex items-center gap-xs px-md py-[7px] text-[12px] font-semibold bg-canvas border border-hairline rounded-md hover:bg-ink-muted8 text-ink shadow-sm transition active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5 text-primary" /> Edit Event Details
            </button>
          )}
        </div>

        {/* Event Header Card */}
        <div className="bg-canvas border border-hairline rounded-xl p-lg shadow-product-surface space-y-md">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-md">
            <div className="space-y-xxs">
              <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Event Command Center</span>
              <h1 className="text-display-md font-bold text-ink tracking-tight">{selectedEvent.eventName}</h1>
              <div className="flex flex-wrap items-center gap-sm text-[12px] text-ink-muted48">
                <span>📅 {selectedEvent.eventDate ? new Date(selectedEvent.eventDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'TBD'}</span>
                {selectedEvent.venue && <span>📍 {selectedEvent.venue}</span>}
                {selectedEvent.budgetAllocation ? <span>💰 ₹{Number(selectedEvent.budgetAllocation).toLocaleString('en-IN')}</span> : null}
              </div>
              {selectedEvent.description && (
                <p className="text-[13px] text-ink-muted80 pt-xs max-w-[700px] leading-relaxed">
                  {selectedEvent.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-sm shrink-0">
              <span className={`text-[11px] font-bold px-[10px] py-[4px] rounded-full border ${health.color}`}>
                {health.dot} {health.label}
              </span>
              <span className={`px-[8px] py-[3px] text-[10px] font-semibold rounded-pill ${getStatusColor(selectedEvent.eventStatus)}`}>
                {selectedEvent.eventStatus}
              </span>
            </div>
          </div>

          {/* Overall progress */}
          <div className="space-y-xs pt-xs">
            <div className="flex justify-between text-[12px]">
              <span className="text-ink-muted48 font-medium">Overall Progress</span>
              <span className="font-bold text-ink">{pct}%</span>
            </div>
            <div className="w-full bg-ink-muted8 h-[8px] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-primary' : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Summary + Team Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
          {/* Task Summary */}
          <div className="bg-canvas border border-hairline rounded-xl p-lg shadow-product-surface space-y-md">
            <h2 className="text-[13px] font-bold text-ink flex items-center gap-xs">
              <Activity className="w-4 h-4 text-primary" /> Task Summary
            </h2>
            <div className="grid grid-cols-3 gap-sm">
              {[
                { label: 'Total', val: total, color: 'text-ink' },
                { label: 'Completed', val: completed, color: 'text-green-600' },
                { label: 'In Progress', val: inProgress, color: 'text-primary' },
                { label: 'Not Started', val: notStarted, color: 'text-ink-muted48' },
                { label: 'Delayed', val: delayed, color: 'text-amber-600' },
                { label: 'Blocked', val: blocked, color: 'text-red-600' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center bg-canvas-parchment/40 rounded-lg p-sm space-y-xxs border border-hairline">
                  <div className={`text-[18px] font-bold ${color}`}>{val}</div>
                  <div className="text-[9px] font-semibold text-ink-muted32 uppercase">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Progress */}
          <div className="bg-canvas border border-hairline rounded-xl p-lg shadow-product-surface space-y-md">
            <h2 className="text-[13px] font-bold text-ink flex items-center gap-xs">
              <Users className="w-4 h-4 text-primary" /> Team Progress
            </h2>
            {teamProgress.length === 0 ? (
              <p className="text-[12px] text-ink-muted32">No team assignments for this event yet.</p>
            ) : (
              <div className="space-y-sm">
                {teamProgress.map(tp => (
                  <div key={tp.tid} className="space-y-xxs">
                    <div className="flex justify-between text-[12px]">
                      <span className="font-medium text-ink">{tp.teamName}</span>
                      <span className="text-ink-muted48 font-mono">{tp.completed}/{tp.total} · <strong className="text-ink">{tp.pct}%</strong></span>
                    </div>
                    <div className="w-full bg-ink-muted8 h-[5px] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          tp.pct >= 80 ? 'bg-green-500' : tp.pct >= 50 ? 'bg-primary' : 'bg-amber-500'
                        }`}
                        style={{ width: `${tp.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-lg space-y-md">
            <h2 className="text-[13px] font-bold text-red-700 flex items-center gap-xs">
              <ShieldAlert className="w-4 h-4" /> 🚨 Needs Attention
            </h2>
            <div className="space-y-sm">
              {needsAttention.map(item => {
                const isOverdue = item.urgency === 'high';
                const daysLabel = item.deadline
                  ? (() => {
                      const diff = Math.ceil((new Date(item.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
                      if (diff === 0) return 'Due today';
                      if (diff === 1) return 'Due tomorrow';
                      return `Due in ${diff}d`;
                    })()
                  : '';
                const teamName = teams.find(t => t.teamId === item.teamId)?.teamName || '';
                return (
                  <div key={item.taskId} className={`flex items-start justify-between gap-sm bg-white border rounded-lg px-md py-sm ${isOverdue ? 'border-red-200' : 'border-amber-200'}`}>
                    <div className="space-y-[2px]">
                      <div className="text-[13px] font-semibold text-ink">{item.taskTitle}</div>
                      <div className="text-[11px] text-ink-muted48">
                        {teamName && <span>{teamName} · </span>}
                        {item.assignedToName && <span>{item.assignedToName}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-[2px]">
                      <div className={`text-[10px] font-bold px-[8px] py-[2px] rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.reason}
                      </div>
                      <div className="text-[10px] text-ink-muted48">{daysLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently Active + Upcoming Deadlines row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
          {/* Recently Active */}
          <div className="bg-canvas border border-hairline rounded-xl p-lg shadow-product-surface space-y-md">
            <h2 className="text-[13px] font-bold text-ink flex items-center gap-xs">
              <Clock className="w-4 h-4 text-primary" /> Recently Active Tasks
            </h2>
            {recentlyUpdated.length === 0 ? (
              <p className="text-[12px] text-ink-muted32">No tasks in progress.</p>
            ) : (
              <div className="space-y-xs">
                {recentlyUpdated.map(t => {
                  const teamName = teams.find(x => x.teamId === t.teamId)?.teamName || '';
                  return (
                    <div key={t.taskId} className="flex items-center justify-between py-xs border-b border-hairline last:border-0">
                      <div>
                        <div className="text-[12px] font-medium text-ink">{t.taskTitle}</div>
                        {teamName && <div className="text-[10px] text-ink-muted32">{teamName}</div>}
                      </div>
                      <span className={`text-[9px] font-bold px-[7px] py-[2px] rounded-full ${
                        t.status === 'DELAYED' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-canvas border border-hairline rounded-xl p-lg shadow-product-surface space-y-md">
            <h2 className="text-[13px] font-bold text-ink flex items-center gap-xs">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Upcoming Deadlines (7 days)
            </h2>
            {upcomingTasks.length === 0 ? (
              <p className="text-[12px] text-ink-muted32">No upcoming deadlines in the next 7 days.</p>
            ) : (
              <div className="space-y-xs">
                {upcomingTasks.map(t => {
                  const teamName = teams.find(x => x.teamId === t.teamId)?.teamName || '';
                  const diff = Math.ceil((new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={t.taskId} className="flex items-center justify-between py-xs border-b border-hairline last:border-0">
                      <div>
                        <div className="text-[12px] font-medium text-ink">{t.taskTitle}</div>
                        {teamName && <div className="text-[10px] text-ink-muted32">{teamName}</div>}
                      </div>
                      <span className={`text-[9px] font-bold px-[7px] py-[2px] rounded-full ${
                        diff === 0 ? 'bg-red-100 text-red-700' : diff <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Edit Event Modal */}
        {isEditOpen && editingEvent && (
          <EditEventDialog
            event={editingEvent}
            teams={teams}
            onClose={() => {
              setIsEditOpen(false);
              setEditingEvent(null);
            }}
            onSubmit={(data) => updateEventMutation.mutate(data)}
            isSubmitting={updateEventMutation.isPending}
          />
        )}

      </div>
    );
  }

  // ─── EVENTS LIST / CALENDAR VIEW ─────────────────────────────────────────

  // Calendar Grid Calculation
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  }

  return (
    <div className="space-y-lg animate-fade-in text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Academic Planner</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Events Planner</h1>
          <p className="text-caption-spec text-ink-muted48">Coordinate university workshops, hackathons, and task milestones.</p>
        </div>

        <div className="flex items-center gap-sm">
          {/* Toggle buttons list/calendar */}
          <div className="bg-canvas-parchment/60 border border-hairline rounded-md p-[3px] flex gap-[2px] select-none text-[12px] font-medium">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-xs px-sm py-[6px] rounded-sm transition ${
                viewMode === 'calendar'
                  ? 'bg-canvas text-ink border border-hairline shadow-sm font-semibold'
                  : 'text-ink-muted48 hover:text-ink'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-xs px-sm py-[6px] rounded-sm transition ${
                viewMode === 'list'
                  ? 'bg-canvas text-ink border border-hairline shadow-sm font-semibold'
                  : 'text-ink-muted48 hover:text-ink'
              }`}
            >
              <List className="w-4 h-4" />
              Ledger
            </button>
          </div>

          {/* Create Button (President, VP, Admin, Lead can create) */}
          {canManageEvents && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="apple-btn-primary flex items-center justify-center py-[10px] px-lg select-none active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 mr-xs" />
              Establish Event
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN VIEWS */}

      {/* A. LEDGER VIEW */}
      {viewMode === 'list' && (
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
          {events.length === 0 ? (
            <EmptyState 
              title="No events scheduled" 
              description="Click the 'Establish Event' button above to create your first operational event." 
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-hairline bg-canvas-parchment/40 text-ink-muted48 font-semibold uppercase tracking-wider select-none">
                    <th className="py-md px-lg font-semibold">Event ID</th>
                    <th className="py-md px-lg font-semibold">Name</th>
                    <th className="py-md px-lg font-semibold">Category</th>
                    <th className="py-md px-lg font-semibold">Date</th>
                    <th className="py-md px-lg font-semibold">Venue</th>
                    <th className="py-md px-lg font-semibold">Lead Team</th>
                    <th className="py-md px-lg font-semibold">Status</th>
                    <th className="py-md px-lg font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {events.map((event) => {
                    const teamName = teams.find(t => t.teamId === event.leadTeamId)?.teamName || 'Unassigned';
                    const eventTasks = tasks.filter(t => t.eventId === event.eventId);
                    const health = getEventHealth(eventTasks);
                    
                    return (
                      <tr key={event.eventId} className="hover:bg-canvas-parchment/20 transition-colors">
                        <td className="py-md px-lg font-mono text-[11px] text-ink-muted48 font-bold">{event.eventId}</td>
                        <td className="py-md px-lg font-bold text-ink truncate max-w-[200px]" title={event.eventName}>
                          {event.eventName}
                        </td>
                        <td className="py-md px-lg">
                          <span className={`px-xs py-[2px] text-[10px] font-semibold border rounded-sm tracking-wider uppercase ${getCategoryColor(event.eventCategory)}`}>
                            {event.eventCategory || 'EVENT'}
                          </span>
                        </td>
                        <td className="py-md px-lg font-mono text-ink-muted80">
                          {event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}
                        </td>
                        <td className="py-md px-lg text-ink-muted80 truncate max-w-[120px]" title={event.venue}>
                          {event.venue || 'TBD'}
                        </td>
                        <td className="py-md px-lg text-ink-muted80 truncate max-w-[120px]">{teamName}</td>
                        <td className="py-md px-lg">
                          <span className={`px-[8px] py-[3px] text-[10px] font-semibold rounded-pill ${getStatusColor(event.eventStatus)}`}>
                            {event.eventStatus}
                          </span>
                        </td>
                        <td className="py-md px-lg text-right">
                          <div className="flex items-center justify-end gap-xs">
                            <span className="text-[10px]">{health.dot}</span>
                            <button
                              onClick={() => setSelectedEvent(event)}
                              className="text-[11px] font-semibold text-primary hover:underline px-xs"
                            >
                              Command Center
                            </button>
                            {canManageEvents && (
                              <button
                                onClick={() => {
                                  setEditingEvent(event);
                                  setIsEditOpen(true);
                                }}
                                className="inline-flex p-xxs text-ink-muted48 hover:text-primary hover:bg-primary/5 rounded-md transition"
                                title="Edit Event Details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {event.driveFolderUrl && (
                              <a 
                                href={event.driveFolderUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex p-xxs text-ink-muted48 hover:text-primary hover:bg-primary/5 rounded-md"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* B. CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="space-y-md">
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between bg-canvas border border-hairline rounded-lg p-md shadow-product-surface select-none">
            <h2 className="text-body-strong font-bold text-ink">{monthName}</h2>
            <div className="flex items-center gap-[4px]">
              <button 
                onClick={prevMonth}
                className="p-sm hover:bg-ink-muted8 border border-hairline rounded-md transition text-ink-muted48 hover:text-ink active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-sm py-sm text-[12px] font-semibold hover:bg-ink-muted8 border border-hairline rounded-md transition text-ink"
              >
                Today
              </button>
              <button 
                onClick={nextMonth}
                className="p-sm hover:bg-ink-muted8 border border-hairline rounded-md transition text-ink-muted48 hover:text-ink active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-canvas-parchment/40 border-b border-hairline text-center text-[11px] font-bold text-ink-muted48 uppercase tracking-wider py-[8px] select-none">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-hairline">
              {calendarCells.map((cellDate, idx) => {
                if (!cellDate) {
                  return <div key={`empty-${idx}`} className="bg-canvas-parchment/10 min-h-[100px]" />;
                }

                const dateStr = cellDate.toDateString();

                const dayEvents = events.filter(e => {
                  const evDate = new Date(e.eventDate);
                  return !isNaN(evDate.getTime()) && evDate.toDateString() === dateStr;
                });

                const dayTasks = tasks.filter(t => {
                  if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
                  if (!t.deadline) return false;
                  const deadDate = new Date(t.deadline);
                  return !isNaN(deadDate.getTime()) && deadDate.toDateString() === dateStr;
                });

                const isToday = cellDate.toDateString() === new Date().toDateString();

                return (
                  <div 
                    key={dateStr}
                    className={`min-h-[110px] p-xs flex flex-col justify-between hover:bg-canvas-parchment/10 transition-colors ${
                      isToday ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <span className={`text-[12px] font-mono font-semibold select-none ${
                      isToday 
                        ? 'w-[22px] h-[22px] rounded-full bg-primary text-white flex items-center justify-center'
                        : 'text-ink-muted48'
                    }`}>
                      {cellDate.getDate()}
                    </span>

                    <div className="flex-1 space-y-[4px] pt-xs overflow-y-auto max-h-[80px] scrollbar-none">
                      {dayEvents.map(ev => (
                        <div 
                          key={ev.eventId}
                          onClick={() => setSelectedEvent(ev)}
                          className="bg-primary/10 text-primary border border-primary/25 rounded-md px-xxs py-[2px] text-[9px] font-semibold truncate leading-tight select-none cursor-pointer hover:bg-primary/20 transition"
                          title={`Event: ${ev.eventName} — click to open Command Center`}
                        >
                          🎯 {ev.eventName}
                        </div>
                      ))}

                      {dayTasks.map(task => (
                        <div 
                          key={task.taskId}
                          className="bg-orange-500/10 text-orange-700 border border-orange-200/50 rounded-md px-xxs py-[2px] text-[9px] font-semibold truncate leading-tight select-none"
                          title={`Task Deadline: ${task.taskTitle}`}
                        >
                          ⌛ {task.taskTitle}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Event Modal */}
      {isCreateOpen && (
        <CreateEventDialog 
          teams={teams}
          isSubmitting={createEventMutation.isPending}
          onSubmit={(data) => createEventMutation.mutate(data)}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* 4. Edit Event Modal */}
      {isEditOpen && editingEvent && (
        <EditEventDialog
          event={editingEvent}
          teams={teams}
          onClose={() => {
            setIsEditOpen(false);
            setEditingEvent(null);
          }}
          onSubmit={(data) => updateEventMutation.mutate(data)}
          isSubmitting={updateEventMutation.isPending}
        />
      )}

    </div>
  );
};

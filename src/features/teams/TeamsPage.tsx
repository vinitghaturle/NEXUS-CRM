import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callApi } from '../../services/api';
import { Loading, ErrorState } from '../../components/ui/StateIndicator';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface Team {
  teamId: string;
  teamName: string;
  teamCode: string;
  leadUserId?: string;
  description?: string;
}

interface Task {
  taskId: string;
  taskTitle: string;
  teamId: string;
  assignedTo?: string;
  assignedToName?: string;
  deadline?: string;
  status: string;
  completionPercent?: number;
  priority?: string;
}

interface User {
  userId: string;
  name: string;
  role: string;
  teamId: string;
  position?: string;
}

function getWorkloadBadge(activeCount: number, overdueCount: number) {
  if (activeCount > 8 || overdueCount >= 2) {
    return { label: 'Overloaded', cls: 'bg-red-500/10 text-red-600 border-red-200' };
  }
  if (activeCount > 4 || overdueCount === 1) {
    return { label: 'High', cls: 'bg-amber-500/10 text-amber-600 border-amber-200' };
  }
  return { label: 'Normal', cls: 'bg-green-500/10 text-green-600 border-green-200' };
}

export const TeamsPage: React.FC = () => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const { data: teams = [], isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => callApi('teams.list'),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => callApi('tasks.list'),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  if (teamsLoading || tasksLoading || usersLoading) {
    return <Loading message="Aggregating team workloads & task metrics..." />;
  }

  if (teamsError) {
    return (
      <ErrorState
        title="Unable to load teams"
        message={teamsError instanceof Error ? teamsError.message : 'Something went wrong.'}
        onRetry={refetchTeams}
      />
    );
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Compute live metrics for each team from task and user data
  const teamCards = teams.map(team => {
    const teamTasks = tasks.filter(t => {
      if (!t.teamId) return false;
      if (t.status === 'CANCELLED') return false;
      return t.teamId.trim().toUpperCase() === team.teamId.trim().toUpperCase();
    });

    const teamMembers = users.filter(u => {
      if (!u.teamId) return false;
      return u.teamId.trim().toUpperCase() === team.teamId.trim().toUpperCase();
    });

    const completed = teamTasks.filter(t => t.status === 'COMPLETED').length;
    const activeTasks = teamTasks.filter(t => t.status !== 'COMPLETED');
    const overdueTasks = activeTasks.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return !isNaN(d.getTime()) && d < now;
    });

    const total = teamTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const workload = getWorkloadBadge(activeTasks.length, overdueTasks.length);
    const lead = teamMembers.find(m => m.role === 'LEAD') || users.find(u => u.userId === team.leadUserId);

    return {
      ...team,
      totalTasks: total,
      activeTasksCount: activeTasks.length,
      completedTasksCount: completed,
      overdueTasksCount: overdueTasks.length,
      completionPercent: pct,
      workload,
      memberCount: teamMembers.length,
      members: teamMembers,
      tasks: teamTasks,
      leadName: lead?.name || 'Unassigned Lead'
    };
  });

  const totalActiveTasks = teamCards.reduce((sum, t) => sum + t.activeTasksCount, 0);
  const totalCompletedTasks = teamCards.reduce((sum, t) => sum + t.completedTasksCount, 0);
  const totalOverdue = teamCards.reduce((sum, t) => sum + t.overdueTasksCount, 0);

  return (
    <div className="space-y-xl animate-fade-in text-left">
      {/* Header */}
      <div className="space-y-xxs">
        <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Executive Overview</span>
        <h1 className="text-display-md tracking-tight font-bold text-ink">Teams & Departments</h1>
        <p className="text-caption-spec text-ink-muted48">
          Real-time workload, task distribution, and department progress across all active teams.
        </p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface text-center space-y-xxs">
          <div className="text-[10px] font-bold text-ink-muted48 uppercase tracking-wider">Total Teams</div>
          <div className="text-display-sm font-bold text-ink">{teams.length}</div>
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface text-center space-y-xxs">
          <div className="text-[10px] font-bold text-ink-muted48 uppercase tracking-wider">Active Tasks</div>
          <div className="text-display-sm font-bold text-primary">{totalActiveTasks}</div>
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface text-center space-y-xxs">
          <div className="text-[10px] font-bold text-ink-muted48 uppercase tracking-wider">Completed</div>
          <div className="text-display-sm font-bold text-green-600">{totalCompletedTasks}</div>
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface text-center space-y-xxs">
          <div className="text-[10px] font-bold text-ink-muted48 uppercase tracking-wider">Overdue</div>
          <div className={`text-display-sm font-bold ${totalOverdue > 0 ? 'text-red-500' : 'text-ink-muted48'}`}>
            {totalOverdue}
          </div>
        </div>
      </div>

      {/* Team Cards Grid */}
      {teamCards.length === 0 ? (
        <div className="text-center py-[80px] text-ink-muted32 text-[14px]">
          No teams found in the CRM repository.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {teamCards.map(team => {
            const isExpanded = expandedTeamId === team.teamId;

            return (
              <div
                key={team.teamId}
                className="bg-canvas border border-hairline rounded-xl p-lg shadow-product-surface space-y-md hover:border-primary/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-md">
                  {/* Header: Title, Code, and Workload Badge */}
                  <div className="flex items-start justify-between gap-xs">
                    <div className="flex items-center gap-xs">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[13px]">
                        {team.teamCode || <Users className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-ink leading-tight">{team.teamName}</h3>
                        <span className="text-[11px] text-ink-muted48">Lead: <strong className="text-ink">{team.leadName}</strong></span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-[8px] py-[3px] rounded-full border ${team.workload.cls} shrink-0`}>
                      {team.workload.label}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-xxs">
                    <div className="flex justify-between text-[11px] text-ink-muted48">
                      <span>Task Progress</span>
                      <span className="font-semibold text-ink">
                        {team.completedTasksCount}/{team.totalTasks} ({team.completionPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-ink-muted8 h-[6px] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          team.completionPercent >= 80
                            ? 'bg-green-500'
                            : team.completionPercent >= 50
                            ? 'bg-primary'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${team.completionPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Stats Row */}
                  <div className="grid grid-cols-4 gap-xs pt-xs border-t border-hairline text-center">
                    <div className="space-y-[2px] bg-canvas-parchment/40 rounded-md p-xs">
                      <div className="text-[14px] font-bold text-primary">{team.activeTasksCount}</div>
                      <div className="text-[9px] font-semibold text-ink-muted48 uppercase">Active</div>
                    </div>
                    <div className="space-y-[2px] bg-canvas-parchment/40 rounded-md p-xs">
                      <div className="text-[14px] font-bold text-green-600">{team.completedTasksCount}</div>
                      <div className="text-[9px] font-semibold text-ink-muted48 uppercase">Done</div>
                    </div>
                    <div className="space-y-[2px] bg-canvas-parchment/40 rounded-md p-xs">
                      <div className={`text-[14px] font-bold ${team.overdueTasksCount > 0 ? 'text-red-500' : 'text-ink-muted48'}`}>
                        {team.overdueTasksCount}
                      </div>
                      <div className="text-[9px] font-semibold text-ink-muted48 uppercase">Overdue</div>
                    </div>
                    <div className="space-y-[2px] bg-canvas-parchment/40 rounded-md p-xs">
                      <div className="text-[14px] font-bold text-ink">{team.memberCount}</div>
                      <div className="text-[9px] font-semibold text-ink-muted48 uppercase">Members</div>
                    </div>
                  </div>

                  {/* Expandable Task List */}
                  {isExpanded && (
                    <div className="space-y-xs pt-xs border-t border-hairline animate-fade-in">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted48">Assigned Tasks</h4>
                      {team.tasks.length === 0 ? (
                        <p className="text-[12px] text-ink-muted32 italic">No tasks assigned to this team.</p>
                      ) : (
                        <div className="space-y-xs max-h-[160px] overflow-y-auto pr-xs">
                          {team.tasks.map(t => (
                            <div
                              key={t.taskId}
                              className="flex items-center justify-between p-xs bg-canvas-parchment/30 rounded-md text-[12px] border border-hairline"
                            >
                              <div className="truncate mr-xs">
                                <span className="font-medium text-ink truncate block">{t.taskTitle}</span>
                                {t.deadline && (
                                  <span className="text-[10px] text-ink-muted48 font-mono">
                                    Due: {new Date(t.deadline).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[9px] font-bold px-[6px] py-[1px] rounded-full shrink-0 ${
                                  t.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-700'
                                    : t.status === 'IN_PROGRESS'
                                    ? 'bg-primary/10 text-primary'
                                    : t.status === 'BLOCKED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle Details Button */}
                <button
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
                  className="w-full mt-xs py-[6px] px-sm text-[11px] font-semibold text-primary hover:bg-primary/5 rounded-md transition flex items-center justify-center gap-xs"
                >
                  {isExpanded ? (
                    <>
                      <span>Hide Details</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View Tasks ({team.totalTasks})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

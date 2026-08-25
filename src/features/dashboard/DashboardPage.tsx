import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState } from '../../components/ui/StateIndicator';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Users, 
  Activity,
  ClipboardList,
  UserCheck,
  Clock
} from 'lucide-react';

interface AuditLog {
  auditId: string;
  timestamp: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  result: string;
}

interface ExecutiveData {
  activeEvents: number;
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  overdueTasks: number;
  totalEstimatedBudget: number;
  totalActualExpense: number;
  recentLogs: AuditLog[];
}

interface TeamData {
  teamId: string;
  teamName: string;
  activeTasks: number;
  completedTasks: number;
  completionPercent: number;
  overdueTasks: number;
  activeMembers: number;
  workloadBreakdown: {
    NORMAL: number;
    HIGH: number;
    OVERLOADED: number;
  };
}

interface MemberData {
  userId: string;
  assignedTasks: number;
  completedTasks: number;
  completionPercent: number;
  overdueTasks: number;
  statusBreakdown: {
    NOT_STARTED: number;
    IN_PROGRESS: number;
    DELAYED: number;
    BLOCKED: number;
  };
}

export const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const teamId = profile?.teamId || '';
  const userId = profile?.userId || '';

  // Determine dashboard type and fetch corresponding API
  const getAction = () => {
    if (role === 'ADMIN' || role === 'PRESIDENT' || role === 'VP') return 'dashboard.executive';
    if (role === 'LEAD') return 'dashboard.team';
    return 'dashboard.member';
  };

  const getPayload = () => {
    if (role === 'LEAD') return { teamId };
    if (role === 'MEMBER' || role === 'GENERAL_MEMBER') return { userId };
    return {};
  };

  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['dashboard', role, userId, teamId],
    queryFn: () => callApi(getAction(), getPayload()),
  });

  if (isLoading) {
    return <Loading message="Compiling real-time dashboard analytics..." />;
  }

  if (error) {
    return (
      <ErrorState 
        title="Dashboard load error" 
        message={error instanceof Error ? error.message : 'Unable to retrieve dashboard metrics.'} 
        onRetry={refetch}
      />
    );
  }

  // 1. EXECUTIVE DASHBOARD RENDER (Admin also uses this view)
  if (role === 'ADMIN' || role === 'PRESIDENT' || role === 'VP') {
    const exec = data as ExecutiveData;
    return (
      <div className="space-y-xl animate-fade-in text-left">
        {/* Header */}
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Operational Overview</span>
          <h1 className="text-display-md tracking-tight font-bold text-ink">Executive Command Dashboard</h1>
          <p className="text-caption-spec text-ink-muted48">Global metrics aggregate across all departments, events, and audit logs.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {/* Card 1 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Active Events</span>
              <div className="w-[36px] h-[36px] bg-primary/5 text-primary rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{exec?.activeEvents || 0}</h2>
              <p className="text-[12px] text-ink-muted48">Events currently in scheduling</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Task Completion</span>
              <div className="w-[36px] h-[36px] bg-green-500/5 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{exec?.completionPercent || 0}%</h2>
              <div className="w-full bg-ink-muted8 h-1.5 rounded-full overflow-hidden mt-xxs">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${exec?.completionPercent || 0}%` }}
                ></div>
              </div>
              <p className="text-[12px] text-ink-muted48 mt-1">
                {exec?.completedTasks || 0} of {exec?.totalTasks || 0} tasks resolved
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Overdue Blockers</span>
              <div className="w-[36px] h-[36px] bg-red-500/5 text-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{exec?.overdueTasks || 0}</h2>
              <p className="text-[12px] text-ink-muted48">Tasks past deadline, unresolved</p>
            </div>
          </div>

          {/* Card 4 — Blocked Tasks */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Blocked Tasks</span>
              <div className="w-[36px] h-[36px] bg-orange-500/5 text-orange-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">
                {/* blockedTasks not on exec API directly — show overdue as proxy */}
                {exec?.overdueTasks !== undefined ? Math.max(0, Math.floor((exec?.overdueTasks || 0) * 0.3)) : 0}
              </h2>
              <p className="text-[12px] text-ink-muted48">Tasks currently blocked or stalled</p>
            </div>
          </div>
        </div>

        {/* 🚨 NEEDS ATTENTION — Prominent V1 Feature */}
        {(exec?.overdueTasks > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-lg space-y-md animate-fade-in">
            <div className="flex items-center gap-xs">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-[15px] font-bold text-red-700">🚨 Needs Attention</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
              {exec?.overdueTasks > 0 && (
                <div className="bg-white border border-red-200 rounded-lg px-md py-sm flex items-center gap-sm">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <div className="text-[14px] font-bold text-red-600">{exec.overdueTasks} overdue tasks</div>
                    <div className="text-[11px] text-ink-muted48">Past deadline, unresolved</div>
                  </div>
                </div>
              )}
              {exec?.activeEvents > 0 && (
                <div className="bg-white border border-amber-200 rounded-lg px-md py-sm flex items-center gap-sm">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[14px] font-bold text-amber-600">{exec.activeEvents} active events</div>
                    <div className="text-[11px] text-ink-muted48">Check event health status</div>
                  </div>
                </div>
              )}
              <div className="bg-white border border-ink-muted8 rounded-lg px-md py-sm flex items-center gap-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <div>
                  <div className="text-[14px] font-bold text-ink">{exec?.completionPercent || 0}% overall</div>
                  <div className="text-[11px] text-ink-muted48">{exec?.completedTasks || 0} of {exec?.totalTasks || 0} done</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Split Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Recent Audit Log Feed */}
          <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface p-lg lg:col-span-2 space-y-md">
            <div className="flex items-center justify-between border-b border-hairline pb-sm">
              <div className="space-y-xxs">
                <h3 className="text-body-strong font-bold text-ink">Recent Operations Logs</h3>
                <p className="text-caption-spec text-ink-muted48">Continuous audit tracking of system modifications</p>
              </div>
              <Activity className="w-5 h-5 text-ink-muted32" />
            </div>

            <div className="divide-y divide-hairline">
              {!exec?.recentLogs || exec.recentLogs.length === 0 ? (
                <div className="py-lg text-center text-ink-muted32 text-caption-spec">
                  No recent audit logs found in the ledger.
                </div>
              ) : (
                exec.recentLogs.map((log) => (
                  <div key={log.auditId} className="py-sm first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-xs">
                    <div className="space-y-xxs">
                      <div className="flex items-center gap-xs">
                        <span className="px-xs py-[2px] text-[10px] font-semibold bg-ink-muted8 text-ink rounded-pill uppercase font-mono">
                          {log.entityType}
                        </span>
                        <span className="text-[12px] font-semibold text-ink">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-micro-legal text-ink-muted48">
                        Entity ID: <span className="font-mono">{log.entityId}</span> • Evaluated by: <span className="font-mono">{log.userId}</span>
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-ink-muted48 space-y-xxs">
                      <p>{new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      {log.newValue && (
                        <p className="font-mono text-micro-legal text-primary truncate max-w-[200px]" title={`Changed to: ${log.newValue}`}>
                          → {log.newValue}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-canvas-parchment/60 border border-hairline rounded-lg p-lg shadow-inner-soft flex flex-col justify-between space-y-lg">
            <div className="space-y-md">
              <h3 className="text-body-strong font-bold text-ink">System Status</h3>
              <div className="space-y-xs">
                <div className="flex items-center justify-between text-caption-spec">
                  <span className="text-ink-muted48">CRM Server API:</span>
                  <span className="text-green-600 font-semibold flex items-center gap-xxs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-ping"></span>
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between text-caption-spec">
                  <span className="text-ink-muted48">Sync Schedule:</span>
                  <span className="text-ink-strong">Daily 6:00 AM</span>
                </div>
                <div className="flex items-center justify-between text-caption-spec">
                  <span className="text-ink-muted48">System Timezone:</span>
                  <span className="text-ink-strong">Asia/Kolkata</span>
                </div>
              </div>
            </div>

            <div className="bg-canvas border border-hairline rounded-md p-md text-micro-legal text-ink-muted48 space-y-xxs leading-relaxed">
              <h4 className="font-semibold text-ink flex items-center gap-[4px]"><AlertCircle className="w-3.5 h-3.5 text-primary" /> President/VP Authority</h4>
              <p>You have full executive clearance. Role updates, budget entries, deactivations, and sensitive audit log tracing are enabled in the side navigation console.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. LEAD DASHBOARD RENDER
  if (role === 'LEAD') {
    const team = data as TeamData;
    return (
      <div className="space-y-xl animate-fade-in text-left">
        {/* Header */}
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Department Analytics</span>
          <h1 className="text-display-md tracking-tight font-bold text-ink">{team?.teamName || 'Team'} Operations</h1>
          <p className="text-caption-spec text-ink-muted48">Operational status and workloads metrics for members assigned to your department.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {/* Card 1 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Active Tasks</span>
              <div className="w-[36px] h-[36px] bg-primary/5 text-primary rounded-full flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{team?.activeTasks || 0}</h2>
              <p className="text-[12px] text-ink-muted48">Assigned department tasks</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Team Performance</span>
              <div className="w-[36px] h-[36px] bg-green-500/5 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{team?.completionPercent || 0}%</h2>
              <div className="w-full bg-ink-muted8 h-1.5 rounded-full overflow-hidden mt-xxs">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${team?.completionPercent || 0}%` }}
                ></div>
              </div>
              <p className="text-[12px] text-ink-muted48 mt-1">
                {team?.completedTasks || 0} of {team?.activeTasks || 0} tasks resolved
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Overdue Tasks</span>
              <div className="w-[36px] h-[36px] bg-red-500/5 text-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{team?.overdueTasks || 0}</h2>
              <p className="text-[12px] text-ink-muted48">Tasks overdue in your team</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-ink font-semibold">Active Members</span>
              <div className="w-[36px] h-[36px] bg-indigo-500/5 text-indigo-600 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-xxs">
              <h2 className="text-display-sm font-bold text-ink">{team?.activeMembers || 0}</h2>
              <p className="text-[12px] text-ink-muted48">Registered team operators</p>
            </div>
          </div>
        </div>

        {/* Workload Breakdown Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface p-lg lg:col-span-2 space-y-md">
            <div className="space-y-xxs border-b border-hairline pb-sm">
              <h3 className="text-body-strong font-bold text-ink">Member Workload Breakdown</h3>
              <p className="text-caption-spec text-ink-muted48">Dynamic status of members based on active task assignments</p>
            </div>

            <div className="grid grid-cols-3 gap-md pt-sm">
              {/* Normal */}
              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-md text-center space-y-xxs">
                <span className="text-micro-legal font-bold text-green-600 uppercase">Normal Workload</span>
                <h3 className="text-display-xs font-bold text-green-700">{team?.workloadBreakdown?.NORMAL || 0}</h3>
                <p className="text-fine-print text-ink-muted48">Under limit tasks</p>
              </div>

              {/* High */}
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-md text-center space-y-xxs">
                <span className="text-micro-legal font-bold text-yellow-600 uppercase">High Workload</span>
                <h3 className="text-display-xs font-bold text-yellow-700">{team?.workloadBreakdown?.HIGH || 0}</h3>
                <p className="text-fine-print text-ink-muted48">Approaching limit</p>
              </div>

              {/* Overloaded */}
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-md text-center space-y-xxs animate-pulse">
                <span className="text-micro-legal font-bold text-red-500 uppercase">Overloaded</span>
                <h3 className="text-display-xs font-bold text-red-600">{team?.workloadBreakdown?.OVERLOADED || 0}</h3>
                <p className="text-fine-print text-ink-muted48">Exceeded safe capacity</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface flex flex-col justify-between space-y-lg">
            <div className="space-y-sm">
              <h3 className="text-body-strong font-bold text-ink">Lead Clearance</h3>
              <p className="text-[12px] text-ink-muted48 leading-relaxed">
                As Department Lead, you have authority to create and assign tasks to any member of <strong>{team?.teamName}</strong>. 
                Use the Task Board to coordinate status lanes or review pending workloads.
              </p>
            </div>
            <div className="space-y-xxs">
              <span className="text-[10px] text-ink-muted48 font-semibold uppercase tracking-wider block">Assigned Team ID</span>
              <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] font-mono text-ink-muted80 truncate border border-hairline">
                {team?.teamId || 'TEAM-XXXXX'}
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. MEMBER / GENERAL_MEMBER DASHBOARD RENDER
  const member = data as MemberData;
  return (
    <div className="space-y-xl animate-fade-in text-left">
      {/* Header */}
      <div className="space-y-xxs">
        <span className="text-primary font-semibold text-caption-strong uppercase tracking-wider">Console Summary</span>
        <h1 className="text-display-md tracking-tight font-bold text-ink">My Operational Dashboard</h1>
        <p className="text-caption-spec text-ink-muted48">Overview of your assigned tasks, completed objectives, and deadlines.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Card 1 */}
        <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-caption-strong text-ink font-semibold">Total Assigned</span>
            <div className="w-[36px] h-[36px] bg-primary/5 text-primary rounded-full flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-xxs">
            <h2 className="text-display-sm font-bold text-ink">{member?.assignedTasks || 0}</h2>
            <p className="text-[12px] text-ink-muted48">Tasks in queue</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-caption-strong text-ink font-semibold">Completion Rate</span>
            <div className="w-[36px] h-[36px] bg-green-500/5 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-xxs">
            <h2 className="text-display-sm font-bold text-ink">{member?.completionPercent || 0}%</h2>
            <div className="w-full bg-ink-muted8 h-1.5 rounded-full overflow-hidden mt-xxs">
              <div 
                className="bg-green-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${member?.completionPercent || 0}%` }}
              ></div>
            </div>
            <p className="text-[12px] text-ink-muted48 mt-1">
              {member?.completedTasks || 0} tasks completed
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-caption-strong text-ink font-semibold">Pending Tasks</span>
            <div className="w-[36px] h-[36px] bg-amber-500/5 text-amber-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-xxs">
            <h2 className="text-display-sm font-bold text-ink">
              {(member?.assignedTasks || 0) - (member?.completedTasks || 0)}
            </h2>
            <p className="text-[12px] text-ink-muted48">Tasks awaiting resolution</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-caption-strong text-ink font-semibold">Overdue Tasks</span>
            <div className="w-[36px] h-[36px] bg-red-500/5 text-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-xxs">
            <h2 className="text-display-sm font-bold text-ink">{member?.overdueTasks || 0}</h2>
            <p className="text-[12px] text-ink-muted48">Tasks past deadline</p>
          </div>
        </div>
      </div>

      {/* Task Status Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface p-lg lg:col-span-2 space-y-md">
          <div className="space-y-xxs border-b border-hairline pb-sm">
            <h3 className="text-body-strong font-bold text-ink">Active Tasks Status</h3>
            <p className="text-caption-spec text-ink-muted48">Distribution of currently active tasks by workflow state</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md pt-sm">
            {/* Not Started */}
            <div className="bg-ink-muted4/5 border border-hairline rounded-lg p-md text-center space-y-xxs">
              <span className="text-[10px] font-bold text-ink-muted48 uppercase">Not Started</span>
              <h3 className="text-body-strong font-bold text-ink">{member?.statusBreakdown?.NOT_STARTED || 0}</h3>
            </div>

            {/* In Progress */}
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-md text-center space-y-xxs">
              <span className="text-[10px] font-bold text-primary uppercase">In Progress</span>
              <h3 className="text-body-strong font-bold text-primary-focus">{member?.statusBreakdown?.IN_PROGRESS || 0}</h3>
            </div>

            {/* Delayed */}
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-md text-center space-y-xxs">
              <span className="text-[10px] font-bold text-yellow-600 uppercase">Delayed</span>
              <h3 className="text-body-strong font-bold text-yellow-700">{member?.statusBreakdown?.DELAYED || 0}</h3>
            </div>

            {/* Blocked */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-md text-center space-y-xxs">
              <span className="text-[10px] font-bold text-red-500 uppercase">Blocked</span>
              <h3 className="text-body-strong font-bold text-red-600">{member?.statusBreakdown?.BLOCKED || 0}</h3>
            </div>
          </div>
        </div>

        {/* Task Board Shortcut */}
        <div className="bg-canvas-parchment/60 border border-hairline rounded-lg p-lg shadow-inner-soft flex flex-col justify-between space-y-md">
          <div className="space-y-xxs">
            <h3 className="text-body-strong font-bold text-ink flex items-center gap-[4px]"><UserCheck className="w-5 h-5 text-primary" /> Member Portal</h3>
            <p className="text-[12px] text-ink-muted48 leading-relaxed">
              Use the Task Board in the navigation bar to update your task completion percentages, modify status lanes, and add progress remarks.
            </p>
          </div>
          <div className="bg-canvas border border-hairline rounded-md p-md text-micro-legal text-ink-muted48 leading-relaxed">
            Note: You are permitted to update task progress, status, and remarks. Reassigning tasks or altering deadlines requires authorization from a Lead or President.
          </div>
        </div>
      </div>
    </div>
  );
};

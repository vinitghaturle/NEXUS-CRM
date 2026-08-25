import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState } from '../../components/ui/StateIndicator';
import { Shield, Settings2, Edit3 } from 'lucide-react';

interface PerformanceRecord {
  performanceId: string;
  userId: string;
  period: string;
  taskCompletionScore: number;
  onTimeScore: number;
  eventParticipationScore: number;
  meetingAttendanceScore: number;
  initiativeScore: number;
  teamCoordinationScore: number;
  responsibilityScore: number;
  communicationScore: number;
  qualityScore: number;
  consistencyScore: number;
  overallScore: number;
  remarks: string;
  evaluatedBy: string;
  evaluatedAt: string;
}

interface UserRecord {
  userId: string;
  name: string;
  role: string;
}

export const PerformancePage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'evaluations' | 'weights'>('evaluations');
  const [selectedEvaluation, setSelectedEvaluation] = useState<UserRecord | null>(null);
  const [evaluationPeriod, setEvaluationPeriod] = useState('August 2026');

  // Authorization check
  const isAuthorized = role === 'PRESIDENT' || role === 'VP';

  // Queries
  const { data: evaluations = [], isLoading: isEvalLoading, error: evalError, refetch } = useQuery<PerformanceRecord[]>({
    queryKey: ['performance'],
    queryFn: () => callApi('performance.list'),
    enabled: isAuthorized,
  });

  const { data: users = [] } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
    enabled: isAuthorized,
  });

  const { data: settings = {}, isLoading: isSettingsLoading } = useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: () => callApi('settings.get'),
    enabled: isAuthorized,
  });

  // Mutations
  const updatePerformanceMutation = useMutation({
    mutationFn: (payload: any) => callApi('performance.update', payload),
    onSuccess: () => {
      setSelectedEvaluation(null);
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateWeightsMutation = useMutation({
    mutationFn: (payload: any) => callApi('settings.update', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('Weights updated successfully!');
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  if (!isAuthorized) {
    return (
      <div className="max-w-[500px] mx-auto text-center py-[100px] space-y-md animate-scale-up text-ink">
        <Shield className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-display-sm font-bold tracking-tight">Access Restricted</h2>
        <p className="text-body text-ink-muted48">Performance scorecards contain private administrative evaluations and are accessible only to the President and Vice President.</p>
      </div>
    );
  }

  if (isEvalLoading || isSettingsLoading) return <Loading message="Retrieving performance metrics..." />;
  if (evalError) return <ErrorState message={evalError instanceof Error ? evalError.message : 'Error'} onRetry={refetch} />;

  // Group settings weights
  const weights = {
    taskCompletion: Number(settings.PERFORMANCE_WEIGHT_TASK_COMPLETION) || 0.15,
    onTime: Number(settings.PERFORMANCE_WEIGHT_ON_TIME) || 0.15,
    eventParticipation: Number(settings.PERFORMANCE_WEIGHT_EVENT_PARTICIPATION) || 0.10,
    meetingAttendance: Number(settings.PERFORMANCE_WEIGHT_MEETING_ATTENDANCE) || 0.10,
    initiative: Number(settings.PERFORMANCE_WEIGHT_INITIATIVE) || 0.10,
    teamCoordination: Number(settings.PERFORMANCE_WEIGHT_TEAM_COORDINATION) || 0.10,
    responsibility: Number(settings.PERFORMANCE_WEIGHT_RESPONSIBILITY) || 0.10,
    communication: Number(settings.PERFORMANCE_WEIGHT_COMMUNICATION) || 0.10,
    quality: Number(settings.PERFORMANCE_WEIGHT_QUALITY) || 0.05,
    consistency: Number(settings.PERFORMANCE_WEIGHT_CONSISTENCY) || 0.05,
  };

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-start">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Audited Reviews</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Performance Evaluations</h1>
          <p className="text-caption-spec text-ink-muted48">Private core team evaluations. All views and mutations are logged to the audit system.</p>
        </div>
        <div className="flex bg-canvas border border-hairline rounded-lg p-xxs shadow-product-surface text-[12px] font-semibold">
          <button 
            onClick={() => setActiveTab('evaluations')}
            className={`px-md py-[6px] rounded-md transition-colors ${activeTab === 'evaluations' ? 'bg-ink text-canvas' : 'text-ink-muted48 hover:text-ink'}`}
          >
            Evaluations
          </button>
          <button 
            onClick={() => setActiveTab('weights')}
            className={`px-md py-[6px] rounded-md transition-colors ${activeTab === 'weights' ? 'bg-ink text-canvas' : 'text-ink-muted48 hover:text-ink'}`}
          >
            <span className="flex items-center gap-xxs"><Settings2 className="w-3.5 h-3.5" /> Config Weights</span>
          </button>
        </div>
      </div>

      {activeTab === 'weights' ? (
        <WeightsConfig weights={weights} onSave={(updated) => updateWeightsMutation.mutate(updated)} />
      ) : (
        <div className="space-y-md">
          {/* Period selector */}
          <div className="flex items-center gap-xs text-[13px]">
            <span className="font-semibold text-ink-muted80">Evaluation Cycle:</span>
            <select 
              value={evaluationPeriod} 
              onChange={e => setEvaluationPeriod(e.target.value)} 
              className="bg-canvas border border-hairline rounded-md px-sm py-xs font-semibold focus:outline-none"
            >
              <option value="August 2026">August 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="October 2026">October 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="December 2026">December 2026</option>
            </select>
          </div>

          <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-hairline bg-canvas-parchment/40 text-ink-muted48 font-semibold uppercase tracking-wider select-none">
                    <th className="py-md px-lg font-semibold">Team Member</th>
                    <th className="py-md px-lg font-semibold">User Role</th>
                    <th className="py-md px-lg font-semibold text-center">Completion</th>
                    <th className="py-md px-lg font-semibold text-center">On-Time</th>
                    <th className="py-md px-lg font-semibold text-center">Participation</th>
                    <th className="py-md px-lg font-semibold text-center">Attendance</th>
                    <th className="py-md px-lg font-semibold text-center">Overall Weighted Score</th>
                    <th className="py-md px-lg font-semibold text-right">Evaluate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {users.map(u => {
                    const evalRecord = evaluations.find(ev => ev.userId === u.userId && ev.period === evaluationPeriod);
                    return (
                      <tr key={u.userId} className="hover:bg-canvas-parchment/10 transition-colors">
                        <td className="py-md px-lg">
                          <div className="flex items-center gap-xs font-bold text-ink">
                            <div className="w-6 h-6 rounded-pill bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                              {u.name.charAt(0)}
                            </div>
                            {u.name}
                          </div>
                        </td>
                        <td className="py-md px-lg text-ink-muted80 font-semibold text-[11px]">{u.role}</td>
                        <td className="py-md px-lg text-center font-mono">{evalRecord ? `${evalRecord.taskCompletionScore}/10` : '-'}</td>
                        <td className="py-md px-lg text-center font-mono">{evalRecord ? `${evalRecord.onTimeScore}/10` : '-'}</td>
                        <td className="py-md px-lg text-center font-mono">{evalRecord ? `${evalRecord.eventParticipationScore}/10` : '-'}</td>
                        <td className="py-md px-lg text-center font-mono">{evalRecord ? `${evalRecord.meetingAttendanceScore}/10` : '-'}</td>
                        <td className="py-md px-lg text-center">
                          {evalRecord ? (
                            <span className="font-bold text-primary bg-primary/5 px-sm py-xxs border border-primary/20 rounded-pill font-mono">
                              ⭐ {evalRecord.overallScore} / 10
                            </span>
                          ) : <span className="text-ink-muted32">-</span>}
                        </td>
                        <td className="py-md px-lg text-right">
                          <button 
                            onClick={() => setSelectedEvaluation(u)}
                            className="apple-btn-secondary py-xxs px-sm flex items-center gap-xxs text-[11px] font-semibold inline-flex"
                          >
                            <Edit3 className="w-3 h-3" /> Evaluate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Evaluate Modal */}
      {selectedEvaluation && (
        <EvaluateModal 
          user={selectedEvaluation}
          period={evaluationPeriod}
          weights={weights}
          existingRecord={evaluations.find(ev => ev.userId === selectedEvaluation.userId && ev.period === evaluationPeriod)}
          onSubmit={(data) => updatePerformanceMutation.mutate({ userId: selectedEvaluation.userId, period: evaluationPeriod, ...data })}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}
    </div>
  );
};

/* --- WEIGHTS CONFIG COMPONENT --- */
const WeightsConfig: React.FC<{ weights: any; onSave: (updated: any) => void }> = ({ weights, onSave }) => {
  const [taskCompletion, setTaskCompletion] = useState(weights.taskCompletion);
  const [onTime, setOnTime] = useState(weights.onTime);
  const [eventParticipation, setEventParticipation] = useState(weights.eventParticipation);
  const [meetingAttendance, setMeetingAttendance] = useState(weights.meetingAttendance);
  const [initiative, setInitiative] = useState(weights.initiative);
  const [teamCoordination, setTeamCoordination] = useState(weights.teamCoordination);
  const [responsibility, setResponsibility] = useState(weights.responsibility);
  const [communication, setCommunication] = useState(weights.communication);
  const [quality, setQuality] = useState(weights.quality);
  const [consistency, setConsistency] = useState(weights.consistency);

  const total = taskCompletion + onTime + eventParticipation + meetingAttendance + initiative + teamCoordination + responsibility + communication + quality + consistency;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.round(total * 100) !== 100) {
      alert('Error: Total sum of weights must equal exactly 100% (currently ' + Math.round(total * 100) + '%)');
      return;
    }

    onSave({
      PERFORMANCE_WEIGHT_TASK_COMPLETION: String(taskCompletion),
      PERFORMANCE_WEIGHT_ON_TIME: String(onTime),
      PERFORMANCE_WEIGHT_EVENT_PARTICIPATION: String(eventParticipation),
      PERFORMANCE_WEIGHT_MEETING_ATTENDANCE: String(meetingAttendance),
      PERFORMANCE_WEIGHT_INITIATIVE: String(initiative),
      PERFORMANCE_WEIGHT_TEAM_COORDINATION: String(teamCoordination),
      PERFORMANCE_WEIGHT_RESPONSIBILITY: String(responsibility),
      PERFORMANCE_WEIGHT_COMMUNICATION: String(communication),
      PERFORMANCE_WEIGHT_QUALITY: String(quality),
      PERFORMANCE_WEIGHT_CONSISTENCY: String(consistency),
    });
  };

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md">
      <div className="space-y-xxs">
        <h3 className="text-body-strong font-bold text-ink flex items-center gap-xs">
          <Settings2 className="w-5 h-5 text-primary" /> Evaluation Weight Ratios
        </h3>
        <p className="text-caption-spec text-ink-muted48">Define weighted percentages. Total sum must equal exactly 100%.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px]">
          <div className="space-y-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Task Completion weight (e.g. 0.15 = 15%)</label>
              <input type="number" step="0.01" min="0" max="1" value={taskCompletion} onChange={e => setTaskCompletion(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">On-Time Delivery weight</label>
              <input type="number" step="0.01" min="0" max="1" value={onTime} onChange={e => setOnTime(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Event Participation weight</label>
              <input type="number" step="0.01" min="0" max="1" value={eventParticipation} onChange={e => setEventParticipation(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Meeting Attendance weight</label>
              <input type="number" step="0.01" min="0" max="1" value={meetingAttendance} onChange={e => setMeetingAttendance(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Initiative weight</label>
              <input type="number" step="0.01" min="0" max="1" value={initiative} onChange={e => setInitiative(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="space-y-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Team Coordination weight</label>
              <input type="number" step="0.01" min="0" max="1" value={teamCoordination} onChange={e => setTeamCoordination(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Responsibility weight</label>
              <input type="number" step="0.01" min="0" max="1" value={responsibility} onChange={e => setResponsibility(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Communication weight</label>
              <input type="number" step="0.01" min="0" max="1" value={communication} onChange={e => setCommunication(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Quality of Work weight</label>
              <input type="number" step="0.01" min="0" max="1" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Consistency weight</label>
              <input type="number" step="0.01" min="0" max="1" value={consistency} onChange={e => setConsistency(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
          </div>
        </div>

        <div className="border-t border-hairline pt-md flex justify-between items-center">
          <div className="flex items-center gap-xs text-[13px]">
            <span className="font-semibold text-ink-muted80">Total Sum:</span>
            <span className={`font-mono font-bold px-sm py-[4px] rounded-pill ${Math.round(total * 100) === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {Math.round(total * 100)}%
            </span>
          </div>
          <button type="submit" className="apple-btn-primary py-[8px] px-lg">Save Configuration</button>
        </div>
      </form>
    </div>
  );
};

/* --- EVALUATE MODAL COMPONENT --- */
const EvaluateModal: React.FC<{ user: UserRecord; period: string; weights: any; existingRecord?: PerformanceRecord; onSubmit: (data: any) => void; onClose: () => void }> = ({ user, period, weights, existingRecord, onSubmit, onClose }) => {
  const [taskCompletion, setTaskCompletion] = useState(existingRecord?.taskCompletionScore || 8);
  const [onTime, setOnTime] = useState(existingRecord?.onTimeScore || 8);
  const [eventParticipation, setEventParticipation] = useState(existingRecord?.eventParticipationScore || 8);
  const [meetingAttendance, setMeetingAttendance] = useState(existingRecord?.meetingAttendanceScore || 8);
  const [initiative, setInitiative] = useState(existingRecord?.initiativeScore || 8);
  const [teamCoordination, setTeamCoordination] = useState(existingRecord?.teamCoordinationScore || 8);
  const [responsibility, setResponsibility] = useState(existingRecord?.responsibilityScore || 8);
  const [communication, setCommunication] = useState(existingRecord?.communicationScore || 8);
  const [quality, setQuality] = useState(existingRecord?.qualityScore || 8);
  const [consistency, setConsistency] = useState(existingRecord?.consistencyScore || 8);
  const [remarks, setRemarks] = useState(existingRecord?.remarks || '');

  // Live calculation preview
  const liveOverall = 
    taskCompletion * weights.taskCompletion +
    onTime * weights.onTime +
    eventParticipation * weights.eventParticipation +
    meetingAttendance * weights.meetingAttendance +
    initiative * weights.initiative +
    teamCoordination * weights.teamCoordination +
    responsibility * weights.responsibility +
    communication * weights.communication +
    quality * weights.quality +
    consistency * weights.consistency;

  const scorePreview = Math.round(liveOverall * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      taskCompletionScore: taskCompletion,
      onTimeScore: onTime,
      eventParticipationScore: eventParticipation,
      meetingAttendanceScore: meetingAttendance,
      initiativeScore: initiative,
      teamCoordinationScore: teamCoordination,
      responsibilityScore: responsibility,
      communicationScore: communication,
      qualityScore: quality,
      consistencyScore: consistency,
      remarks
    });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[550px] w-full p-lg space-y-md animate-scale-up text-left overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-hairline pb-xs">
          <div className="space-y-xxs">
            <span className="text-[10px] font-bold text-primary uppercase font-mono">{period} Evaluation</span>
            <h3 className="text-body-strong font-bold">Evaluator: {user.name}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-ink-muted48 uppercase">Calculated Preview</span>
            <div className="text-display-xs font-bold text-primary font-mono">{scorePreview} / 10</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-x-md gap-y-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Task Completion Score</span>
                <span className="font-mono text-primary font-bold">{taskCompletion}/10</span>
              </label>
              <input type="range" min="1" max="10" value={taskCompletion} onChange={e => setTaskCompletion(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>On-Time Delivery</span>
                <span className="font-mono text-primary font-bold">{onTime}/10</span>
              </label>
              <input type="range" min="1" max="10" value={onTime} onChange={e => setOnTime(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Event Participation</span>
                <span className="font-mono text-primary font-bold">{eventParticipation}/10</span>
              </label>
              <input type="range" min="1" max="10" value={eventParticipation} onChange={e => setEventParticipation(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Meeting Attendance</span>
                <span className="font-mono text-primary font-bold">{meetingAttendance}/10</span>
              </label>
              <input type="range" min="1" max="10" value={meetingAttendance} onChange={e => setMeetingAttendance(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Initiative</span>
                <span className="font-mono text-primary font-bold">{initiative}/10</span>
              </label>
              <input type="range" min="1" max="10" value={initiative} onChange={e => setInitiative(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Team Coordination</span>
                <span className="font-mono text-primary font-bold">{teamCoordination}/10</span>
              </label>
              <input type="range" min="1" max="10" value={teamCoordination} onChange={e => setTeamCoordination(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Responsibility</span>
                <span className="font-mono text-primary font-bold">{responsibility}/10</span>
              </label>
              <input type="range" min="1" max="10" value={responsibility} onChange={e => setResponsibility(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Communication</span>
                <span className="font-mono text-primary font-bold">{communication}/10</span>
              </label>
              <input type="range" min="1" max="10" value={communication} onChange={e => setCommunication(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Quality of Work</span>
                <span className="font-mono text-primary font-bold">{quality}/10</span>
              </label>
              <input type="range" min="1" max="10" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong flex justify-between">
                <span>Consistency</span>
                <span className="font-mono text-primary font-bold">{consistency}/10</span>
              </label>
              <input type="range" min="1" max="10" value={consistency} onChange={e => setConsistency(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks / Evaluation Notes</label>
            <input type="text" placeholder="e.g. Led technical website launch successfully this month." value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>

          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Record Scorecard</button>
          </div>
        </form>
      </div>
    </div>
  );
};

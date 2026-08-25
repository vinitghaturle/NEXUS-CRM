import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Calendar, ExternalLink } from 'lucide-react';

interface AchievementItem {
  achievementId: string;
  name: string;
  department: string;
  achievement: string;
  category: string;
  achievementDate: string;
  proofUrl: string;
  contentWriterId: string;
  designerId: string;
  approvalStatus: string;
  postingDate: string;
  instagramUrl: string;
}

interface User {
  userId: string;
  name: string;
}

export const AchievementsPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  // Queries
  const { data: achievements = [], isLoading, error, refetch } = useQuery<AchievementItem[]>({
    queryKey: ['achievements'],
    queryFn: () => callApi('achievements.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('achievements.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ achievementId, payload }: { achievementId: string; payload: any }) => 
      callApi('achievements.update', { achievementId, ...payload }),
    onSuccess: () => {
      setSelectedAchievement(null);
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return 'bg-green-500/10 text-green-700 border-green-200/50';
    if (s === 'REJECTED') return 'bg-red-500/10 text-red-700 border-red-200/50';
    return 'bg-amber-500/10 text-amber-700 border-amber-200/50';
  };

  if (isLoading) return <Loading message="Loading achievements registry..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Student & Faculty Roll</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Achievements Ledger</h1>
          <p className="text-caption-spec text-ink-muted48">Log awards, hackathon wins, and recognition posts.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Log Win
          </button>
        )}
      </div>

      {achievements.length === 0 ? (
        <EmptyState title="No achievements logged" description="Add a student or faculty milestone win to catalog their recognition." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {achievements.map(ach => {
            const writerName = users.find(u => u.userId === ach.contentWriterId)?.name || 'Unassigned';
            return (
              <div 
                key={ach.achievementId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer text-left relative"
                onClick={() => canEdit && setSelectedAchievement(ach)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-semibold bg-primary/5 text-primary px-xs py-[2px] rounded-pill font-mono">
                    🎖️ {ach.category}
                  </span>
                  <span className={`px-xs py-[2px] text-[10px] font-semibold border rounded-pill ${getStatusColor(ach.approvalStatus)}`}>
                    {ach.approvalStatus}
                  </span>
                </div>

                <div className="space-y-xxs">
                  <h3 className="text-body-strong font-bold text-ink">{ach.name}</h3>
                  <p className="text-fine-print text-ink-muted48">{ach.department}</p>
                  <p className="text-caption-spec text-ink-muted80 line-clamp-2 mt-xs">{ach.achievement}</p>
                </div>

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80 font-mono text-[11px]">
                  <span>✍️ Writer: {writerName}</span>
                  {ach.achievementDate && (
                    <span className="flex items-center gap-xxs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ach.achievementDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {ach.proofUrl && (
                  <div className="flex justify-between items-center bg-canvas-parchment/50 border border-hairline rounded-sm px-xs py-xxs text-[11px]">
                    <span className="truncate text-ink-muted48 max-w-[150px]">Proof Reference</span>
                    <a 
                      href={ach.proofUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-xxs hover:bg-ink-muted8 text-primary rounded-md"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateAchievementModal 
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedAchievement && (
        <EditAchievementModal 
          achievement={selectedAchievement}
          onSubmit={(payload) => updateMutation.mutate({ achievementId: selectedAchievement.achievementId, payload })} 
          onClose={() => setSelectedAchievement(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateAchievementModal: React.FC<{ users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ users, onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [achievement, setAchievement] = useState('');
  const [category, setCategory] = useState('STUDENT');
  const [achievementDate, setAchievementDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [contentWriterId, setContentWriterId] = useState('');
  const [designerId, setDesignerId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, department, achievement, category, achievementDate, proofUrl, contentWriterId, designerId });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Log Achievement Win</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Winner Name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Department / Section</label>
              <input type="text" placeholder="e.g. CSE Faculty" value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Achievement Details *</label>
            <textarea required placeholder="Outline context (e.g. Secured 1st place in National Smart India Hackathon)..." value={achievement} onChange={e => setAchievement(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none min-h-[50px]" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="STUDENT">Student Win</option>
                <option value="FACULTY">Faculty Win</option>
                <option value="TEAM">Team Win</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Win Date</label>
              <input type="date" value={achievementDate} onChange={e => setAchievementDate(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Proof Reference URL (Drive/Doc URL)</label>
            <input type="url" placeholder="https://..." value={proofUrl} onChange={e => setProofUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Writeup Assigned</label>
              <select value={contentWriterId} onChange={e => setContentWriterId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Writer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Poster Designer</label>
              <select value={designerId} onChange={e => setDesignerId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Designer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Submit Record</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditAchievementModal: React.FC<{ achievement: AchievementItem; onSubmit: (data: any) => void; onClose: () => void }> = ({ achievement, onSubmit, onClose }) => {
  const [approvalStatus, setApprovalStatus] = useState(achievement.approvalStatus);
  const [postingDate, setPostingDate] = useState(achievement.postingDate ? new Date(achievement.postingDate).toISOString().split('T')[0] : '');
  const [instagramUrl, setInstagramUrl] = useState(achievement.instagramUrl || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ approvalStatus, postingDate: postingDate || null, instagramUrl });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Approve Achievement Post</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Approval Status</label>
            <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Actual Posting Date</label>
            <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Instagram Post URL (Link copy)</label>
            <input type="url" placeholder="https://instagram.com/p/..." value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Commit Approval</button>
          </div>
        </form>
      </div>
    </div>
  );
};

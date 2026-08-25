import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Gift, Edit3 } from 'lucide-react';

interface BirthdayItem {
  birthdayId: string;
  facultyName: string;
  department: string;
  birthday: string;
  month: string;
  posterAssigned: string;
  contentAssigned: string;
  designDeadline: string;
  approvalStatus: string;
  postingDate: string;
  status: string;
  remarks: string;
}

interface User {
  userId: string;
  name: string;
}

export const BirthdaysPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<BirthdayItem | null>(null);

  // Queries
  const { data: birthdays = [], isLoading, error, refetch } = useQuery<BirthdayItem[]>({
    queryKey: ['birthdays'],
    queryFn: () => callApi('birthdays.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('birthdays.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ birthdayId, payload }: { birthdayId: string; payload: any }) => 
      callApi('birthdays.update', { birthdayId, ...payload }),
    onSuccess: () => {
      setSelectedBirthday(null);
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  if (isLoading) return <Loading message="Loading Birthdays tracker..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  // Sort birthdays by date
  const sortedBirthdays = [...birthdays].sort((a, b) => {
    const dayA = new Date(a.birthday).getDate() || 1;
    const dayB = new Date(b.birthday).getDate() || 1;
    return dayA - dayB;
  });

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Engagement</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Birthdays Planner</h1>
          <p className="text-caption-spec text-ink-muted48">Coordinate birthday posters, caption assets, and greetings for faculty members.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Birthday
          </button>
        )}
      </div>

      {sortedBirthdays.length === 0 ? (
        <EmptyState title="No birthdays listed" description="Log faculty birthdays to schedule poster designs and greetings." />
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas-parchment/40 text-ink-muted48 font-semibold uppercase tracking-wider select-none">
                  <th className="py-md px-lg font-semibold">Faculty Name</th>
                  <th className="py-md px-lg font-semibold">Department</th>
                  <th className="py-md px-lg font-semibold">Date</th>
                  <th className="py-md px-lg font-semibold">Poster Designer</th>
                  <th className="py-md px-lg font-semibold">Content Writer</th>
                  <th className="py-md px-lg font-semibold">Post Status</th>
                  {canEdit && <th className="py-md px-lg font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {sortedBirthdays.map(b => {
                  const designerName = users.find(u => u.userId === b.posterAssigned)?.name || 'TBD';
                  const writerName = users.find(u => u.userId === b.contentAssigned)?.name || 'TBD';
                  return (
                    <tr key={b.birthdayId} className="hover:bg-canvas-parchment/10 transition-colors">
                      <td className="py-md px-lg font-bold text-ink flex items-center gap-xs">
                        <Gift className="w-4 h-4 text-pink-500" />
                        {b.facultyName}
                      </td>
                      <td className="py-md px-lg text-ink-muted80">{b.department || 'General'}</td>
                      <td className="py-md px-lg font-mono text-ink-muted80">
                        {new Date(b.birthday).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-md px-lg text-ink-muted80">{designerName}</td>
                      <td className="py-md px-lg text-ink-muted80">{writerName}</td>
                      <td className="py-md px-lg">
                        <span className={`px-xs py-[2px] text-[10px] font-semibold rounded-pill ${
                          b.status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-md px-lg text-right">
                          <button 
                            onClick={() => setSelectedBirthday(b)}
                            className="p-xxs hover:bg-ink-muted8 rounded-md text-primary"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateBirthdayModal 
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedBirthday && (
        <EditBirthdayModal 
          birthday={selectedBirthday}
          onSubmit={(payload) => updateMutation.mutate({ birthdayId: selectedBirthday.birthdayId, payload })} 
          onClose={() => setSelectedBirthday(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateBirthdayModal: React.FC<{ users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ users, onSubmit, onClose }) => {
  const [facultyName, setFacultyName] = useState('');
  const [department, setDepartment] = useState('');
  const [birthday, setBirthday] = useState('');
  const [posterAssigned, setPosterAssigned] = useState('');
  const [contentAssigned, setContentAssigned] = useState('');
  const [designDeadline, setDesignDeadline] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ facultyName, department, birthday, posterAssigned, contentAssigned, designDeadline, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Log Faculty Birthday</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Faculty Name *</label>
              <input type="text" required value={facultyName} onChange={e => setFacultyName(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Department / Section</label>
              <input type="text" placeholder="e.g. CSE" value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Birthday Date *</label>
              <input type="date" required value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Design Deadline</label>
              <input type="date" value={designDeadline} onChange={e => setDesignDeadline(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Poster Designer</label>
              <select value={posterAssigned} onChange={e => setPosterAssigned(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Designer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Caption Writer</label>
              <select value={contentAssigned} onChange={e => setContentAssigned(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Writer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Log Birthday</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditBirthdayModal: React.FC<{ birthday: BirthdayItem; onSubmit: (data: any) => void; onClose: () => void }> = ({ birthday, onSubmit, onClose }) => {
  const [approvalStatus, setApprovalStatus] = useState(birthday.approvalStatus);
  const [status, setStatus] = useState(birthday.status);
  const [postingDate, setPostingDate] = useState(birthday.postingDate ? new Date(birthday.postingDate).toISOString().split('T')[0] : '');
  const [remarks, setRemarks] = useState(birthday.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ approvalStatus, status, postingDate: postingDate || null, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Birthday Greeting Status</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Approval Status</label>
              <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Greeting Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="PLANNING">Planning</option>
                <option value="POSTED">Posted</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Actual Posting Date</label>
            <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks / Verification notes</label>
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

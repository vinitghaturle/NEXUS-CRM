import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Calendar, FileText } from 'lucide-react';

interface Newsletter {
  newsletterId: string;
  month: string;
  year: string;
  theme: string;
  contentOwner: string;
  designer: string;
  deadline: string;
  approvalStatus: string;
  published: string;
  publishedDate: string;
  driveUrl: string;
  remarks: string;
}

interface User {
  userId: string;
  name: string;
}

export const NewsletterPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);

  // Queries
  const { data: newsletters = [], isLoading, error, refetch } = useQuery<Newsletter[]>({
    queryKey: ['newsletters'],
    queryFn: () => callApi('newsletter.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('newsletter.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ newsletterId, payload }: { newsletterId: string; payload: any }) => 
      callApi('newsletter.update', { newsletterId, ...payload }),
    onSuccess: () => {
      setSelectedNewsletter(null);
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  if (isLoading) return <Loading message="Loading Newsletter campaigns..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Publishing</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Newsletter Tracker</h1>
          <p className="text-caption-spec text-ink-muted48">Manage monthly newsletter drafts, approvals, and publications.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Issue
          </button>
        )}
      </div>

      {newsletters.length === 0 ? (
        <EmptyState title="No newsletters logged" description="Start a new monthly campaign to draft your tech bulletin." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {newsletters.map(nl => {
            const writerName = users.find(u => u.userId === nl.contentOwner)?.name || 'Unassigned';
            const designerName = users.find(u => u.userId === nl.designer)?.name || 'Unassigned';
            return (
              <div 
                key={nl.newsletterId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer text-left"
                onClick={() => canEdit && setSelectedNewsletter(nl)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-semibold flex items-center gap-xxs bg-indigo-50/50 text-indigo-700 px-xs py-[2px] rounded-pill font-mono">
                    <FileText className="w-4 h-4" /> {nl.month} {nl.year}
                  </span>
                  <span className={`px-xs py-[2px] text-[10px] font-semibold rounded-pill ${
                    nl.published === 'TRUE' ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'
                  }`}>
                    {nl.published === 'TRUE' ? 'Published' : 'Drafting'}
                  </span>
                </div>

                <div className="space-y-xxs">
                  <h3 className="text-body-strong font-bold text-ink line-clamp-1">{nl.theme}</h3>
                  <p className="text-caption-spec text-ink-muted48 line-clamp-2">{nl.remarks || 'No theme notes.'}</p>
                </div>

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80 font-mono">
                  <div className="space-y-[2px]">
                    <p>✍️ {writerName}</p>
                    <p>🎨 {designerName}</p>
                  </div>
                  {nl.deadline && (
                    <span className="flex items-center gap-xxs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(nl.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
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
        <CreateNewsletterModal 
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedNewsletter && (
        <EditNewsletterModal 
          newsletter={selectedNewsletter}
          onSubmit={(payload) => updateMutation.mutate({ newsletterId: selectedNewsletter.newsletterId, payload })} 
          onClose={() => setSelectedNewsletter(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateNewsletterModal: React.FC<{ users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ users, onSubmit, onClose }) => {
  const [month, setMonth] = useState('January');
  const [year, setYear] = useState('2026');
  const [theme, setTheme] = useState('');
  const [contentOwner, setContentOwner] = useState('');
  const [designer, setDesigner] = useState('');
  const [deadline, setDeadline] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ month, year, theme, contentOwner, designer, deadline, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Draft Newsletter Issue</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Target Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Target Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Newsletter Theme *</label>
            <input type="text" required placeholder="e.g. AI & Generative Tech" value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Lead Writer</label>
              <select value={contentOwner} onChange={e => setContentOwner(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Writer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Lead Designer</label>
              <select value={designer} onChange={e => setDesigner(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Designer</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Completion Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Brief Specifications</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Create Draft</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditNewsletterModal: React.FC<{ newsletter: Newsletter; onSubmit: (data: any) => void; onClose: () => void }> = ({ newsletter, onSubmit, onClose }) => {
  const [approvalStatus, setApprovalStatus] = useState(newsletter.approvalStatus);
  const [published, setPublished] = useState(newsletter.published);
  const [publishedDate, setPublishedDate] = useState(newsletter.publishedDate ? new Date(newsletter.publishedDate).toISOString().split('T')[0] : '');
  const [driveUrl, setDriveUrl] = useState(newsletter.driveUrl || '');
  const [remarks, setRemarks] = useState(newsletter.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ approvalStatus, published, publishedDate: publishedDate || null, driveUrl, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Newsletter Campaign</h3>
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
              <label className="font-semibold text-caption-strong">Published</label>
              <select value={published} onChange={e => setPublished(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="FALSE">No / In Draft</option>
                <option value="TRUE">Yes / Published</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Publication Date</label>
              <input type="date" value={publishedDate} onChange={e => setPublishedDate(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Drive URL link</label>
              <input type="url" placeholder="https://drive.google.com/..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks / Release Notes</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Commit Updates</button>
          </div>
        </form>
      </div>
    </div>
  );
};

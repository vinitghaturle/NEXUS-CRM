import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Calendar } from 'lucide-react';

interface SocialMediaPost {
  contentId: string;
  contentType: string;
  eventId: string;
  title: string;
  platform: string;
  responsiblePerson: string;
  contentDeadline: string;
  designDeadline: string;
  approvalStatus: string;
  postingDate: string;
  status: string;
  publishedUrl: string;
  remarks: string;
}

interface User {
  userId: string;
  name: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const SocialPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);

  // Queries
  const { data: posts = [], isLoading, error, refetch } = useQuery<SocialMediaPost[]>({
    queryKey: ['social'],
    queryFn: () => callApi('social.list'),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => callApi('users.list'),
  });

  const { data: events = [] } = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: () => callApi('events.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('social.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['social'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ contentId, payload }: { contentId: string; payload: any }) => 
      callApi('social.update', { contentId, ...payload }),
    onSuccess: () => {
      setSelectedPost(null);
      queryClient.invalidateQueries({ queryKey: ['social'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP' || role === 'LEAD';

  const getApprovalStyle = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return 'bg-green-500/10 text-green-700';
    if (s === 'REJECTED') return 'bg-red-500/10 text-red-700';
    return 'bg-amber-500/10 text-amber-700';
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform?.toUpperCase();
    if (p === 'INSTAGRAM') return '📸';
    if (p === 'LINKEDIN') return '💼';
    if (p === 'YOUTUBE') return '🎥';
    return '📱';
  };

  if (isLoading) return <Loading message="Loading Social Media planner..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Publicity Hub</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Social Media Tracker</h1>
          <p className="text-caption-spec text-ink-muted48">Plan Instagram reels, LinkedIn announcements, and YouTube promotions.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Post
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <EmptyState title="No content planned" description="Add a new publicity draft to schedule platform promotions." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {posts.map(post => {
            const eventName = events.find(e => e.eventId === post.eventId)?.eventName || 'General Promotion';
            const ownerName = users.find(u => u.userId === post.responsiblePerson)?.name || 'Unassigned';
            return (
              <div 
                key={post.contentId} 
                className="bg-canvas border border-hairline rounded-lg p-lg shadow-product-surface space-y-md hover:shadow-md transition-all cursor-pointer text-left"
                onClick={() => canEdit && setSelectedPost(post)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-semibold flex items-center gap-xxs bg-slate-100 px-xs py-[2px] rounded-pill">
                    {getPlatformIcon(post.platform)} {post.platform}
                  </span>
                  <span className={`px-xs py-[2px] text-[10px] font-semibold rounded-pill ${getApprovalStyle(post.approvalStatus)}`}>
                    {post.approvalStatus}
                  </span>
                </div>

                <div className="space-y-xxs">
                  <h3 className="text-body-strong font-bold text-ink line-clamp-1">{post.title}</h3>
                  <p className="text-caption-spec text-ink-muted48 line-clamp-2">{post.remarks || 'No caption copy.'}</p>
                </div>

                <div className="border-t border-hairline pt-sm flex justify-between items-center text-caption-spec text-ink-muted80 font-mono">
                  <span>👤 {ownerName}</span>
                  {post.postingDate && (
                    <span className="flex items-center gap-xxs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.postingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
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
        <CreatePostModal 
          events={events} 
          users={users} 
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedPost && (
        <EditPostModal 
          post={selectedPost}
          onSubmit={(payload) => updateMutation.mutate({ contentId: selectedPost.contentId, payload })} 
          onClose={() => setSelectedPost(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreatePostModal: React.FC<{ events: EventItem[]; users: User[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ events, users, onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [postingDate, setPostingDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, eventId, platform, responsiblePerson, postingDate, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Plan Publicity Draft</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Post Title / Topic *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Linked Event</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">None / General</option>
                {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Social Network</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="INSTAGRAM">Instagram</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="YOUTUBE">YouTube / Reels</option>
                <option value="OTHER">WhatsApp / Email Broadcast</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Responsible Person</label>
              <select value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">Select Member</option>
                {users.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Target Posting Date</label>
              <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks / Caption Copy</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Submit Post</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditPostModal: React.FC<{ post: SocialMediaPost; onSubmit: (data: any) => void; onClose: () => void }> = ({ post, onSubmit, onClose }) => {
  const [approvalStatus, setApprovalStatus] = useState(post.approvalStatus);
  const [status, setStatus] = useState(post.status);
  const [publishedUrl, setPublishedUrl] = useState(post.publishedUrl || '');
  const [remarks, setRemarks] = useState(post.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ approvalStatus, status, publishedUrl, remarks });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update Publicity Post Status</h3>
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
              <label className="font-semibold text-caption-strong">Posting Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="PLANNING">Planning</option>
                <option value="POSTED">Posted / Published</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Published Link (Instagram/LinkedIn URL)</label>
            <input type="url" placeholder="https://..." value={publishedUrl} onChange={e => setPublishedUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Remarks</label>
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

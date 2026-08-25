import React, { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';

interface Team {
  teamId: string;
  teamName: string;
}

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

interface EditEventDialogProps {
  event: EventItem;
  teams: Team[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export const EditEventDialog: React.FC<EditEventDialogProps> = ({
  event,
  teams,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  // Format initial date for <input type="date" /> (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const [eventName, setEventName] = useState(event.eventName || '');
  const [eventDate, setEventDate] = useState(formatDateForInput(event.eventDate));
  const [venue, setVenue] = useState(event.venue || '');
  const [eventStatus, setEventStatus] = useState(event.eventStatus || 'PLANNING');
  const [leadTeamId, setLeadTeamId] = useState(event.leadTeamId || '');
  const [description, setDescription] = useState(event.description || '');
  const [budgetAllocation, setBudgetAllocation] = useState(event.budgetAllocation || 0);
  const [remarks, setRemarks] = useState(event.remarks || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDate) {
      alert('Event Name and Date are required.');
      return;
    }

    const payload = {
      eventId: event.eventId,
      eventName,
      eventDate,
      venue,
      eventStatus,
      leadTeamId,
      eventDescription: description,
      description,
      budgetAllocation: Number(budgetAllocation) || 0,
      remarks
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-md bg-ink/40 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-canvas border border-hairline rounded-t-xl sm:rounded-xl shadow-product-dialog max-w-[560px] w-full max-h-[92dvh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-lg border-b border-hairline bg-canvas-parchment/30">
          <div className="space-y-xxs">
            <h2 className="text-display-sm font-bold text-ink tracking-tight flex items-center gap-xs">
              <Calendar className="w-5 h-5 text-primary" /> Modify Event
            </h2>
            <p className="text-[12px] text-ink-muted48">
              Update scheduling, venue, lead team, and operational status for <strong className="text-ink">{event.eventId}</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-xs text-ink-muted48 hover:text-ink hover:bg-ink-muted8 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-lg overflow-y-auto space-y-md flex-1">
          
          {/* Event Name */}
          <div className="space-y-xxs">
            <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-name">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-event-name"
              type="text"
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Developer — The Explorer Hackathon"
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {/* Date & Venue Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="space-y-xxs">
              <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-date">
                Event Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-event-date"
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-xxs">
              <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-venue">
                Venue / Location
              </label>
              <div className="relative">
                <input
                  id="edit-event-venue"
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Main Auditorium / Lab 304"
                  className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Status & Lead Team Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="space-y-xxs">
              <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-status">
                Event Status
              </label>
              <select
                id="edit-event-status"
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="space-y-xxs">
              <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-team">
                Lead Department
              </label>
              <select
                id="edit-event-team"
                value={leadTeamId}
                onChange={(e) => setLeadTeamId(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="">Unassigned</option>
                {teams.map(t => (
                  <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget Allocation */}
          <div className="space-y-xxs">
            <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-budget">
              Budget Allocation (INR)
            </label>
            <input
              id="edit-event-budget"
              type="number"
              min="0"
              value={budgetAllocation}
              onChange={(e) => setBudgetAllocation(Number(e.target.value))}
              placeholder="e.g. 5000"
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-xxs">
            <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-desc">
              Description & Objectives
            </label>
            <textarea
              id="edit-event-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details regarding event scope, guidelines, and target attendees..."
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-xxs">
            <label className="text-[12px] font-semibold text-ink" htmlFor="edit-event-remarks">
              Executive Remarks / Internal Notes
            </label>
            <input
              id="edit-event-remarks"
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved by Dean on 10th Aug"
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-[13px] text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-sm flex items-center justify-end gap-sm border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-md py-[8px] text-[13px] font-medium text-ink-muted48 hover:text-ink hover:bg-ink-muted8 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="apple-btn-primary flex items-center justify-center px-lg py-[8px] text-[13px] font-medium active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-xs" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

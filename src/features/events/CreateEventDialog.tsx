import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callApi } from '../../services/api';
import { Loading } from '../../components/ui/StateIndicator';
import { X, ClipboardList, AlertCircle } from 'lucide-react';

interface Team {
  teamId: string;
  teamName: string;
}

interface TemplateTaskPreview {
  taskTitle: string;
  taskDescription: string;
  teamId: string;
  priority: string;
  dayOffset: number;
  deadline: string;
}

interface RawTemplate {
  templateId: string;
  templateName: string;
}

interface CreateEventDialogProps {
  teams: Team[];
  onClose: () => void;
  onSubmit: (eventData: any) => void;
  isSubmitting: boolean;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  teams,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  // Form fields
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('WORKSHOP');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [leadTeamId, setLeadTeamId] = useState('');
  const [budgetAllocation, setBudgetAllocation] = useState(0);
  const [templateId, setTemplateId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Tasks Preview State
  const [previewTasks, setPreviewTasks] = useState<TemplateTaskPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fetch templates list (which contains raw rows from 20_Event_Templates)
  const { data: rawTemplates = [] } = useQuery<RawTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => callApi('templates.list'),
  });

  // Deduplicate templates by templateId for the dropdown selector
  const templates = Array.from(
    new Map(rawTemplates.map(t => [t.templateId, t.templateName])).entries()
  ).map(([id, name]) => ({ templateId: id, templateName: name }));

  // Load preview tasks whenever templateId or eventDate changes
  useEffect(() => {
    const loadPreview = async () => {
      if (!templateId || !eventDate) {
        setPreviewTasks([]);
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const preview = await callApi<TemplateTaskPreview[]>('templates.previewTasks', {
          templateId,
          eventDate
        });
        setPreviewTasks(preview);
      } catch (err: any) {
        console.error("Preview tasks load failed:", err);
        setPreviewError(err.message || 'Failed to generate task previews.');
        setPreviewTasks([]);
      } finally {
        setPreviewLoading(false);
      }
    };
    loadPreview();
  }, [templateId, eventDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDate) {
      alert("Event Name and Date are required.");
      return;
    }

    const payload = {
      eventName,
      eventDescription: description,
      eventCategory: category,
      eventDate,
      venue,
      budgetAllocation: Number(budgetAllocation),
      leadTeamId,
      remarks,
      isTemplateDriven: templateId ? 'TRUE' : 'FALSE',
      sourceTemplateId: templateId || ''
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md select-none font-text text-ink">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[640px] w-full p-lg space-y-md animate-scale-up text-left max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-xs">
          <h3 className="text-body-strong font-bold text-ink">Establish Operations Event</h3>
          <button onClick={onClose} className="p-xxs hover:bg-ink-muted8 rounded-md transition">
            <X className="w-4 h-4 text-ink-muted48 hover:text-ink" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md text-[13px]">
          
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Event Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Annual Tech Symposium"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Event Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="WORKSHOP">Workshop / Session</option>
                <option value="WEBINAR">Webinar / Virtual</option>
                <option value="COMPETITION">Hackathon / Competition</option>
                <option value="SOCIAL">Social / Community Outreach</option>
                <option value="GENERAL">General Assembly / Board Meeting</option>
              </select>
            </div>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Event Description</label>
            <textarea
              placeholder="Outline the objectives and scope of the event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] text-ink focus:border-primary focus:outline-none min-h-[50px]"
            />
          </div>

          {/* Schedule & Logistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Event Date *</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[6px] text-ink focus:border-primary focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Venue / Platform</label>
              <input
                type="text"
                placeholder="e.g. Seminar Hall 3 / Zoom"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Lead Department</label>
              <select
                value={leadTeamId}
                onChange={(e) => setLeadTeamId(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="">Unassigned</option>
                {teams.map(t => (
                  <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Finance & Template */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Budget Allocation (INR)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={budgetAllocation}
                onChange={(e) => setBudgetAllocation(Number(e.target.value))}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Operational Event Template</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="">No Template (Create Empty Event)</option>
                {templates.map(t => (
                  <option key={t.templateId} value={t.templateId}>{t.templateName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Additional Remarks</label>
            <input
              type="text"
              placeholder="e.g. Collaboration with external IEEE chapter"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {/* Template Tasks Preview Area */}
          {templateId && (
            <div className="bg-canvas-parchment/40 border border-hairline rounded-md p-md space-y-sm">
              <div className="flex items-center justify-between border-b border-hairline pb-xxs">
                <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-xs">
                  <ClipboardList className="w-4 h-4" />
                  Generated Tasks Preview
                </h4>
                <span className="text-[10px] text-ink-muted48">Instantiated on confirm</span>
              </div>

              {previewLoading && (
                <div className="py-md text-center">
                  <Loading message="Simulating task generation offsets..." />
                </div>
              )}

              {previewError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/25 rounded-md p-sm text-xs text-red-500 flex items-start gap-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{previewError}</p>
                </div>
              )}

              {!previewLoading && !previewError && previewTasks.length === 0 && (
                <div className="py-md text-center text-ink-muted32 text-caption-spec">
                  Please configure an Event Date to preview task deadlines.
                </div>
              )}

              {!previewLoading && !previewError && previewTasks.length > 0 && (
                <div className="overflow-x-auto max-h-[180px] scrollbar-thin">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-hairline text-ink-muted48 font-semibold uppercase tracking-wider">
                        <th className="pb-xxs font-semibold">Title</th>
                        <th className="pb-xxs font-semibold">Team</th>
                        <th className="pb-xxs font-semibold">Priority</th>
                        <th className="pb-xxs font-semibold text-right">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {previewTasks.map((task, idx) => {
                        const teamName = teams.find(t => t.teamId === task.teamId)?.teamName || 'Unassigned';
                        return (
                          <tr key={idx} className="hover:bg-canvas">
                            <td className="py-[6px] font-medium text-ink truncate max-w-[180px]" title={task.taskTitle}>
                              {task.taskTitle}
                            </td>
                            <td className="py-[6px] text-ink-muted48">{teamName}</td>
                            <td className="py-[6px]">
                              <span className={`px-xxs py-[1px] text-[9px] font-semibold border rounded-sm font-mono uppercase ${
                                task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'text-red-600 bg-red-50/50 border-red-200' : 'text-slate-600 bg-slate-100 border-slate-200'
                              }`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-[6px] text-right font-mono text-ink-muted80">
                              {new Date(task.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
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

          {/* Action buttons */}
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="apple-btn-secondary py-[8px] px-md select-none active:scale-[0.98] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!!templateId && previewTasks.length === 0)}
              className="apple-btn-primary py-[8px] px-lg select-none active:scale-[0.98] transition flex items-center justify-center"
            >
              {isSubmitting ? 'Establishing Event...' : 'Confirm & Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

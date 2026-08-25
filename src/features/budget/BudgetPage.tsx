import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { callApi } from '../../services/api';
import { Loading, ErrorState, EmptyState } from '../../components/ui/StateIndicator';
import { Plus, Edit3, ExternalLink } from 'lucide-react';

interface BudgetRecord {
  budgetId: string;
  eventId: string;
  category: string;
  description: string;
  estimatedBudget: number;
  actualExpense: number;
  amountPaid: number;
  pendingAmount: number;
  vendor: string;
  sponsor: string;
  invoiceUrl: string;
  approvalStatus: string;
  approvedBy: string;
}

interface EventItem {
  eventId: string;
  eventName: string;
}

export const BudgetPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || 'MEMBER';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetRecord | null>(null);

  // Queries
  const { data: budgets = [], isLoading, error, refetch } = useQuery<BudgetRecord[]>({
    queryKey: ['budgets'],
    queryFn: () => callApi('budget.list'),
  });

  const { data: events = [] } = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: () => callApi('events.list'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => callApi('budget.create', payload),
    onSuccess: () => {
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ budgetId, payload }: { budgetId: string; payload: any }) => 
      callApi('budget.update', { budgetId, ...payload }),
    onSuccess: () => {
      setSelectedBudget(null);
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Error')
  });

  const canEdit = role === 'PRESIDENT' || role === 'VP';

  // Aggregate metrics
  const totalEst = budgets.reduce((acc, b) => acc + (Number(b.estimatedBudget) || 0), 0);
  const totalAct = budgets.reduce((acc, b) => acc + (Number(b.actualExpense) || 0), 0);
  const totalPaid = budgets.reduce((acc, b) => acc + (Number(b.amountPaid) || 0), 0);
  const totalPending = budgets.reduce((acc, b) => acc + (Number(b.pendingAmount) || 0), 0);

  if (isLoading) return <Loading message="Syncing ledger financials..." />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Error'} onRetry={refetch} />;

  return (
    <div className="space-y-lg text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-xxs">
          <span className="text-primary font-semibold text-caption-strong uppercase">Treasury</span>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Financial Budgets</h1>
          <p className="text-caption-spec text-ink-muted48">Index event cost estimations, vendor invoicing, and outstanding balances.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="apple-btn-primary flex items-center gap-xs py-[10px] px-lg"
          >
            <Plus className="w-4 h-4" /> Item
          </button>
        )}
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface space-y-xxs">
          <span className="text-[10px] font-bold text-ink-muted48 uppercase">Total Estimated</span>
          <h3 className="text-body-strong font-bold text-ink">INR {totalEst.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface space-y-xxs">
          <span className="text-[10px] font-bold text-ink-muted48 uppercase">Actual Expenses</span>
          <h3 className="text-body-strong font-bold text-ink">INR {totalAct.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface space-y-xxs">
          <span className="text-[10px] font-bold text-ink-muted48 uppercase">Total Paid</span>
          <h3 className="text-body-strong font-bold text-green-600">INR {totalPaid.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-md shadow-product-surface space-y-xxs">
          <span className="text-[10px] font-bold text-ink-muted48 uppercase">Net Outstanding</span>
          <h3 className="text-body-strong font-bold text-red-600">INR {totalPending.toLocaleString('en-IN')}</h3>
        </div>
      </div>

      {budgets.length === 0 ? (
        <EmptyState title="No financial logs cataloged" description="Add estimated costs for your operational events." />
      ) : (
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas-parchment/40 text-ink-muted48 font-semibold uppercase tracking-wider select-none">
                  <th className="py-md px-lg font-semibold">Category</th>
                  <th className="py-md px-lg font-semibold">Event Link</th>
                  <th className="py-md px-lg font-semibold text-right">Estimated</th>
                  <th className="py-md px-lg font-semibold text-right">Actual Expense</th>
                  <th className="py-md px-lg font-semibold text-right">Amount Paid</th>
                  <th className="py-md px-lg font-semibold text-right">Pending Amount</th>
                  <th className="py-md px-lg font-semibold">Invoice</th>
                  <th className="py-md px-lg font-semibold">Approval</th>
                  {canEdit && <th className="py-md px-lg font-semibold text-right">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {budgets.map(b => {
                  const eventName = events.find(e => e.eventId === b.eventId)?.eventName || 'General Overhead';
                  return (
                    <tr key={b.budgetId} className="hover:bg-canvas-parchment/10 transition-colors">
                      <td className="py-md px-lg font-bold text-ink">{b.category}</td>
                      <td className="py-md px-lg text-ink-muted80 truncate max-w-[150px]" title={eventName}>{eventName}</td>
                      <td className="py-md px-lg text-right font-mono text-ink-muted80">₹{(Number(b.estimatedBudget) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-md px-lg text-right font-mono text-ink-muted80">₹{(Number(b.actualExpense) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-md px-lg text-right font-mono text-green-600">₹{(Number(b.amountPaid) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-md px-lg text-right font-mono text-red-600">₹{(Number(b.pendingAmount) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-md px-lg">
                        {b.invoiceUrl ? (
                          <a href={b.invoiceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-xxs text-primary hover:underline">
                            Bill <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : <span className="text-ink-muted32">-</span>}
                      </td>
                      <td className="py-md px-lg">
                        <span className={`px-xs py-[2px] text-[10px] font-semibold rounded-pill ${
                          b.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.approvalStatus}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-md px-lg text-right">
                          <button 
                            onClick={() => setSelectedBudget(b)}
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
        <CreateBudgetModal 
          events={events}
          onSubmit={(data) => createMutation.mutate(data)} 
          onClose={() => setIsCreateOpen(false)} 
        />
      )}

      {/* Edit Modal */}
      {selectedBudget && (
        <EditBudgetModal 
          budget={selectedBudget}
          events={events}
          onSubmit={(payload) => updateMutation.mutate({ budgetId: selectedBudget.budgetId, payload })} 
          onClose={() => setSelectedBudget(null)} 
        />
      )}
    </div>
  );
};

/* --- CREATE COMPONENT --- */
const CreateBudgetModal: React.FC<{ events: EventItem[]; onSubmit: (data: any) => void; onClose: () => void }> = ({ events, onSubmit, onClose }) => {
  const [category, setCategory] = useState('EQUIPMENT');
  const [eventId, setEventId] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState(0);
  const [vendor, setVendor] = useState('');
  const [sponsor, setSponsor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ category, eventId, description, estimatedBudget, vendor, sponsor });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Add Budget Item</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="EQUIPMENT">Sound & Equipment</option>
                <option value="CATERING">Catering / Refreshments</option>
                <option value="MARKETING">Branding & Merch</option>
                <option value="GUESTS">Guest Hospitality</option>
                <option value="OVERHEAD">Miscellaneous Overhead</option>
              </select>
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Event Link</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none">
                <option value="">None / General</option>
                {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.eventName}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Estimated Budget (INR) *</label>
            <input type="number" min="0" required value={estimatedBudget} onChange={e => setEstimatedBudget(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Description / Purpose</label>
            <input type="text" placeholder="e.g. Stage decorators payment" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Vendor</label>
              <input type="text" placeholder="e.g. SoundCraft Ltd" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Sponsor Partner</label>
              <input type="text" placeholder="e.g. IEEE Sponsorship" value={sponsor} onChange={e => setSponsor(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Create Item</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --- EDIT COMPONENT --- */
const EditBudgetModal: React.FC<{ budget: BudgetRecord; events: EventItem[]; onSubmit: (payload: any) => void; onClose: () => void }> = ({ budget, onSubmit, onClose }) => {
  const [actualExpense, setActualExpense] = useState(budget.actualExpense);
  const [amountPaid, setAmountPaid] = useState(budget.amountPaid);
  const [invoiceUrl, setInvoiceUrl] = useState(budget.invoiceUrl || '');
  const [approvalStatus, setApprovalStatus] = useState(budget.approvalStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ actualExpense: Number(actualExpense), amountPaid: Number(amountPaid), invoiceUrl, approvalStatus });
  };

  return (
    <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-md text-[13px] text-ink select-none font-text">
      <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface max-w-[440px] w-full p-lg space-y-md animate-scale-up text-left">
        <h3 className="text-body-strong font-bold border-b border-hairline pb-xs">Update financials item</h3>
        <form onSubmit={handleSubmit} className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Actual Expense (INR)</label>
              <input type="number" min="0" value={actualExpense} onChange={e => setActualExpense(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
            <div className="space-y-xxs">
              <label className="font-semibold text-caption-strong">Amount Paid (INR)</label>
              <input type="number" min="0" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-mono" />
            </div>
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Bill / Invoice URL (Drive Link)</label>
            <input type="url" placeholder="https://drive.google.com/..." value={invoiceUrl} onChange={e => setInvoiceUrl(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none" />
          </div>
          <div className="space-y-xxs">
            <label className="font-semibold text-caption-strong">Approval Status</label>
            <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} className="w-full bg-canvas border border-hairline rounded-md px-sm py-[8px] focus:outline-none font-semibold">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="flex justify-end gap-sm pt-xs border-t border-hairline">
            <button type="button" onClick={onClose} className="apple-btn-secondary py-[8px] px-md">Cancel</button>
            <button type="submit" className="apple-btn-primary py-[8px] px-lg">Update financials</button>
          </div>
        </form>
      </div>
    </div>
  );
};

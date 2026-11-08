import { useState, useEffect } from 'react';
import {
  X,
  Printer,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  RotateCcw,
  Trash2,
  Building2,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import RecordPaymentModal from '@/components/sales/RecordPaymentModal';
import BillPrintModal from './BillPrintModal';

interface BillDetailModalProps {
  billId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function BillDetailModal({
  billId,
  onClose,
  onRefresh,
}: BillDetailModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchBill = async () => {
    if (!businessId || !billId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/purchase-bills/${billId}`);
      if (res.success && res.data) {
        setBill(res.data);
      } else {
        setError(res.error || res.message || 'Failed to load purchase bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bill');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [businessId, billId]);

  const handleCancelBill = async () => {
    if (!businessId || !billId) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/businesses/${businessId}/purchase-bills/${billId}/cancel`, {});
      if (res.success) {
        setShowCancelConfirm(false);
        await fetchBill();
        onRefresh();
      } else {
        alert(res.error || res.message || 'Failed to cancel bill');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while cancelling the bill');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this purchase bill record?')) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/purchase-bills/${billId}`);
      if (res.success) {
        onRefresh();
        onClose();
      } else {
        alert(res.error || res.message || 'Failed to delete bill');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete bill');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600">Loading purchase bill...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <h3 className="font-semibold text-slate-800 text-sm">Error Loading Bill</h3>
          </div>
          <p className="text-xs text-slate-600">{error || 'Bill not found'}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dueBalance = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} /> PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} /> PARTIAL
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban size={13} /> CANCELLED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText size={13} /> DRAFT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {status}
          </span>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden border border-slate-200">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-slate-800 text-lg font-mono">
                {bill.billNumber}
              </span>
              {getStatusBadge(bill.status)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-xs"
              >
                <Printer size={14} />
                Print Voucher / PDF
              </button>

              {bill.status !== 'PAID' && bill.status !== 'CANCELLED' && bill.status !== 'DRAFT' && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                >
                  <IndianRupee size={14} />
                  Record Payment Made
                </button>
              )}

              {bill.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  title="Cancel bill and reverse inward stock"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <RotateCcw size={14} />
                  Cancel Bill
                </button>
              )}

              <button
                onClick={handleDeleteBill}
                title="Delete bill"
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Cancellation Warning Banner if CANCELLED */}
          {bill.status === 'CANCELLED' && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs px-6">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                This purchase bill is cancelled. Inward inventory and double-entry accounting records have been safely reversed.
              </span>
            </div>
          )}

          {/* Bill Body */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[calc(85vh-100px)] overflow-y-auto">
            {/* Top Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
              <div>
                <span className="inline-block text-[10px] uppercase tracking-wider font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  PURCHASE BILL (INWARD VOUCHER)
                </span>
                <p className="text-2xl font-black text-slate-900 mt-2 font-mono">{bill.billNumber}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span>
                    Bill Date: <strong className="text-slate-800">{formatDate(bill.billDate)}</strong>
                  </span>
                  {bill.dueDate && (
                    <span>
                      Payment Due: <strong className="text-slate-800">{formatDate(bill.dueDate)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[220px]">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Supplier / Vendor Details
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {bill.supplier?.name || 'Cash Supplier'}
                </h3>
                {bill.supplier?.phone && (
                  <p className="text-xs text-slate-600 mt-0.5">Ph: {bill.supplier.phone}</p>
                )}
                {bill.supplier?.email && (
                  <p className="text-xs text-slate-600 mt-0.5">Email: {bill.supplier.email}</p>
                )}
                {bill.supplier?.gstin && (
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-1">
                    GSTIN: {bill.supplier.gstin}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Purchased Inward Items ({bill.items?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Item / Description</th>
                      <th className="py-2.5 px-3 text-right">Inward Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">GST Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {bill.items?.map((item: any, idx: number) => {
                      const itemTaxable = item.quantity * item.unitPrice;
                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">{item.description}</span>
                            {item.item?.sku && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                SKU: {item.item.sku}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                            {item.quantity} {item.item?.unit?.shortName || ''}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCurrency(itemTaxable)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                            {item.taxRate}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Summary & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {bill.notes && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Purchase Notes / Remarks
                    </span>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">{bill.notes}</p>
                  </div>
                )}

                {/* Payments made history */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Supplier Payments ({bill.payments?.length || 0})
                    </span>
                    {bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        + Add Payment
                      </button>
                    )}
                  </div>

                  {bill.payments && bill.payments.length > 0 ? (
                    <div className="space-y-1.5 text-xs">
                      {bill.payments.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-slate-600"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{p.method}</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {formatDate(p.paymentDate)} {p.reference ? `• ${p.reference}` : ''}
                            </span>
                          </div>
                          <span className="font-semibold text-emerald-600 font-mono">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No payments recorded yet</p>
                  )}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Subtotal</span>
                  <span className="font-mono font-medium">{formatCurrency(bill.subtotal)}</span>
                </div>

                {bill.igst > 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Input IGST</span>
                    <span className="font-mono">{formatCurrency(bill.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Input CGST</span>
                      <span className="font-mono">{formatCurrency(bill.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Input SGST</span>
                      <span className="font-mono">{formatCurrency(bill.sgst)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Total Tax</span>
                  <span className="font-mono">{formatCurrency(bill.taxAmount)}</span>
                </div>

                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2.5">
                  <span>Grand Total</span>
                  <span className="text-indigo-600 font-mono text-base">
                    {formatCurrency(bill.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-emerald-700 font-semibold pt-1">
                  <span>Total Paid</span>
                  <span className="font-mono">{formatCurrency(bill.paidAmount)}</span>
                </div>

                <div className="flex justify-between text-xs font-bold border-t border-slate-200 pt-2">
                  <span className={dueBalance > 0 ? 'text-rose-700' : 'text-slate-700'}>
                    Pending Payable
                  </span>
                  <span
                    className={
                      dueBalance > 0
                        ? 'font-mono text-rose-700 font-extrabold'
                        : 'font-mono text-emerald-700'
                    }
                  >
                    {formatCurrency(dueBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Cancel Purchase Bill?</h3>
                <p className="text-xs text-slate-500">Bill: {bill.billNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this bill will:
              <br />• <strong>Reverse inventory inward:</strong> Deduct the item quantities from current stock.
              <br />• <strong>Create reversing journal entries:</strong> Reverse Accounts Payable and ITC records.
              <br />• <strong>Mark status as CANCELLED.</strong>
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                No, Keep Bill
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelBill}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel & Reverse Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Made Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          type="MADE"
          invoiceOrBillId={bill.id}
          partyName={bill.supplier?.name || 'Supplier'}
          totalAmount={bill.totalAmount}
          paidAmount={bill.paidAmount}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={async () => {
            setIsPaymentModalOpen(false);
            await fetchBill();
            onRefresh();
          }}
        />
      )}

      {/* Bill Multi-format Print Modal */}
      {isPrintModalOpen && (
        <BillPrintModal
          billId={bill.id}
          onClose={() => setIsPrintModalOpen(false)}
          onRefresh={fetchBill}
        />
      )}
    </>
  );
}

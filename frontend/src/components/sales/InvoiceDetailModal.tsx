import { useState, useEffect } from 'react';
import { X, Printer, IndianRupee, AlertCircle, CheckCircle2, Clock, Ban } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import RecordPaymentModal from './RecordPaymentModal';

interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function InvoiceDetailModal({
  invoiceId,
  onClose,
  onRefresh,
}: InvoiceDetailModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoice = async () => {
    if (!businessId || !invoiceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/sales-invoices/${invoiceId}`);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        setError(res.error || res.message || 'Failed to load invoice details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [businessId, invoiceId]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This will mark it as cancelled.')) {
      return;
    }
    setCancelling(true);
    try {
      const res = await api.post(`/businesses/${businessId}/sales-invoices/${invoiceId}/cancel`);
      if (res.success) {
        await fetchInvoice();
        onRefresh();
      } else {
        alert(res.error || res.message || 'Failed to cancel invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <h3 className="font-semibold text-slate-800">Error Loading Invoice</h3>
          </div>
          <p className="text-sm text-slate-600">{error || 'Invoice not found'}</p>
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

  const dueBalance = Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));

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
            <Clock size={13} /> PARTIALLY PAID
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban size={13} /> CANCELLED
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
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 print:p-0 print:bg-white print:fixed">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden print:shadow-none print:m-0 print:max-w-none">
          {/* Header Controls (Hidden on Print) */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 print:hidden">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800 text-base">{invoice.invoiceNumber}</span>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Printer size={14} />
                Print / PDF
              </button>
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  <IndianRupee size={14} />
                  Record Payment
                </button>
              )}
              {invoice.status !== 'CANCELLED' && invoice.paidAmount === 0 && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Ban size={14} />
                  {cancelling ? 'Cancelling...' : 'Cancel Invoice'}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Invoice Document Body */}
          <div className="p-8 print:p-4 space-y-6">
            {/* Top Row: Business and Title */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentBusiness?.name || 'Lekvanta Business'}
                </h1>
                {currentBusiness?.gstin && (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    GSTIN: <span className="font-mono text-slate-700">{currentBusiness.gstin}</span>
                  </p>
                )}
                {currentBusiness?.address && (
                  <p className="text-xs text-slate-500 mt-0.5">{currentBusiness.address}</p>
                )}
                {currentBusiness?.state && (
                  <p className="text-xs text-slate-500">State: {currentBusiness.state}</p>
                )}
              </div>
              <div className="text-right space-y-1">
                <span className="inline-block text-xs uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                  TAX INVOICE
                </span>
                <p className="text-lg font-bold text-slate-900 mt-1">{invoice.invoiceNumber}</p>
                <p className="text-xs text-slate-500">
                  Date: <span className="font-medium text-slate-700">{formatDate(invoice.invoiceDate)}</span>
                </p>
                {invoice.dueDate && (
                  <p className="text-xs text-slate-500">
                    Due Date: <span className="font-medium text-slate-700">{formatDate(invoice.dueDate)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Bill To Info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Bill To
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {invoice.customer?.name || 'Cash Customer'}
                </h3>
                {invoice.customer?.phone && (
                  <p className="text-xs text-slate-600 mt-0.5">Phone: {invoice.customer.phone}</p>
                )}
                {invoice.customer?.email && (
                  <p className="text-xs text-slate-600">Email: {invoice.customer.email}</p>
                )}
                {invoice.customer?.billingAddress && (
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">{invoice.customer.billingAddress}</p>
                )}
                {invoice.customer?.gstin && (
                  <p className="text-xs font-mono text-slate-700 mt-1">
                    GSTIN: {invoice.customer.gstin}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Payment Status
                </span>
                <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                <div className="mt-2 text-xs">
                  <span className="text-slate-500">Total: </span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Paid: </span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                {dueBalance > 0 && (
                  <div className="text-xs font-semibold text-rose-600 mt-0.5">
                    Due: {formatCurrency(dueBalance)}
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Disc %</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoice.items?.map((item: any, idx: number) => {
                    const gross = (item.quantity || 0) * (item.unitPrice || 0);
                    const disc = (gross * (item.discountPct || 0)) / 100;
                    const taxable = gross - disc;
                    const gstAmount = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{item.description}</p>
                          {item.item?.sku && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.item.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {item.hsnCode || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {item.discountPct ? `${item.discountPct}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatCurrency(taxable)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-mono">{formatCurrency(gstAmount)}</span>
                          <span className="text-[10px] text-slate-400 block">({item.taxRate}%)</span>
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

            {/* Bottom Section: Notes & Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                {invoice.notes && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Notes
                    </span>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Terms & Conditions
                    </span>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}

                {/* Recorded Payments list */}
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Payments Received ({invoice.payments.length})
                    </span>
                    <div className="mt-2 space-y-1.5 text-xs">
                      {invoice.payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center text-slate-600">
                          <span>
                            {formatDate(p.paymentDate)} • <span className="font-medium text-slate-800">{p.method}</span>
                            {p.reference && ` (${p.reference})`}
                          </span>
                          <span className="font-semibold text-emerald-600 font-mono">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Taxable Value)</span>
                  <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-mono">- {formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.cgst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST</span>
                    <span className="font-mono">{formatCurrency(invoice.cgst)}</span>
                  </div>
                )}
                {invoice.sgst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST</span>
                    <span className="font-mono">{formatCurrency(invoice.sgst)}</span>
                  </div>
                )}
                {invoice.igst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST</span>
                    <span className="font-mono">{formatCurrency(invoice.igst)}</span>
                  </div>
                )}
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Round Off</span>
                    <span className="font-mono">{formatCurrency(invoice.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Grand Total</span>
                  <span className="text-indigo-600 font-mono">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 pt-1">
                  <span>Amount Paid</span>
                  <span className="font-mono">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-600 border-t border-slate-200 pt-1">
                  <span>Balance Due</span>
                  <span className="font-mono">{formatCurrency(dueBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPaymentModalOpen && (
        <RecordPaymentModal
          type="RECEIVED"
          invoiceOrBillId={invoice.id}
          partyName={invoice.customer?.name || 'Customer'}
          totalAmount={invoice.totalAmount}
          paidAmount={invoice.paidAmount}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={async () => {
            setIsPaymentModalOpen(false);
            await fetchInvoice();
            onRefresh();
          }}
        />
      )}
    </>
  );
}


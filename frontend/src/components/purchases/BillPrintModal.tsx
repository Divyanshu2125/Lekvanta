import { useState, useEffect } from 'react';
import {
  X,
  Printer,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  Receipt,
  RotateCw,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

interface BillPrintModalProps {
  billId: string;
  onClose: () => void;
  onRefresh?: () => void;
}

type PrintFormat = 'A4' | 'A5' | '80MM' | '58MM';

export default function BillPrintModal({
  billId,
  onClose,
  onRefresh,
}: BillPrintModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [format, setFormat] = useState<PrintFormat>('A4');
  const [printMsg, setPrintMsg] = useState('');
  const [printErr, setPrintErr] = useState('');

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

  const handlePrint = () => {
    window.print();
  };

  const handleElectronPDF = async () => {
    if (!window.electronAPI || !bill) return;
    setPrintErr('');
    setPrintMsg('');
    const res = await window.electronAPI.savePDF({ title: bill.billNumber || 'purchase-bill', landscape: false });
    if (res.canceled) return;
    if (res.success) setPrintMsg(`PDF saved: ${res.path}`);
    else setPrintErr(res.error || 'PDF generation failed.');
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
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={20} />
            <h3 className="font-semibold text-slate-800 text-sm">Purchase Bill Error</h3>
          </div>
          <p className="text-xs text-slate-600">{error || 'Bill record not found'}</p>
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
  const isInterState = bill.igst > 0;
  const biz = bill.business || currentBusiness;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:overflow-visible">
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl w-full my-6 overflow-hidden print:shadow-none print:m-0 print:border-none',
          format === 'A4' && 'max-w-4xl',
          format === 'A5' && 'max-w-2xl',
          format === '80MM' && 'max-w-md',
          format === '58MM' && 'max-w-sm'
        )}
      >
        {/* Top bar controls (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm font-mono">
              {bill.billNumber}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              PURCHASE BILL
            </span>
            {bill.status === 'PAID' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={11} /> PAID
              </span>
            )}
            {bill.status === 'PARTIAL' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Clock size={11} /> PARTIAL
              </span>
            )}
            {bill.status === 'CANCELLED' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                <Ban size={11} /> CANCELLED
              </span>
            )}
          </div>

          {/* Format selection tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setFormat('A4')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                format === 'A4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FileText size={13} />
              A4 Regular
            </button>
            <button
              onClick={() => setFormat('A5')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                format === 'A5'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FileText size={13} />
              A5 Medium
            </button>
            <button
              onClick={() => setFormat('80MM')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                format === '80MM'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Receipt size={13} />
              80mm Slip
            </button>
            <button
              onClick={() => setFormat('58MM')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                format === '58MM'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Receipt size={13} />
              58mm Mini
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isElectron ? (
              <>
                <button
                  onClick={handleElectronPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Save size={14} />
                  Save PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Printer size={14} />
                  Print
                </button>
              </>
            ) : (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Printer size={14} />
                Print / Save PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Bill print status */}
        {isElectron && printMsg && (
          <div className="mx-4 mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-lg print:hidden">
            <CheckCircle2 size={13} className="shrink-0" /> {printMsg}
          </div>
        )}
        {isElectron && printErr && (
          <div className="mx-4 mt-2 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg print:hidden">
            <AlertCircle size={13} className="shrink-0" /> {printErr}
          </div>
        )}

        {/* PRINTABLE CONTENT */}
        <div id="bill-print-area" className="p-6 sm:p-8 bg-white text-slate-800">
          {/* Format 1 & 2: A4 and A5 Standard Inward Tax Invoice */}
          {(format === 'A4' || format === 'A5') && (
            <div className={cn('space-y-6', format === 'A5' && 'text-[11px] leading-tight space-y-4')}>
              {/* Top Business / Supplier Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {biz?.name || 'LEKVANTA STORE'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {biz?.address}
                    {biz?.city ? `, ${biz.city}` : ''}
                    {biz?.state ? `, ${biz.state}` : ''}
                    {biz?.pincode ? ` - ${biz.pincode}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1">
                    {biz?.phone && <span>Ph: {biz.phone}</span>}
                    {biz?.email && <span>Email: {biz.email}</span>}
                  </div>
                  {biz?.gstin && (
                    <p className="text-xs font-bold text-slate-800 mt-1 font-mono">
                      GSTIN: {biz.gstin}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-black text-xs px-3 py-1 rounded tracking-widest uppercase">
                    PURCHASE INWARD VOUCHER
                  </div>
                  <div className="mt-2 text-right">
                    <p className="text-base font-extrabold font-mono text-slate-900">
                      {bill.billNumber}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bill Date: <span className="font-semibold text-slate-800">{formatDate(bill.billDate)}</span>
                    </p>
                    {bill.dueDate && (
                      <p className="text-xs text-slate-500">
                        Payment Due: <span className="font-semibold text-slate-800">{formatDate(bill.dueDate)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Supplier Information Panel */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    SUPPLIED BY (VENDOR):
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {bill.supplier?.name || 'Cash Supplier / Vendor'}
                  </p>
                  {bill.supplier?.address && (
                    <p className="text-slate-600 mt-0.5 whitespace-pre-line">
                      {bill.supplier.address}
                    </p>
                  )}
                  {bill.supplier?.phone && (
                    <p className="text-slate-600 mt-0.5">Phone: {bill.supplier.phone}</p>
                  )}
                  {bill.supplier?.gstin && (
                    <p className="font-mono font-semibold text-slate-800 mt-1">
                      GSTIN: {bill.supplier.gstin}
                    </p>
                  )}
                </div>

                <div className="border-l border-slate-200 pl-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    TAX / REGULATORY DETAILS:
                  </span>
                  <p className="text-slate-600">
                    Place of Supply:{' '}
                    <span className="font-semibold text-slate-800">
                      {isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    Input Tax Credit (ITC):{' '}
                    <span className="font-semibold text-emerald-700">Eligible (Normal Rate)</span>
                  </p>
                  <p className="text-slate-600">
                    Settlement Status:{' '}
                    <span className="font-bold text-slate-900">{bill.status}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Item / Description</th>
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {bill.items?.map((item: any, idx: number) => {
                      const itemTaxable = item.quantity * item.unitPrice;
                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {item.description}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500">
                            {item.item?.hsnCode || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            {item.quantity} {item.item?.unit?.shortName || ''}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatCurrency(itemTaxable)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono">
                            {item.taxRate}%
                          </td>
                          <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary & Notes */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  {bill.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Purchase Remarks / Notes:
                      </p>
                      <p className="text-slate-600 mt-1 whitespace-pre-line">{bill.notes}</p>
                    </div>
                  )}

                  {bill.payments && bill.payments.length > 0 && (
                    <div className="p-3 rounded-xl border border-slate-200 text-xs">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                        Payment Disbursement Record:
                      </p>
                      {bill.payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between py-0.5 text-slate-600">
                          <span>
                            {formatDate(p.paymentDate)} • {p.method} {p.reference ? `(${p.reference})` : ''}
                          </span>
                          <span className="font-mono font-semibold text-emerald-600">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value (Subtotal)</span>
                    <span className="font-mono font-medium">{formatCurrency(bill.subtotal)}</span>
                  </div>

                  {!isInterState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Central GST (CGST)</span>
                        <span className="font-mono">{formatCurrency(bill.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>State GST (SGST)</span>
                        <span className="font-mono">{formatCurrency(bill.sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>Integrated GST (IGST)</span>
                      <span className="font-mono">{formatCurrency(bill.igst)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2">
                    <span>Grand Inward Total</span>
                    <span className="font-mono text-indigo-700">{formatCurrency(bill.totalAmount)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                    <span>Amount Paid</span>
                    <span className="font-mono">{formatCurrency(bill.paidAmount)}</span>
                  </div>

                  <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1.5">
                    <span>Outstanding Payable</span>
                    <span className="font-mono">{formatCurrency(dueBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-10 text-center text-xs text-slate-500">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 mx-auto w-44" />
                  <p className="mt-1 font-semibold text-slate-700">Vendor / Supplier Representative</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 mx-auto w-44" />
                  <p className="mt-1 font-semibold text-slate-700">Received & Verified By</p>
                </div>
              </div>
            </div>
          )}

          {/* Format 3 & 4: 80mm and 58mm Thermal Receipt Format */}
          {(format === '80MM' || format === '58MM') && (
            <div
              className={cn(
                'mx-auto font-mono text-slate-900 text-xs leading-tight',
                format === '58MM' ? 'max-w-[220px] text-[10px]' : 'max-w-[300px]'
              )}
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <p className="font-bold text-sm tracking-wide uppercase">{biz?.name || 'LEKVANTA'}</p>
                <p className="text-[10px] text-slate-600">{biz?.address}</p>
                {biz?.phone && <p className="text-[10px]">Ph: {biz.phone}</p>}
                {biz?.gstin && <p className="text-[10px] font-bold">GST: {biz.gstin}</p>}
                <p className="font-bold mt-1 text-[11px] underline">PURCHASE RECEIPT</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Bill#: {bill.billNumber}</span>
                  <span>{formatDate(bill.billDate)}</span>
                </div>
                <p>Vendor: {bill.supplier?.name || 'Cash'}</p>
                {bill.supplier?.gstin && <p>GST: {bill.supplier.gstin}</p>}
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold text-[10px] mb-1">
                  <span>ITEM</span>
                  <span>QTY x RATE</span>
                  <span>AMT</span>
                </div>
                {bill.items?.map((it: any, i: number) => (
                  <div key={i} className="py-0.5">
                    <p className="font-semibold truncate">{it.description}</p>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {it.quantity} x {formatCurrency(it.unitPrice)}
                      </span>
                      <span className="font-bold text-slate-900">{formatCurrency(it.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(bill.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({isInterState ? 'IGST' : 'GST'}):</span>
                  <span>{formatCurrency(bill.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(bill.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid:</span>
                  <span>{formatCurrency(bill.paidAmount)}</span>
                </div>
                {dueBalance > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Payable:</span>
                    <span>{formatCurrency(dueBalance)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500">
                <p>Inward Inventory Registered</p>
                <p className="font-semibold text-slate-700 mt-1">Thank you</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


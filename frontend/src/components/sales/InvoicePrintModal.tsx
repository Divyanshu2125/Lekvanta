import { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
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

interface InvoicePrintModalProps {
  invoiceId: string;
  onClose: () => void;
  onRefresh?: () => void;
}

type PrintFormat = 'A4' | 'A5' | '80MM' | '58MM';

export default function InvoicePrintModal({
  invoiceId,
  onClose,
  onRefresh,
}: InvoicePrintModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [format, setFormat] = useState<PrintFormat>('A4');
  const [printMsg, setPrintMsg] = useState('');
  const [printErr, setPrintErr] = useState('');

  const fetchInvoice = async () => {
    if (!businessId || !invoiceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/sales-invoices/${invoiceId}`);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        setError(res.error || res.message || 'Failed to load invoice');
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

  const handlePrint = () => {
    window.print();
  };

  const handleElectronPDF = async () => {
    if (!window.electronAPI || !invoice) return;
    setPrintErr('');
    setPrintMsg('');
    const res = await window.electronAPI.savePDF({ title: invoice.invoiceNumber, landscape: false });
    if (res.canceled) return;
    if (res.success) setPrintMsg(`PDF saved: ${res.path}`);
    else setPrintErr(res.error || 'PDF generation failed.');
  };

  const handleElectronThermal = async () => {
    if (!window.electronAPI || !invoice) return;
    setPrintErr('');
    setPrintMsg('');
    // Build minimal receipt HTML from current modal content
    const isThermal58 = format === '58MM';
    const paperWidth = isThermal58 ? '58mm' : '80mm';
    const html = document.querySelector('.thermal-receipt-content')?.innerHTML;
    if (!html) return;
    const fullHtml = `<html><head><style>body{margin:0;padding:4px;font-family:monospace;font-size:12px;width:${paperWidth}}</style></head><body>${html}</body></html>`;
    const settings = window.electronAPI ? await window.electronAPI.getAppSettings() : {};
    const printerName = settings?.thermalPrinter || '';
    const res = await window.electronAPI.printThermal({ html: fullHtml, printerName, paperWidth });
    if (res.success) setPrintMsg('Thermal receipt sent to printer!');
    else setPrintErr(res.error || 'Thermal print failed.');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600">Loading invoice document...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={20} />
            <h3 className="font-semibold text-slate-800 text-sm">Invoice Error</h3>
          </div>
          <p className="text-xs text-slate-600">{error || 'Invoice record not found'}</p>
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
  const isInterState = invoice.igst > 0;
  const biz = invoice.business || currentBusiness;

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
              {invoice.invoiceNumber}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {invoice.invoiceType?.replace('_', ' ')}
            </span>
          </div>

          {/* Format Picker */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            {[
              { id: 'A4', label: 'A4 Standard' },
              { id: 'A5', label: 'A5 Compact' },
              { id: '80MM', label: '80mm POS' },
              { id: '58MM', label: '58mm Thermal' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id as PrintFormat)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                  format === f.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isElectron ? (
              <>
                <button
                  onClick={handleElectronPDF}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Save size={14} />
                  Save PDF
                </button>
                {(format === '80MM' || format === '58MM') && (
                  <button
                    onClick={handleElectronThermal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Printer size={14} />
                    Thermal Print
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Printer size={14} />
                  Print
                </button>
              </>
            ) : (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Printer size={14} />
                Print / PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Electron print status messages */}
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

        {/* ─────────────────────────────────────────────────────────────
            FORMAT: 58mm Thermal Receipt
        ───────────────────────────────────────────────────────────── */}
        {format === '58MM' && (
          <div className="thermal-receipt-content p-4 mx-auto font-mono text-[11px] leading-tight text-black max-w-[280px]">
            <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
              <h2 className="text-sm font-bold uppercase">{biz?.name || 'LEKVANTA STORE'}</h2>
              {biz?.gstin && <p className="text-[10px]">GSTIN: {biz.gstin}</p>}
              {biz?.phone && <p className="text-[10px]">Ph: {biz.phone}</p>}
              {biz?.address && <p className="text-[9px]">{biz.address}</p>}
              <p className="font-bold text-[10px] mt-1 uppercase">
                {invoice.invoiceType === 'BILL_OF_SUPPLY' ? 'BILL OF SUPPLY' : 'TAX INVOICE'}
              </p>
            </div>

            <div className="text-[10px] border-b border-dashed border-black pb-1.5 mb-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span>Inv: {invoice.invoiceNumber}</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div>Cust: {invoice.customer?.name || 'Cash Customer'}</div>
              {invoice.customer?.phone && <div>Ph: {invoice.customer.phone}</div>}
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-black pb-1.5 mb-1.5">
              <div className="flex justify-between font-bold text-[10px] border-b border-black pb-0.5 mb-1">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              <div className="space-y-1">
                {invoice.items?.map((it: any, i: number) => (
                  <div key={i}>
                    <div className="font-bold truncate">{it.description}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {it.quantity} x ₹{it.unitPrice}
                      </span>
                      <span>₹{it.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-0.5 text-[10px] border-b border-dashed border-black pb-2 mb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{invoice.subtotal?.toFixed(2)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>₹{invoice.taxAmount?.toFixed(2)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{invoice.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span>₹{invoice.roundOff?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span>₹{invoice.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-0.5">
                <span>PAID:</span>
                <span>₹{invoice.paidAmount?.toFixed(2)}</span>
              </div>
              {dueBalance > 0 && (
                <div className="flex justify-between font-bold text-[11px]">
                  <span>BAL DUE:</span>
                  <span>₹{dueBalance.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-[9px] pt-1 space-y-0.5">
              <p>*** THANK YOU! VISIT AGAIN ***</p>
              <p>Powered by Lekvanta</p>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            FORMAT: 80mm POS Thermal Slip
        ───────────────────────────────────────────────────────────── */}
        {format === '80MM' && (
          <div className="thermal-receipt-content p-6 mx-auto font-mono text-xs leading-normal text-black max-w-[360px]">
            <div className="text-center space-y-1 border-b-2 border-black pb-3 mb-2">
              <h2 className="text-base font-black uppercase">{biz?.name || 'LEKVANTA RETAIL'}</h2>
              {biz?.gstin && <p className="text-[11px] font-bold">GSTIN: {biz.gstin}</p>}
              {biz?.address && <p className="text-[10px]">{biz.address}</p>}
              {biz?.phone && <p className="text-[10px]">Tel: {biz.phone}</p>}
              <div className="inline-block border border-black px-2 py-0.5 text-[10px] font-bold uppercase mt-1">
                {invoice.invoiceType?.replace('_', ' ') || 'TAX INVOICE'}
              </div>
            </div>

            <div className="text-[11px] border-b border-black pb-2 mb-2 grid grid-cols-2 gap-1">
              <div>
                <span className="text-slate-600">Inv No: </span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-600">Date: </span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-600">Customer: </span>
                <span className="font-bold">{invoice.customer?.name || 'Cash Customer'}</span>
              </div>
              {invoice.customer?.phone && (
                <div className="col-span-2">
                  <span className="text-slate-600">Phone: </span>
                  <span>{invoice.customer.phone}</span>
                </div>
              )}
              {invoice.customer?.gstin && (
                <div className="col-span-2">
                  <span className="text-slate-600">GSTIN: </span>
                  <span>{invoice.customer.gstin}</span>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="border-b-2 border-black pb-2 mb-2">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-black">
                  <tr>
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-slate-300">
                  {invoice.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1 pr-1 font-semibold">{it.description}</td>
                      <td className="py-1 text-center">{it.quantity}</td>
                      <td className="py-1 text-right">₹{it.unitPrice}</td>
                      <td className="py-1 text-right font-bold">₹{it.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="space-y-1 text-xs border-b border-black pb-2 mb-2">
              <div className="flex justify-between">
                <span>Subtotal (Taxable):</span>
                <span>₹{invoice.subtotal?.toFixed(2)}</span>
              </div>
              {invoice.cgst > 0 && (
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span>₹{invoice.cgst?.toFixed(2)}</span>
                </div>
              )}
              {invoice.sgst > 0 && (
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span>₹{invoice.sgst?.toFixed(2)}</span>
                </div>
              )}
              {invoice.igst > 0 && (
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span>₹{invoice.igst?.toFixed(2)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Discount:</span>
                  <span>-₹{invoice.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span>₹{invoice.roundOff?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm border-t border-black pt-1">
                <span>GRAND TOTAL:</span>
                <span>₹{invoice.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-0.5">
                <span>PAID AMOUNT:</span>
                <span>₹{invoice.paidAmount?.toFixed(2)}</span>
              </div>
              {dueBalance > 0 && (
                <div className="flex justify-between font-black text-xs">
                  <span>BALANCE DUE:</span>
                  <span>₹{dueBalance.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] pt-1 space-y-1">
              <p className="font-bold">Thank You For Your Business!</p>
              {invoice.terms && <p className="text-[9px] text-slate-600">{invoice.terms}</p>}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            FORMAT: A4 or A5 Professional GST Invoice
        ───────────────────────────────────────────────────────────── */}
        {(format === 'A4' || format === 'A5') && (
          <div
            className={cn(
              'p-8 print:p-4 text-slate-800 bg-white space-y-6',
              format === 'A5' && 'text-[11px] p-5 space-y-4'
            )}
          >
            {/* Header: Company & Tax Title */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div>
                <h1
                  className={cn(
                    'font-black text-slate-900 tracking-tight uppercase',
                    format === 'A4' ? 'text-2xl' : 'text-lg'
                  )}
                >
                  {biz?.name || 'Lekvanta Business'}
                </h1>
                {biz?.gstin && (
                  <p className="font-bold text-xs mt-1 text-slate-700">
                    GSTIN:{' '}
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      {biz.gstin}
                    </span>
                  </p>
                )}
                {biz?.address && <p className="text-xs text-slate-600 mt-0.5">{biz.address}</p>}
                {biz?.city && (
                  <p className="text-xs text-slate-600">
                    {biz.city}
                    {biz.state ? `, ${biz.state}` : ''}
                    {biz.pincode ? ` - ${biz.pincode}` : ''}
                  </p>
                )}
                {biz?.phone && <p className="text-xs text-slate-600">Phone: {biz.phone}</p>}
                {biz?.email && <p className="text-xs text-slate-600">Email: {biz.email}</p>}
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block uppercase font-black tracking-wider text-white bg-slate-900 px-3 py-1 rounded text-xs">
                  {invoice.invoiceType === 'BILL_OF_SUPPLY'
                    ? 'BILL OF SUPPLY'
                    : invoice.invoiceType === 'ESTIMATE'
                    ? 'ESTIMATE / QUOTE'
                    : 'TAX INVOICE'}
                </span>
                <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {invoice.invoiceNumber}
                </p>
                <p className="text-xs text-slate-600">
                  Invoice Date: <span className="font-bold text-slate-800">{formatDate(invoice.invoiceDate)}</span>
                </p>
                {invoice.dueDate && (
                  <p className="text-xs text-slate-600">
                    Due Date: <span className="font-bold text-slate-800">{formatDate(invoice.dueDate)}</span>
                  </p>
                )}
                <div className="text-[11px] font-semibold text-slate-600">
                  Place of Supply:{' '}
                  <span className="font-bold text-slate-800">
                    {invoice.customer?.billingAddress?.split(',').pop()?.trim() || biz?.state || 'Local'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To & Status Card */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed To
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {invoice.customer?.name || 'Cash Customer'}
                </h3>
                {invoice.customer?.gstin && (
                  <p className="text-xs font-mono text-slate-700 mt-0.5">
                    GSTIN: <strong>{invoice.customer.gstin}</strong>
                  </p>
                )}
                {invoice.customer?.billingAddress && (
                  <p className="text-xs text-slate-600 mt-0.5 max-w-sm">
                    {invoice.customer.billingAddress}
                  </p>
                )}
                {invoice.customer?.phone && (
                  <p className="text-xs text-slate-600 mt-0.5">Phone: {invoice.customer.phone}</p>
                )}
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Payment Status
                </span>
                <span
                  className={cn(
                    'inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase',
                    invoice.status === 'PAID' && 'bg-emerald-100 text-emerald-800',
                    invoice.status === 'PARTIAL' && 'bg-amber-100 text-amber-800',
                    invoice.status === 'SENT' && 'bg-blue-100 text-blue-800',
                    invoice.status === 'CANCELLED' && 'bg-rose-100 text-rose-800',
                    invoice.status === 'DRAFT' && 'bg-slate-200 text-slate-700'
                  )}
                >
                  {invoice.status}
                </span>
                <div className="text-xs pt-1">
                  <span className="text-slate-500">Total Invoice: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Paid: </span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>
                {dueBalance > 0 && (
                  <div className="text-xs font-bold text-rose-600">
                    Balance Due: {formatCurrency(dueBalance)}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Disc %</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    {invoice.invoiceType !== 'BILL_OF_SUPPLY' && (
                      <th className="py-2.5 px-3 text-right">GST</th>
                    )}
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {invoice.items?.map((it: any, i: number) => {
                    const gross = it.quantity * it.unitPrice;
                    const disc = (gross * (it.discountPct || 0)) / 100;
                    const taxable = gross - disc;
                    const gstTax = (it.cgst || 0) + (it.sgst || 0) + (it.igst || 0);

                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3">
                          <p className="font-bold text-slate-900">{it.description}</p>
                          {it.item?.sku && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {it.item.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {it.item?.hsnCode || '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          {it.quantity} {it.item?.unit?.shortName || ''}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatCurrency(it.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {it.discountPct ? `${it.discountPct}%` : '0%'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {formatCurrency(taxable)}
                        </td>
                        {invoice.invoiceType !== 'BILL_OF_SUPPLY' && (
                          <td className="py-2 px-3 text-right font-mono">
                            <span>{formatCurrency(gstTax)}</span>
                            <span className="text-[10px] text-slate-400 block">({it.taxRate}%)</span>
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Row: Terms + Calculation summary */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                {invoice.notes && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Notes</span>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Terms & Conditions
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}

                <div className="pt-4 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Bank Transfer Details:</p>
                  <p>Bank: HDFC Bank • A/c: 50200012345678 • IFSC: HDFC0001234</p>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Taxable Value):</span>
                  <span className="font-mono font-semibold">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Invoice Discount:</span>
                    <span className="font-mono">- {formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.cgst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono">{formatCurrency(invoice.cgst)}</span>
                  </div>
                )}
                {invoice.sgst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST):</span>
                    <span className="font-mono">{formatCurrency(invoice.sgst)}</span>
                  </div>
                )}
                {invoice.igst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono">{formatCurrency(invoice.igst)}</span>
                  </div>
                )}
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Round Off:</span>
                    <span className="font-mono">{formatCurrency(invoice.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 border-t-2 border-slate-300 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-indigo-600 font-mono text-base">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 pt-1 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-600 border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(dueBalance)}</span>
                </div>
              </div>
            </div>

            {/* Signature row */}
            <div className="flex justify-between items-end pt-8 border-t border-slate-200 text-xs">
              <div className="text-slate-400">
                <p>This is a computer generated invoice.</p>
                <p>Generated by Lekvanta Software</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">For {biz?.name || 'Business'}</p>
                <div className="h-12"></div>
                <p className="text-slate-500 border-t border-slate-300 pt-1">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


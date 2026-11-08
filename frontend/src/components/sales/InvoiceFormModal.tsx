import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  AlertCircle,
  IndianRupee,
  Barcode,
  Search,
  Check,
  Printer,
  FileText,
  UserPlus,
  Percent,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import CustomerModal, { CustomerData } from '@/components/parties/CustomerModal';

export interface InvoiceFormModalProps {
  initialInvoice?: any; // For duplicating or editing
  onClose: () => void;
  onSaved: (savedInvoice?: any, autoPrint?: boolean) => void;
}

interface LineItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  hsnCode: string;
  unit: string;
  stock: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
}

const GST_RATES = [0, 5, 12, 18, 28];

function calcLine(
  quantity: number,
  unitPrice: number,
  discountPct: number,
  taxRate: number,
  isInterState: boolean,
  isNonGst: boolean = false
) {
  const gross = quantity * unitPrice;
  const discount = (gross * (discountPct || 0)) / 100;
  const taxable = gross - discount;
  const effectiveTax = isNonGst ? 0 : taxRate;
  const totalTax = (taxable * effectiveTax) / 100;

  const cgst = isInterState ? 0 : totalTax / 2;
  const sgst = isInterState ? 0 : totalTax / 2;
  const igst = isInterState ? totalTax : 0;
  return { taxable, cgst, sgst, igst, totalTax, amount: taxable + totalTax };
}

function emptyLine(): LineItem {
  return {
    itemId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discountPct: 0,
    taxRate: 18,
    hsnCode: '',
    unit: 'Pcs',
    stock: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    amount: 0,
  };
}

export default function InvoiceFormModal({
  initialInvoice,
  onClose,
  onSaved,
}: InvoiceFormModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [invoiceType, setInvoiceType] = useState<string>(
    initialInvoice?.invoiceType || 'TAX_INVOICE'
  );
  const [customerId, setCustomerId] = useState(initialInvoice?.customerId || '');
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice ? `${initialInvoice.invoiceNumber}-COPY` : ''
  );
  const [invoiceDate, setInvoiceDate] = useState(
    initialInvoice?.invoiceDate
      ? new Date(initialInvoice.invoiceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    initialInvoice?.dueDate
      ? new Date(initialInvoice.dueDate).toISOString().split('T')[0]
      : ''
  );
  const [isInterState, setIsInterState] = useState(initialInvoice?.igst > 0);
  const [notes, setNotes] = useState(initialInvoice?.notes || '');
  const [terms, setTerms] = useState(
    initialInvoice?.terms || '1. Goods once sold will not be taken back.\n2. Payment due within 15 days.'
  );

  // Line items
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (initialInvoice?.items?.length) {
      return initialInvoice.items.map((it: any) => ({
        itemId: it.itemId || '',
        description: it.description || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discountPct: it.discountPct || 0,
        taxRate: it.taxRate || 0,
        hsnCode: it.item?.hsnCode || '',
        unit: it.item?.unit?.shortName || 'Pcs',
        stock: it.item?.currentStock || 0,
        cgst: it.cgst || 0,
        sgst: it.sgst || 0,
        igst: it.igst || 0,
        amount: it.amount || 0,
      }));
    }
    return [emptyLine()];
  });

  // Additional billing adjustments
  const [discountAmount, setDiscountAmount] = useState<number>(initialInvoice?.discountAmount || 0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [autoRoundOff, setAutoRoundOff] = useState<boolean>(true);
  const [manualRoundOff, setManualRoundOff] = useState<number>(initialInvoice?.roundOff || 0);

  // Payment settlement
  const [paidAmount, setPaidAmount] = useState<number | string>(initialInvoice?.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  // Barcode quick scan
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Quick Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Fetch customers & items
  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [cRes, iRes] = await Promise.all([
        api.get(`/businesses/${businessId}/customers?limit=300`),
        api.get(`/businesses/${businessId}/items?limit=500`),
      ]);
      if (cRes.success) setCustomers(cRes.data || []);
      if (iRes.success) setItems(iRes.data || []);
    } catch (e) {
      console.error('Failed to load customers/items', e);
    }
  }, [businessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When customer changes, automatically detect Inter-State GST
  useEffect(() => {
    if (!customerId) return;
    const cust = customers.find((c) => c.id === customerId);
    if (cust && cust.gstin && currentBusiness?.gstin) {
      const custStateCode = cust.gstin.substring(0, 2);
      const bizStateCode = currentBusiness.gstin.substring(0, 2);
      setIsInterState(custStateCode !== bizStateCode);
    }
  }, [customerId, customers, currentBusiness]);

  const isNonGst = invoiceType === 'BILL_OF_SUPPLY';

  // Recalculate line
  const recomputeLine = useCallback(
    (line: LineItem): LineItem => {
      const { cgst, sgst, igst, amount } = calcLine(
        line.quantity,
        line.unitPrice,
        line.discountPct,
        line.taxRate,
        isInterState,
        isNonGst
      );
      return { ...line, cgst, sgst, igst, amount };
    },
    [isInterState, isNonGst]
  );

  const updateLine = (idx: number, patch: Partial<LineItem>) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = recomputeLine({ ...copy[idx], ...patch });
      return copy;
    });
  };

  const selectProduct = (idx: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      updateLine(idx, { itemId: '' });
      return;
    }
    updateLine(idx, {
      itemId: item.id,
      description: item.name,
      unitPrice: item.sellingPrice || 0,
      taxRate: isNonGst ? 0 : item.gstRate || 18,
      hsnCode: item.hsnCode || '',
      unit: item.unit?.shortName || 'Pcs',
      stock: item.currentStock || 0,
      quantity: 1,
      discountPct: 0,
    });
  };

  // Recompute lines when GST type or invoice type changes
  useEffect(() => {
    setLines((prev) => prev.map((l) => recomputeLine(l)));
  }, [isInterState, invoiceType, recomputeLine]);

  // Barcode scan / Quick add handler
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeQuery.trim().toLowerCase();
      if (!code) return;

      const matchedItem = items.find(
        (i) =>
          (i.barcode && i.barcode.toLowerCase() === code) ||
          (i.sku && i.sku.toLowerCase() === code) ||
          i.name.toLowerCase().includes(code)
      );

      if (matchedItem) {
        // If line item already exists for this item, increment quantity
        const existingIdx = lines.findIndex((l) => l.itemId === matchedItem.id);
        if (existingIdx !== -1) {
          updateLine(existingIdx, {
            quantity: lines[existingIdx].quantity + 1,
          });
        } else {
          // Replace first empty line or append new line
          const emptyIdx = lines.findIndex((l) => !l.description && !l.itemId);
          const newLine = recomputeLine({
            itemId: matchedItem.id,
            description: matchedItem.name,
            unitPrice: matchedItem.sellingPrice || 0,
            taxRate: isNonGst ? 0 : matchedItem.gstRate || 18,
            hsnCode: matchedItem.hsnCode || '',
            unit: matchedItem.unit?.shortName || 'Pcs',
            stock: matchedItem.currentStock || 0,
            quantity: 1,
            discountPct: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            amount: 0,
          });

          if (emptyIdx !== -1) {
            setLines((prev) => {
              const copy = [...prev];
              copy[emptyIdx] = newLine;
              return copy;
            });
          } else {
            setLines((prev) => [...prev, newLine]);
          }
        }
        setBarcodeQuery('');
      } else {
        setError(`No item found matching barcode/SKU '${code}'`);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Calculations
  const subtotal = lines.reduce(
    (sum, l) => sum + (l.quantity * l.unitPrice - (l.quantity * l.unitPrice * (l.discountPct || 0)) / 100),
    0
  );
  const totalCgst = lines.reduce((sum, l) => sum + l.cgst, 0);
  const totalSgst = lines.reduce((sum, l) => sum + l.sgst, 0);
  const totalIgst = lines.reduce((sum, l) => sum + l.igst, 0);
  const taxAmount = totalCgst + totalSgst + totalIgst;

  const rawTotal = subtotal - discountAmount + additionalCharges + taxAmount;
  const computedRoundOff = autoRoundOff
    ? Number((Math.round(rawTotal) - rawTotal).toFixed(2))
    : manualRoundOff;
  const grandTotal = Math.max(0, rawTotal + computedRoundOff);

  const numPaid = Number(paidAmount) || 0;
  const balanceDue = Math.max(0, grandTotal - numPaid);

  const handleSave = async (isDraft: boolean = false, autoPrint: boolean = false) => {
    setError('');

    if (lines.length === 0 || lines.every((l) => !l.description.trim())) {
      setError('Please add at least one line item with a description.');
      return;
    }

    if (lines.some((l) => l.quantity <= 0 || l.unitPrice < 0)) {
      setError('Line item quantities must be > 0 and rates must be valid.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerId: customerId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        invoiceType,
        status: isDraft ? 'DRAFT' : 'SENT',
        discountAmount,
        roundOff: computedRoundOff,
        paidAmount: isDraft ? 0 : numPaid,
        paymentMethod: numPaid > 0 ? paymentMethod : undefined,
        paymentReference: paymentReference || undefined,
        isInterState,
        notes: notes || undefined,
        terms: terms || undefined,
        items: lines
          .filter((l) => l.description.trim())
          .map((l) => ({
            itemId: l.itemId || undefined,
            description: l.description.trim(),
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct || 0,
            taxRate: isNonGst ? 0 : l.taxRate || 0,
            hsnCode: l.hsnCode || undefined,
            unit: l.unit || undefined,
          })),
      };

      const res = await api.post(`/businesses/${businessId}/sales-invoices`, payload);
      if (res.success && res.data) {
        onSaved(res.data, autoPrint);
      } else {
        setError(res.error || res.message || 'Failed to save sales invoice');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialInvoice ? 'Duplicate / New Invoice' : 'Create Sales Invoice & POS Billing'}
              </h2>
              <p className="text-xs text-slate-500">
                GST compliant invoice with inventory adjustment & double-entry accounting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Invoice Type Selector */}
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="TAX_INVOICE">GST Tax Invoice</option>
              <option value="BILL_OF_SUPPLY">Bill of Supply (Non-GST)</option>
              <option value="RETAIL">Retail Invoice</option>
              <option value="ESTIMATE">Estimate</option>
              <option value="QUOTATION">Quotation</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl animate-shake">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer & Invoice Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            {/* Customer Picker */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Customer *</label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <UserPlus size={12} /> + Add Customer
                </button>
              </div>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
                >
                  <option value="">Select Customer (or Cash Sale)...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {c.gstin ? `[${c.gstin}]` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Barcode & GST Tax Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl">
            {/* Quick Barcode Scanner Input */}
            <div className="relative w-full sm:w-96">
              <div className="absolute left-3 top-2.5 flex items-center gap-1 text-indigo-600">
                <Barcode size={16} />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan Barcode or SKU & hit Enter..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-indigo-400 font-mono"
              />
            </div>

            {/* GST Tax Nature Toggle */}
            {invoiceType !== 'BILL_OF_SUPPLY' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-slate-600">Tax Type:</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setIsInterState(false)}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      !isInterState ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Intra-State (CGST + SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInterState(true)}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      isInterState ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Inter-State (IGST)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Products / Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Line Items ({lines.length})
              </span>
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Product Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 gap-2 bg-slate-100/80 px-3 py-2.5 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                <div className="col-span-4">Item & Description</div>
                <div className="col-span-1 text-center">HSN</div>
                <div className="col-span-2 text-right">Quantity</div>
                <div className="col-span-2 text-right">Rate (₹)</div>
                <div className="col-span-1 text-right">Disc %</div>
                {invoiceType !== 'BILL_OF_SUPPLY' && <div className="col-span-1 text-right">GST %</div>}
                <div className={invoiceType === 'BILL_OF_SUPPLY' ? 'col-span-2 text-right' : 'col-span-1 text-right'}>
                  Total (₹)
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-50/50">
                    {/* Item Select / Description */}
                    <div className="col-span-4 space-y-1">
                      <select
                        value={line.itemId}
                        onChange={(e) => selectProduct(idx, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">— Select from catalog —</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Stock: {i.currentStock} {i.unit?.shortName || ''})
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Item description / details..."
                        value={line.description}
                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* HSN */}
                    <div className="col-span-1">
                      <input
                        placeholder="HSN"
                        value={line.hsnCode}
                        onChange={(e) => updateLine(idx, { hsnCode: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Quantity & Unit */}
                    <div className="col-span-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateLine(idx, { quantity: Math.max(1, line.quantity - 1) })}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => updateLine(idx, { quantity: line.quantity + 1 })}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0"
                      >
                        +
                      </button>
                    </div>

                    {/* Unit Rate */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Discount */}
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discountPct}
                        onChange={(e) => updateLine(idx, { discountPct: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* GST Rate */}
                    {invoiceType !== 'BILL_OF_SUPPLY' && (
                      <div className="col-span-1">
                        <select
                          value={line.taxRate}
                          onChange={(e) => updateLine(idx, { taxRate: parseFloat(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Line Amount & Trash */}
                    <div
                      className={cn(
                        'flex items-center justify-end gap-2',
                        invoiceType === 'BILL_OF_SUPPLY' ? 'col-span-2' : 'col-span-1'
                      )}
                    >
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {line.amount.toFixed(2)}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Billing Calculations & Payment Settlement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Notes, Terms & Additional Charges */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Invoice Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Shipping / Other Charges (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={additionalCharges || ''}
                    onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for customer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Billing Summary & Instant Payment */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="space-y-1.5 text-xs pb-3 border-b border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Taxable):</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {additionalCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Additional Charges:</span>
                    <span className="font-mono">+ {formatCurrency(additionalCharges)}</span>
                  </div>
                )}
                {!isNonGst && !isInterState && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST:</span>
                      <span className="font-mono">{formatCurrency(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST:</span>
                      <span className="font-mono">{formatCurrency(totalSgst)}</span>
                    </div>
                  </>
                )}
                {!isNonGst && isInterState && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST:</span>
                    <span className="font-mono">{formatCurrency(totalIgst)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span>Round Off:</span>
                    <button
                      type="button"
                      onClick={() => setAutoRoundOff(!autoRoundOff)}
                      className="text-[10px] text-indigo-600 underline font-medium"
                    >
                      {autoRoundOff ? 'Auto' : 'Manual'}
                    </button>
                  </div>
                  <span className="font-mono">{formatCurrency(computedRoundOff)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center py-2 text-slate-900 border-b border-slate-200">
                <span className="text-sm font-black uppercase">Grand Total:</span>
                <span className="text-xl font-black text-indigo-600 font-mono">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Payment Settlement */}
              <div className="pt-2 space-y-3">
                <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider block">
                  Payment Collection
                </span>

                {/* Quick settlement buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(grandTotal)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    Full Paid ({formatCurrency(grandTotal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(0)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    Credit Sale (₹0.00)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Amount Collected (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-right font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>

                {numPaid > 0 && (
                  <div>
                    <input
                      type="text"
                      placeholder="Transaction Reference / Cheque No / UPI ID..."
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Balance Due Notification */}
                <div className="flex justify-between items-center pt-1 font-bold text-xs">
                  <span className="text-slate-600">Balance Due (Receivable):</span>
                  <span className={cn('font-mono text-sm', balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Save as Draft */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(true, false)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Save as Draft
            </button>

            {/* Save and Print */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(false, true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Printer size={14} />
              Save & Print
            </button>

            {/* Confirm & Save */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(false, false)}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Check size={14} />
              {loading ? 'Saving Invoice...' : 'Save & Confirm Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Quick Add Modal */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          businessId={businessId!}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={() => {
            setIsCustomerModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

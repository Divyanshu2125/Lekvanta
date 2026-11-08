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
  ShoppingCart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import SupplierModal from '@/components/parties/SupplierModal';

export interface BillFormModalProps {
  initialBill?: any; // For duplicating or editing
  onClose: () => void;
  onSaved: (savedBill?: any, autoPrint?: boolean) => void;
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
  isInterState: boolean
) {
  const gross = quantity * unitPrice;
  const discount = (gross * (discountPct || 0)) / 100;
  const taxable = gross - discount;
  const totalTax = (taxable * (taxRate || 0)) / 100;

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

export default function BillFormModal({
  initialBill,
  onClose,
  onSaved,
}: BillFormModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [supplierId, setSupplierId] = useState(initialBill?.supplierId || '');
  const [billNumber, setBillNumber] = useState(
    initialBill ? `${initialBill.billNumber}-COPY` : ''
  );
  const [billDate, setBillDate] = useState(
    initialBill?.billDate
      ? new Date(initialBill.billDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    initialBill?.dueDate
      ? new Date(initialBill.dueDate).toISOString().split('T')[0]
      : ''
  );
  const [isInterState, setIsInterState] = useState(initialBill?.igst > 0);
  const [notes, setNotes] = useState(initialBill?.notes || '');

  // Line items
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (initialBill?.items?.length) {
      return initialBill.items.map((it: any) => ({
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
  const [discountAmount, setDiscountAmount] = useState<number>(initialBill?.discountAmount || 0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [autoRoundOff, setAutoRoundOff] = useState<boolean>(true);
  const [manualRoundOff, setManualRoundOff] = useState<number>(initialBill?.roundOff || 0);

  // Payment settlement
  const [paidAmount, setPaidAmount] = useState<number | string>(initialBill?.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE' | 'NEFT' | 'RTGS'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  // Barcode quick scan
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Quick Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Fetch suppliers & items
  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [sRes, iRes] = await Promise.all([
        api.get(`/businesses/${businessId}/suppliers?limit=300`),
        api.get(`/businesses/${businessId}/items?limit=500`),
      ]);
      if (sRes.success) setSuppliers(sRes.data || []);
      if (iRes.success) setItems(iRes.data || []);
    } catch (e) {
      console.error('Failed to load suppliers/items', e);
    }
  }, [businessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When supplier changes, auto-detect Inter-State GST
  useEffect(() => {
    if (!supplierId) return;
    const supp = suppliers.find((s) => s.id === supplierId);
    if (supp && supp.gstin && currentBusiness?.gstin) {
      const suppStateCode = supp.gstin.substring(0, 2);
      const bizStateCode = currentBusiness.gstin.substring(0, 2);
      setIsInterState(suppStateCode !== bizStateCode);
    }
  }, [supplierId, suppliers, currentBusiness]);

  // Recalculate line
  const recomputeLine = useCallback(
    (line: LineItem): LineItem => {
      const { cgst, sgst, igst, amount } = calcLine(
        line.quantity,
        line.unitPrice,
        line.discountPct,
        line.taxRate,
        isInterState
      );
      return { ...line, cgst, sgst, igst, amount };
    },
    [isInterState]
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
      unitPrice: item.purchasePrice || 0,
      taxRate: item.gstRate || 18,
      hsnCode: item.hsnCode || '',
      unit: item.unit?.shortName || 'Pcs',
      stock: item.currentStock || 0,
      quantity: 1,
      discountPct: 0,
    });
  };

  // Recompute lines when GST type changes
  useEffect(() => {
    setLines((prev) => prev.map((l) => recomputeLine(l)));
  }, [isInterState, recomputeLine]);

  // Barcode scan / Quick add handler
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeQuery.trim().toLowerCase();
      if (!code) return;

      const matchedItem = items.find(
        (i) =>
          (i.barcode && i.barcode.toLowerCase() === code) ||
          (i.sku && i.sku.toLowerCase() === code)
      );

      if (matchedItem) {
        const existingIdx = lines.findIndex((l) => l.itemId === matchedItem.id);
        if (existingIdx !== -1) {
          updateLine(existingIdx, { quantity: lines[existingIdx].quantity + 1 });
        } else {
          // If the last line is blank, replace it; else append
          const lastLine = lines[lines.length - 1];
          const newLine: LineItem = recomputeLine({
            itemId: matchedItem.id,
            description: matchedItem.name,
            quantity: 1,
            unitPrice: matchedItem.purchasePrice || 0,
            discountPct: 0,
            taxRate: matchedItem.gstRate || 18,
            hsnCode: matchedItem.hsnCode || '',
            unit: matchedItem.unit?.shortName || 'Pcs',
            stock: matchedItem.currentStock || 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            amount: 0,
          });

          if (lines.length === 1 && !lastLine.itemId && !lastLine.description) {
            setLines([newLine]);
          } else {
            setLines((prev) => [...prev, newLine]);
          }
        }
        setBarcodeQuery('');
      } else {
        alert(`No product found with barcode / SKU: "${barcodeQuery}"`);
      }
    }
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) {
      setLines([emptyLine()]);
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Totals calculation
  const subtotal = lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice * (1 - (l.discountPct || 0) / 100)), 0);
  const totalCgst = lines.reduce((acc, l) => acc + l.cgst, 0);
  const totalSgst = lines.reduce((acc, l) => acc + l.sgst, 0);
  const totalIgst = lines.reduce((acc, l) => acc + l.igst, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;

  const rawTotal = subtotal - Number(discountAmount || 0) + Number(additionalCharges || 0) + totalTax;

  let calculatedRoundOff = 0;
  let finalGrandTotal = rawTotal;

  if (autoRoundOff) {
    const rounded = Math.round(rawTotal);
    calculatedRoundOff = rounded - rawTotal;
    finalGrandTotal = rounded;
  } else {
    calculatedRoundOff = Number(manualRoundOff || 0);
    finalGrandTotal = rawTotal + calculatedRoundOff;
  }

  const numericPaid = Number(paidAmount) || 0;
  const balanceDue = Math.max(0, finalGrandTotal - numericPaid);

  // Quick payment action helpers
  const handleQuickPayment = (type: 'FULL' | 'ZERO' | 'HALF') => {
    if (type === 'FULL') setPaidAmount(finalGrandTotal);
    if (type === 'ZERO') setPaidAmount(0);
    if (type === 'HALF') setPaidAmount(Math.round(finalGrandTotal / 2));
  };

  // Submission handler
  const handleSave = async (isDraft: boolean, autoPrint: boolean = false) => {
    setError('');

    // Validations
    const validLines = lines.filter((l) => l.description.trim() !== '');
    if (validLines.length === 0) {
      setError('Please add at least one line item with a description.');
      return;
    }

    for (let i = 0; i < validLines.length; i++) {
      if (validLines[i].quantity <= 0) {
        setError(`Row ${i + 1}: Quantity must be greater than zero.`);
        return;
      }
      if (validLines[i].unitPrice < 0) {
        setError(`Row ${i + 1}: Purchase price cannot be negative.`);
        return;
      }
    }

    setLoading(true);

    const payload = {
      supplierId: supplierId || null,
      billNumber: billNumber.trim() || undefined,
      billDate: new Date(billDate).toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      status: isDraft ? 'DRAFT' : 'RECEIVED',
      discountAmount: Number(discountAmount) || 0,
      roundOff: calculatedRoundOff,
      paidAmount: isDraft ? 0 : numericPaid,
      paymentMethod: numericPaid > 0 ? paymentMethod : undefined,
      paymentReference: paymentReference || undefined,
      notes: notes.trim() || undefined,
      isInterState,
      items: validLines.map((l) => ({
        itemId: l.itemId || null,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discountPct: Number(l.discountPct) || 0,
        taxRate: Number(l.taxRate) || 0,
        hsnCode: l.hsnCode || null,
        unit: l.unit || null,
      })),
    };

    try {
      const res = await api.post(`/businesses/${businessId}/purchase-bills`, payload);
      if (res.success && res.data) {
        onSaved(res.data, autoPrint);
      } else {
        setError(res.error || res.message || 'Failed to save purchase bill.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving the bill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-xs p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {initialBill ? 'Duplicate / Edit Purchase Bill' : 'Record Purchase Bill (Inward Stock)'}
                </h2>
                <p className="text-xs text-slate-500">
                  Enter vendor inward details. Confirmed bills atomically update your warehouse stock.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(85vh-80px)] overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bill Header Info (Supplier, Bill#, Date, Due Date, GST Type) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              {/* Supplier Selection */}
              <div className="md:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Vendor / Supplier</label>
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <UserPlus size={12} /> + Add Supplier
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-8 shadow-xs"
                  >
                    <option value="">Cash / Direct Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.gstin ? `(GST: ${s.gstin})` : ''} {s.phone ? `• ${s.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Bill Number */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bill / Inv #
                </label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="Auto-generated (PB-0001)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs font-mono"
                />
              </div>

              {/* Bill Date */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Date *</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                />
              </div>

              {/* Due Date */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                />
              </div>

              {/* GST Supply Place */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Place of Supply</label>
                <div className="flex bg-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsInterState(false)}
                    className={cn(
                      'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all text-center',
                      !isInterState ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    )}
                  >
                    Intra (CGST+SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInterState(true)}
                    className={cn(
                      'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all text-center',
                      isInterState ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    )}
                  >
                    Inter (IGST)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Barcode Scanner Bar */}
            <div className="flex items-center gap-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <div className="text-indigo-600 pl-1">
                <Barcode size={18} />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan product barcode or type SKU and press Enter for fast inward addition..."
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-mono"
              />
              <span className="text-[10px] font-medium text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs">
                Press Enter
              </span>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Purchased Items ({lines.length})
                </h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Add Product Line
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3 w-56">Item / Description</th>
                      <th className="py-2.5 px-2 w-20">HSN</th>
                      <th className="py-2.5 px-2 w-28 text-right">Quantity</th>
                      <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 w-20 text-right">Disc %</th>
                      <th className="py-2.5 px-2 w-24 text-right">GST Rate</th>
                      <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Product Selector / Description */}
                        <td className="py-2 px-3 space-y-1">
                          <select
                            value={line.itemId}
                            onChange={(e) => selectProduct(idx, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          >
                            <option value="">— Select item from catalog —</option>
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} {i.sku ? `(${i.sku})` : ''} • Stock: {i.currentStock}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(idx, { description: e.target.value })}
                            placeholder="Line description or custom item..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:bg-white"
                          />
                        </td>

                        {/* HSN */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={line.hsnCode}
                            onChange={(e) => updateLine(idx, { hsnCode: e.target.value })}
                            placeholder="HSN"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-mono focus:outline-none focus:bg-white"
                          />
                        </td>

                        {/* Quantity with unit */}
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {line.unit || 'Pcs'}
                            </span>
                          </div>
                          {line.stock > 0 && (
                            <span className="text-[10px] text-slate-400 block text-right mt-0.5">
                              Curr: {line.stock}
                            </span>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </td>

                        {/* Discount % */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.discountPct}
                            onChange={(e) =>
                              updateLine(idx, { discountPct: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </td>

                        {/* Tax Rate */}
                        <td className="py-2 px-2">
                          <select
                            value={line.taxRate}
                            onChange={(e) =>
                              updateLine(idx, { taxRate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          >
                            {GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Line Total */}
                        <td className="py-2 px-3 text-right">
                          <span className="text-xs font-bold font-mono text-slate-900">
                            {formatCurrency(line.amount)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Tax: {formatCurrency(line.cgst + line.sgst + line.igst)}
                          </span>
                        </td>

                        {/* Delete row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Notes & Billing Summary / Settlement */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Notes & Terms */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bill Notes & Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Vendor remarks, delivery challan reference, freight details..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none shadow-xs"
                  />
                </div>

                {/* Payment Disbursement Panel */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <IndianRupee size={14} className="text-indigo-600" />
                      Payment Disbursement / Settlement
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickPayment('FULL')}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md transition-colors"
                      >
                        Full Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPayment('ZERO')}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md transition-colors"
                      >
                        Full Credit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPayment('HALF')}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md transition-colors"
                      >
                        50% Paid
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Amount Paid (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer / NEFT</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CARD">Card</option>
                        <option value="RTGS">RTGS</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Reference / Txn #
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Cheque# or UTR..."
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Billing Summary Card */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Bill Summary
                </h4>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Taxable Subtotal</span>
                  <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Discount on Total</span>
                  <div className="flex items-center gap-1 w-28">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-right font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Freight / Additional</span>
                  <div className="flex items-center gap-1 w-28">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-right font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* GST Details */}
                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Central Tax (Input CGST)</span>
                      <span className="font-mono">{formatCurrency(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>State Tax (Input SGST)</span>
                      <span className="font-mono">{formatCurrency(totalSgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Integrated Tax (Input IGST)</span>
                    <span className="font-mono">{formatCurrency(totalIgst)}</span>
                  </div>
                )}

                {/* Round off */}
                <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-200 pt-2">
                  <div className="flex items-center gap-2">
                    <span>Round Off</span>
                    <label className="text-[10px] text-indigo-600 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRoundOff}
                        onChange={(e) => setAutoRoundOff(e.target.checked)}
                        className="mr-1 rounded"
                      />
                      Auto
                    </label>
                  </div>
                  <span className="font-mono">{formatCurrency(calculatedRoundOff)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 border-t-2 border-slate-200 pt-2">
                  <span>Grand Total</span>
                  <span className="text-lg font-mono text-indigo-600">
                    {formatCurrency(finalGrandTotal)}
                  </span>
                </div>

                {/* Paid & Balance Due */}
                <div className="flex justify-between text-xs text-emerald-700 font-semibold pt-1">
                  <span>Amount Paid</span>
                  <span className="font-mono">{formatCurrency(numericPaid)}</span>
                </div>

                <div className="flex justify-between text-xs font-bold border-t border-slate-200 pt-2">
                  <span className={balanceDue > 0 ? 'text-rose-700' : 'text-slate-700'}>
                    Balance Payable
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm',
                      balanceDue > 0 ? 'text-rose-700 font-extrabold' : 'text-emerald-700'
                    )}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave(true, false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                <FileText size={14} />
                Save as Draft
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave(false, true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                <Printer size={14} />
                Confirm & Print
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave(false, false)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50"
              >
                <Check size={14} />
                {loading ? 'Processing...' : 'Confirm Inward Purchase'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      {isSupplierModalOpen && businessId && (
        <SupplierModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSuccess={async () => {
            setIsSupplierModalOpen(false);
            await loadData();
          }}
          businessId={businessId}
        />
      )}
    </>
  );
}

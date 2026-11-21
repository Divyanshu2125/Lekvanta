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
  Zap,
  Wrench,
  Package,
  Settings,
  Edit2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import CustomerModal from '@/components/parties/CustomerModal';

export interface InvoiceFormModalProps {
  initialInvoice?: any; // For duplicating or editing
  isQuickBill?: boolean; // Fast POS / Walk-in billing without customer details
  initialTab?: 'products' | 'services'; // Default tab on open
  onClose: () => void;
  onSaved: (savedInvoice?: any, autoPrint?: boolean) => void;
}

export interface LineItem {
  id?: string;
  itemId?: string;
  isService?: boolean;
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

export interface ServiceItemDef {
  id: string;
  name: string;
  unit: string;
  defaultPrice: number;
  defaultTaxRate?: number;
  icon?: string;
  isCustom?: boolean;
}

// 16 Default Services requested by the shopkeeper
export const DEFAULT_SERVICES: ServiceItemDef[] = [
  { id: 'bw-photocopy', name: 'B&W Photocopy', unit: 'page', defaultPrice: 2, icon: '📄', defaultTaxRate: 0 },
  { id: 'color-photocopy', name: 'Color Photocopy', unit: 'page', defaultPrice: 10, icon: '📑', defaultTaxRate: 0 },
  { id: 'bw-print', name: 'B&W Printing', unit: 'page', defaultPrice: 5, icon: '🖨️', defaultTaxRate: 0 },
  { id: 'color-print', name: 'Color Printing', unit: 'page', defaultPrice: 15, icon: '🎨', defaultTaxRate: 0 },
  { id: 'photo-print', name: 'Photo Printing', unit: 'photo', defaultPrice: 30, icon: '🖼️', defaultTaxRate: 18 },
  { id: 'passport-photo', name: 'Passport Photo', unit: 'set', defaultPrice: 60, icon: '📸', defaultTaxRate: 18 },
  { id: 'lamination', name: 'Lamination', unit: 'sheet', defaultPrice: 20, icon: '🛡️', defaultTaxRate: 18 },
  { id: 'spiral-binding', name: 'Spiral Binding', unit: 'book', defaultPrice: 40, icon: '📚', defaultTaxRate: 18 },
  { id: 'scanning', name: 'Scanning', unit: 'page', defaultPrice: 10, icon: '📱', defaultTaxRate: 18 },
  { id: 'pvc-card', name: 'PVC Card Printing', unit: 'card', defaultPrice: 80, icon: '🪪', defaultTaxRate: 18 },
  { id: 'id-card', name: 'ID Card Printing', unit: 'card', defaultPrice: 50, icon: '🏷️', defaultTaxRate: 18 },
  { id: 'poster-print', name: 'Poster Printing', unit: 'poster', defaultPrice: 100, icon: '🖼️', defaultTaxRate: 18 },
  { id: 'sticker-print', name: 'Sticker Printing', unit: 'sticker', defaultPrice: 25, icon: '🏷️', defaultTaxRate: 18 },
  { id: 'typing-services', name: 'Typing Services', unit: 'page', defaultPrice: 40, icon: '✍️', defaultTaxRate: 18 },
  { id: 'online-form', name: 'Online Form Filling', unit: 'form', defaultPrice: 50, icon: '🌐', defaultTaxRate: 0 },
  { id: 'custom-service', name: 'Custom Service', unit: 'job', defaultPrice: 100, icon: '⚡', defaultTaxRate: 18, isCustom: true },
];

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

function emptyProductLine(): LineItem {
  return {
    itemId: '',
    isService: false,
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
  isQuickBill = false,
  initialTab = 'products',
  onClose,
  onSaved,
}: InvoiceFormModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Active Tab for adding items: 'products' | 'services'
  const [activeTab, setActiveTab] = useState<'products' | 'services'>(initialTab);

  // Service Catalog state (configurable, saved to localStorage)
  const [services, setServices] = useState<ServiceItemDef[]>(() => {
    try {
      const saved = localStorage.getItem('lekvanta_service_catalog');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_SERVICES;
  });

  const [serviceSearch, setServiceSearch] = useState('');
  const [isManageServicesOpen, setIsManageServicesOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItemDef | null>(null);

  // Form states
  const [invoiceType, setInvoiceType] = useState<string>(
    initialInvoice?.invoiceType || 'TAX_INVOICE'
  );
  const [customerId, setCustomerId] = useState(initialInvoice?.customerId || '');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [isFullPaid, setIsFullPaid] = useState<boolean>(isQuickBill ? true : false);
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
    initialInvoice?.terms || '1. Goods once sold will not be taken back.\n2. Services delivered in satisfactory condition.'
  );

  // Line items (both products and services on the same bill)
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (initialInvoice?.items?.length) {
      return initialInvoice.items.map((it: any) => ({
        itemId: it.itemId || '',
        isService: !it.itemId,
        description: it.description || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discountPct: it.discountPct || 0,
        taxRate: it.taxRate || 0,
        hsnCode: it.item?.hsnCode || it.hsnCode || '',
        unit: it.item?.unit?.shortName || it.unit || 'Pcs',
        stock: it.item?.currentStock || 0,
        cgst: it.cgst || 0,
        sgst: it.sgst || 0,
        igst: it.igst || 0,
        amount: it.amount || 0,
      }));
    }
    return [emptyProductLine()];
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
  const [shopBankAccounts, setShopBankAccounts] = useState<any[]>([]);

  // Fetch customers, items & shop bank accounts
  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [cRes, iRes, bRes] = await Promise.all([
        api.get(`/businesses/${businessId}/customers?limit=300`),
        api.get(`/businesses/${businessId}/items?limit=500`),
        api.get(`/businesses/${businessId}/bank-accounts`),
      ]);
      if (cRes.success) setCustomers(cRes.data || []);
      if (iRes.success) setItems(iRes.data || []);
      if (bRes.success && Array.isArray(bRes.data)) setShopBankAccounts(bRes.data);
    } catch (e) {
      console.error('Failed to load customers/items/bank-accounts', e);
    }
  }, [businessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const primaryBank =
    shopBankAccounts.find((b) => b.isPrimary) || shopBankAccounts[0] || null;

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

  // Available stock helper for physical inventory items
  const getAvailableStockForItem = (itemId: string, excludeLineIdx: number = -1): number => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.trackInventory) return Infinity;

    const usedInOtherLines = lines.reduce(
      (sum, l, i) => (i !== excludeLineIdx && l.itemId === itemId && !l.isService ? sum + (Number(l.quantity) || 0) : sum),
      0
    );
    return Math.max(0, item.currentStock - usedInOtherLines);
  };

  const updateLine = (idx: number, patch: Partial<LineItem>) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = recomputeLine({ ...copy[idx], ...patch });
      return copy;
    });
  };

  const removeLine = (idx: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [emptyProductLine()]));
  };

  // Quantity Change: validates stock ONLY for physical products, services have NO stock limit
  const handleQuantityChange = (idx: number, requestedQty: number) => {
    const line = lines[idx];
    if (!line) return;

    if (line.itemId && !line.isService) {
      const item = items.find((i) => i.id === line.itemId);
      if (item && item.trackInventory) {
        const maxAvailable = getAvailableStockForItem(line.itemId, idx);
        if (requestedQty > maxAvailable) {
          setError(`Insufficient Stock! Only ${item.currentStock} units available.`);
          const clamped = Math.min(requestedQty, Math.max(1, maxAvailable));
          updateLine(idx, { quantity: clamped });
          return;
        }
      }
    }

    setError('');
    updateLine(idx, { quantity: requestedQty });
  };

  // Select Product from inventory dropdown
  const selectProduct = (idx: number, itemId: string) => {
    if (!itemId) {
      updateLine(idx, { itemId: '', isService: false, description: '', unitPrice: 0, stock: 0 });
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      updateLine(idx, { itemId: '' });
      return;
    }

    if (item.trackInventory) {
      const maxAvailable = getAvailableStockForItem(item.id, idx);
      if (maxAvailable <= 0) {
        setError(`Insufficient Stock! Only ${item.currentStock} units available.`);
        return;
      }
    }

    setError('');
    updateLine(idx, {
      itemId: item.id,
      isService: false,
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

  // Add Service directly to the line items table
  const addServiceToBill = (svc: ServiceItemDef) => {
    setError('');
    const newLine = recomputeLine({
      itemId: '',
      isService: true,
      description: svc.name,
      quantity: 1,
      unitPrice: svc.defaultPrice,
      discountPct: 0,
      taxRate: isNonGst ? 0 : svc.defaultTaxRate || 0,
      hsnCode: '9983', // SAC Code for business & support services
      unit: svc.unit,
      stock: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      amount: 0,
    });

    // If first line is blank & unused, replace it; otherwise append
    setLines((prev) => {
      const emptyIdx = prev.findIndex((l) => !l.description.trim() && !l.itemId);
      if (emptyIdx !== -1) {
        const copy = [...prev];
        copy[emptyIdx] = newLine;
        return copy;
      }
      return [...prev, newLine];
    });
  };

  // Recompute lines when GST type or invoice type changes
  useEffect(() => {
    setLines((prev) => prev.map((l) => recomputeLine(l)));
  }, [isInterState, invoiceType, recomputeLine]);

  // Barcode scan handler for quick product add
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
        const existingIdx = lines.findIndex((l) => l.itemId === matchedItem.id && !l.isService);
        if (existingIdx !== -1) {
          const targetQty = lines[existingIdx].quantity + 1;
          if (matchedItem.trackInventory) {
            const maxAvailable = getAvailableStockForItem(matchedItem.id, existingIdx);
            if (targetQty > maxAvailable) {
              setError(`Insufficient Stock! Only ${matchedItem.currentStock} units available.`);
              return;
            }
          }
          setError('');
          updateLine(existingIdx, { quantity: targetQty });
        } else {
          if (matchedItem.trackInventory) {
            const maxAvailable = getAvailableStockForItem(matchedItem.id, -1);
            if (maxAvailable <= 0) {
              setError(`Insufficient Stock! Only ${matchedItem.currentStock} units available.`);
              return;
            }
          }
          setError('');
          const emptyIdx = lines.findIndex((l) => !l.description && !l.itemId);
          const newLine = recomputeLine({
            itemId: matchedItem.id,
            isService: false,
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
        setError(`No product found matching barcode/SKU '${code}'`);
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

  // Auto-focus barcode input in Quick Bill mode
  useEffect(() => {
    if (isQuickBill && barcodeInputRef.current) {
      const t = setTimeout(() => barcodeInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isQuickBill]);

  // Auto-sync paid amount to grand total if Full Paid is active
  useEffect(() => {
    if (isFullPaid) {
      setPaidAmount(grandTotal);
    }
  }, [grandTotal, isFullPaid]);

  // Save Service Catalog to localStorage
  const saveServicesList = (updated: ServiceItemDef[]) => {
    localStorage.setItem('lekvanta_service_catalog', JSON.stringify(updated));
    setServices(updated);
  };

  // Submit and Save Bill (Products + Services)
  const handleSave = async (isDraft: boolean = false, autoPrint: boolean = false) => {
    setError('');

    const validLines = lines.filter((l) => l.description.trim());
    if (validLines.length === 0) {
      setError('Please add at least one product or service with a description.');
      return;
    }

    if (validLines.some((l) => l.quantity <= 0 || l.unitPrice < 0)) {
      setError('Line item quantities must be > 0 and rates must be valid.');
      return;
    }

    // Validate available stock ONLY for physical inventory products (not services!)
    const itemTotalMap = new Map<string, number>();
    for (const line of validLines) {
      if (!line.itemId || line.isService) continue;
      itemTotalMap.set(line.itemId, (itemTotalMap.get(line.itemId) || 0) + (Number(line.quantity) || 0));
    }

    for (const [itemId, requestedQty] of itemTotalMap.entries()) {
      const item = items.find((i) => i.id === itemId);
      if (item && item.trackInventory) {
        if (requestedQty > item.currentStock) {
          setError(`Insufficient Stock! Only ${item.currentStock} units available for "${item.name}".`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      let finalNotes = notes || '';
      if (!customerId && (walkinName.trim() || walkinPhone.trim())) {
        const parts = [
          walkinName.trim() ? `Customer: ${walkinName.trim()}` : '',
          walkinPhone.trim() ? `Phone: ${walkinPhone.trim()}` : '',
        ].filter(Boolean);
        const prefix = `[Walk-in: ${parts.join(', ')}]`;
        finalNotes = finalNotes ? `${prefix}\n${finalNotes}` : prefix;
      }

      const payload = {
        customerId: customerId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        invoiceType,
        status: isDraft ? 'DRAFT' : numPaid >= grandTotal ? 'PAID' : numPaid > 0 ? 'PARTIAL' : 'SENT',
        discountAmount,
        roundOff: computedRoundOff,
        paidAmount: isDraft ? 0 : numPaid,
        paymentMethod: numPaid > 0 ? paymentMethod : undefined,
        paymentReference: paymentReference || undefined,
        isInterState,
        notes: finalNotes || undefined,
        terms: terms || undefined,
        items: validLines.map((l) => ({
          // If isService is true: itemId is undefined so backend skips stock check and does not deduct stock!
          itemId: l.isService ? undefined : l.itemId || undefined,
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
        setError(res.error || res.message || 'Failed to save sales bill');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving invoice');
    } finally {
      setLoading(false);
    }
  };

  // Filtered services for the Services Tab
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.unit.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold',
                isQuickBill ? 'bg-emerald-600 shadow-sm' : 'bg-indigo-600'
              )}
            >
              {isQuickBill ? <Zap size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {initialInvoice
                    ? 'Duplicate / New Invoice'
                    : isQuickBill
                    ? '⚡ Quick Bill / POS Counter Sale'
                    : 'Create Bill / Sales Invoice'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Products + Services
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Add products from inventory and services (photocopy, printing, lamination) on the same bill
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
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <span>Customer</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Optional (Walk-in / Cash)
                  </span>
                </label>
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
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    if (e.target.value) {
                      setWalkinName('');
                      setWalkinPhone('');
                    }
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8 font-medium"
                >
                  <option value="">👤 Walk-in / Cash Customer (No profile needed)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {c.gstin ? `[${c.gstin}]` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {!customerId && (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Walk-in name (Optional)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="Mobile # (Optional)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
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

          {/* ─────────────────────────────────────────────────────────────
              TAB / TOGGLE: PRODUCTS vs SERVICES SELECTOR
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                    activeTab === 'products'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Package size={15} />
                  <span>📦 Products (Inventory)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                    activeTab === 'services'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Wrench size={15} />
                  <span>🛠️ Services (Printing, Xerox, Repairs)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {services.length}
                  </span>
                </button>
              </div>

              {/* Tax Type / GST toggle */}
              {invoiceType !== 'BILL_OF_SUPPLY' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-slate-600">Tax Type:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsInterState(false)}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        !isInterState ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Intra-State (CGST+SGST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInterState(true)}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        isInterState ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Inter-State (IGST)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TAB CONTENT: PRODUCTS (Barcode + Inventory Search) */}
            {activeTab === 'products' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
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
                    placeholder="Scan Barcode or SKU & hit Enter to add product..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-indigo-400 font-mono shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden sm:inline">Or add row below:</span>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, emptyProductLine()])}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white border border-indigo-200 hover:bg-indigo-50/50 px-3 py-2 rounded-xl transition-colors shadow-2xs"
                  >
                    <Plus size={14} /> + Add Product Line
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SERVICES (16 Popular Presets + Quick Add + Custom Services) */}
            {activeTab === 'services' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Search services (e.g. photocopy, lamination)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService({
                          id: Math.random().toString(36).substring(2, 9),
                          name: '',
                          unit: 'job',
                          defaultPrice: 50,
                          defaultTaxRate: 18,
                          icon: '⚡',
                          isCustom: true,
                        });
                        setIsManageServicesOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={13} /> + Add Custom Service
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsManageServicesOpen(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                    >
                      <Settings size={13} /> Manage Rates
                    </button>
                  </div>
                </div>

                {/* 16 Service Preset Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200 shadow-inner">
                  {filteredServices.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => addServiceToBill(svc)}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/40 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-base shrink-0 group-hover:scale-110 transition-transform">
                          {svc.icon || '🛠️'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{svc.name}</p>
                          <p className="text-[10px] text-slate-500">
                            per {svc.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-1">
                        <span className="text-xs font-bold font-mono text-emerald-700">
                          ₹{svc.defaultPrice}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold block group-hover:underline">
                          + Add
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              UNIFIED BILL ITEMS TABLE (Products & Services Combined)
          ───────────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Bill Line Items ({lines.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  ({lines.filter((l) => !l.isService && l.description.trim()).length} Products,{' '}
                  {lines.filter((l) => l.isService && l.description.trim()).length} Services)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLines((prev) => [...prev, emptyProductLine()])}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Plus size={13} /> + Product Line
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 gap-2 bg-slate-100/90 px-3 py-2.5 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                <div className="col-span-1 text-center">Type</div>
                <div className="col-span-4">Item / Service Description</div>
                <div className="col-span-1 text-center">Unit / HSN</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Price (₹)</div>
                <div className="col-span-1 text-right">Disc %</div>
                <div className="col-span-1 text-right">Total (₹)</div>
              </div>

              <div className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors',
                      line.isService ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50/60'
                    )}
                  >
                    {/* Badge: PROD vs SERVICE */}
                    <div className="col-span-1 text-center">
                      <span
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider block',
                          line.isService
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        )}
                      >
                        {line.isService ? 'SERVICE' : 'PROD'}
                      </span>
                    </div>

                    {/* Item Select / Description Input */}
                    <div className="col-span-4 space-y-1">
                      {!line.isService ? (
                        <>
                          <select
                            value={line.itemId}
                            onChange={(e) => selectProduct(idx, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          >
                            <option value="">— Select product from inventory —</option>
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} (Stock: {i.currentStock} {i.unit?.shortName || ''})
                              </option>
                            ))}
                          </select>
                          <input
                            placeholder="Product notes / serial #..."
                            value={line.description}
                            onChange={(e) => updateLine(idx, { description: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Service name (e.g. B&W Photocopy, Lamination)..."
                            value={line.description}
                            onChange={(e) => updateLine(idx, { description: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Unit / HSN */}
                    <div className="col-span-1">
                      <input
                        placeholder={line.isService ? line.unit || 'unit' : 'HSN'}
                        value={line.isService ? line.unit : line.hsnCode}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            line.isService ? { unit: e.target.value } : { hsnCode: e.target.value }
                          )
                        }
                        className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Quantity with + / - steppers */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, Math.max(1, line.quantity - 1))}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0 text-slate-700"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-14 bg-white border border-slate-200 rounded px-1 py-1 text-xs text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, line.quantity + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0 text-slate-700"
                        >
                          +
                        </button>
                      </div>
                      {!line.isService && line.itemId && (
                        <div className="text-[10px] text-slate-400 text-center mt-0.5 font-medium">
                          Avail: {items.find((i) => i.id === line.itemId)?.currentStock ?? line.stock}
                        </div>
                      )}
                      {line.isService && (
                        <div className="text-[10px] text-emerald-600 text-center mt-0.5 font-medium">
                          {line.unit || 'unit'}
                        </div>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-right font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Discount % */}
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={line.discountPct || ''}
                        onChange={(e) => updateLine(idx, { discountPct: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Total & Remove */}
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {formatCurrency(line.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BILLING SUMMARY & PAYMENT SETTLEMENT
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
            {/* Notes & Additional adjustments */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Invoice Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-right font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Extra Charges (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={additionalCharges || ''}
                    onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for customer (e.g. delivery date, binding color)..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Calculations & Payment Checkout */}
            <div className="space-y-3">
              <div className="space-y-1.5 text-xs pb-3 border-b border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
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
                    <span>Extra Charges:</span>
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
                <span className="text-2xl font-black text-indigo-600 font-mono">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Payment Settlement */}
              <div className="pt-1 space-y-2.5">
                {/* Full Paid vs Credit sale */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullPaid(true);
                      setPaidAmount(grandTotal);
                    }}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      isFullPaid || Number(paidAmount) === grandTotal
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    )}
                  >
                    Full Paid ({formatCurrency(grandTotal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullPaid(false);
                      setPaidAmount(0);
                    }}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      Number(paidAmount) === 0
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    )}
                  >
                    Credit Sale (₹0.00)
                  </button>
                </div>

                {/* Quick Mode Chips: Cash / UPI / Card / Bank */}
                <div className="flex gap-1.5">
                  {(['CASH', 'UPI', 'CARD', 'BANK'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMethod(mode)}
                      className={cn(
                        'flex-1 py-1 px-2 rounded-lg text-[11px] font-bold border transition-all',
                        paymentMethod === mode
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {mode === 'CASH'
                        ? '💵 Cash'
                        : mode === 'UPI'
                        ? '📱 UPI'
                        : mode === 'CARD'
                        ? '💳 Card'
                        : '🏦 Bank'}
                    </button>
                  ))}
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
                      onChange={(e) => {
                        setIsFullPaid(false);
                        setPaidAmount(e.target.value);
                      }}
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

                {/* Bank / UPI Account Preview for payment collection */}
                {paymentMethod === 'BANK' && (
                  <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs">
                    {primaryBank ? (
                      <div>
                        <p className="font-bold text-indigo-950 flex items-center gap-1">
                          <span>🏦 Receiving Bank:</span>
                          <span className="font-semibold">{primaryBank.bankName}</span>
                          {primaryBank.branchName && (
                            <span className="text-indigo-600 font-normal"> ({primaryBank.branchName})</span>
                          )}
                        </p>
                        <p className="text-[11px] text-indigo-800 mt-0.5 font-mono">
                          A/c: <strong>{primaryBank.accountNumber}</strong> • IFSC: <strong>{primaryBank.ifscCode}</strong>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Holder: {primaryBank.accountHolder}
                        </p>
                      </div>
                    ) : (
                      <p className="text-amber-700 text-[11px]">
                        ⚠️ No bank account configured for this shop. You can configure bank accounts in Settings &gt; Bank Details.
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === 'UPI' && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs">
                    {primaryBank?.upiId ? (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-800 font-medium text-[11px]">Shop UPI ID:</span>
                        <span className="font-mono font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          {primaryBank.upiId}
                        </span>
                      </div>
                    ) : (
                      <p className="text-amber-700 text-[11px]">
                        ℹ️ No UPI ID configured on your primary bank account in Settings &gt; Bank Details.
                      </p>
                    )}
                  </div>
                )}

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
                  <span className="text-slate-600">Balance Due:</span>
                  <span
                    className={cn('font-mono text-sm', balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600')}
                  >
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
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(true, false)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(false, true)}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              <Printer size={15} />
              Save & Print Bill
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(false, false)}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Check size={14} />
              {loading ? 'Saving Bill...' : 'Save & Confirm'}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MANAGE SERVICES MODAL (Configurable Service Rates & Custom Services)
      ───────────────────────────────────────────────────────────── */}
      {isManageServicesOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Manage Service Catalog & Rates</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManageServicesOpen(false);
                  setEditingService(null);
                }}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Add / Edit Inline Form */}
              {editingService && (
                <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-emerald-800 block">
                    {services.some((s) => s.id === editingService.id) ? 'Edit Service' : 'Add New Custom Service'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Service Name</label>
                      <input
                        type="text"
                        value={editingService.name}
                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                        placeholder="e.g. Spiral Binding, Photo Print..."
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Unit (e.g. page, pcs)</label>
                      <input
                        type="text"
                        value={editingService.unit}
                        onChange={(e) => setEditingService({ ...editingService, unit: e.target.value })}
                        placeholder="page, sheet, job"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Default Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editingService.defaultPrice}
                        onChange={(e) =>
                          setEditingService({ ...editingService, defaultPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">GST Rate (%)</label>
                      <select
                        value={editingService.defaultTaxRate || 0}
                        onChange={(e) =>
                          setEditingService({ ...editingService, defaultTaxRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingService.name.trim()) return;
                          const existingIdx = services.findIndex((s) => s.id === editingService.id);
                          let updated: ServiceItemDef[];
                          if (existingIdx !== -1) {
                            updated = [...services];
                            updated[existingIdx] = editingService;
                          } else {
                            updated = [...services, editingService];
                          }
                          saveServicesList(updated);
                          setEditingService(null);
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Service list table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Service Name</th>
                      <th className="py-2 px-3">Unit</th>
                      <th className="py-2 px-3 text-right">Default Rate (₹)</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{s.icon || '🛠️'}</span>
                          <span>{s.name}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono">per {s.unit}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          ₹{s.defaultPrice}
                        </td>
                        <td className="py-2 px-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingService(s)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                            title="Edit rate"
                          >
                            <Edit2 size={13} />
                          </button>
                          {s.isCustom && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = services.filter((x) => x.id !== s.id);
                                saveServicesList(updated);
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600"
                              title="Delete service"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    saveServicesList(DEFAULT_SERVICES);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw size={12} /> Reset to 16 Default Services
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsManageServicesOpen(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export interface ItemData {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  taxRateId?: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  minStock: number;
  trackInventory?: boolean;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
  itemToEdit?: ItemData | null;
}

export default function ItemModal({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  itemToEdit,
}: ItemModalProps) {
  const isEditing = !!itemToEdit?.id;

  const [formData, setFormData] = useState<ItemData>({
    name: '',
    sku: '',
    barcode: '',
    hsnCode: '',
    description: '',
    categoryId: '',
    unitId: '',
    taxRateId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    openingStock: 0,
    minStock: 5,
    trackInventory: true,
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string; shortName: string }[]>([]);
  const [taxRates, setTaxRates] = useState<{ id: string; name: string; rate: number }[]>([]);

  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitShort, setNewUnitShort] = useState('');
  const [showAddUnit, setShowAddUnit] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dropdown resources
  useEffect(() => {
    if (!isOpen || !businessId) return;

    const loadMetadata = async () => {
      try {
        const [catsRes, unitsRes, taxesRes] = await Promise.all([
          api.get(`/businesses/${businessId}/items/categories`),
          api.get(`/businesses/${businessId}/items/units`),
          api.get(`/businesses/${businessId}/items/tax-rates`),
        ]);
        if (catsRes.success) setCategories(catsRes.data || []);
        if (unitsRes.success) setUnits(unitsRes.data || []);
        if (taxesRes.success) setTaxRates(taxesRes.data || []);
      } catch (err) {
        console.error('Failed to load item metadata', err);
      }
    };

    loadMetadata();
  }, [isOpen, businessId]);

  // Set initial form data
  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        name: itemToEdit.name || '',
        sku: itemToEdit.sku || '',
        barcode: itemToEdit.barcode || '',
        hsnCode: itemToEdit.hsnCode || '',
        description: itemToEdit.description || '',
        categoryId: itemToEdit.categoryId || '',
        unitId: itemToEdit.unitId || '',
        taxRateId: itemToEdit.taxRateId || '',
        purchasePrice: itemToEdit.purchasePrice || 0,
        sellingPrice: itemToEdit.sellingPrice || 0,
        openingStock: itemToEdit.openingStock || 0,
        minStock: itemToEdit.minStock || 0,
        trackInventory: itemToEdit.trackInventory ?? true,
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        hsnCode: '',
        description: '',
        categoryId: '',
        unitId: '',
        taxRateId: '',
        purchasePrice: 0,
        sellingPrice: 0,
        openingStock: 0,
        minStock: 5,
        trackInventory: true,
      });
    }
    setError(null);
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    setError(null);
  };

  const handleGenerateSku = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = formData.name
      ? formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'ITM')
      : 'ITM';
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  const handleGenerateBarcode = () => {
    const code = '890' + Math.floor(100000000 + Math.random() * 900000000);
    setFormData((prev) => ({ ...prev, barcode: code }));
  };

  const handleCreateCategoryInline = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await api.post(`/businesses/${businessId}/items/categories`, {
        name: newCatName.trim(),
      });
      if (res.success && res.data) {
        setCategories((prev) => [...prev, res.data]);
        setFormData((prev) => ({ ...prev, categoryId: res.data.id }));
        setNewCatName('');
        setShowAddCat(false);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateUnitInline = async () => {
    if (!newUnitName.trim() || !newUnitShort.trim()) return;
    try {
      const res = await api.post(`/businesses/${businessId}/items/units`, {
        name: newUnitName.trim(),
        shortName: newUnitShort.trim(),
      });
      if (res.success && res.data) {
        setUnits((prev) => [...prev, res.data]);
        setFormData((prev) => ({ ...prev, unitId: res.data.id }));
        setNewUnitName('');
        setNewUnitShort('');
        setShowAddUnit(false);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (formData.sellingPrice < 0) {
      setError('Selling price cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const res = await api.patch(
          `/businesses/${businessId}/items/${itemToEdit!.id}`,
          formData
        );
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to update item.');
        }
      } else {
        const res = await api.post(`/businesses/${businessId}/items`, formData);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to create item.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? 'Edit Product Item' : 'Add New Product Item'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditing
                ? 'Update pricing, codes, and tax rates for this item'
                : 'Enter product details to add to your stock catalog'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product / Item Name *
            </label>
            <input
              type="text"
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Samsung Galaxy M35 5G (Dark Blue)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Category, Unit & GST Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                <button
                  type="button"
                  onClick={() => setShowAddCat(!showAddCat)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5"
                >
                  <Plus size={12} /> New
                </button>
              </div>
              {showAddCat ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategoryInline}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  name="categoryId"
                  value={formData.categoryId || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Unit */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Unit of Measure</label>
                <button
                  type="button"
                  onClick={() => setShowAddUnit(!showAddUnit)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5"
                >
                  <Plus size={12} /> New
                </button>
              </div>
              {showAddUnit ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="e.g. Meter"
                    className="w-1/2 px-2 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newUnitShort}
                    onChange={(e) => setNewUnitShort(e.target.value)}
                    placeholder="m"
                    className="w-1/4 px-2 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateUnitInline}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  name="unitId"
                  value={formData.unitId || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.shortName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Indian GST Rate
              </label>
              <select
                name="taxRateId"
                value={formData.taxRateId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              >
                <option value="">No Tax / Exempt (0%)</option>
                {taxRates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SKU, Barcode, HSN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">SKU Code</label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5"
                >
                  <Sparkles size={11} /> Auto
                </button>
              </div>
              <input
                type="text"
                name="sku"
                value={formData.sku || ''}
                onChange={handleChange}
                placeholder="e.g. SAM-M35"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition uppercase font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Barcode / EAN</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5"
                >
                  <Sparkles size={11} /> Auto
                </button>
              </div>
              <input
                type="text"
                name="barcode"
                value={formData.barcode || ''}
                onChange={handleChange}
                placeholder="Scan or enter code"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                HSN / SAC Code
              </label>
              <input
                type="text"
                name="hsnCode"
                value={formData.hsnCode || ''}
                onChange={handleChange}
                placeholder="e.g. 8517"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition font-mono"
              />
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pricing & Stock Tracking
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Purchase Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="purchasePrice"
                  value={formData.purchasePrice || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  name="sellingPrice"
                  value={formData.sellingPrice || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Opening Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="openingStock"
                    value={formData.openingStock || ''}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Records an initial StockMovement in the ledger.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Min Stock Alert Level
                </label>
                <input
                  type="number"
                  min="0"
                  name="minStock"
                  value={formData.minStock || ''}
                  onChange={handleChange}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Triggers low stock badge when current stock reaches this.
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Optional product specifications or shelf location..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-60 transition"
            >
              {loading ? 'Saving item...' : isEditing ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


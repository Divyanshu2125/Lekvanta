import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Building2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export interface CustomerData {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  gstin?: string;
  openingBalance: number;
  creditLimit: number;
  notes?: string;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
  customerToEdit?: CustomerData | null;
}

export default function CustomerModal({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  customerToEdit,
}: CustomerModalProps) {
  const isEditing = !!customerToEdit?.id;

  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    phone: '',
    email: '',
    billingAddress: '',
    gstin: '',
    openingBalance: 0,
    creditLimit: 0,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        phone: customerToEdit.phone || '',
        email: customerToEdit.email || '',
        billingAddress: customerToEdit.billingAddress || '',
        gstin: customerToEdit.gstin || '',
        openingBalance: customerToEdit.openingBalance || 0,
        creditLimit: customerToEdit.creditLimit || 0,
        notes: customerToEdit.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        billingAddress: '',
        gstin: '',
        openingBalance: 0,
        creditLimit: 0,
        notes: '',
      });
    }
    setError(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const res = await api.patch(
          `/businesses/${businessId}/customers/${customerToEdit!.id}`,
          formData
        );
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to update customer.');
        }
      } else {
        const res = await api.post(`/businesses/${businessId}/customers`, formData);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to create customer.');
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
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? 'Edit Customer Details' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter customer contact, billing, and credit details
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer / Company Name *
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Sharma Enterprises"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Contact Details: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone / Mobile Number
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="98200 12345"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="client@company.com"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* GSTIN & Billing Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer GSTIN <span className="text-slate-400 font-normal">(Optional for non-GST)</span>
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="gstin"
                maxLength={15}
                value={formData.gstin || ''}
                onChange={handleChange}
                placeholder="27AABCS1429B1Z1"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Billing Address
            </label>
            <textarea
              rows={2}
              name="billingAddress"
              value={formData.billingAddress || ''}
              onChange={handleChange}
              placeholder="Shop/Office No, Street, City, State, Pincode"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white resize-none"
            />
          </div>

          {/* Financials: Opening Balance & Credit Limit */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Financial Balances
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="openingBalance"
                  value={formData.openingBalance || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Positive: Customer owes you (Receivable)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="creditLimit"
                  value={formData.creditLimit || ''}
                  onChange={handleChange}
                  placeholder="0 (Unlimited)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Maximum credit allowed on unpaid invoices
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes / Remarks
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="e.g. VIP client, prefers cheque payment"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
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
              {loading ? 'Saving...' : isEditing ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


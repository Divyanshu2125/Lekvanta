import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Search,
  Upload,
  Download,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  History,
  SlidersHorizontal,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  TrendingDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import ItemModal, { ItemData } from '@/components/items/ItemModal';
import StockAdjustmentModal from '@/components/items/StockAdjustmentModal';
import StockMovementsModal from '@/components/items/StockMovementsModal';
import CsvImportModal from '@/components/items/CsvImportModal';

interface Item {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  currentStock: number;
  minStock: number;
  trackInventory: boolean;
  createdAt: string;
  category?: { id: string; name: string };
  unit?: { id: string; name: string; shortName: string };
  taxRate?: { id: string; name: string; rate: number };
}

export default function Items() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;
  const location = useLocation();
  const navigate = useNavigate();

  // States
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);

  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setEditingItem(null);
      setIsItemModalOpen(true);
    }
  }, [location.pathname]);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);

  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<any | null>(null);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Load items from database
  const fetchItems = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        categoryId: selectedCategory,
        stockStatus,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '20',
      });

      const res = await api.get(`/businesses/${businessId}/items?${params.toString()}`);
      if (res.success && res.data) {
        setItems(res.data);
        if (res.meta) {
          setTotalCount(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
          setLowStockCount((res.meta as any).lowStockCount || 0);
          setOutOfStockCount((res.meta as any).outOfStockCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, selectedCategory, stockStatus, sortBy, sortOrder, page]);

  // Load categories
  useEffect(() => {
    if (!businessId) return;
    const loadCats = async () => {
      const res = await api.get(`/businesses/${businessId}/items/categories`);
      if (res.success && res.data) {
        setCategories(res.data);
      }
    };
    loadCats();
  }, [businessId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Delete Item
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This item will be archived.`)) {
      return;
    }
    try {
      const res = await api.delete(`/businesses/${businessId}/items/${id}`);
      if (res.success) {
        fetchItems();
      }
    } catch (err) {
      console.error('Delete item error', err);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (items.length === 0) return;

    const headers = [
      'Product Name',
      'SKU',
      'Barcode',
      'HSN Code',
      'Category',
      'Unit',
      'Purchase Price',
      'Selling Price',
      'Current Stock',
      'Min Stock Level',
      'GST Rate (%)',
    ];

    const rows = items.map((i) => [
      `"${i.name.replace(/"/g, '""')}"`,
      i.sku || '',
      i.barcode || '',
      i.hsnCode || '',
      `"${i.category?.name || ''}"`,
      i.unit?.shortName || '',
      i.purchasePrice,
      i.sellingPrice,
      i.currentStock,
      i.minStock,
      i.taxRate?.rate || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lekvanta_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inventory value calculation
  const totalStockValuation = items.reduce(
    (sum, i) => sum + (i.purchasePrice > 0 ? i.purchasePrice : i.sellingPrice) * Math.max(0, i.currentStock),
    0
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Items & Inventory</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your product catalog, real-time stock levels, and audit movements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus size={15} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Stock Valuation</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalStockValuation)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{outOfStockCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, barcode, HSN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock (&gt; 0)</option>
            <option value="low_stock">Low Stock (≤ Threshold)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="name">Sort: Name</option>
            <option value="sellingPrice">Sort: Price</option>
            <option value="currentStock">Sort: Stock</option>
            <option value="createdAt">Sort: Recently Added</option>
          </select>

          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
            title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown size={14} />
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-left">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Stock Level</th>
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading products catalog...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Boxes size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search || selectedCategory !== 'all' || stockStatus !== 'all'
                        ? 'Try clearing your filters or search keywords.'
                        : 'Click "Add Item" or "Import CSV" to add products to your inventory.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isOutOfStock = item.currentStock <= 0;
                  const isLowStock = !isOutOfStock && item.currentStock <= item.minStock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition group">
                      {/* Name & HSN */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                        {item.hsnCode && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            HSN: {item.hsnCode}
                          </p>
                        )}
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-3 px-4">
                        <p className="font-mono text-slate-700 font-medium">
                          {item.sku || '—'}
                        </p>
                        {item.barcode && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.barcode}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-slate-900 text-sm">
                          {formatCurrency(item.sellingPrice)}
                        </p>
                        {item.purchasePrice > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Cost: {formatCurrency(item.purchasePrice)}
                          </p>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-4 text-right">
                        <p
                          className={cn(
                            'font-bold text-sm',
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          )}
                        >
                          {item.currentStock} {item.unit?.shortName || ''}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Min: {item.minStock} {item.unit?.shortName || ''}
                        </p>
                      </td>

                      {/* GST */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                          {item.taxRate ? `${item.taxRate.rate}%` : '0%'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={12} /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock Adjustment */}
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingItem(item);
                              setIsAdjustModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Adjust stock quantity"
                          >
                            <SlidersHorizontal size={14} />
                          </button>

                          {/* Movements History */}
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryItem(item);
                              setIsMovementsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="View stock movement ledger"
                          >
                            <History size={14} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem({
                                id: item.id,
                                name: item.name,
                                sku: item.sku,
                                barcode: item.barcode,
                                hsnCode: item.hsnCode,
                                description: item.description,
                                categoryId: item.category?.id,
                                unitId: item.unit?.id,
                                taxRateId: item.taxRate?.id,
                                purchasePrice: item.purchasePrice,
                                sellingPrice: item.sellingPrice,
                                openingStock: item.openingStock,
                                minStock: item.minStock,
                                trackInventory: item.trackInventory,
                              });
                              setIsItemModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Edit product"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            <p>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * 20 + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(page * 20, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{totalCount}</span> items
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium transition"
              >
                Previous
              </button>

              <span className="px-2.5 py-1 font-semibold text-indigo-700 bg-indigo-50 rounded-lg">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {businessId && (
        <>
          <ItemModal
            isOpen={isItemModalOpen}
            onClose={() => {
              setIsItemModalOpen(false);
              if (location.pathname.endsWith('/new')) navigate('/items', { replace: true });
            }}
            onSuccess={fetchItems}
            businessId={businessId}
            itemToEdit={editingItem}
          />

          <StockAdjustmentModal
            isOpen={isAdjustModalOpen}
            onClose={() => {
              setIsAdjustModalOpen(false);
              setAdjustingItem(null);
            }}
            onSuccess={fetchItems}
            businessId={businessId}
            item={adjustingItem}
          />

          <StockMovementsModal
            isOpen={isMovementsModalOpen}
            onClose={() => {
              setIsMovementsModalOpen(false);
              setHistoryItem(null);
            }}
            businessId={businessId}
            item={historyItem}
          />

          <CsvImportModal
            isOpen={isCsvModalOpen}
            onClose={() => setIsCsvModalOpen(false)}
            onSuccess={fetchItems}
            businessId={businessId}
          />
        </>
      )}
    </div>
  );
}

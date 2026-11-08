import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
}

export default function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  businessId,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const csvContent =
      'name,sku,barcode,hsnCode,purchasePrice,sellingPrice,openingStock,minStock\n' +
      'Samsung Galaxy M35 5G,SAM-M35,890123450003,8517,14500,17999,10,3\n' +
      'Canon Printer Ink GI-790,CAN-INK-B,890123450004,3215,420,599,25,5\n' +
      'Logitech M100 Mouse,LOG-M100,890123450006,8471,280,450,15,4\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'lekvanta_items_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) {
          setError('CSV must contain a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim());
          const rowObj: any = {};
          headers.forEach((h, index) => {
            rowObj[h] = values[index] || '';
          });

          if (rowObj.name) {
            rows.push({
              name: rowObj.name,
              sku: rowObj.sku || null,
              barcode: rowObj.barcode || null,
              hsnCode: rowObj.hsncode || rowObj['hsn code'] || null,
              purchasePrice: parseFloat(rowObj.purchaseprice || rowObj['purchase price'] || '0') || 0,
              sellingPrice: parseFloat(rowObj.sellingprice || rowObj['selling price'] || '0') || 0,
              openingStock: parseFloat(rowObj.openingstock || rowObj['opening stock'] || '0') || 0,
              minStock: parseFloat(rowObj.minstock || rowObj['min stock'] || '5') || 5,
            });
          }
        }

        if (rows.length === 0) {
          setError('No valid product rows found in the CSV file.');
          return;
        }

        setParsedRows(rows);
      } catch (err: any) {
        setError('Failed to parse CSV file: ' + err.message);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/businesses/${businessId}/items/import-csv`, {
        items: parsedRows,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to import items.');
      }
    } catch (err: any) {
      setError(err.message || 'Import request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Upload size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Products from CSV</h2>
              <p className="text-xs text-slate-400 mt-0.5">Bulk upload catalog items and initial stock</p>
            </div>
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

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Template Download pill */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText size={16} className="text-indigo-600" />
              <span>Need the standard CSV format template?</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Download size={13} />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition flex flex-col items-center justify-center gap-2"
          >
            <Upload size={28} className="text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {fileName ? fileName : 'Click to select or drop your .csv file here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports columns: name, sku, barcode, hsnCode, purchasePrice, sellingPrice, openingStock
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Parsed Preview */}
          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Preview ({parsedRows.length} items found)
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 size={13} /> Ready to import
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">Item Name</th>
                      <th className="py-2 px-3 text-left">SKU</th>
                      <th className="py-2 px-3 text-right">Selling Price</th>
                      <th className="py-2 px-3 text-right">Opening Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 truncate max-w-[160px] font-medium">{row.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{row.sku || '—'}</td>
                        <td className="py-2 px-3 text-right font-semibold">₹{row.sellingPrice}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{row.openingStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[10px] text-slate-400 text-right mt-1">
                  + {parsedRows.length - 10} more items will be imported.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || parsedRows.length === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 transition"
          >
            {loading ? 'Importing items...' : `Import ${parsedRows.length} Items`}
          </button>
        </div>
      </div>
    </div>
  );
}


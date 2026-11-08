import { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Check,
  AlertCircle,
  Save,
  Shield,
  Printer,
  HardDrive,
  FolderOpen,
  RefreshCw,
  Monitor,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export default function Settings() {
  const { currentBusiness, setCurrentBusiness, user } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Electron / Desktop State ──
  const [appVersion, setAppVersion] = useState('');
  const [dbInfo, setDbInfo] = useState<{ path: string; sizeKB: string; sizeMB: string } | null>(null);
  const [printers, setPrinters] = useState<Array<{ name: string; displayName: string; isDefault: boolean }>>([]);
  const [desktopSettings, setDesktopSettings] = useState({
    defaultInvoicePrinter: '',
    thermalPrinter: '',
    thermalPaperWidth: '80mm',
    autoBackupOnExit: false,
    defaultInvoiceFormat: 'A4',
  });
  const [desktopMsg, setDesktopMsg] = useState('');
  const [desktopErr, setDesktopErr] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [type, setType] = useState<string>('RETAIL');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [purchasePrefix, setPurchasePrefix] = useState('PB');

  useEffect(() => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}`).then((res) => {
      if (res.success && res.data) {
        const b = res.data;
        setName(b.name || '');
        setPhone(b.phone || '');
        setEmail(b.email || '');
        setGstin(b.gstin || '');
        setAddress(b.address || '');
        setCity(b.city || '');
        setState(b.state || '');
        setPincode(b.pincode || '');
        setType(b.type || 'RETAIL');
        setInvoicePrefix(b.invoicePrefix || 'INV');
        setPurchasePrefix(b.purchasePrefix || 'PB');
      }
    });

    // Load Electron desktop info
    if (isElectron && window.electronAPI) {
      window.electronAPI.getAppVersion().then(setAppVersion);
      window.electronAPI.getDatabaseInfo().then((info) => {
        if (!info.error) setDbInfo(info);
      });
      window.electronAPI.getPrinters().then(setPrinters);
      window.electronAPI.getAppSettings().then((s) => {
        if (s) setDesktopSettings((prev) => ({ ...prev, ...s }));
      });
    }
  }, [businessId]);

  const handleSaveDesktop = async () => {
    if (!window.electronAPI) return;
    setDesktopErr('');
    setDesktopMsg('');
    const res = await window.electronAPI.saveAppSettings(desktopSettings);
    if (res.success) setDesktopMsg('Desktop settings saved!');
    else setDesktopErr(res.error || 'Failed to save.');
  };

  const handleBackup = async () => {
    if (!window.electronAPI) return;
    setBackupLoading(true);
    setDesktopErr('');
    setDesktopMsg('');
    const res = await window.electronAPI.backupDatabase();
    setBackupLoading(false);
    if (res.canceled) return;
    if (res.success) setDesktopMsg(`Backup saved: ${res.path}`);
    else setDesktopErr(res.error || 'Backup failed.');
  };

  const handleRestore = async () => {
    if (!window.electronAPI) return;
    setRestoreLoading(true);
    setDesktopErr('');
    setDesktopMsg('');
    const res = await window.electronAPI.restoreDatabase();
    setRestoreLoading(false);
    if (res.canceled) return;
    if (res.success) setDesktopMsg('Database restored successfully. Reloading…');
    else setDesktopErr(res.error || 'Restore failed.');
  };

  const handleTestA4Print = async () => {
    if (!window.electronAPI) return;
    const html = `<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>Lekvanta</h1><p>A4 Test Print — ${new Date().toLocaleString()}</p></body></html>`;
    const res = await window.electronAPI.printDocument({ html, printerName: desktopSettings.defaultInvoicePrinter, silent: true });
    if (!res.success) setDesktopErr(res.error || 'Print failed');
    else setDesktopMsg('A4 test print sent!');
  };

  const handleTestThermal = async () => {
    if (!window.electronAPI) return;
    const width = desktopSettings.thermalPaperWidth;
    const html = `<html><body style="font-family:monospace;font-size:12px;width:${width};padding:4px"><div style="text-align:center"><b>LEKVANTA</b><br/>Thermal Test<br/>${new Date().toLocaleString()}</div></body></html>`;
    const res = await window.electronAPI.printThermal({ html, printerName: desktopSettings.thermalPrinter, paperWidth: width });
    if (!res.success) setDesktopErr(res.error || 'Thermal print failed');
    else setDesktopMsg('Thermal test print sent!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Business name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state || undefined,
        pincode: pincode.trim() || undefined,
        type: type as any,
        invoicePrefix: invoicePrefix.trim() || 'INV',
        purchasePrefix: purchasePrefix.trim() || 'PB',
      };

      const res = await api.patch(`/businesses/${businessId}`, payload);
      if (res.success && res.data) {
        setSuccessMsg('Business settings updated successfully!');
        if (currentBusiness) {
          setCurrentBusiness({
            ...currentBusiness,
            ...res.data,
          });
        }
      } else {
        setErrorMsg(res.error || res.message || 'Failed to update settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Business Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your business profile, invoicing prefix and tax information
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl">
          <Check size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Profile Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Business Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Business Legal Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Enterprises Pvt. Ltd."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Business Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="RETAIL">Retailer</option>
                <option value="WHOLESALE">Wholesaler / Distributor</option>
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="SERVICE">Service Provider</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AADCB2230M1Z2"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Business Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Business Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Registered Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No, Building, Street..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select state...</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice & Prefix Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText size={18} className="text-purple-600" />
            <h2 className="text-sm font-bold text-slate-800">Document Prefix & Numbering</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Sales Invoice Prefix
              </label>
              <input
                type="text"
                maxLength={10}
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="INV"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Next invoice example: {invoicePrefix}-0001
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Purchase Bill Prefix
              </label>
              <input
                type="text"
                maxLength={10}
                value={purchasePrefix}
                onChange={(e) => setPurchasePrefix(e.target.value.toUpperCase())}
                placeholder="PB"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Next bill example: {purchasePrefix}-0001
              </span>
            </div>
          </div>
        </div>

        {/* User & Access Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield size={18} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">Account & Security</h2>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p>
              Logged in as: <span className="font-semibold text-slate-900">{user?.name}</span> (
              {user?.email})
            </p>
            <p>
              Current Business ID: <span className="font-mono text-slate-500">{businessId}</span>
            </p>
            <p>
              Role: <span className="font-semibold text-indigo-600">{currentBusiness?.role || 'ADMIN'}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Save size={15} />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* ── Desktop & Hardware Settings (Electron only) ── */}
      {isElectron && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Monitor size={18} className="text-cyan-600" />
              Desktop &amp; Hardware Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure printers, PDF defaults, and database backup — available in the desktop app.
              {appVersion && <span className="ml-2 font-mono text-slate-400">v{appVersion}</span>}
            </p>
          </div>

          {desktopMsg && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl">
              <Check size={15} className="shrink-0" />
              <span className="break-all">{desktopMsg}</span>
            </div>
          )}
          {desktopErr && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="shrink-0" />
              <span>{desktopErr}</span>
            </div>
          )}

          {/* Printer Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Printer size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Printer Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default Invoice Printer (A4)
                </label>
                <select
                  value={desktopSettings.defaultInvoicePrinter}
                  onChange={(e) => setDesktopSettings((p) => ({ ...p, defaultInvoicePrinter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">System Default</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name}{p.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTestA4Print}
                  className="mt-2 text-xs text-indigo-600 hover:underline"
                >
                  Send A4 test page →
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Thermal POS Printer
                </label>
                <select
                  value={desktopSettings.thermalPrinter}
                  onChange={(e) => setDesktopSettings((p) => ({ ...p, thermalPrinter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">System Default</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name}{p.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTestThermal}
                  className="mt-2 text-xs text-indigo-600 hover:underline"
                >
                  Send thermal test receipt →
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Thermal Paper Width
                </label>
                <select
                  value={desktopSettings.thermalPaperWidth}
                  onChange={(e) => setDesktopSettings((p) => ({ ...p, thermalPaperWidth: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="58mm">58mm (Narrow)</option>
                  <option value="80mm">80mm (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default Invoice Print Format
                </label>
                <select
                  value={desktopSettings.defaultInvoiceFormat}
                  onChange={(e) => setDesktopSettings((p) => ({ ...p, defaultInvoiceFormat: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="A4">A4 Standard</option>
                  <option value="A5">A5 Compact</option>
                  <option value="80MM">80mm POS</option>
                  <option value="58MM">58mm Thermal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Database Backup & Restore */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HardDrive size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Database Backup &amp; Restore</h3>
            </div>

            {dbInfo && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs space-y-1">
                <p className="text-slate-500 font-medium">Current Database</p>
                <p className="font-mono text-slate-700 break-all">{dbInfo.path}</p>
                <p className="text-slate-500">
                  Size: <span className="font-semibold text-slate-700">{dbInfo.sizeMB} MB</span>
                  <button
                    onClick={() => window.electronAPI?.openPath(dbInfo.path)}
                    className="ml-3 text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    <FolderOpen size={11} /> Show in Explorer
                  </button>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <HardDrive size={14} />
                {backupLoading ? 'Backing up…' : 'Backup Database Now'}
              </button>

              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <RefreshCw size={14} />
                {restoreLoading ? 'Restoring…' : 'Restore from Backup…'}
              </button>

              <button
                onClick={async () => {
                  const res = await window.electronAPI?.openLogFile();
                  if (!res?.success && res?.error) {
                    setDesktopErr(res.error);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <FileText size={14} />
                Open Diagnostics Log
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDesktopSettings((p) => ({ ...p, autoBackupOnExit: !p.autoBackupOnExit }))}
                className="text-indigo-600"
              >
                {desktopSettings.autoBackupOnExit
                  ? <ToggleRight size={22} className="text-indigo-600" />
                  : <ToggleLeft size={22} className="text-slate-400" />}
              </button>
              <span className="text-xs text-slate-700">
                Auto-backup database on application exit
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveDesktop}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Save size={15} />
              Save Desktop Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

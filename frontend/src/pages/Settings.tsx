import { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Building2,
  Landmark,
  Users,
  Shield,
  Monitor,
  Check,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  QrCode,
  CheckCircle2,
  Printer,
  HardDrive,
  FolderOpen,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  FileText,
  Star,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

const BUSINESS_TYPES = [
  'RETAIL',
  'WHOLESALE',
  'SERVICES',
  'MANUFACTURING',
  'TRADER',
  'DISTRIBUTOR',
  'OTHER',
];

const ROLES = [
  { value: 'ADMIN', label: 'Admin', desc: 'Full access to all modules and business operations' },
  { value: 'MANAGER', label: 'Manager', desc: 'Can manage inventory, sales, purchases, and parties' },
  { value: 'CASHIER', label: 'Cashier', desc: 'Can only create bills, sales, and receive customer payments' },
  { value: 'STAFF', label: 'Staff', desc: 'Basic read access with sales entry capability' },
];

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

interface BankAccount {
  id: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  accountType: string;
  upiId?: string;
  isPrimary: boolean;
}

interface TeamMember {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profilePhoto?: string;
  };
}

type TabType = 'profile' | 'shop' | 'bank' | 'users' | 'security' | 'desktop';

export default function Settings() {
  const { currentBusiness, setCurrentBusiness, user, setUser } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Helper to clear messages
  const notify = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. MY PROFILE STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAltPhone, setProfileAltPhone] = useState(user?.alternatePhone || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [profileDob, setProfileDob] = useState(user?.dob || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profileCity, setProfileCity] = useState(user?.city || '');
  const [profileState, setProfileState] = useState(user?.state || '');
  const [profilePincode, setProfilePincode] = useState(user?.pincode || '');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileAltPhone(user.alternatePhone || '');
      setProfilePhoto(user.profilePhoto || '');
      setProfileDob(user.dob || '');
      setProfileAddress(user.address || '');
      setProfileCity(user.city || '');
      setProfileState(user.state || '');
      setProfilePincode(user.pincode || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      notify('Please enter your full name', true);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        name: profileName,
        phone: profilePhone,
        alternatePhone: profileAltPhone,
        profilePhoto: profilePhoto,
        dob: profileDob || undefined,
        address: profileAddress,
        city: profileCity,
        state: profileState,
        pincode: profilePincode,
      });

      if (res.success && res.data) {
        setUser(res.data);
        notify('Profile updated successfully!');
      } else {
        notify(res.error || 'Failed to update profile', true);
      }
    } catch {
      notify('Network error updating profile', true);
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SHOP DETAILS STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [shopName, setShopName] = useState('');
  const [shopLogo, setShopLogo] = useState('');
  const [shopType, setShopType] = useState('RETAIL');
  const [shopOwnerName, setShopOwnerName] = useState('');
  const [shopGstin, setShopGstin] = useState('');
  const [shopPan, setShopPan] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopState, setShopState] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopPincode, setShopPincode] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopWebsite, setShopWebsite] = useState('');
  const [shopFinancialYear, setShopFinancialYear] = useState('2024-2025');
  const [shopInvoicePrefix, setShopInvoicePrefix] = useState('INV');
  const [shopPurchasePrefix, setShopPurchasePrefix] = useState('PB');

  const loadShopDetails = async () => {
    if (!businessId) return;
    try {
      const res = await api.get(`/businesses/${businessId}`);
      if (res.success && res.data) {
        const b = res.data;
        setShopName(b.name || '');
        setShopLogo(b.logoUrl || '');
        setShopType(b.type || 'RETAIL');
        setShopOwnerName(b.ownerName || '');
        setShopGstin(b.gstin || '');
        setShopPan(b.panNumber || '');
        setShopAddress(b.address || '');
        setShopState(b.state || '');
        setShopCity(b.city || '');
        setShopPincode(b.pincode || '');
        setShopPhone(b.phone || '');
        setShopEmail(b.email || '');
        setShopWebsite(b.website || '');
        setShopFinancialYear(b.financialYear || '2024-2025');
        setShopInvoicePrefix(b.invoicePrefix || 'INV');
        setShopPurchasePrefix(b.purchasePrefix || 'PB');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadShopDetails();
  }, [businessId]);

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!shopName.trim()) {
      notify('Shop / Business name is required', true);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/businesses/${businessId}`, {
        name: shopName,
        logoUrl: shopLogo || undefined,
        type: shopType,
        ownerName: shopOwnerName,
        gstin: shopGstin,
        panNumber: shopPan,
        address: shopAddress,
        state: shopState,
        city: shopCity,
        pincode: shopPincode,
        phone: shopPhone,
        email: shopEmail,
        website: shopWebsite,
        financialYear: shopFinancialYear,
        invoicePrefix: shopInvoicePrefix,
        purchasePrefix: shopPurchasePrefix,
      });

      if (res.success && res.data) {
        setCurrentBusiness(res.data);
        notify('Shop details updated successfully! Updated info will appear on invoices and reports.');
      } else {
        notify(res.error || 'Failed to update shop details', true);
      }
    } catch {
      notify('Network error updating shop details', true);
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. BANK DETAILS STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [revealedAccounts, setRevealedAccounts] = useState<Set<string>>(new Set());
  const [editingBankId, setEditingBankId] = useState<string | null>(null);

  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccNumber, setBankAccNumber] = useState('');
  const [bankConfirmAccNumber, setBankConfirmAccNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankType, setBankType] = useState('CURRENT');
  const [bankUpi, setBankUpi] = useState('');
  const [bankIsPrimary, setBankIsPrimary] = useState(false);

  const loadBankAccounts = async () => {
    if (!businessId) return;
    setLoadingBanks(true);
    try {
      const res = await api.get(`/businesses/${businessId}/bank-accounts`);
      if (res.success && Array.isArray(res.data)) {
        setBankAccounts(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bank') {
      loadBankAccounts();
    }
  }, [activeTab, businessId]);

  const openAddBankModal = () => {
    setEditingBankId(null);
    setBankHolder(shopOwnerName || user?.name || '');
    setBankName('');
    setBankAccNumber('');
    setBankConfirmAccNumber('');
    setBankIfsc('');
    setBankBranch('');
    setBankType('CURRENT');
    setBankUpi('');
    setBankIsPrimary(bankAccounts.length === 0);
    setShowBankModal(true);
  };

  const openEditBankModal = (bank: BankAccount) => {
    setEditingBankId(bank.id);
    setBankHolder(bank.accountHolder);
    setBankName(bank.bankName);
    setBankAccNumber(bank.accountNumber);
    setBankConfirmAccNumber(bank.accountNumber);
    setBankIfsc(bank.ifscCode);
    setBankBranch(bank.branchName || '');
    setBankType(bank.accountType);
    setBankUpi(bank.upiId || '');
    setBankIsPrimary(bank.isPrimary);
    setShowBankModal(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    if (!bankHolder.trim()) return notify('Account Holder Name is required', true);
    if (!bankName.trim()) return notify('Bank Name is required', true);
    if (!bankAccNumber.trim()) return notify('Account Number is required', true);
    if (bankAccNumber !== bankConfirmAccNumber) {
      return notify('Account Numbers do not match! Please check.', true);
    }
    const cleanIfsc = bankIfsc.trim().toUpperCase();
    if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return notify('Invalid IFSC Code! Format example: HDFC0001234', true);
    }
    if (bankUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(bankUpi.trim())) {
      return notify('Invalid UPI ID format! Example: merchant@upi', true);
    }

    setSaving(true);
    try {
      const payload = {
        accountHolder: bankHolder,
        bankName: bankName,
        accountNumber: bankAccNumber,
        ifscCode: cleanIfsc,
        branchName: bankBranch || undefined,
        accountType: bankType,
        upiId: bankUpi.trim() || undefined,
        isPrimary: bankIsPrimary,
      };

      let res;
      if (editingBankId) {
        res = await api.patch(`/businesses/${businessId}/bank-accounts/${editingBankId}`, payload);
      } else {
        res = await api.post(`/businesses/${businessId}/bank-accounts`, payload);
      }

      if (res.success) {
        notify(editingBankId ? 'Bank account updated successfully!' : 'Bank account added successfully!');
        setShowBankModal(false);
        loadBankAccounts();
      } else {
        notify(res.error || 'Failed to save bank account', true);
      }
    } catch {
      notify('Network error saving bank account', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/bank-accounts/${id}`);
      if (res.success) {
        notify('Bank account removed');
        loadBankAccounts();
      } else {
        notify(res.error || 'Failed to delete bank account', true);
      }
    } catch {
      notify('Error deleting bank account', true);
    }
  };

  const handleSetPrimaryBank = async (id: string) => {
    try {
      const res = await api.post(`/businesses/${businessId}/bank-accounts/${id}/set-primary`, {});
      if (res.success) {
        notify('Primary bank account updated!');
        loadBankAccounts();
      } else {
        notify(res.error || 'Failed to set primary bank', true);
      }
    } catch {
      notify('Error updating primary bank', true);
    }
  };

  const toggleRevealAccount = (id: string) => {
    setRevealedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskAccountNumber = (acc: string) => {
    if (!acc || acc.length < 5) return acc;
    return '•••• •••• ' + acc.slice(-4);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. USER MANAGEMENT STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Add User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('CASHIER');
  const [newUserPassword, setNewUserPassword] = useState('Lekvanta@123');

  // Edit User Form
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserStatus, setEditUserStatus] = useState('ACTIVE');

  // Reset Password Form
  const [resetPasswordVal, setResetPasswordVal] = useState('Lekvanta@123');

  const isOwnerOrAdmin = currentBusiness?.role === 'OWNER' || currentBusiness?.role === 'ADMIN' || !currentBusiness?.role;

  const loadTeamMembers = async () => {
    if (!businessId) return;
    setLoadingUsers(true);
    try {
      const res = await api.get(`/businesses/${businessId}/users`);
      if (res.success && Array.isArray(res.data)) {
        setTeamMembers(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadTeamMembers();
    }
  }, [activeTab, businessId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      return notify('Name and Email are required', true);
    }
    setSaving(true);
    try {
      const res = await api.post(`/businesses/${businessId}/users`, {
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone || undefined,
        role: newUserRole,
        password: newUserPassword || 'Lekvanta@123',
      });

      if (res.success) {
        notify('User added to business successfully!');
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserRole('CASHIER');
        loadTeamMembers();
      } else {
        notify(res.error || 'Failed to add user', true);
      }
    } catch {
      notify('Network error adding user', true);
    } finally {
      setSaving(false);
    }
  };

  const openEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditUserName(member.user.name);
    setEditUserPhone(member.user.phone || '');
    setEditUserRole(member.role);
    setEditUserStatus(member.status);
    setShowEditUserModal(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSaving(true);
    try {
      const res = await api.patch(`/businesses/${businessId}/users/${selectedMember.id}`, {
        name: editUserName,
        phone: editUserPhone,
        role: editUserRole,
        status: editUserStatus,
      });

      if (res.success) {
        notify('User updated successfully!');
        setShowEditUserModal(false);
        loadTeamMembers();
      } else {
        notify(res.error || 'Failed to update user', true);
      }
    } catch {
      notify('Error updating user', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (membershipId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from this shop?`)) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/users/${membershipId}`);
      if (res.success) {
        notify('Member removed successfully');
        loadTeamMembers();
      } else {
        notify(res.error || 'Failed to remove member', true);
      }
    } catch {
      notify('Error removing member', true);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      return notify('Password must be at least 6 characters', true);
    }
    setSaving(true);
    try {
      const res = await api.post(`/businesses/${businessId}/users/${selectedMember.id}/reset-password`, {
        password: resetPasswordVal,
      });

      if (res.success) {
        notify(`Password reset for ${selectedMember.user.name}!`);
        setShowResetPassModal(false);
      } else {
        notify(res.error || 'Failed to reset password', true);
      }
    } catch {
      notify('Error resetting password', true);
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SECURITY SETTINGS STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return notify('Current password is required', true);
    if (!newPassword || newPassword.length < 6) {
      return notify('New password must be at least 6 characters', true);
    }
    if (newPassword !== confirmNewPassword) {
      return notify('New passwords do not match!', true);
    }

    setSaving(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        notify('Password updated successfully! Please use your new password next time you sign in.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        notify(res.error || 'Failed to change password', true);
      }
    } catch {
      notify('Network error changing password', true);
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 6. ELECTRON / DESKTOP HARDWARE STATE
  // ──────────────────────────────────────────────────────────────────────────
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

  useEffect(() => {
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
  }, []);

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

  // Nav Items definition
  const navTabs = [
    { id: 'profile', label: 'My Profile', icon: UserIcon, desc: 'Personal details and contact info' },
    { id: 'shop', label: 'Shop Details', icon: Building2, desc: 'Business profile, GSTIN & invoice header' },
    { id: 'bank', label: 'Bank Details', icon: Landmark, desc: 'Bank accounts, UPI & QR code for payments' },
    { id: 'users', label: 'User Management', icon: Users, desc: 'Team roles, staff access & passwords' },
    { id: 'security', label: 'Security Settings', icon: Shield, desc: 'Password change & account protection' },
    ...(isElectron
      ? [{ id: 'desktop', label: 'Desktop & Printers', icon: Monitor, desc: 'Printers, thermal receipt & backup' }]
      : []),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal profile, business information, banking, team access, and system preferences.
        </p>
      </div>

      {/* Global Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl shadow-sm transition animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl shadow-sm transition animate-in fade-in">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Layout Grid: Sidebar Navigation + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 lg:col-span-1 space-y-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
                  isActive
                    ? 'bg-indigo-50/80 text-indigo-700 font-semibold border-l-4 border-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon size={18} className={cn('shrink-0 mt-0.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                <div className="min-w-0">
                  <p className="text-sm leading-tight truncate">{tab.label}</p>
                  <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 1: MY PROFILE */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserIcon size={18} className="text-indigo-600" />
                    Personal Profile
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your personal information and account details.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Save size={14} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* Profile Photo & Basic Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center font-bold text-xl text-indigo-600 overflow-hidden shrink-0 shadow-sm">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={profileName} className="w-full h-full object-cover" />
                  ) : (
                    profileName?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Profile Photo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={profilePhoto}
                      onChange={(e) => setProfilePhoto(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    {profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setProfilePhoto('')}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Direct image link (PNG, JPG, or SVG)</p>
                </div>
              </div>

              {/* Personal Details Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email Address <span className="text-slate-400">(Linked with account)</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profileEmail}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Alternate Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional backup phone"
                    value={profileAltPhone}
                    onChange={(e) => setProfileAltPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={profileDob}
                    onChange={(e) => setProfileDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    State
                  </label>
                  <select
                    value={profileState}
                    onChange={(e) => setProfileState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Residential / Communication Address
                  </label>
                  <textarea
                    rows={2}
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder="Building, street, landmark…"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={profilePincode}
                    onChange={(e) => setProfilePincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Save size={15} />
                  {saving ? 'Saving Changes…' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 2: SHOP DETAILS */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'shop' && (
            <form onSubmit={handleSaveShop} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={18} className="text-indigo-600" />
                    Shop &amp; Business Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This information appears automatically on your invoices, receipts, and GST reports.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Save size={14} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* Shop Logo & Invoice Preview */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {shopLogo ? (
                      <img src={shopLogo} alt={shopName} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Shop Logo URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/shop-logo.png"
                      value={shopLogo}
                      onChange={(e) => setShopLogo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Square or rectangular logo to be printed on receipts and invoices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Shop / Legal Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Lekvanta Stationery & Xerox"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Business Type
                  </label>
                  <select
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Proprietor / Owner Name
                  </label>
                  <input
                    type="text"
                    placeholder="Name of owner"
                    value={shopOwnerName}
                    onChange={(e) => setShopOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="22AAAAA0000A1Z5"
                    value={shopGstin}
                    onChange={(e) => setShopGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={shopPan}
                    onChange={(e) => setShopPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Business Address
                  </label>
                  <textarea
                    rows={2}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="Shop No, Complex, Street, Area…"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={shopCity}
                    onChange={(e) => setShopCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    State
                  </label>
                  <select
                    value={shopState}
                    onChange={(e) => setShopState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={shopPincode}
                    onChange={(e) => setShopPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Shop Mobile / Phone
                  </label>
                  <input
                    type="tel"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Shop Email Address
                  </label>
                  <input
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://myshop.com"
                    value={shopWebsite}
                    onChange={(e) => setShopWebsite(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Financial Year
                  </label>
                  <select
                    value={shopFinancialYear}
                    onChange={(e) => setShopFinancialYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="2024-2025">2024–2025</option>
                    <option value="2025-2026">2025–2026</option>
                    <option value="2026-2027">2026–2027</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={shopInvoicePrefix}
                    onChange={(e) => setShopInvoicePrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Purchase Bill Prefix
                  </label>
                  <input
                    type="text"
                    value={shopPurchasePrefix}
                    onChange={(e) => setShopPurchasePrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Save size={15} />
                  {saving ? 'Saving Changes…' : 'Save Shop Details'}
                </button>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 3: BANK DETAILS */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Landmark size={18} className="text-indigo-600" />
                      Bank &amp; Payment Accounts
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your official bank accounts, UPI IDs, and QR codes for payment on invoices.
                    </p>
                  </div>
                  <button
                    onClick={openAddBankModal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Plus size={14} />
                    Add Bank Account
                  </button>
                </div>

                {/* Bank Accounts List */}
                {loadingBanks ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading bank accounts…</div>
                ) : bankAccounts.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Landmark size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No bank accounts added</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Add your bank account and UPI details so customers can pay directly via bank transfer or QR code.
                    </p>
                    <button
                      onClick={openAddBankModal}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                      + Add First Bank Account
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bankAccounts.map((b) => {
                      const isRevealed = revealedAccounts.has(b.id);
                      return (
                        <div
                          key={b.id}
                          className={cn(
                            'p-4 rounded-xl border transition-all relative flex flex-col justify-between space-y-3',
                            b.isPrimary ? 'bg-indigo-50/40 border-indigo-200 shadow-sm' : 'bg-white border-slate-200'
                          )}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                  <Landmark size={16} />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{b.bankName}</h3>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{b.accountHolder}</p>
                                </div>
                              </div>
                              {b.isPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                                  <Star size={10} className="fill-white" /> Primary
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSetPrimaryBank(b.id)}
                                  className="text-[11px] text-slate-400 hover:text-indigo-600 font-medium transition"
                                >
                                  Set Primary
                                </button>
                              )}
                            </div>

                            <div className="mt-4 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400 text-[11px]">Account No</span>
                                <div className="flex items-center gap-1.5 font-mono font-medium text-slate-800">
                                  <span>{isRevealed ? b.accountNumber : maskAccountNumber(b.accountNumber)}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealAccount(b.id)}
                                    title={isRevealed ? 'Mask' : 'Reveal'}
                                    className="text-slate-400 hover:text-slate-600 p-0.5"
                                  >
                                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400 text-[11px]">IFSC Code</span>
                                <span className="font-mono font-bold text-slate-800 uppercase">{b.ifscCode}</span>
                              </div>

                              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400 text-[11px]">Account Type</span>
                                <span className="text-slate-700 font-medium capitalize">{b.accountType.toLowerCase()}</span>
                              </div>

                              {b.branchName && (
                                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                  <span className="text-slate-400 text-[11px]">Branch</span>
                                  <span className="text-slate-700">{b.branchName}</span>
                                </div>
                              )}

                              {b.upiId && (
                                <div className="flex items-center justify-between py-1">
                                  <span className="text-slate-400 text-[11px]">UPI ID</span>
                                  <span className="font-mono text-indigo-600 font-semibold">{b.upiId}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100/60">
                            <button
                              onClick={() => openEditBankModal(b)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition flex items-center gap-1"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBank(b.id)}
                              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add / Edit Bank Account Modal */}
              {showBankModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Landmark size={16} className="text-indigo-600" />
                        {editingBankId ? 'Edit Bank Account' : 'Add Bank Account'}
                      </h3>
                      <button
                        onClick={() => setShowBankModal(false)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveBankAccount} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Account Holder Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={bankHolder}
                          onChange={(e) => setBankHolder(e.target.value)}
                          placeholder="As shown in bank passbook"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Bank Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. HDFC Bank, SBI"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Account Type
                          </label>
                          <select
                            value={bankType}
                            onChange={(e) => setBankType(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          >
                            <option value="CURRENT">Current Account</option>
                            <option value="SAVINGS">Savings Account</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Account Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            value={bankAccNumber}
                            onChange={(e) => setBankAccNumber(e.target.value.replace(/\s+/g, ''))}
                            placeholder="Enter account number"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Confirm Account Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bankConfirmAccNumber}
                            onChange={(e) => setBankConfirmAccNumber(e.target.value.replace(/\s+/g, ''))}
                            placeholder="Re-enter to confirm"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            IFSC Code <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={11}
                            placeholder="e.g. SBIN0001234"
                            value={bankIfsc}
                            onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Branch Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Main Branch"
                            value={bankBranch}
                            onChange={(e) => setBankBranch(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          UPI ID (For Instant QR Code Payment)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. merchant@icici, 9876543210@paytm"
                          value={bankUpi}
                          onChange={(e) => setBankUpi(e.target.value.toLowerCase().trim())}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* UPI QR Preview */}
                      {bankUpi && (
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3">
                          <QrCode size={36} className="text-indigo-600 shrink-0" />
                          <div className="text-xs">
                            <p className="font-semibold text-slate-800">Dynamic UPI QR enabled</p>
                            <p className="text-[11px] text-slate-500 font-mono">{bankUpi}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="primaryBankCheck"
                          checked={bankIsPrimary}
                          onChange={(e) => setBankIsPrimary(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="primaryBankCheck" className="text-xs text-slate-700 cursor-pointer">
                          Set this as the primary bank account for invoice receipts
                        </label>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowBankModal(false)}
                          className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                          {saving ? 'Saving…' : editingBankId ? 'Update Account' : 'Save Account'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 4: USER MANAGEMENT */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users size={18} className="text-indigo-600" />
                      Team &amp; User Management
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add and manage shop employees, managers, and cashiers with role-based permissions.
                    </p>
                  </div>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition self-start sm:self-auto"
                    >
                      <Plus size={14} />
                      Add Team Member
                    </button>
                  )}
                </div>

                {/* Team Members Table */}
                {loadingUsers ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading team members…</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="pb-3 pl-1">User</th>
                          <th className="pb-3">Contact</th>
                          <th className="pb-3">Role</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-1">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teamMembers.map((member) => {
                          const isCurrentUser = member.user.id === user?.id;
                          return (
                            <tr key={member.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 pl-1">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 uppercase shrink-0">
                                    {member.user.profilePhoto ? (
                                      <img
                                        src={member.user.profilePhoto}
                                        alt={member.user.name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      member.user.name?.[0] || 'U'
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 leading-tight">
                                      {member.user.name}
                                      {isCurrentUser && (
                                        <span className="ml-1.5 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-normal">
                                          (You)
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{member.user.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 text-slate-600">
                                {member.user.phone || <span className="text-slate-300">-</span>}
                              </td>

                              <td className="py-3">
                                <span
                                  className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                    member.role === 'OWNER' && 'bg-purple-100 text-purple-700',
                                    member.role === 'ADMIN' && 'bg-indigo-100 text-indigo-700',
                                    member.role === 'MANAGER' && 'bg-amber-100 text-amber-700',
                                    member.role === 'CASHIER' && 'bg-teal-100 text-teal-700',
                                    member.role === 'STAFF' && 'bg-slate-100 text-slate-700'
                                  )}
                                >
                                  {member.role}
                                </span>
                              </td>

                              <td className="py-3">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                                    member.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'w-1.5 h-1.5 rounded-full',
                                      member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                                    )}
                                  />
                                  {member.status}
                                </span>
                              </td>

                              <td className="py-3 text-right pr-1">
                                {isOwnerOrAdmin && member.role !== 'OWNER' && (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditMember(member)}
                                      title="Edit details"
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedMember(member);
                                        setResetPasswordVal('Lekvanta@123');
                                        setShowResetPassModal(true);
                                      }}
                                      title="Reset Password"
                                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                                    >
                                      <KeyRound size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMember(member.id, member.user.name)}
                                      title="Remove from shop"
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add User Modal */}
              {showAddUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Users size={16} className="text-indigo-600" />
                        Add Team Member
                      </h3>
                      <button
                        onClick={() => setShowAddUserModal(false)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleAddUser} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="ramesh@example.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Role <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label} — {r.desc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Initial Password
                        </label>
                        <input
                          type="text"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Share this password with the staff member. They can change it in Security Settings.
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowAddUserModal(false)}
                          className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                          {saving ? 'Adding…' : 'Add Member'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit User Modal */}
              {showEditUserModal && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Edit2 size={16} className="text-indigo-600" />
                        Edit Member: {selectedMember.user.name}
                      </h3>
                      <button
                        onClick={() => setShowEditUserModal(false)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleUpdateMember} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={editUserPhone}
                          onChange={(e) => setEditUserPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Role
                        </label>
                        <select
                          value={editUserRole}
                          onChange={(e) => setEditUserRole(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Status
                        </label>
                        <select
                          value={editUserStatus}
                          onChange={(e) => setEditUserStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="ACTIVE">ACTIVE (Access enabled)</option>
                          <option value="INACTIVE">INACTIVE (Deactivated)</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowEditUserModal(false)}
                          className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                          {saving ? 'Updating…' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Reset Password Modal */}
              {showResetPassModal && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <KeyRound size={16} className="text-amber-600" />
                        Reset Password
                      </h3>
                      <button
                        onClick={() => setShowResetPassModal(false)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-3.5">
                      <p className="text-xs text-slate-600">
                        Set a new password for <span className="font-semibold text-slate-900">{selectedMember.user.name}</span>:
                      </p>

                      <div>
                        <input
                          type="text"
                          required
                          minLength={6}
                          value={resetPasswordVal}
                          onChange={(e) => setResetPasswordVal(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowResetPassModal(false)}
                          className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                          {saving ? 'Resetting…' : 'Reset Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 5: SECURITY SETTINGS */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Shield size={18} className="text-indigo-600" />
                    Security &amp; Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your password and secure your Lekvanta account.
                  </p>
                </div>

                <div className="max-w-md space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Current Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      <Lock size={14} />
                      {saving ? 'Updating Password…' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Active Session & Security Tips */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Protection Tips</h3>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Use a unique, strong password containing letters, numbers, and symbols.</li>
                  <li>Never share your admin password with other shop staff; create separate cashier accounts.</li>
                  <li>All bank account and UPI details are encrypted and securely multi-tenant isolated.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 6: DESKTOP & PRINTERS (ELECTRON ONLY) */}
          {/* ────────────────────────────────────────────────────────── */}
          {activeTab === 'desktop' && isElectron && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
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
                <div className="space-y-4">
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
                <div className="space-y-4 pt-4 border-t border-slate-100">
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

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSaveDesktop}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Save size={15} />
                    Save Desktop Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

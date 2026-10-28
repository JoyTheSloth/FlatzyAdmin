import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Home,
  Tag,
  MapPin,
  Calendar,
  IndianRupee,
  Phone,
  MessageCircle,
  Trash2,
  Pencil,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  LogOut,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Users,
  Crown,
  PhoneCall,
  Copy,
  Clock,
  Maximize2,
  CheckCircle2,
  Sparkle,
  FileEdit,
  Sun,
  Moon,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Armchair,
  Info,
  Search,
  FileText
} from 'lucide-react';
import { KOLKATA_LOCATIONS } from '../data/leadsData';
import CloudinaryImageUploader from './CloudinaryImageUploader';
import AiPropertyQuickBox from './AiPropertyQuickBox';
import { formatEnquiryTimestamp, getLeadTimestamp, getPropertyTimestamp } from '../utils/dateUtils';

export const COMMON_AMENITIES = [
  'Lift',
  'Car Parking',
  '24/7 Security',
  'Power Backup',
  'Gated Community',
  'Gym',
  'Swimming Pool',
  'Balcony',
  'Water Supply',
  'Gas Pipeline',
  'Intercom',
  'CCTV'
];

export default function BrokerDashboard({
  currentUser = {},
  properties = [],
  leads = [],
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onUpdateLeadStatus,
  onOpenAuth,
  onSignOut,
  showToast,
  isDark = false,
  toggleTheme,
  isSyncing = false,
  onSync
}) {
  // 3 MAIN ACCESSES: 'leads' (Assigned Leads) | 'upload' (Upload Flat) | 'manage' (Manage Flats)
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'upload' | 'manage'
  
  // Search query for desktop top bar
  const [searchQuery, setSearchQuery] = useState('');

  // Property listing filters
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all', 'rent', 'sale'
  
  // Modals & Popups
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);

  // Form state for adding/uploading property
  const todayFormatted = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const defaultPropertyForm = {
    title: '',
    listingType: 'rent', // 'rent' or 'sale'
    bhk: '2 BHK',
    sqft: 1150,
    postingDate: todayFormatted,
    location: 'New Town',
    subLocation: '',
    price: 18000,
    securityDeposit: 36000,
    furnishing: 'Semi Furnished',
    amenities: ['Lift', 'Car Parking', '24/7 Security'],
    description: '',
    images: ['', '', '', '', '', ''],
    status: 'available'
  };
  const [formData, setFormData] = useState(defaultPropertyForm);
  const [phonePostMode, setPhonePostMode] = useState('ai'); // 'ai' | 'manual'

  // Broker Identity Fallback (Vaastu Nivas)
  const brokerName = currentUser?.agencyName || currentUser?.name || 'Vaastu Nivas';
  const brokerPhone = currentUser?.phone || '9830123456';
  const brokerId = currentUser?.id || 'broker-vastu-niwas';

  // Filter properties owned by this broker with persistent fallback
  const safeProperties = properties || [];
  const myProperties = safeProperties.filter(p => {
    if (!p) return false;
    const bId = (p.brokerId || '').toLowerCase();
    const bName = (p.brokerName || '').toLowerCase();
    const bPhone = p.brokerPhone || '';

    return (
      bId === 'broker-vastu-niwas' ||
      bId === (brokerId || '').toLowerCase() ||
      bId === (currentUser?.id || '').toLowerCase() ||
      (currentUser?.phone && bPhone === currentUser?.phone) ||
      bName.includes('vastu') ||
      bName.includes('vaastu') ||
      bName.includes('nivas') ||
      bName.includes('niwas') ||
      bName === (brokerName || '').toLowerCase()
    );
  });

  const displayedProperties = myProperties.filter(p => {
    if (listingTypeFilter !== 'all' && p.listingType !== listingTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.subLocation && p.subLocation.toLowerCase().includes(q)) ||
        (p.bhk && p.bhk.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Filter leads assigned to this broker by Super Admin with persistent fallback
  const safeLeads = leads || [];
  const savedAssignments = (() => {
    try {
      const raw = localStorage.getItem('flatzy_admin_lead_assignments_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  const assignedLeads = safeLeads.filter(l => {
    if (!l) return false;
    const assignment = savedAssignments[l.id];
    const bId = (l.assignedBrokerId || assignment?.assignedBrokerId || '').toLowerCase();
    const bName = (l.assignedBrokerName || assignment?.assignedBrokerName || '').toLowerCase();
    const bPhone = l.assignedBrokerPhone || assignment?.assignedBrokerPhone || '';

    return (
      bId === 'broker-vastu-niwas' ||
      bId === (brokerId || '').toLowerCase() ||
      bId === (currentUser?.id || '').toLowerCase() ||
      (currentUser?.phone && bPhone === currentUser?.phone) ||
      bName.includes('vastu') ||
      bName.includes('vaastu') ||
      bName.includes('nivas') ||
      bName.includes('niwas') ||
      bName === (brokerName || '').toLowerCase()
    );
  }).map(l => {
    const assignment = savedAssignments[l.id];
    if (assignment && !l.assignedBrokerName) {
      return { ...l, ...assignment };
    }
    return l;
  });

  const displayedLeads = assignedLeads.filter(l => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.bhk && l.bhk.toLowerCase().includes(q)) ||
        (l.property && l.property.toLowerCase().includes(q)) ||
        (l.location && l.location.toLowerCase().includes(q)) ||
        (l.budget && l.budget.toLowerCase().includes(q)) ||
        (l.comments && l.comments.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Handle Amenity toggle in Add Form
  const toggleAmenityInForm = (amenity) => {
    const current = formData.amenities || [];
    if (current.includes(amenity)) {
      setFormData({ ...formData, amenities: current.filter(a => a !== amenity) });
    } else {
      setFormData({ ...formData, amenities: [...current, amenity] });
    }
  };

  // Handle Amenity toggle in Edit Form
  const toggleAmenityInEdit = (amenity) => {
    if (!editingProperty) return;
    const current = editingProperty.amenities || [];
    if (current.includes(amenity)) {
      setEditingProperty({ ...editingProperty, amenities: current.filter(a => a !== amenity) });
    } else {
      setEditingProperty({ ...editingProperty, amenities: [...current, amenity] });
    }
  };

  const handleEditImageUrlChange = (index, value) => {
    if (!editingProperty) return;
    const currentImgs = editingProperty.images || ['', '', '', '', '', ''];
    while (currentImgs.length < 6) currentImgs.push('');
    const updated = [...currentImgs];
    updated[index] = value;
    setEditingProperty({ ...editingProperty, images: updated });
  };

  const handleAiParsedProperty = (parsed) => {
    setFormData(prev => ({
      ...prev,
      title: parsed.title || prev.title,
      listingType: parsed.listingType || prev.listingType,
      bhk: parsed.bhk || prev.bhk,
      sqft: parsed.sqft || prev.sqft,
      price: parsed.price || prev.price,
      securityDeposit: parsed.securityDeposit !== undefined ? parsed.securityDeposit : prev.securityDeposit,
      location: parsed.location || prev.location,
      subLocation: parsed.subLocation || prev.subLocation,
      furnishing: parsed.furnishing || prev.furnishing,
      amenities: (parsed.amenities && parsed.amenities.length > 0) ? parsed.amenities : prev.amenities,
      description: parsed.description || prev.description
    }));
  };

  // Submit Add Flat
  const handleAddSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title.trim()) {
      if (showToast) showToast('⚠️ Please enter a flat title');
      return;
    }

    const cleanImages = (formData.images || []).map(s => (s || '').trim()).filter(Boolean).slice(0, 6);

    const newProp = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brokerId: brokerId,
      brokerName: brokerName,
      brokerPhone: brokerPhone,
      title: formData.title.trim(),
      listingType: formData.listingType,
      bhk: formData.bhk,
      sqft: Number(formData.sqft) || 1000,
      postingDate: formData.postingDate || todayFormatted,
      location: formData.location,
      subLocation: formData.subLocation.trim() || formData.location,
      price: Number(formData.price) || (formData.listingType === 'sale' ? 3500000 : 15000),
      securityDeposit: Number(formData.securityDeposit) || 0,
      furnishing: formData.furnishing,
      amenities: formData.amenities || [],
      description: formData.description.trim() || `${formData.bhk} (${formData.sqft} sq.ft) in ${formData.location} for ${formData.listingType}.`,
      images: cleanImages,
      status: 'available',
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    onAddProperty(newProp);
    setFormData(defaultPropertyForm);
    if (showToast) showToast(`✅ "${newProp.title}" listed successfully!`);
    // Automatically switch to Manage Flats to view the uploaded listing
    setActiveTab('manage');
  };

  // Submit Edit Flat
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingProperty) return;

    const cleanImages = (editingProperty.images || []).map(s => (s || '').trim()).filter(Boolean).slice(0, 6);
    const updatedProp = {
      ...editingProperty,
      images: cleanImages
    };

    onUpdateProperty(updatedProp);
    setEditingProperty(null);
    if (showToast) showToast(`✅ Updated "${updatedProp.title}"`);
  };

  // WhatsApp Connect for Lead
  const openWhatsAppLead = (lead) => {
    const text = `Hello ${lead.name}, I am reaching out from ${brokerName} (Flatzy Verified Broker Partner). We received your requirement for a ${lead.bhk || lead.property || 'flat'} in ${lead.location || 'Kolkata'} with budget ${lead.budget || 'as discussed'}. I have verified options ready for you!`;
    window.open(`https://wa.me/91${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCallLead = (phone) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  const handleCopyPhone = (phone, id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    if (showToast) showToast(`Copied ${phone} to clipboard`);
    setTimeout(() => setCopiedPhoneId(null), 1800);
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-200 ${
      isDark ? 'bg-[#0B132B] text-slate-100' : 'bg-[#F4F5F9] text-[#0B132B]'
    }`}>

      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (>= lg only) */}
      {/* ======================================================== */}
      <aside className={`hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r h-screen sticky top-0 z-30 select-none transition-colors duration-200 ${
        isDark
          ? 'bg-[#080E21] border-slate-800/80 text-slate-200'
          : 'bg-white border-slate-200/90 text-slate-800 shadow-xs'
      }`}>
        {/* TOP BRAND HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-3">
            {/* Logo with purple/gold ring */}
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] p-0.5 shadow-[0_2px_14px_rgba(124,58,237,0.35)] shrink-0 flex items-center justify-center text-white">
              <Building2 className="w-6 h-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-lg tracking-tight leading-none truncate">
                  {brokerName}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  VERIFIED PARTNER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION MENU */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
          <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Partner Workspace
          </div>

          {/* Option 1: Assigned Leads */}
          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full p-3 rounded-2xl transition-all duration-150 flex items-center justify-between text-left group cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-[#FFC800] text-[#0B132B] shadow-md shadow-amber-400/20 font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'leads' ? 'bg-black/10 text-current' : 'bg-slate-100 dark:bg-slate-800 text-amber-500'
              }`}>
                <Crown className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold truncate tracking-tight block">Assigned Leads</span>
                <p className={`text-[10px] truncate ${activeTab === 'leads' ? 'opacity-80' : 'text-slate-400'}`}>
                  Tenant calls & site visits
                </p>
              </div>
            </div>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ml-1.5 transition-all ${
              activeTab === 'leads' ? 'bg-[#0B132B] text-[#FFC800]' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {assignedLeads.length}
            </span>
          </button>

          {/* Option 2: Upload Flat */}
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full p-3 rounded-2xl transition-all duration-150 flex items-center justify-between text-left group cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/20 font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'upload' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-purple-400'
              }`}>
                <Upload className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold truncate tracking-tight block">Upload Flat</span>
                <p className={`text-[10px] truncate ${activeTab === 'upload' ? 'opacity-80' : 'text-slate-400'}`}>
                  Post new rent or sale flat
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ml-1.5 transition-all ${
              activeTab === 'upload' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-400'
            }`}>
              NEW
            </span>
          </button>

          {/* Option 3: Manage Flats */}
          <button
            onClick={() => setActiveTab('manage')}
            className={`w-full p-3 rounded-2xl transition-all duration-150 flex items-center justify-between text-left group cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'manage' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-blue-500'
              }`}>
                <Home className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold truncate tracking-tight block">Manage Flats</span>
                <p className={`text-[10px] truncate ${activeTab === 'manage' ? 'opacity-80' : 'text-slate-400'}`}>
                  Live catalog & inventory
                </p>
              </div>
            </div>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ml-1.5 transition-all ${
              activeTab === 'manage' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {myProperties.length}
            </span>
          </button>


          {/* Cloud Sync Status Card */}
          <div className={`mt-5 p-3 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Broker Realtime Sync
                </span>
              </div>
              {onSync && (
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  title="Sync with Supabase cloud"
                  className={`p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer ${
                    isSyncing ? 'animate-spin opacity-60' : ''
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Supabase Live Cloud
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isSyncing ? 'Syncing data now...' : 'Assignments sync in realtime'}
            </p>
          </div>
        </div>

        {/* SIDEBAR FOOTER (Partner Profile + Settings) */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 shrink-0 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            {/* Broker info */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                VN
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block truncate leading-tight">
                  {brokerName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                  <span>{brokerPhone}</span>
                </span>
              </div>
            </div>

            {/* Actions: Theme toggle, Switch account, Sign out */}
            <div className="flex items-center space-x-1">
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
                </button>
              )}
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  title="Switch Account / Super Admin Login"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT WRAPPER */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">

        {/* ======================================================== */}
        {/* 2. DESKTOP TOP BAR (>= lg only) */}
        {/* ======================================================== */}
        <header className={`hidden lg:flex items-center justify-between px-8 py-4 border-b shrink-0 sticky top-0 z-20 backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-[#080E21]/90 border-slate-800 text-white'
            : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
        }`}>
          {/* Left: Current Section Title & Breadcrumb */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              activeTab === 'leads' 
                ? 'bg-amber-400/10 text-amber-400' 
                : activeTab === 'upload' 
                  ? 'bg-purple-500/10 text-purple-400' 
                  : 'bg-blue-500/10 text-blue-500'
            }`}>
              {activeTab === 'leads' && <Crown className="w-5 h-5 fill-current" />}
              {activeTab === 'upload' && <Upload className="w-5 h-5" />}
              {activeTab === 'manage' && <Home className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-black tracking-tight truncate">
                  {activeTab === 'leads' && 'Assigned Inquiries & Leads'}
                  {activeTab === 'upload' && 'Upload Flat to Flatzy'}
                  {activeTab === 'manage' && 'Manage Flat Listings'}
                </h1>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  activeTab === 'leads'
                    ? 'bg-amber-400/15 text-amber-500 border-amber-400/30'
                    : activeTab === 'upload'
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                }`}>
                  {activeTab === 'leads' && `${displayedLeads.length} Leads`}
                  {activeTab === 'upload' && 'Upload Studio'}
                  {activeTab === 'manage' && `${displayedProperties.length} Flats`}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {activeTab === 'leads' && `Customer requirements forwarded to ${brokerName} by Super Admin`}
                {activeTab === 'upload' && `Post verified rental or sale flats with photos to Kolkata renters`}
                {activeTab === 'manage' && `Active property portfolio managed under ${brokerName}`}
              </p>
            </div>
          </div>

          {/* Center: Global Desktop Search Bar */}
          <div className="flex-1 max-w-md mx-6">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'leads'
                    ? "Search tenant name, phone, BHK, locality, budget..."
                    : activeTab === 'manage'
                      ? "Search flat title, locality, BHK, description..."
                      : "Search assigned leads or properties..."
                }
                className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs outline-none border transition-all font-medium ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Sync Button */}
            {onSync && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                title="Sync with Supabase"
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Theme Toggle Button */}
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Switch Account Button */}
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                title="Switch Account / Super Admin Login"
                className="px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-[#7C3AED] dark:text-purple-300 text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Switch Portal</span>
              </button>
            )}

            {/* Primary Action Button */}
            <button
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:brightness-105 text-white shadow-purple-500/25"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Upload Flat</span>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 3. MOBILE BRANDED HEADER (< lg only) */}
        {/* ======================================================== */}
        <header className="lg:hidden relative px-5 pt-6 pb-6 rounded-b-[32px] shadow-xl bg-[#080E21] text-white overflow-hidden mx-3 sm:mx-6 mt-3">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity transform scale-105"
            style={{ backgroundImage: `url('/kolkata-header.jpg')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#080E21]/80 via-[#0B1530]/65 to-[#080E21]/95"></div>
          <div className="absolute top-0 right-1/4 w-72 h-36 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] p-0.5 shadow-lg flex items-center justify-center text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black tracking-tight">{brokerName}</h1>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    VERIFIED PARTNER
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono font-medium flex items-center space-x-2 mt-0.5">
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-purple-400" />
                    <span>{brokerPhone}</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-[11px] text-purple-300">ID: vaastunivas</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Sync Button */}
              {onSync && (
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  title="Sync with cloud"
                  className={`w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center border border-white/15 transition-all cursor-pointer ${
                    isSyncing ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Theme Toggle */}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center border border-white/15 transition-all cursor-pointer"
                >
                  {isDark ? <Sun className="w-4 h-4 text-[#FFC800]" /> : <Moon className="w-4 h-4 text-slate-200" />}
                </button>
              )}

              {/* Sign Out Button */}
              <button
                onClick={onSignOut}
                title="Sign Out to Switch Account"
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/15 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* 3 TOP NAVIGATION OPTIONS: ASSIGNED LEADS, UPLOAD FLAT, MANAGE FLATS */}
          <div className="relative z-10 grid grid-cols-3 gap-2 bg-white/[0.08] p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
            {/* Option 1: Assigned Leads */}
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'leads'
                  ? 'bg-[#FFC800] text-[#0B132B] shadow-md ring-1 ring-[#FFC800]/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Assigned Leads</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'leads' ? 'bg-[#0B132B] text-[#FFC800]' : 'bg-white/15 text-slate-300'
              }`}>
                {assignedLeads.length}
              </span>
            </button>

            {/* Option 2: Upload Flat */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-md ring-1 ring-purple-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
              <span className="truncate">Upload Flat</span>
            </button>

            {/* Option 3: Manage Flats */}
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Manage Flats</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'manage' ? 'bg-white/20 text-white' : 'bg-white/15 text-slate-300'
              }`}>
                {myProperties.length}
              </span>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 4. MAIN BODY CONTENT CANVAS */}
        {/* ======================================================== */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-12 space-y-5">
        
        {/* ======================================================== */}
        {/* VIEW 1: ASSIGNED LEADS */}
        {/* ======================================================== */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Context Info Banner */}
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-[#0B132B] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0B132B] dark:text-white">
                    Assigned Customer Inquiries • Vaastu Nivas
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl leading-relaxed">
                    These tenant inquiries were forwarded directly to <b>Vaastu Nivas</b> by Flatzy Super Admin. Connect immediately via 1-tap WhatsApp or Direct Call to arrange site visits.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-black px-3 py-1 rounded-xl bg-amber-400 text-[#0B132B] shadow-xs">
                  {assignedLeads.length} Total Leads
                </span>
              </div>
            </div>

            {/* Leads Grid or Empty State */}
            {displayedLeads.length === 0 ? (
              <div className={`p-10 rounded-3xl border text-center transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              }`}>
                <Crown className="w-12 h-12 mx-auto text-amber-400 mb-3 stroke-[1.5]" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {searchQuery ? `No Inquiries Found matching "${searchQuery}"` : 'No Inquiries Assigned Yet'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  {searchQuery 
                    ? 'Try adjusting your search terms or clear the search query.'
                    : 'When Flatzy Super Admin forwards renter inquiries to Vaastu Nivas, they will appear here instantly with full customer requirements, budget, and 1-tap contact buttons.'}
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      + Upload Flat Now
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedLeads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadForDetails(lead)}
                    className={`rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer hover:shadow-xl group p-4 sm:p-5 ${
                      isDark 
                        ? 'bg-[#0E172A] border-slate-800 hover:border-violet-500/50 hover:shadow-violet-500/5 shadow-sm' 
                        : 'bg-white border-slate-200/90 hover:border-violet-400 shadow-xs hover:shadow-md'
                    }`}
                  >
                    {/* Subtle Top Ambient Accent */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-violet-500 to-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity" />

                    {/* Top Row: Clean subtle assignment pill + status badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-500 dark:text-amber-400">
                        <Crown className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500 shrink-0" />
                        <span className="tracking-tight">Assigned to {brokerName}</span>
                      </div>

                      <span className={`inline-flex items-center space-x-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                        lead.status === 'Booked'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : lead.status === 'Site Visit Scheduled'
                            ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                            : 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          lead.status === 'Booked' ? 'bg-emerald-500' : lead.status === 'Site Visit Scheduled' ? 'bg-blue-500' : 'bg-violet-500 animate-pulse'
                        }`} />
                        <span>{lead.status || 'Active Lead'}</span>
                      </span>
                    </div>

                    {/* Lead Name & Phone */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`font-black text-lg tracking-tight group-hover:text-violet-500 transition-colors leading-tight truncate ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {lead.name}
                        </h3>

                        {/* Location & BHK tags */}
                        <div className="flex items-center space-x-2 mt-1.5 text-xs font-semibold flex-wrap gap-y-1">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold border border-violet-500/20">
                            <Home className="w-3 h-3 shrink-0" />
                            <span>{lead.bhk || lead.property || 'Flat'}</span>
                          </span>

                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{lead.location || 'Kolkata'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Phone Copy Pill */}
                      {lead.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(lead.phone, lead.id, e);
                          }}
                          title="Click to copy phone number"
                          className={`text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                            copiedPhoneId === lead.id
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : isDark 
                                ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {copiedPhoneId === lead.id ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{lead.phone}</span>
                        </button>
                      )}
                    </div>

                    {/* Budget & Timing Meta Card */}
                    <div className={`mt-3.5 p-3 rounded-xl border ${
                      isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                    }`}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Budget</span>
                        <span className="font-black text-sm text-violet-600 dark:text-violet-400">
                          {lead.budget || 'Flexible'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span className="flex items-center space-x-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{getLeadTimestamp(lead)}</span>
                        </span>
                        {lead.shiftingDate && (
                          <span className="flex items-center space-x-1 font-semibold text-amber-500 dark:text-amber-400">
                            <Calendar className="w-3 h-3" />
                            <span>Shift: {lead.shiftingDate}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar: View Details + WhatsApp + Call + Follow-up Dropdown */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap"
                    >
                      <div className="flex items-center space-x-1.5">
                        {/* 1-Tap Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForDetails(lead)}
                          className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                            isDark
                              ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                          }`}
                          title="View customer inquiry notes"
                        >
                          <Eye className="w-3.5 h-3.5 text-violet-500" />
                          <span>Details</span>
                        </button>

                        {lead.phone && (
                          <>
                            <button
                              type="button"
                              onClick={() => openWhatsAppLead(lead)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-white" />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCallLead(lead.phone)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                              title="Call Directly"
                            >
                              <PhoneCall className="w-3.5 h-3.5 fill-white" />
                              <span>Call</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Status Selector */}
                      {onUpdateLeadStatus && (
                        <div className="flex items-center space-x-1">
                          <select
                            value={lead.status || 'Active Lead'}
                            onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value)}
                            className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border outline-none cursor-pointer transition-colors ${
                              isDark
                                ? 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-slate-600'
                                : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <option value="Active Lead">Active Follow-up</option>
                            <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                            <option value="Booked">Deal Closed / Booked</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: UPLOAD FLAT */}
        {/* ======================================================== */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className={`p-4 rounded-3xl border flex items-center justify-between gap-3 flex-wrap ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-purple-600 text-white flex items-center justify-center shadow-md">
                  <Upload className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Upload Flat to Flatzy Catalog
                  </h2>
                  <p className="text-xs text-slate-400">
                    Listed under <strong>{brokerName}</strong> • Photos auto-compressed & CDN hosted
                  </p>
                </div>
              </div>

              {/* Upload Mode Pill Toggle: AI Details Filler vs Manual (Desktop & Mobile) */}
              <div className="flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-inner">
                <button
                  type="button"
                  onClick={() => setPhonePostMode('ai')}
                  className={`flex items-center space-x-2 py-1.5 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    phonePostMode === 'ai'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full transition-all ${
                    phonePostMode === 'ai' ? 'bg-amber-400 ring-2 ring-white/50 animate-pulse' : 'bg-slate-400/50'
                  }`} />
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Details Filler</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhonePostMode('manual')}
                  className={`flex items-center space-x-2 py-1.5 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    phonePostMode === 'manual'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md border border-slate-200 dark:border-slate-600 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full transition-all ${
                    phonePostMode === 'manual' ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-slate-400/50'
                  }`} />
                  <FileText className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </button>
              </div>
            </div>

            {/* Studio Container */}
            <div className={`rounded-3xl border p-4 sm:p-6 transition-all ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              {/* Responsive Layout based on Mode */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* AI / PHOTOS COLUMN */}
                <div className={`${phonePostMode === 'ai' ? 'lg:col-span-5' : 'lg:col-span-4'} space-y-4`}>
                  {phonePostMode === 'ai' && (
                    <AiPropertyQuickBox
                      onParsedProperty={(parsed) => {
                        handleAiParsedProperty(parsed);
                        if (showToast) showToast('✅ Details extracted with AI! Review & publish below.');
                      }}
                      showToast={showToast}
                      isDark={isDark}
                    />
                  )}

                  {/* 4-Photo Cloudinary / WebP Uploader */}
                  <CloudinaryImageUploader
                    images={formData.images}
                    onChange={(newImages) => setFormData({ ...formData, images: newImages })}
                    isDark={isDark}
                    showToast={showToast}
                  />
                </div>

                {/* FORM FIELDS COLUMN */}
                <div className={`${phonePostMode === 'ai' ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
                  <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-medium">
                    
                    {/* Listing Type: Rent vs Sale */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, listingType: 'rent' })}
                        className={`py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                          formData.listingType === 'rent'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        🏠 For Rent
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, listingType: 'sale' })}
                        className={`py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                          formData.listingType === 'sale'
                            ? 'bg-amber-500 text-[#0B132B] border-amber-500 shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        🏢 For Sale
                      </button>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Property Headline / Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Modern 2 BHK Flat in New Town Action Area 1"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* BHK + Square Feet */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">BHK Configuration</label>
                        <select
                          value={formData.bhk}
                          onChange={(e) => setFormData({ ...formData, bhk: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                        >
                          <option value="1 BHK">1 BHK</option>
                          <option value="2 BHK">2 BHK</option>
                          <option value="3 BHK">3 BHK</option>
                          <option value="4+ BHK">4+ BHK</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Area (Square Feet)</label>
                        <input
                          type="number"
                          value={formData.sqft}
                          onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                          placeholder="e.g. 1150"
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                        >
                        </input>
                      </div>
                    </div>

                    {/* Price & Security Deposit */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                          {formData.listingType === 'sale' ? 'Sale Price (₹) *' : 'Monthly Rent (₹) *'}
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="e.g. 18000"
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Security Deposit (₹)</label>
                        <input
                          type="number"
                          value={formData.securityDeposit}
                          onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                          placeholder="e.g. 36000"
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                        />
                      </div>
                    </div>

                    {/* Location & Sub-location */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Locality in Kolkata</label>
                        <select
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                        >
                          {KOLKATA_LOCATIONS.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Sub-Location / Landmark</label>
                        <input
                          type="text"
                          value={formData.subLocation}
                          onChange={(e) => setFormData({ ...formData, subLocation: e.target.value })}
                          placeholder="e.g. Near City Centre 2"
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                        />
                      </div>
                    </div>

                    {/* Furnishing */}
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Furnishing</label>
                      <select
                        value={formData.furnishing}
                        onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none"
                      >
                        <option value="Semi Furnished">Semi Furnished</option>
                        <option value="Fully Furnished">Fully Furnished</option>
                        <option value="Unfurnished">Unfurnished</option>
                      </select>
                    </div>

                    {/* Amenities Checkboxes */}
                    <div>
                      <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">Amenities Available</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {COMMON_AMENITIES.map(amenity => {
                          const isSelected = (formData.amenities || []).includes(amenity);
                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => toggleAmenityInForm(amenity)}
                              className={`p-2 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span>{amenity}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Description / Highlights</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Additional details about the flat, flooring, sunlight, parking, etc."
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] hover:brightness-105 active:scale-98 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4 stroke-[2.5]" />
                        <span>Publish Flat to Catalog</span>
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: MANAGE FLATS */}
        {/* ======================================================== */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* Quick Filter & Add Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5 text-xs font-bold">
                {['all', 'rent', 'sale'].map(type => (
                  <button
                    key={type}
                    onClick={() => setListingTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-xl capitalize transition-all border cursor-pointer ${
                      listingTypeFilter === type
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs font-black'
                        : isDark
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    {type === 'all' ? `All Flats (${myProperties.length})` : type === 'rent' ? 'For Rent' : 'For Sale'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white hover:brightness-105 active:scale-95 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Upload New Flat</span>
              </button>
            </div>

            {/* LISTINGS CONTAINER */}
            {displayedProperties.length === 0 ? (
              <div className={`p-10 rounded-3xl border text-center transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              }`}>
                <Home className="w-12 h-12 mx-auto text-purple-400 mb-3 stroke-[1.5]" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {searchQuery ? `No Flats Found matching "${searchQuery}"` : 'No Flats Listed under Vaastu Nivas Yet'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery 
                    ? 'Try searching with a different locality, BHK or title, or clear the search.' 
                    : 'Upload your rental and sale flats with photos to reach verified renters in Kolkata.'}
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      + Upload Flat Now
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedProperties.map(prop => {
                  const validImages = (prop.images || []).filter(Boolean).slice(0, 6);
                  const isRent = prop.listingType === 'rent';
                  const timeMeta = getPropertyTimestamp(prop);

                  return (
                    <div
                      key={prop.id}
                      className={`rounded-3xl border p-4 transition-all relative overflow-hidden group shadow-sm ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Top Row: Type Badge + BHK + Price */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              isRent 
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}>
                              FOR {prop.listingType.toUpperCase()}
                            </span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{prop.bhk}</span>
                            
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center space-x-1">
                              <Maximize2 className="w-3 h-3" />
                              <span>{prop.sqft ? `${prop.sqft} sq.ft` : '1,000 sq.ft'}</span>
                            </span>

                            {/* Elapsed Countdown Pill (e.g. "Just now", "7 days ago", "14 days ago") */}
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center space-x-1 ${timeMeta.badgeClass}`} title={`Posted on ${timeMeta.fullDate}`}>
                              <Clock className="w-3 h-3" />
                              <span>{timeMeta.timeAgo}</span>
                            </span>

                            {/* Date Stamp */}
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1" title={timeMeta.timeStr ? `Time: ${timeMeta.timeStr}` : ''}>
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{timeMeta.dateStr}</span>
                            </span>
                          </div>

                          <h3 className={`text-base font-black mt-1.5 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {prop.title}
                          </h3>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-[#7C3AED] dark:text-[#A78BFA] block">
                            ₹{prop.price?.toLocaleString('en-IN')}
                            <span className="text-[10px] font-normal text-slate-400">{isRent ? '/mo' : ''}</span>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            prop.status === 'available' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'
                          }`}>
                            {prop.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Photo Section: If photos provided, show grid */}
                      {validImages.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 my-3">
                          {validImages.map((imgUrl, idx) => (
                            <div key={idx} className="aspect-4/3 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group">
                              <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Home className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-extrabold block text-slate-800 dark:text-slate-200">
                                {prop.bhk} • {prop.sqft ? `${prop.sqft} sq.ft` : 'Spacious Flat'}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {prop.location} • {prop.subLocation || 'Kolkata'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-300">
                            Verified Flat
                          </span>
                        </div>
                      )}

                      {/* Location & Deposit */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 my-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center space-x-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{prop.location}</span>
                          {prop.subLocation && <span className="opacity-75">• {prop.subLocation}</span>}
                        </span>
                        <span>Deposit: ₹{prop.securityDeposit?.toLocaleString('en-IN') || 0}</span>
                      </div>

                      {/* Amenities Pills */}
                      {prop.amenities && prop.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 my-2">
                          {prop.amenities.slice(0, 4).map(amenity => (
                            <span
                              key={amenity}
                              className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              ✓ {amenity}
                            </span>
                          ))}
                          {prop.amenities.length > 4 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">
                              +{prop.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Bar: Edit, Delete */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingProperty(prop)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setPropertyToDelete(prop)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* 3. PHONE BOTTOM FLOATING NAVIGATION BAR (3 OPTIONS) */}
      {/* ======================================================== */}
      <div className="fixed bottom-3 inset-x-3 max-w-md mx-auto z-40 sm:hidden pointer-events-none">
        <nav
          aria-label="Broker Bottom Navigation"
          className={`pointer-events-auto h-[64px] px-3 rounded-[32px] border transition-all duration-300 relative flex items-center justify-between ${
            isDark
              ? 'bg-[#0E172E]/95 border-slate-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl'
              : 'bg-white/95 border-slate-200/90 shadow-[0_16px_40px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur-2xl'
          }`}
        >
          {/* Tab 1: Assigned Leads */}
          <button
            onClick={() => setActiveTab('leads')}
            className="flex-1 relative flex flex-col items-center justify-center h-full cursor-pointer transition-all duration-300 select-none group"
          >
            {activeTab === 'leads' ? (
              <div className="flex flex-col items-center -translate-y-4 transition-transform duration-300 ease-out">
                <div className="w-12 h-12 rounded-full flex items-center justify-center relative bg-[#0E172E] text-[#FFC800] ring-4 ring-[#080E21] border border-white/10 shadow-[0_8px_20px_rgba(255,200,0,0.3)]">
                  <Crown className="w-5 h-5 stroke-[2.5]" />
                  {assignedLeads.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full leading-tight shadow-sm bg-[#FFC800] text-[#0B132B]">
                      {assignedLeads.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-black mt-1 tracking-tight text-white">
                  Leads
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-1">
                <div className="relative">
                  <Crown className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
                  {assignedLeads.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight bg-white/15 text-slate-300">
                      {assignedLeads.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1 text-slate-400">
                  Leads
                </span>
              </div>
            )}
          </button>

          {/* Tab 2: Upload Flat (Elevated Center Button) */}
          <button
            onClick={() => setActiveTab('upload')}
            className="flex-1 relative flex flex-col items-center justify-center h-full cursor-pointer transition-all duration-300 select-none group"
          >
            {activeTab === 'upload' ? (
              <div className="flex flex-col items-center -translate-y-4 transition-transform duration-300 ease-out">
                <div className="w-12 h-12 rounded-full flex items-center justify-center relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-4 ring-[#080E21] border border-white/10 shadow-[0_8px_20px_rgba(124,58,237,0.4)]">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-[10px] font-black mt-1 tracking-tight text-white">
                  Upload
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-1">
                <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/25">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-semibold mt-0.5 text-slate-400">
                  Upload
                </span>
              </div>
            )}
          </button>

          {/* Tab 3: Manage Flats */}
          <button
            onClick={() => setActiveTab('manage')}
            className="flex-1 relative flex flex-col items-center justify-center h-full cursor-pointer transition-all duration-300 select-none group"
          >
            {activeTab === 'manage' ? (
              <div className="flex flex-col items-center -translate-y-4 transition-transform duration-300 ease-out">
                <div className="w-12 h-12 rounded-full flex items-center justify-center relative bg-[#0E172E] text-blue-400 ring-4 ring-[#080E21] border border-white/10 shadow-[0_8px_20px_rgba(37,99,235,0.3)]">
                  <Home className="w-5 h-5 stroke-[2.5]" />
                  {myProperties.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full leading-tight shadow-sm bg-blue-600 text-white">
                      {myProperties.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-black mt-1 tracking-tight text-white">
                  Flats
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-1">
                <div className="relative">
                  <Home className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
                  {myProperties.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight bg-white/15 text-slate-300">
                      {myProperties.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1 text-slate-400">
                  Flats
                </span>
              </div>
            )}
          </button>
        </nav>
      </div>

      </div> {/* END OF DESKTOP MAIN CONTENT WRAPPER */}

      {/* ======================================================== */}
      {/* 4. LEAD DETAILS POPUP MODAL */}
      {/* ======================================================== */}
      {selectedLeadForDetails && (
        <div 
          onClick={() => setSelectedLeadForDetails(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border transition-all my-auto relative ${
              isDark ? 'bg-[#0E172E] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/40'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400 text-[#0B132B] flex items-center justify-center shrink-0 shadow-sm font-black">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">Customer Inquiry Details</h3>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                    Forwarded to Vaastu Nivas by Super Admin
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLeadForDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Contact Card */}
            <div className={`p-4 rounded-2xl border mb-4 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-50/60 border-amber-200/80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-black">{selectedLeadForDetails.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Phone: {selectedLeadForDetails.phone}
                  </p>
                </div>

                <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl ${
                  selectedLeadForDetails.status === 'Booked'
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                }`}>
                  {selectedLeadForDetails.status || 'Active Lead'}
                </span>
              </div>

              {/* 1-Tap Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => openWhatsAppLead(selectedLeadForDetails)}
                  className="py-2 px-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleCallLead(selectedLeadForDetails.phone)}
                  className="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 fill-white" />
                  <span>Call</span>
                </button>

                <button
                  onClick={(e) => handleCopyPhone(selectedLeadForDetails.phone, selectedLeadForDetails.id, e)}
                  className="py-2 px-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {copiedPhoneId === selectedLeadForDetails.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPhoneId === selectedLeadForDetails.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Requirement Specifications Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs mb-4">
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Required BHK</span>
                <span className="font-extrabold text-sm text-[#7C3AED] dark:text-[#A78BFA] flex items-center space-x-1">
                  <Home className="w-4 h-4" />
                  <span>{selectedLeadForDetails.bhk || selectedLeadForDetails.property || 'Flat'}</span>
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Preferred Locality</span>
                <span className="font-extrabold text-sm text-rose-500 flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedLeadForDetails.location || 'Kolkata'}</span>
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Budget</span>
                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <IndianRupee className="w-4 h-4" />
                  <span>{selectedLeadForDetails.budget || 'Flexible'}</span>
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Shifting Timeline</span>
                <span className="font-extrabold text-sm text-amber-500 flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedLeadForDetails.shiftingDate || 'Immediate'}</span>
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Furnishing</span>
                <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Armchair className="w-4 h-4" />
                  <span>{selectedLeadForDetails.furnishing || 'Semi-Furnished'}</span>
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Tenant Category</span>
                <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{selectedLeadForDetails.tenantType || 'Bachelor'}</span>
                </span>
              </div>
            </div>

            {/* Status Updater */}
            {onUpdateLeadStatus && (
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Update Lead Status:
                </span>
                <select
                  value={selectedLeadForDetails.status || 'Active Lead'}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    onUpdateLeadStatus(selectedLeadForDetails.id, newStatus);
                    setSelectedLeadForDetails({ ...selectedLeadForDetails, status: newStatus });
                  }}
                  className="text-xs font-black rounded-xl px-3 py-1.5 bg-purple-600 text-white outline-none cursor-pointer shadow-xs"
                >
                  <option value="Active Lead">Active Follow-up</option>
                  <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                  <option value="Booked">Deal Closed / Booked</option>
                </select>
              </div>
            )}

            <button
              onClick={() => setSelectedLeadForDetails(null)}
              className="w-full mt-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. EDIT PROPERTY MODAL */}
      {/* ======================================================== */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-auto transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base">Edit Flat Listing</h3>
              <button
                type="button"
                onClick={() => setEditingProperty(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    {editingProperty.listingType === 'sale' ? 'Sale Price (₹)' : 'Monthly Rent (₹)'}
                  </label>
                  <input
                    type="number"
                    value={editingProperty.price}
                    onChange={(e) => setEditingProperty({ ...editingProperty, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select
                    value={editingProperty.status}
                    onChange={(e) => setEditingProperty({ ...editingProperty, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold / Rented Out</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Locality</label>
                <select
                  value={editingProperty.location}
                  onChange={(e) => setEditingProperty({ ...editingProperty, location: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                >
                  {KOLKATA_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Photo links */}
              <div>
                <label className="block font-bold mb-1">Photos (Up to 6 links)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      type="url"
                      value={(editingProperty.images || [])[idx] || ''}
                      onChange={(e) => handleEditImageUrlChange(idx, e.target.value)}
                      placeholder={`Photo ${idx + 1} URL`}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium outline-none font-mono"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-black shadow-md hover:bg-purple-700 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. DELETE PROPERTY MODAL */}
      {/* ======================================================== */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-extrabold text-base">Delete this flat?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to delete <b>{propertyToDelete.title}</b>?
            </p>
            <div className="flex items-center space-x-2 mt-5">
              <button
                onClick={() => setPropertyToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProperty(propertyToDelete.id);
                  setPropertyToDelete(null);
                  if (showToast) showToast('Deleted flat listing');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700 shadow-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

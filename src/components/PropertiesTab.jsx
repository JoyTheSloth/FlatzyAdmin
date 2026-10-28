import React, { useState, useMemo } from 'react';
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
  ShieldCheck,
  Search,
  X,
  Sparkles,
  Users,
  Maximize2,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Zap,
  Filter,
  Eye,
  SlidersHorizontal,
  FileEdit,
  Clock
} from 'lucide-react';
import { KOLKATA_LOCATIONS } from '../data/leadsData';
import { matchesSearchQuery } from '../utils/searchUtils';
import CloudinaryImageUploader from './CloudinaryImageUploader';
import AiPropertyQuickBox from './AiPropertyQuickBox';
import { getPropertyTimestamp } from '../utils/dateUtils';

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

export default function PropertiesTab({
  properties = [],
  leads = [],
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  showToast,
  isDark,
  openAddModal = false,
  onCloseAddModal
}) {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all', 'rent', 'sale'
  const [bhkFilter, setBhkFilter] = useState('all'); // 'all', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'
  const [locationFilter, setLocationFilter] = useState('All');
  const [priceTierFilter, setPriceTierFilter] = useState('all'); // 'all', 'under15k', '15k_30k', '30k_50k', 'above50k'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'reserved', 'rented', 'sold'
  const [furnishingFilter, setFurnishingFilter] = useState('all'); // 'all', 'Fully Furnished', 'Semi Furnished', 'Unfurnished'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price_asc', 'price_desc'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals & Interactive States
  const [internalAddModal, setInternalAddModal] = useState(false);
  const showAddModal = openAddModal || internalAddModal;
  const setShowAddModal = (val) => {
    setInternalAddModal(val);
    if (!val && onCloseAddModal) onCloseAddModal();
  };
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [selectedFlatForLeads, setSelectedFlatForLeads] = useState(null); // Flat opened in "Matching Leads" modal
  const [lightboxData, setLightboxData] = useState(null); // { images: [], activeIndex: 0, title: '' }
  const [copiedPitchId, setCopiedPitchId] = useState(null);

  const todayFormatted = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const defaultPropertyForm = {
    title: '',
    listingType: 'rent',
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
    brokerName: 'Flatzy Direct',
    brokerPhone: '918910376054',
    status: 'available',
    isVerified: true
  };
  const [formData, setFormData] = useState(defaultPropertyForm);
  const [phonePostMode, setPhonePostMode] = useState('ai'); // 'ai' | 'manual'

  // =========================================================================
  // MATCHING INQUIRIES ALGORITHM
  // Connects a flat with active inquiries looking for this BHK & Location
  // =========================================================================
  const getMatchingLeadsForFlat = (prop) => {
    if (!leads || !Array.isArray(leads) || leads.length === 0) return [];
    const propBhk = (prop.bhk || '').toLowerCase().replace(/\s+/g, '');
    const propLoc = (prop.location || '').toLowerCase();
    const propSubLoc = (prop.subLocation || '').toLowerCase();

    return leads.filter(lead => {
      if (lead.isClosed) return false;
      
      // BHK Match
      const leadBhk = (lead.bhk || '').toLowerCase().replace(/\s+/g, '');
      const bhkMatches = !leadBhk || leadBhk === 'flat' || leadBhk.includes(propBhk) || propBhk.includes(leadBhk);

      // Location Match
      const leadLoc = (lead.location || '').toLowerCase();
      const locMatches = !leadLoc || leadLoc === 'kolkata' || 
        propLoc.includes(leadLoc) || leadLoc.includes(propLoc) ||
        (propSubLoc && leadLoc.includes(propSubLoc));

      return bhkMatches && locMatches;
    });
  };

  // Pre-calculate matching leads counts for all properties
  const propertyMatchesMap = useMemo(() => {
    const map = {};
    properties.forEach(p => {
      map[p.id] = getMatchingLeadsForFlat(p);
    });
    return map;
  }, [properties, leads]);

  const totalMatchingLeadsAcrossInventory = useMemo(() => {
    const matchedLeadIds = new Set();
    Object.values(propertyMatchesMap).forEach(list => {
      list.forEach(l => matchedLeadIds.add(l.id));
    });
    return matchedLeadIds.size;
  }, [propertyMatchesMap]);

  // =========================================================================
  // FILTERED & SORTED PROPERTIES
  // =========================================================================
  const filteredProperties = useMemo(() => {
    const cleanQuery = (searchQuery || '').trim();
    const hasSearch = cleanQuery.length > 0;

    const list = properties.filter(prop => {
      // 1. Multi-token, case-insensitive search
      const matchesSearch = matchesSearchQuery(
        cleanQuery,
        prop.title,
        prop.location,
        prop.subLocation,
        prop.brokerName,
        prop.brokerPhone,
        prop.bhk,
        prop.listingType,
        prop.furnishing,
        prop.price,
        prop.sqft,
        prop.description,
        prop.amenities,
        prop.status,
        prop.id
      );

      if (!matchesSearch) return false;

      // If user typed a search query, prioritize showing results directly
      if (hasSearch) return true;

      // Type filter
      if (listingTypeFilter !== 'all' && prop.listingType !== listingTypeFilter) return false;

      // BHK filter
      if (bhkFilter !== 'all' && !prop.bhk.includes(bhkFilter)) return false;

      // Location filter
      if (locationFilter !== 'All' && prop.location !== locationFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && (prop.status || 'available') !== statusFilter) return false;

      // Furnishing filter
      if (furnishingFilter !== 'all' && prop.furnishing !== furnishingFilter) return false;

      // Price tier filter
      if (priceTierFilter !== 'all') {
        const price = Number(prop.price) || 0;
        if (priceTierFilter === 'under15k' && price >= 15000) return false;
        if (priceTierFilter === '15k_30k' && (price < 15000 || price > 30000)) return false;
        if (priceTierFilter === '30k_50k' && (price < 30000 || price > 50000)) return false;
        if (priceTierFilter === 'above50k' && price <= 50000) return false;
      }

      return true;
    });

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [
    properties,
    searchQuery,
    listingTypeFilter,
    bhkFilter,
    locationFilter,
    priceTierFilter,
    statusFilter,
    furnishingFilter,
    sortBy
  ]);

  const totalCount = properties.length;
  const rentCount = properties.filter(p => p.listingType === 'rent').length;
  const saleCount = properties.filter(p => p.listingType === 'sale').length;
  const availableCount = properties.filter(p => (p.status || 'available') === 'available').length;

  // =========================================================================
  // WHATSAPP PITCH & BROCHURE GENERATION
  // Formats flat details for instant client sending
  // =========================================================================
  const generatePropertyPitch = (prop) => {
    const isRent = prop.listingType === 'rent';
    const priceFormatted = isRent 
      ? `₹${prop.price?.toLocaleString('en-IN')}/month` 
      : `₹${prop.price >= 10000000 ? (prop.price / 10000000).toFixed(2) + ' Crore' : (prop.price / 100000).toFixed(1) + ' Lakhs'}`;
    
    const amenitiesText = prop.amenities && prop.amenities.length > 0 
      ? prop.amenities.slice(0, 6).join(', ') 
      : 'Lift, 24/7 Security, Power Backup';

    return `🏡 *FLATZY KOLKATA — VERIFIED PROPERTY OPTION*
━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *${prop.title}*
🏷️ *Type:* For ${prop.listingType.toUpperCase()}
🏢 *Configuration:* ${prop.bhk} (${prop.sqft ? `${prop.sqft} sq.ft` : 'Spacious Flat'})
💰 *Price:* ${priceFormatted}${isRent && prop.securityDeposit ? ` | Deposit: ₹${prop.securityDeposit?.toLocaleString('en-IN')}` : ''}
📍 *Location:* ${prop.location}${prop.subLocation ? ` (${prop.subLocation})` : ''}
🛋️ *Furnishing:* ${prop.furnishing || 'Semi Furnished'}
✨ *Amenities:* ${amenitiesText}
📅 *Posted:* ${prop.postingDate || 'Recent'}
${prop.description ? `\n📝 *Details:* ${prop.description}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *Direct Partner:* ${prop.brokerPhone || '+91 89103 76054'} (${prop.brokerName || 'Flatzy Verified'})
🌐 *Schedule a Visit with Flatzy Kolkata*`;
  };

  const handleCopyPitch = (prop, e) => {
    e.stopPropagation();
    const pitch = generatePropertyPitch(prop);
    navigator.clipboard.writeText(pitch);
    setCopiedPitchId(prop.id);
    showToast(`📋 Copied WhatsApp brochure for "${prop.title}"`);
    setTimeout(() => setCopiedPitchId(null), 2000);
  };

  const handleShareWhatsApp = (prop, e) => {
    e.stopPropagation();
    const pitch = generatePropertyPitch(prop);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(pitch)}`, '_blank');
  };

  // Quick 1-Tap Status Switcher
  const handleQuickStatusChange = (prop, nextStatus, e) => {
    e.stopPropagation();
    const updated = { ...prop, status: nextStatus };
    onUpdateProperty(updated);
    const statusLabels = {
      available: '🟢 Available',
      reserved: '🟡 Reserved (Token Paid)',
      rented: '🔴 Rented Out',
      sold: '🔴 Sold Out'
    };
    showToast(`Flat updated to ${statusLabels[nextStatus] || nextStatus}`);
  };

  // Lightbox handlers
  const openLightbox = (images, index, title, e) => {
    e.stopPropagation();
    if (!images || images.length === 0) return;
    setLightboxData({ images, activeIndex: index, title });
  };

  const nextLightboxImg = () => {
    if (!lightboxData) return;
    setLightboxData(prev => ({
      ...prev,
      activeIndex: (prev.activeIndex + 1) % prev.images.length
    }));
  };

  const prevLightboxImg = () => {
    if (!lightboxData) return;
    setLightboxData(prev => ({
      ...prev,
      activeIndex: (prev.activeIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  // Amenity toggles in forms
  const toggleAmenityInForm = (amenity) => {
    const current = formData.amenities || [];
    if (current.includes(amenity)) {
      setFormData({ ...formData, amenities: current.filter(a => a !== amenity) });
    } else {
      setFormData({ ...formData, amenities: [...current, amenity] });
    }
  };

  const toggleAmenityInEdit = (amenity) => {
    if (!editingProperty) return;
    const current = editingProperty.amenities || [];
    if (current.includes(amenity)) {
      setEditingProperty({ ...editingProperty, amenities: current.filter(a => a !== amenity) });
    } else {
      setEditingProperty({ ...editingProperty, amenities: [...current, amenity] });
    }
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
      brokerName: parsed.brokerName || prev.brokerName,
      brokerPhone: parsed.brokerPhone || prev.brokerPhone,
      description: parsed.description || prev.description
    }));
  };

  const handleAddSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title.trim()) {
      showToast('⚠️ Please enter a title');
      return;
    }

    const cleanImages = (formData.images || []).map(s => s.trim()).filter(Boolean).slice(0, 6);

    const newProp = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brokerId: 'admin-master',
      brokerName: formData.brokerName.trim() || 'Flatzy Verified',
      brokerPhone: formData.brokerPhone.trim() || '918910376054',
      title: formData.title.trim(),
      listingType: formData.listingType,
      bhk: formData.bhk,
      sqft: Number(formData.sqft) || 1000,
      postingDate: formData.postingDate || todayFormatted,
      location: formData.location,
      subLocation: formData.subLocation.trim() || formData.location,
      price: Number(formData.price) || 20000,
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
    setShowAddModal(false);
    setFormData(defaultPropertyForm);
    showToast(`✅ Added flat "${newProp.title}"`);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingProperty) return;

    const cleanImages = (editingProperty.images || []).map(s => s.trim()).filter(Boolean).slice(0, 6);

    const updated = {
      ...editingProperty,
      title: editingProperty.title.trim(),
      sqft: Number(editingProperty.sqft) || 1000,
      postingDate: editingProperty.postingDate || todayFormatted,
      price: Number(editingProperty.price) || 20000,
      securityDeposit: Number(editingProperty.securityDeposit) || 0,
      amenities: editingProperty.amenities || [],
      images: cleanImages
    };

    onUpdateProperty(updated);
    setEditingProperty(null);
    showToast(`✅ Updated flat "${updated.title}"`);
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 4 HIGH-IMPACT OPERATIONAL METRIC TILES */}
      {/* ======================================================== */}
      <section aria-label="Properties Overview" className="px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. All Listings */}
          <div className="rounded-[22px] p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-[#0284C7] via-[#0369A1] to-[#075985] min-h-[110px] flex flex-col justify-between">
            <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none">
              <Building2 className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <span className="text-3xl font-black">{totalCount}</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black">All Flats Listed</p>
              <p className="text-[10px] text-sky-200 font-bold">{availableCount} Available Now</p>
            </div>
          </div>

          {/* 2. For Rent */}
          <div className="rounded-[22px] p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] min-h-[110px] flex flex-col justify-between">
            <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none">
              <Home className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <span className="text-3xl font-black">{rentCount}</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black">For Rent</p>
              <p className="text-[10px] text-blue-200 font-bold">Monthly Rentals</p>
            </div>
          </div>

          {/* 3. For Sale */}
          <div className="rounded-[22px] p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] min-h-[110px] flex flex-col justify-between">
            <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none">
              <Tag className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <span className="text-3xl font-black">{saleCount}</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Tag className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black">For Sale</p>
              <p className="text-[10px] text-purple-200 font-bold">Buy & Resale Flats</p>
            </div>
          </div>

          {/* 4. Post Flat Action */}
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-[22px] p-4 text-[#0B132B] shadow-lg relative overflow-hidden bg-gradient-to-br from-[#FFC800] via-[#FFD21A] to-[#FFAE00] hover:brightness-105 active:scale-[0.98] transition-all text-left flex flex-col justify-between cursor-pointer border border-[#FFC800]/40 group"
          >
            <div className="absolute -bottom-3 -right-3 text-[#0B132B]/10 pointer-events-none">
              <Building2 className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/15 text-[#0B132B]">
                + Upload
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#FFC800] flex items-center justify-center shadow-md group-hover:rotate-90 transition-transform">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-sm font-black text-[#0B132B]">Post Flat</p>
              <p className="text-[10px] text-slate-900/80 font-bold">Rent or Sale (Photos Optional)</p>
            </div>
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SEARCH BAR & DYNAMIC QUICK FILTERS */}
      {/* ======================================================== */}
      <section className="px-4 space-y-2.5">
        {/* Search input + Area Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flats by title, locality, broker, BHK, price..."
              className={`w-full pl-9 pr-9 py-2.5 rounded-2xl border text-xs font-medium outline-none transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-xs'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-bold outline-none cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            {KOLKATA_LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc === 'All' ? '📍 All Areas' : loc}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              showAdvancedFilters || priceTierFilter !== 'all' || statusFilter !== 'all' || furnishingFilter !== 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="More Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Filter Row: Type + BHK */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-bold">
          {/* Rent/Sale Tabs */}
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'rent', label: `Rent (${rentCount})` },
            { id: 'sale', label: `Sale (${saleCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setListingTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all border whitespace-nowrap cursor-pointer ${
                listingTypeFilter === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <span className="text-slate-400">|</span>

          {/* BHK Chips */}
          {['all', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'].map(bhk => (
            <button
              key={bhk}
              onClick={() => setBhkFilter(bhk)}
              className={`px-3 py-1.5 rounded-xl transition-all border whitespace-nowrap cursor-pointer ${
                bhkFilter === bhk
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              {bhk === 'all' ? 'Any BHK' : bhk}
            </button>
          ))}
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvancedFilters && (
          <div className={`p-3.5 rounded-2xl border space-y-2.5 transition-all text-xs ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Status Filters */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Availability Status</p>
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'available', label: '🟢 Available Only' },
                  { id: 'reserved', label: '🟡 Reserved' },
                  { id: 'rented', label: '🔴 Rented Out' },
                  { id: 'sold', label: '🔴 Sold' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] whitespace-nowrap ${
                      statusFilter === s.id
                        ? 'bg-slate-800 text-white border-slate-700 dark:bg-white dark:text-slate-900'
                        : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Tiers */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Price Tier</p>
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Prices' },
                  { id: 'under15k', label: 'Under ₹15K' },
                  { id: '15k_30k', label: '₹15K – ₹30K' },
                  { id: '30k_50k', label: '₹30K – ₹50K' },
                  { id: 'above50k', label: '₹50K+ / Luxury' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPriceTierFilter(p.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] whitespace-nowrap ${
                      priceTierFilter === p.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort Inventory:</span>
              </span>
              <div className="flex items-center space-x-1.5">
                {[
                  { id: 'newest', label: 'Newest First' },
                  { id: 'price_asc', label: 'Price: Low to High' },
                  { id: 'price_desc', label: 'Price: High to Low' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSortBy(item.id)}
                    className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                      sortBy === item.id ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* PROPERTIES LIST */}
      {/* ======================================================== */}
      <section className="px-4 space-y-3 pb-8">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            {searchQuery.trim() ? (
              <span className="flex items-center space-x-1.5">
                <span className="text-blue-500 font-bold">🔍 Results for "{searchQuery.trim()}":</span>
                <span>{filteredProperties.length} flat{filteredProperties.length === 1 ? '' : 's'}</span>
              </span>
            ) : (
              <>Showing <strong className={isDark ? 'text-white' : 'text-slate-900 font-extrabold'}>{filteredProperties.length}</strong> of {totalCount} properties</>
            )}
          </span>
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-blue-500 font-bold hover:underline"
            >
              Clear Search
            </button>
          )}
        </div>

        {filteredProperties.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <h4 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {searchQuery.trim() ? `No properties matching "${searchQuery.trim()}"` : 'No properties found'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery.trim() ? 'Try checking your spelling or search by locality/BHK.' : 'Try clearing your search query or filters.'}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-transform active:scale-95"
              >
                Clear Search & Show All
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProperties.map(prop => {
            const validImages = (prop.images || []).filter(Boolean).slice(0, 6);
            const isRent = prop.listingType === 'rent';
            const matchingLeads = propertyMatchesMap[prop.id] || [];
            const hasMatches = matchingLeads.length > 0;
            const currentStatus = prop.status || 'available';
            const timeMeta = getPropertyTimestamp(prop);

            return (
              <div
                key={prop.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all relative overflow-hidden shadow-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Header Row: Type Badge + BHK + Sq.Ft + Countdown + Posting Date + Price */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                        isRent ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                        FOR {prop.listingType.toUpperCase()}
                      </span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">{prop.bhk}</span>
                      
                      {/* Square Feet Badge */}
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center space-x-1">
                        <Maximize2 className="w-3 h-3" />
                        <span>{prop.sqft ? `${prop.sqft} sq.ft` : '1,000 sq.ft'}</span>
                      </span>

                      {/* Elapsed Countdown Pill (e.g. "Just now", "7 days ago", "14 days ago") */}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center space-x-1 ${timeMeta.badgeClass}`} title={`Posted on ${timeMeta.fullDate}`}>
                        <Clock className="w-3 h-3" />
                        <span>{timeMeta.timeAgo}</span>
                      </span>

                      {/* Posting Date */}
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1" title={timeMeta.timeStr ? `Time: ${timeMeta.timeStr}` : ''}>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{timeMeta.dateStr}</span>
                      </span>

                      <span className="text-xs font-semibold text-slate-400">• {prop.brokerName || 'Broker'}</span>
                    </div>

                    <h3 className={`text-base font-black mt-1.5 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{prop.title}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-blue-600 dark:text-blue-400 block">
                      {isRent 
                        ? `₹${prop.price?.toLocaleString('en-IN')}` 
                        : `₹${prop.price >= 10000000 ? (prop.price / 10000000).toFixed(2) + ' Cr' : (prop.price / 100000).toFixed(1) + ' L'}`
                      }
                      <span className="text-[10px] font-normal text-slate-400">{isRent ? '/mo' : ''}</span>
                    </span>

                    {/* Interactive 1-Tap Quick Status Switcher */}
                    <div className="mt-1 flex items-center justify-end space-x-1">
                      {currentStatus === 'available' ? (
                        <button
                          onClick={(e) => handleQuickStatusChange(prop, 'reserved', e)}
                          title="Click to mark as Reserved"
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>AVAILABLE</span>
                        </button>
                      ) : currentStatus === 'reserved' ? (
                        <button
                          onClick={(e) => handleQuickStatusChange(prop, isRent ? 'rented' : 'sold', e)}
                          title="Click to mark as Rented/Sold"
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>RESERVED</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleQuickStatusChange(prop, 'available', e)}
                          title="Click to re-activate as Available"
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-500 dark:text-slate-400 hover:bg-slate-500/25 border border-slate-500/30 transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                          <span>{currentStatus.toUpperCase()}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* MATCHING TENANT LEADS ALERT BANNER (High Utility!) */}
                {/* ======================================================== */}
                {hasMatches ? (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-purple-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-[#FFC800] text-[#0B132B] flex items-center justify-center font-black">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {matchingLeads.length} Matching Tenant Lead{matchingLeads.length > 1 ? 's' : ''} Ready
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          Looking for {prop.bhk} in {prop.location}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedFlatForLeads(prop)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] shadow-xs transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Match Leads</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1">
                    <span>No active tenant inquiries currently matching this BHK/Area</span>
                  </div>
                )}

                {/* Photo Gallery Grid (Clickable Lightbox) or Fallback Specs */}
                {validImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 my-3">
                    {validImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => openLightbox(validImages, idx, prop.title, e)}
                        className="aspect-4/3 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group cursor-pointer"
                      >
                        <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
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
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-300">
                      Live on Flatzy
                    </span>
                  </div>
                )}

                {/* Amenities Chips */}
                {prop.amenities && prop.amenities.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1 mt-2 mb-2">
                    {prop.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Location & Furnishing Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {prop.location} • {prop.subLocation}
                  </span>
                  <span>{prop.furnishing}</span>
                </div>

                {/* ======================================================== */}
                {/* ACTION TOOLBAR: WhatsApp Share, Copy Pitch, Call Broker */}
                {/* ======================================================== */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  {/* Broker Contact & Direct Dial / WhatsApp */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-400">Partner:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{prop.brokerName || 'Partner'}</strong>
                    {prop.brokerPhone && (
                      <div className="flex items-center space-x-1 ml-1">
                        <a
                          href={`tel:${prop.brokerPhone}`}
                          className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          title="Call Broker"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://wa.me/${prop.brokerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${prop.brokerName || 'Partner'}, is the flat "${prop.title}" still available for inspection?`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                          title="WhatsApp Broker"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="flex items-center space-x-1.5 ml-auto">
                    {/* Share on WhatsApp */}
                    <button
                      onClick={(e) => handleShareWhatsApp(prop, e)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                      title="Share property brochure on WhatsApp"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Copy Pitch */}
                    <button
                      onClick={(e) => handleCopyPitch(prop, e)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-all active:scale-95 border cursor-pointer ${
                        copiedPitchId === prop.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Copy full WhatsApp brochure to clipboard"
                    >
                      {copiedPitchId === prop.id ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Pitch</span>
                        </>
                      )}
                    </button>

                    {/* Edit Flat */}
                    <button
                      onClick={() => setEditingProperty({ ...prop })}
                      className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all cursor-pointer"
                      title="Edit Flat Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Flat */}
                    <button
                      onClick={() => setPropertyToDelete(prop)}
                      className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                      title="Delete Property"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* MATCHING TENANT INQUIRIES MODAL */}
      {/* ======================================================== */}
      {selectedFlatForLeads && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl p-5 shadow-2xl border my-8 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFC800] text-[#0B132B] flex items-center justify-center font-black">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-black leading-tight">Matching Inquiries for This Flat</h3>
                  <p className="text-[11px] text-slate-400">{selectedFlatForLeads.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedFlatForLeads(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flat Quick Summary Box */}
            <div className="my-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs flex items-center justify-between">
              <div>
                <span className="font-extrabold text-blue-600 dark:text-blue-400">{selectedFlatForLeads.bhk} • {selectedFlatForLeads.location}</span>
                <span className="block text-[11px] text-slate-400">Rent: ₹{selectedFlatForLeads.price?.toLocaleString('en-IN')}/mo</span>
              </div>
              <button
                onClick={(e) => handleShareWhatsApp(selectedFlatForLeads, e)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center space-x-1 shadow-xs"
              >
                <Share2 className="w-3 h-3" />
                <span>Share Brochure</span>
              </button>
            </div>

            {/* List of matching leads */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {(propertyMatchesMap[selectedFlatForLeads.id] || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active inquiries match this configuration right now.
                </div>
              ) : (
                (propertyMatchesMap[selectedFlatForLeads.id] || []).map((lead) => {
                  const leadMsg = `Hi ${lead.name}, this is Flatzy Kolkata! Regarding your inquiry for ${lead.bhk || selectedFlatForLeads.bhk} in ${lead.location || selectedFlatForLeads.location}: We have this verified option available right now:\n\n🏡 *${selectedFlatForLeads.title}*\n💰 Rent: ₹${selectedFlatForLeads.price?.toLocaleString('en-IN')}/month\n📍 Location: ${selectedFlatForLeads.location} (${selectedFlatForLeads.subLocation || ''})\n✨ Amenities: ${(selectedFlatForLeads.amenities || []).slice(0, 4).join(', ')}\n\nWould you like to schedule a physical visit today?`;
                  
                  return (
                    <div
                      key={lead.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs text-slate-900 dark:text-white">{lead.name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {lead.bhk || 'Flat'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{lead.phone}</span>
                        </div>

                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {lead.budget || 'Budget open'}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Timeline: <strong className="text-slate-600 dark:text-slate-300">{lead.shiftingDate || 'Immediate'}</strong>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <a
                            href={`tel:${lead.phone}`}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center space-x-1"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>Call</span>
                          </a>

                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(leadMsg)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center space-x-1 shadow-xs"
                          >
                            <MessageCircle className="w-2.5 h-2.5 fill-current" />
                            <span>Send Flat Pitch</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedFlatForLeads(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HIGH-RES PHOTO LIGHTBOX MODAL */}
      {/* ======================================================== */}
      {lightboxData && (
        <div 
          onClick={() => setLightboxData(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="p-3.5 bg-black/40 flex items-center justify-between text-white border-b border-white/10">
              <span className="text-xs font-black truncate">{lightboxData.title}</span>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  {lightboxData.activeIndex + 1} / {lightboxData.images.length}
                </span>
                <button onClick={() => setLightboxData(null)} className="p-1 hover:text-amber-400 text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View */}
            <div className="relative aspect-16/10 bg-black flex items-center justify-center">
              <img
                src={lightboxData.images[lightboxData.activeIndex]}
                alt={`Photo ${lightboxData.activeIndex + 1}`}
                className="w-full h-full object-contain select-none"
              />

              {lightboxData.images.length > 1 && (
                <>
                  <button
                    onClick={prevLightboxImg}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextLightboxImg}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail selector */}
            {lightboxData.images.length > 1 && (
              <div className="p-2.5 bg-black/40 flex items-center justify-center space-x-2 border-t border-white/10">
                {lightboxData.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxData(prev => ({ ...prev, activeIndex: i }))}
                    className={`w-12 h-9 rounded-lg overflow-hidden border-2 transition-all ${
                      lightboxData.activeIndex === i ? 'border-[#FFC800] scale-105' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={url} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD PROPERTY MODAL */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-hidden">
          <div className={`w-full max-w-5xl xl:max-w-6xl h-[92vh] max-h-[900px] rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* 1. DESKTOP MODAL HEADER */}
            <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">Post New Flat</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Add flat details manually or auto-fill with AI
                  </p>
                </div>
              </div>

              {/* Pill Toggle with Circle: AI Details Filler vs Manual */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center p-1 rounded-full bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setPhonePostMode('ai')}
                    className={`flex items-center space-x-1.5 py-1 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      phonePostMode === 'ai'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full transition-all ${
                      phonePostMode === 'ai' ? 'bg-amber-400 ring-2 ring-white/50 animate-pulse' : 'bg-slate-400/50'
                    }`} />
                    <Sparkles className="w-3 h-3" />
                    <span>AI Details Filler</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhonePostMode('manual')}
                    className={`flex items-center space-x-1.5 py-1 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      phonePostMode === 'manual'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black border border-slate-200 dark:border-slate-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full transition-all ${
                      phonePostMode === 'manual' ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-slate-400/50'
                    }`} />
                    <FileEdit className="w-3 h-3" />
                    <span>Manual</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. BODY CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: AI Details Filler (if AI mode) + 4-Photo Uploader */}
                <div className="lg:col-span-5 space-y-4">
                  {phonePostMode === 'ai' && (
                    <AiPropertyQuickBox
                      onParsedProperty={(parsed) => {
                        handleAiParsedProperty(parsed);
                        showToast('✅ Details extracted with AI! Review & publish below.');
                      }}
                      showToast={showToast}
                      isDark={isDark}
                    />
                  )}

                  {/* Cloudinary CDN 4-Photo Uploader */}
                  <CloudinaryImageUploader
                    images={formData.images}
                    onChange={(newImages) => setFormData({ ...formData, images: newImages })}
                    isDark={isDark}
                    showToast={showToast}
                  />

                  {/* Phone AI Quick Publish & Summary Card */}
                  <div className="lg:hidden p-4 rounded-2xl border bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-blue-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-500 dark:text-blue-400">
                          Ready to Publish
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhonePostMode('manual')}
                        className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer"
                      >
                        Edit in Form ✏️
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                      <p className="font-extrabold truncate text-slate-800 dark:text-slate-200">
                        {formData.title || 'Untitled Listing (Will auto-generate)'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          {formData.bhk}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          ₹{Number(formData.price || 0).toLocaleString('en-IN')}{formData.listingType === 'rent' ? '/mo' : ''}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                          📍 {formData.location}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSubmit}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>🚀 Publish Flat to Website</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Structured Labeled Form Fields */}
                <div className={`lg:col-span-7 ${phonePostMode === 'manual' ? 'block' : 'hidden lg:block'}`}>
                  {/* Photo Uploader rendered on phone for Manual Mode */}
                  <div className="lg:hidden mb-4">
                    <CloudinaryImageUploader
                      images={formData.images}
                      onChange={(newImages) => setFormData({ ...formData, images: newImages })}
                      isDark={isDark}
                      showToast={showToast}
                    />
                  </div>

                  <form id="desktopFlatForm" onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                    
                    {/* SECTION 1: Basic Information & Headline */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          1. Basic Information
                        </span>

                        {/* Rent / Sale Toggle Tabs */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, listingType: 'rent' })}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              formData.listingType === 'rent'
                                ? 'bg-blue-600 text-white shadow-xs font-black'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                            }`}
                          >
                            🏠 For Rent
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, listingType: 'sale' })}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              formData.listingType === 'sale'
                                ? 'bg-amber-500 text-white shadow-xs font-black'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                            }`}
                          >
                            🏷️ For Sale
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="font-extrabold block mb-1">
                          Headline / Listing Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Spacious 2BHK Gated Society with Balcony"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                            isDark 
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' 
                              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* SECTION 2: Configuration & Pricing (2x2 Grid) */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        2. Configuration & Pricing
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-extrabold block mb-1">Configuration (BHK) *</label>
                          <select
                            value={formData.bhk}
                            onChange={(e) => setFormData({ ...formData, bhk: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="1 RK">1 RK / Studio</option>
                            <option value="1 BHK">1 BHK</option>
                            <option value="2 BHK">2 BHK</option>
                            <option value="3 BHK">3 BHK</option>
                            <option value="4+ BHK">4+ BHK</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-extrabold block mb-1">Square Feet (sq.ft) *</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 1150"
                            value={formData.sqft}
                            onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="font-extrabold block mb-1">
                            {formData.listingType === 'rent' ? 'Monthly Rent (₹/mo) *' : 'Total Sale Price (₹) *'}
                          </label>
                          <input
                            type="number"
                            required
                            placeholder={formData.listingType === 'rent' ? "e.g. 18000" : "e.g. 4500000"}
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-blue-400 focus:border-blue-500' : 'bg-white border-slate-300 text-blue-600 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="font-extrabold block mb-1">Security Deposit (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 36000"
                            value={formData.securityDeposit}
                            onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Location & Landmark */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        3. Kolkata Location & Landmark
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-extrabold block mb-1">Primary Locality *</label>
                          <select
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {KOLKATA_LOCATIONS.filter(l => l !== 'All').map(loc => (
                              <option key={loc} value={loc} className="dark:bg-slate-900">{loc}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-extrabold block mb-1">Sub-Location / Society Landmark</label>
                          <input
                            type="text"
                            placeholder="e.g. Near Ecospace / Sukhobristhi Phase 2"
                            value={formData.subLocation}
                            onChange={(e) => setFormData({ ...formData, subLocation: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: Furnishing & Amenities */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          4. Furnishing & Amenities
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-extrabold text-slate-400">Furnishing:</span>
                          <select
                            value={formData.furnishing}
                            onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="Fully Furnished" className="dark:bg-slate-900">Fully Furnished</option>
                            <option value="Semi Furnished" className="dark:bg-slate-900">Semi Furnished</option>
                            <option value="Unfurnished" className="dark:bg-slate-900">Unfurnished</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                        {COMMON_AMENITIES.map(amenity => {
                          const selected = (formData.amenities || []).includes(amenity);
                          return (
                            <button
                              type="button"
                              key={amenity}
                              onClick={() => toggleAmenityInForm(amenity)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                selected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {selected ? '✓ ' : '+ '}{amenity}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION 5: Contact Details */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        5. Broker / Landlord Contact
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-extrabold block mb-1">Contact Person Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Sagnik"
                            value={formData.brokerName}
                            onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="font-extrabold block mb-1">WhatsApp / Phone Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 918910376054"
                            value={formData.brokerPhone}
                            onChange={(e) => setFormData({ ...formData, brokerPhone: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="pt-2 flex items-center justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          <span>🚀 Publish Flat to Website</span>
                        </button>
                      </div>
                    </div>

                  </form>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT PROPERTY MODAL */}
      {/* ======================================================== */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-8 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black">Edit Flat Details</h3>
              <button onClick={() => setEditingProperty(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold block mb-1">Title / Headline *</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-extrabold block mb-1">Listing Type *</label>
                  <select
                    value={editingProperty.listingType}
                    onChange={(e) => setEditingProperty({ ...editingProperty, listingType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="rent" className="dark:bg-slate-900">For Rent</option>
                    <option value="sale" className="dark:bg-slate-900">For Sale</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold block mb-1">Configuration (BHK) *</label>
                  <select
                    value={editingProperty.bhk}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bhk: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="1 RK" className="dark:bg-slate-900">1 RK</option>
                    <option value="1 BHK" className="dark:bg-slate-900">1 BHK</option>
                    <option value="2 BHK" className="dark:bg-slate-900">2 BHK</option>
                    <option value="3 BHK" className="dark:bg-slate-900">3 BHK</option>
                    <option value="4+ BHK" className="dark:bg-slate-900">4+ BHK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-extrabold block mb-1">Square Feet *</label>
                  <input
                    type="number"
                    required
                    value={editingProperty.sqft}
                    onChange={(e) => setEditingProperty({ ...editingProperty, sqft: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-extrabold block mb-1">Posting Date *</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.postingDate}
                    onChange={(e) => setEditingProperty({ ...editingProperty, postingDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-extrabold block mb-1">Locality *</label>
                  <select
                    value={editingProperty.location}
                    onChange={(e) => setEditingProperty({ ...editingProperty, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    {KOLKATA_LOCATIONS.filter(l => l !== 'All').map(loc => (
                      <option key={loc} value={loc} className="dark:bg-slate-900">{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold block mb-1">Sub-Location</label>
                  <input
                    type="text"
                    value={editingProperty.subLocation || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, subLocation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-extrabold block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editingProperty.price}
                    onChange={(e) => setEditingProperty({ ...editingProperty, price: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-extrabold block mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={editingProperty.securityDeposit || 0}
                    onChange={(e) => setEditingProperty({ ...editingProperty, securityDeposit: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold block mb-1">Availability Status</label>
                <select
                  value={editingProperty.status || 'available'}
                  onChange={(e) => setEditingProperty({ ...editingProperty, status: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none cursor-pointer"
                >
                  <option value="available" className="dark:bg-slate-900">🟢 Available</option>
                  <option value="reserved" className="dark:bg-slate-900">🟡 Reserved (Token Paid)</option>
                  <option value="rented" className="dark:bg-slate-900">🔴 Rented Out</option>
                  <option value="sold" className="dark:bg-slate-900">🔴 Sold</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold block mb-1">Amenities</label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
                  {COMMON_AMENITIES.map(amenity => {
                    const selected = (editingProperty.amenities || []).includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenityInEdit(amenity)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          selected
                            ? 'bg-blue-600 text-white'
                            : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cloudinary CDN Image Uploader for Edit */}
              <CloudinaryImageUploader
                images={editingProperty.images || []}
                onChange={(newImages) => setEditingProperty({ ...editingProperty, images: newImages })}
                isDark={isDark}
                showToast={showToast}
              />

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border text-center ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black">Delete Property Listing?</h4>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to remove <strong>"{propertyToDelete.title}"</strong>? It will also be removed from the public website.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => setPropertyToDelete(null)}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProperty(propertyToDelete.id);
                  setPropertyToDelete(null);
                  showToast(`🗑️ Removed "${propertyToDelete.title}"`);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md"
              >
                Delete Flat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

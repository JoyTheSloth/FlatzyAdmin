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
  FileEdit
} from 'lucide-react';
import { KOLKATA_LOCATIONS } from '../data/leadsData';
import CloudinaryImageUploader from './CloudinaryImageUploader';
import { formatEnquiryTimestamp, getLeadTimestamp } from '../utils/dateUtils';

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
  onSignOut,
  showToast,
  isDark
}) {
  // 2 ACCESSES: 'properties' (Upload & Manage Flats) vs 'leads' (Assigned Leads)
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'leads'
  
  // Leads Sub-Filter: 'assigned' (Assigned by Super Admin) vs 'all' (All Kolkata Enquiries)
  const [leadsFilterTab, setLeadsFilterTab] = useState('assigned'); // 'assigned' | 'all'
  
  // Property filters
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all', 'rent', 'sale'
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);

  // Form state for adding new property
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
    images: ['', '', '', ''],
    status: 'available'
  };
  const [formData, setFormData] = useState(defaultPropertyForm);
  const [phonePostMode, setPhonePostMode] = useState('ai'); // 'ai' | 'manual'

  // Filter properties owned by this broker
  const safeProperties = properties || [];
  const myProperties = safeProperties.filter(p => p.brokerId === currentUser?.id || (currentUser?.phone && p.brokerPhone === currentUser?.phone));
  const displayedProperties = myProperties.filter(p => {
    if (listingTypeFilter !== 'all' && p.listingType !== listingTypeFilter) return false;
    return true;
  });

  // Filter leads assigned to this broker by Super Admin
  const safeLeads = leads || [];
  const assignedLeads = safeLeads.filter(l => 
    l.assignedBrokerId === currentUser?.id || 
    (currentUser?.phone && l.assignedBrokerPhone === currentUser?.phone)
  );

  const displayedLeads = leadsFilterTab === 'assigned'
    ? assignedLeads
    : safeLeads.filter(l => l.status !== 'closed');

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

  // Handle image URL change
  const handleImageUrlChange = (index, value) => {
    const updated = [...formData.images];
    updated[index] = value;
    setFormData({ ...formData, images: updated });
  };

  const handleEditImageUrlChange = (index, value) => {
    if (!editingProperty) return;
    const currentImgs = editingProperty.images || ['', '', '', ''];
    while (currentImgs.length < 4) currentImgs.push('');
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

  // Submit Add
  const handleAddSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title.trim()) {
      showToast('⚠️ Please enter a property title');
      return;
    }

    const cleanImages = (formData.images || []).map(s => s.trim()).filter(Boolean).slice(0, 4);

    const newProp = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brokerId: currentUser.id,
      brokerName: currentUser.name || currentUser.agencyName || 'Partner Broker',
      brokerPhone: currentUser.phone || '',
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
      images: cleanImages, // Optional! Can be empty
      status: 'available',
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    onAddProperty(newProp);
    setShowAddModal(false);
    setFormData(defaultPropertyForm);
    showToast(`✅ Property listed for ${newProp.listingType.toUpperCase()}!`);
  };

  // Submit Edit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingProperty) return;

    const cleanImages = (editingProperty.images || []).map(s => s.trim()).filter(Boolean).slice(0, 4);
    const updatedProp = {
      ...editingProperty,
      images: cleanImages
    };

    onUpdateProperty(updatedProp);
    setEditingProperty(null);
    showToast(`✅ Updated "${updatedProp.title}"`);
  };

  // WhatsApp Connect for Lead
  const openWhatsAppLead = (lead) => {
    const isAssigned = lead.assignedBrokerId === currentUser?.id || (currentUser?.phone && lead.assignedBrokerPhone === currentUser?.phone);
    const text = isAssigned
      ? `Hello ${lead.name}, Flatzy Kolkata has assigned me as your dedicated property partner. I noticed you are looking for a ${lead.bhk || lead.property || 'flat'} in ${lead.location || 'Kolkata'}. I have verified options ready for you!`
      : `Hello ${lead.name}, regarding your requirement for a ${lead.bhk || lead.property || 'flat'} in ${lead.location || 'Kolkata'}. I am a partner broker with Flatzy.`;
    window.open(`https://wa.me/91${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCallLead = (phone) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  const handleCopyPhone = (phone, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    showToast(`Copied ${phone} to clipboard`);
    setTimeout(() => setCopiedPhoneId(null), 1800);
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen flex flex-col px-3 sm:px-6 lg:px-8 pb-12">
      {/* BROKER BRANDED HEADER */}
      <header className="relative px-5 pt-6 pb-6 rounded-b-[32px] shadow-xl bg-[#080E21] text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity transform scale-105"
          style={{ backgroundImage: `url('/kolkata-header.jpg')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#080E21]/80 via-[#0B1530]/65 to-[#080E21]/95"></div>

        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] p-0.5 shadow-md flex items-center justify-center text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-lg font-black tracking-tight">{currentUser.agencyName || currentUser.name || 'Partner Broker'}</h1>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  VERIFIED PARTNER
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono font-medium flex items-center space-x-1">
                <Phone className="w-3 h-3 text-purple-400" />
                <span>{currentUser.phone || 'Partner Broker'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            title="Sign Out"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/15 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* 2 MAIN BROKER ACCESSES: FLATS (UPLOAD/MANAGE) vs ASSIGNED LEADS */}
        <div className="relative z-10 grid grid-cols-2 gap-2 bg-white/[0.08] p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
          {/* Access 1: Upload & Manage Flats */}
          <button
            onClick={() => setActiveTab('properties')}
            className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-[#7C3AED] text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Manage Flats ({myProperties.length})</span>
          </button>

          {/* Access 2: Assigned Leads */}
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-[#FFC800] text-[#0B132B] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Assigned Leads ({assignedLeads.length})</span>
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="mt-4 px-4 space-y-4">
        {activeTab === 'properties' ? (
          <>
            {/* Quick Filter & Add Property Action */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5 text-xs font-bold">
                {['all', 'rent', 'sale'].map(type => (
                  <button
                    key={type}
                    onClick={() => setListingTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-xl capitalize transition-all border ${
                      listingTypeFilter === type
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs'
                        : isDark
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    {type === 'all' ? 'All Flats' : type === 'rent' ? 'For Rent' : 'For Sale'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] text-[#0B132B] hover:brightness-105 active:scale-95 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Post Flat (Rent / Sale)</span>
              </button>
            </div>

            {/* LISTINGS CONTAINER */}
            {displayedProperties.length === 0 ? (
              <div className={`p-8 rounded-3xl border text-center transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              }`}>
                <Home className="w-12 h-12 mx-auto text-purple-400 mb-2 stroke-[1.5]" />
                <h3 className="font-extrabold text-base">No Flats Listed Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Post your rental or sale flats with posting date, sq.ft, BHK, and optional amenities to reach verified renters in Kolkata. (Photos are optional).
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  + Post Flat Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedProperties.map(prop => {
                  const validImages = (prop.images || []).filter(Boolean).slice(0, 4);
                  const isRent = prop.listingType === 'rent';

                  return (
                    <div
                      key={prop.id}
                      className={`rounded-2xl border p-4 transition-all relative overflow-hidden group shadow-sm ${
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
                            
                            {/* Square Feet Badge */}
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center space-x-1">
                              <Maximize2 className="w-3 h-3" />
                              <span>{prop.sqft ? `${prop.sqft} sq.ft` : '1,000 sq.ft'}</span>
                            </span>

                            {/* Posting Date */}
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Posted: {prop.postingDate || 'Recent'}</span>
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

                      {/* Photo Section: If photos provided, show grid; if NOT provided, show clean aesthetic specs banner */}
                      {validImages.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5 my-3">
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

                      {/* Optional Amenities Chips */}
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

                      {/* Info Bar: Location & Furnishing */}
                      <div className={`pt-2 border-t flex items-center justify-between text-xs text-slate-500 font-semibold ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}>
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {prop.location} • {prop.subLocation}
                        </span>
                        <span>{prop.furnishing}</span>
                      </div>

                      {/* Actions */}
                      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => onUpdateProperty({
                              ...prop,
                              status: prop.status === 'available' ? (isRent ? 'rented' : 'sold') : 'available'
                            })}
                            className="text-[11px] font-bold px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            Mark as {prop.status === 'available' ? (isRent ? 'Rented' : 'Sold') : 'Available'}
                          </button>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setEditingProperty(prop)}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                            title="Edit Listing"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPropertyToDelete(prop)}
                            className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                            title="Delete Listing"
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
          </>
        ) : (
          /* ACCESS 2: ASSIGNED TENANT LEADS */
          <div className="space-y-3.5">
            {/* Sub-Filters: Assigned by Admin vs All Available Inquiries */}
            <div className="flex items-center space-x-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLeadsFilterTab('assigned')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  leadsFilterTab === 'assigned'
                    ? 'bg-amber-400 text-[#0B132B] border-amber-400 shadow-sm font-black'
                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Assigned to You ({assignedLeads.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setLeadsFilterTab('all')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  leadsFilterTab === 'all'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-black'
                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>All Inquiries ({safeLeads.filter(l => l.status !== 'closed').length})</span>
              </button>
            </div>

            {/* Context Info Banner */}
            {leadsFilterTab === 'assigned' ? (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Tenant inquiries assigned directly to your agency by <strong>Super Admin</strong>. Contact them immediately to close the deal!
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-500 shrink-0" />
                <span>
                  General active rental inquiries across Kolkata. If you have matching flats, you can reach out directly.
                </span>
              </div>
            )}

            {displayedLeads.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <Crown className="w-10 h-10 mx-auto text-amber-400 mb-2 stroke-[1.5]" />
                <p className="font-bold text-sm">
                  {leadsFilterTab === 'assigned'
                    ? 'No inquiries assigned to your agency yet.'
                    : 'No active inquiries available in this view.'}
                </p>
                <p className="text-xs mt-1">
                  {leadsFilterTab === 'assigned'
                    ? 'When Super Admin assigns customer inquiries to you, they will appear here with priority alerts.'
                    : 'Check back later for fresh tenant leads.'}
                </p>
                {leadsFilterTab === 'assigned' && (
                  <button
                    onClick={() => setLeadsFilterTab('all')}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer"
                  >
                    View All Kolkata Inquiries ({safeLeads.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedLeads.map(lead => {
                const isAssignedToMe = lead.assignedBrokerId === currentUser?.id || (currentUser?.phone && lead.assignedBrokerPhone === currentUser?.phone);

                return (
                  <div
                    key={lead.id}
                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                      isAssignedToMe
                        ? (isDark ? 'bg-slate-900 border-amber-500/40 ring-1 ring-amber-500/20 shadow-md' : 'bg-white border-amber-400 ring-1 ring-amber-400/30 shadow-md')
                        : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs')
                    }`}
                  >
                    {/* Glowing Left Indicator for Assigned Priority Leads */}
                    {isAssignedToMe && (
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-500"></div>
                    )}

                    {/* Assigned Banner */}
                    {isAssignedToMe && (
                      <div className="flex items-center space-x-1.5 mb-2.5 pb-2 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-black">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                        <span>ASSIGNED BY SUPER ADMIN • HIGH PRIORITY LEAD</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{lead.name}</h3>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            lead.status === 'Booked'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                          }`}>
                            {lead.status || 'Active Lead'}
                          </span>
                        </div>

                        {/* Location & BHK requirements */}
                        <div className="flex items-center space-x-2 mt-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                          <span className="flex items-center space-x-1">
                            <Home className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{lead.bhk || lead.property || 'Flat'}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{lead.location || 'Kolkata'}</span>
                          </span>
                        </div>

                        {/* Budget, Timestamp & Shifting */}
                        <div className="flex items-center space-x-2.5 mt-1.5 text-xs flex-wrap gap-y-1">
                          <span className="font-bold text-[#7C3AED]">Budget: {lead.budget || 'Flexible'}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{getLeadTimestamp(lead)}</span>
                          </span>
                          {lead.shiftingDate && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center space-x-1 text-[11px]">
                                <Calendar className="w-3 h-3" />
                                <span>Shift: {lead.shiftingDate}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Phone Copy Pill */}
                      {lead.phone && (
                        <button
                          onClick={(e) => handleCopyPhone(lead.phone, lead.id, e)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center space-x-1 transition-all cursor-pointer ${
                            copiedPhoneId === lead.id
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {copiedPhoneId === lead.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="font-mono text-[11px]">{lead.phone}</span>
                        </button>
                      )}
                    </div>

                    {/* Action Bar: WhatsApp Connect + Call + Status Update */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-2">
                        {lead.phone && (
                          <>
                            <button
                              onClick={() => openWhatsAppLead(lead)}
                              className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-white" />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              onClick={() => handleCallLead(lead.phone)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
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
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">Status:</span>
                          <select
                            value={lead.status || 'Active Lead'}
                            onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value)}
                            className="text-[11px] font-bold rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                          >
                            <option value="Active Lead">Active Follow-up</option>
                            <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                            <option value="Booked">Deal Closed / Booked</option>
                          </select>
                        </div>
                      )}
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
      {/* POST NEW FLAT MODAL */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-hidden">
          <div className={`w-full max-w-5xl xl:max-w-6xl h-[92vh] max-h-[900px] rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* 1. DESKTOP MODAL HEADER */}
            <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-500/20">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">Post New Flat</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Add listing details or auto-extract with AI
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PHONE COMPACT 2-BUTTON SELECTOR: MANUAL OR AI POWERED */}
            <div className="lg:hidden px-4 pt-3 pb-2 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPhonePostMode('manual')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    phonePostMode === 'manual'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>📝 Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhonePostMode('ai')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    phonePostMode === 'ai'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0B132B] shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ AI Powered</span>
                </button>
              </div>
            </div>

            {/* 2. BODY CONTAINER (Responsive: Compact single mode on phone, full 2-column studio on desktop) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: AI Magic Fast-Fill + 4-Photo Uploader */}
                <div className={`lg:col-span-5 space-y-4 ${phonePostMode === 'ai' ? 'block' : 'hidden lg:block'}`}>
                  {/* AI Magic Box */}
                  <AiPropertyQuickBox
                    onParsedProperty={(parsed) => {
                      handleAiParsedProperty(parsed);
                      showToast('✅ Details extracted with AI! Review & publish below.');
                    }}
                    showToast={showToast}
                    isDark={isDark}
                  />

                  {/* Cloudinary CDN 4-Photo Uploader */}
                  <CloudinaryImageUploader
                    images={formData.images}
                    onChange={(newImages) => setFormData({ ...formData, images: newImages })}
                    isDark={isDark}
                    showToast={showToast}
                  />

                  {/* Phone AI Quick Publish & Summary Card */}
                  <div className="lg:hidden p-4 rounded-2xl border bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                          Ready to Publish
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhonePostMode('manual')}
                        className="text-[11px] font-bold text-purple-400 hover:underline cursor-pointer"
                      >
                        Edit in Form ✏️
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                      <p className="font-extrabold truncate text-slate-800 dark:text-slate-200">
                        {formData.title || 'Untitled Flat (Auto-Generated upon extract)'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
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
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>🚀 Post Flat to Flatzy</span>
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

                  <form id="brokerDesktopFlatForm" onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                    
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
                            onClick={() => setFormData({ ...formData, listingType: 'rent', price: 18000 })}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              formData.listingType === 'rent'
                                ? 'bg-[#7C3AED] text-white shadow-xs font-black'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                            }`}
                          >
                            🏠 For Rent
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, listingType: 'sale', price: 4500000 })}
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
                          Property Headline / Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Spacious 2BHK in Sukhobristhi, Shapoorji"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                            isDark 
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-[#7C3AED]' 
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#7C3AED]'
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
                            <option value="1 RK / Studio">1 RK / Studio</option>
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
                            min={100}
                            placeholder="e.g. 1150"
                            value={formData.sqft}
                            onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-[#7C3AED]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#7C3AED]'
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
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-purple-400 focus:border-[#7C3AED]' : 'bg-white border-slate-300 text-purple-600 focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="font-extrabold block mb-1">Posting Date</label>
                          <input
                            type="text"
                            placeholder="e.g. 27 Oct 2026"
                            value={formData.postingDate}
                            onChange={(e) => setFormData({ ...formData, postingDate: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-[#7C3AED]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#7C3AED]'
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
                            placeholder="e.g. Action Area 1 / Sukhobristhi"
                            value={formData.subLocation}
                            onChange={(e) => setFormData({ ...formData, subLocation: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-[#7C3AED]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#7C3AED]'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: Furnishing & Amenities */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-3">
                        4. Amenities (Tap to select)
                      </span>

                      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                        {COMMON_AMENITIES.map(amenity => {
                          const isSelected = (formData.amenities || []).includes(amenity);
                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => toggleAmenityInForm(amenity)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#7C3AED] text-white shadow-xs'
                                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{amenity}
                            </button>
                          );
                        })}
                      </div>
                      <div className="pt-3 flex items-center justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] hover:brightness-110 text-white text-xs font-black shadow-lg shadow-purple-500/25 active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          <span>🚀 Upload Flat to Website</span>
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
      {/* EDIT FLAT MODAL */}
      {/* ======================================================== */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-8 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black">Edit Flat: {editingProperty.title}</h3>
              <button onClick={() => setEditingProperty(null)} className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Title */}
              <div>
                <label className="block font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold text-xs"
                />
              </div>

              {/* BHK & Square Feet */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">BHK</label>
                  <select
                    value={editingProperty.bhk}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bhk: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold text-xs"
                  >
                    <option value="1 RK / Studio">1 RK / Studio</option>
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                    <option value="4+ BHK">4+ BHK</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Square Feet (sq.ft)</label>
                  <input
                    type="number"
                    value={editingProperty.sqft || 1000}
                    onChange={(e) => setEditingProperty({ ...editingProperty, sqft: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Price & Posting Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editingProperty.price}
                    onChange={(e) => setEditingProperty({ ...editingProperty, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Posting Date</label>
                  <input
                    type="text"
                    value={editingProperty.postingDate || 'Recent'}
                    onChange={(e) => setEditingProperty({ ...editingProperty, postingDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block font-bold mb-1">Amenities (Optional)</label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {COMMON_AMENITIES.map(amenity => {
                    const isSelected = (editingProperty.amenities || []).includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenityInEdit(amenity)}
                        className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photos (Optional) */}
              <div>
                <label className="block font-bold mb-1">Photos (Optional — images are not necessary)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      type="url"
                      value={(editingProperty.images || [])[idx] || ''}
                      onChange={(e) => handleEditImageUrlChange(idx, e.target.value)}
                      placeholder={`Optional Photo ${idx + 1}`}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium outline-none"
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

      {/* DELETE MODAL */}
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
                  showToast('Deleted property listing');
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

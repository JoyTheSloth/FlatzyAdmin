import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Building,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  PhoneCall,
  Home,
  Clock,
  Briefcase
} from 'lucide-react';
import { matchesSearchQuery } from '../utils/searchUtils';

export default function BrokersTab({
  brokers = [],
  properties = [],
  onAddBroker,
  onUpdateBroker,
  onDeleteBroker,
  onViewBrokerProperties,
  showToast,
  isDark
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'verified', 'pending', 'active', 'suspended'
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);
  const [brokerToDelete, setBrokerToDelete] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // New Broker Form State (name & phone number only)
  const defaultBrokerForm = {
    name: '',
    phone: '',
    agencyName: '',
    isVerified: true,
    status: 'active',
    notes: ''
  };
  const [formData, setFormData] = useState(defaultBrokerForm);

  // Calculate live dynamic properties counts for each broker
  const brokersWithStats = brokers.map(broker => {
    const brokerProps = (properties || []).filter(
      p => p.brokerId === broker.id || (broker.phone && p.brokerPhone === broker.phone)
    );
    const rentCount = brokerProps.filter(p => p.listingType === 'rent').length;
    const saleCount = brokerProps.filter(p => p.listingType === 'sale').length;
    return {
      ...broker,
      liveTotalProps: brokerProps.length || broker.totalProperties || 0,
      liveRentCount: rentCount || broker.rentCount || 0,
      liveSaleCount: saleCount || broker.saleCount || 0
    };
  });

  // Filter brokers
  const filteredBrokers = brokersWithStats.filter(broker => {
    // 1. Case-insensitive, multi-token search for broker name, agency, phone, notes
    const matchesSearch = matchesSearchQuery(
      searchQuery,
      broker.name,
      broker.agencyName,
      broker.phone,
      broker.notes,
      broker.id
    );

    if (!matchesSearch) return false;

    // When searching by name or phone, don't let status filter hide the broker
    if (searchQuery.trim()) {
      return true;
    }

    if (statusFilter === 'verified' && !broker.isVerified) return false;
    if (statusFilter === 'pending' && broker.isVerified) return false;
    if (statusFilter === 'active' && broker.status !== 'active') return false;
    if (statusFilter === 'suspended' && broker.status !== 'suspended') return false;

    return true;
  });

  // Metrics
  const totalBrokers = brokers.length;
  const verifiedCount = brokers.filter(b => b.isVerified).length;
  const pendingCount = totalBrokers - verifiedCount;
  const activeCount = brokers.filter(b => b.status === 'active').length;

  const handleCopyPhone = (phone, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    showToast(`Copied ${phone} to clipboard`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleToggleVerify = (broker, e) => {
    e.stopPropagation();
    const nextVerified = !broker.isVerified;
    const updated = { ...broker, isVerified: nextVerified };
    onUpdateBroker(updated);
    showToast(nextVerified ? `🛡️ ${broker.name} marked as Verified Partner` : `⚠️ ${broker.name} marked as Unverified`);
  };

  const handleToggleStatus = (broker, e) => {
    e.stopPropagation();
    const nextStatus = broker.status === 'active' ? 'suspended' : 'active';
    const updated = { ...broker, status: nextStatus };
    onUpdateBroker(updated);
    showToast(nextStatus === 'active' ? `✅ ${broker.name} account activated` : `⏸️ ${broker.name} suspended`);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('⚠️ Please provide broker name and phone number');
      return;
    }

    const newBroker = {
      id: `broker_${Date.now()}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      agencyName: formData.agencyName.trim() || 'Independent Real Estate',
      isVerified: formData.isVerified,
      status: formData.status,
      totalProperties: 0,
      rentCount: 0,
      saleCount: 0,
      joinedDate: 'Just now',
      notes: formData.notes.trim()
    };

    onAddBroker(newBroker);
    setShowAddModal(false);
    setFormData(defaultBrokerForm);
    showToast(`✅ Partner Broker ${newBroker.name} onboarded!`);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingBroker) return;

    onUpdateBroker({
      ...editingBroker,
      name: editingBroker.name.trim(),
      phone: editingBroker.phone.trim(),
      agencyName: (editingBroker.agencyName || '').trim()
    });
    setEditingBroker(null);
    showToast(`Updated profile for ${editingBroker.name}`);
  };

  return (
    <div className="space-y-4">
      {/* 2x2 METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Total Brokers */}
        <div className={`p-4 rounded-[22px] border transition-all ${
          isDark 
            ? 'bg-[#0E172E] border-slate-800 text-white shadow-lg' 
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Total Partners</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black">{totalBrokers}</span>
            <span className="text-[10px] text-slate-400 font-semibold">brokers</span>
          </div>
          <p className="text-[10px] text-emerald-500 font-bold mt-1">● {activeCount} active</p>
        </div>

        {/* Card 2: Verified Partners */}
        <div className={`p-4 rounded-[22px] border transition-all ${
          isDark 
            ? 'bg-[#0E172E] border-slate-800 text-white shadow-lg' 
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Verified Partners</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-emerald-500">{verifiedCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold">approved</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{pendingCount} pending review</p>
        </div>

        {/* Card 3: Total Managed Flats */}
        <div className={`p-4 rounded-[22px] border transition-all ${
          isDark 
            ? 'bg-[#0E172E] border-slate-800 text-white shadow-lg' 
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Listed Flats</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Home className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-blue-500">{(properties || []).length}</span>
            <span className="text-[10px] text-slate-400 font-semibold">inventory</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Rent & Sale Flats</p>
        </div>

        {/* Card 4: Quick Onboard Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="p-4 rounded-[22px] border border-amber-500/30 bg-gradient-to-br from-[#FFC800] via-[#FFD21A] to-[#FFAE00] text-[#0B132B] shadow-lg hover:brightness-105 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider bg-black/15 px-2 py-0.5 rounded-full">
              ADMIN ACTION
            </span>
            <Plus className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight text-[#0B132B]">+ Onboard Broker</h3>
            <p className="text-[10px] text-black/70 font-bold mt-0.5">Name & Phone only</p>
          </div>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
        isDark ? 'bg-[#0E172E] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search broker by name or phone number..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs font-bold">
          {[
            { id: 'all', label: `All (${totalBrokers})` },
            { id: 'verified', label: `Verified (${verifiedCount})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'suspended', label: `Suspended (${totalBrokers - activeCount})` }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === chip.id
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : isDark 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* BROKERS LIST */}
      {filteredBrokers.length === 0 ? (
        <div className={`p-8 rounded-2xl border text-center ${
          isDark ? 'bg-[#0E172E] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <Users className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-[1.5]" />
          <p className="font-bold text-sm">No broker profiles found</p>
          <p className="text-xs mt-1">Try searching by name or phone number.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBrokers.map(broker => {
            const initials = (broker.name || 'B P')
              .split(' ')
              .map(w => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={broker.id}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                  isDark
                    ? 'bg-[#0E172E] border-slate-800 hover:border-slate-700 text-white'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-sm'
                }`}
              >
                {/* Status indicator bar on left edge */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  broker.status === 'suspended'
                    ? 'bg-rose-500'
                    : broker.isVerified 
                      ? 'bg-emerald-500' 
                      : 'bg-amber-400'
                }`}></div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-2">
                  
                  {/* Left: Avatar + Broker Profile (Name & Phone Number Only) */}
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-md">
                        {initials}
                      </div>
                      {broker.isVerified && (
                        <div 
                          title="Verified Flatzy Broker Partner"
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-[#0E172E]"
                        >
                          <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Name & Badges */}
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-extrabold text-sm tracking-tight truncate">{broker.name}</h4>
                        
                        {broker.isVerified ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Unverified</span>
                          </span>
                        )}

                        {broker.status === 'suspended' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Suspended
                          </span>
                        )}
                      </div>

                      {/* Agency Name (if present) */}
                      {broker.agencyName && (
                        <div className="flex items-center space-x-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <Building className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate">{broker.agencyName}</span>
                        </div>
                      )}

                      {/* Phone Number Only (Highlighted & Clickable) */}
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={(e) => handleCopyPhone(broker.phone, broker.id, e)}
                          title="Click to copy phone number"
                          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                        >
                          <Phone className="w-3 h-3 text-purple-500" />
                          <span>{broker.phone}</span>
                          {copiedId === broker.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:items-end justify-between space-y-2 shrink-0">
                    {/* Listed Flats Jump */}
                    <button
                      onClick={() => {
                        if (onViewBrokerProperties) onViewBrokerProperties(broker.id);
                        showToast(`Showing flats listed by ${broker.name}`);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center space-x-1.5 transition-all self-start sm:self-end cursor-pointer"
                      title="View all properties listed by this broker"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{broker.liveTotalProps} Flats</span>
                      <span className="text-[10px] opacity-75">({broker.liveRentCount} Rent / {broker.liveSaleCount} Sale)</span>
                    </button>

                    {/* WhatsApp, Call, Edit & Delete */}
                    <div className="flex items-center space-x-1.5 self-start sm:self-end">
                      <a
                        href={`https://wa.me/91${broker.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${broker.name}, regarding your property listings on Flatzy.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] transition-all cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 fill-current" />
                      </a>

                      <a
                        href={`tel:${broker.phone.replace(/\D/g, '')}`}
                        className="p-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                        title="Direct Phone Call"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>

                      <button
                        onClick={(e) => handleToggleVerify(broker, e)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          broker.isVerified
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                        }`}
                        title={broker.isVerified ? "Mark as Unverified" : "Mark as Verified"}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setEditingBroker({ ...broker })}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        title="Edit Broker Profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setBrokerToDelete(broker)}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-all cursor-pointer"
                        title="Delete Broker Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                </div>

                {/* Notes (if any) */}
                {broker.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic bg-black/5 dark:bg-white/5 p-2 rounded-xl border border-black/5 dark:border-white/5">
                    📝 Note: {broker.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. ONBOARD BROKER MODAL (Name & Phone Number Only) */}
      {/* ======================================================== */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-[28px] p-6 shadow-2xl border transition-all max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#0E172E] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Onboard Broker</h3>
                  <p className="text-[11px] text-slate-400">Profile with name & phone number only</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Broker Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sagnik Roy"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Phone Number (WhatsApp / Calling) *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Agency Name (Optional)</label>
                <input
                  type="text"
                  value={formData.agencyName}
                  onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                  placeholder="e.g. Kolkata Prime Properties"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Verification Status</label>
                  <select
                    value={formData.isVerified ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isVerified: e.target.value === 'true' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium outline-none"
                  >
                    <option value="true">🛡️ Verified Partner</option>
                    <option value="false">⚠️ Pending Verification</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Admin Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional internal broker note..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC800] to-[#FFAE00] text-[#0B132B] font-black shadow-md hover:brightness-105 active:scale-95 cursor-pointer"
                >
                  Onboard Broker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. EDIT BROKER MODAL (Name & Phone Number Only) */}
      {/* ======================================================== */}
      {editingBroker && (
        <div 
          onClick={() => setEditingBroker(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-[28px] p-6 shadow-2xl border transition-all max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#0E172E] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-extrabold text-base tracking-tight">Edit Broker Profile</h3>
              <button
                onClick={() => setEditingBroker(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingBroker.name}
                  onChange={(e) => setEditingBroker({ ...editingBroker, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={editingBroker.phone}
                  onChange={(e) => setEditingBroker({ ...editingBroker, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Agency Name (Optional)</label>
                <input
                  type="text"
                  value={editingBroker.agencyName || ''}
                  onChange={(e) => setEditingBroker({ ...editingBroker, agencyName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Verification</label>
                  <select
                    value={editingBroker.isVerified ? 'true' : 'false'}
                    onChange={(e) => setEditingBroker({ ...editingBroker, isVerified: e.target.value === 'true' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium outline-none"
                  >
                    <option value="true">🛡️ Verified Partner</option>
                    <option value="false">⚠️ Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Account Status</label>
                  <select
                    value={editingBroker.status || 'active'}
                    onChange={(e) => setEditingBroker({ ...editingBroker, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Admin Notes</label>
                <textarea
                  rows={2}
                  value={editingBroker.notes || ''}
                  onChange={(e) => setEditingBroker({ ...editingBroker, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBroker(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-black shadow-md hover:brightness-105 active:scale-95 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {brokerToDelete && (
        <div 
          onClick={() => setBrokerToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-[28px] p-6 shadow-2xl border transition-all text-center ${
              isDark ? 'bg-[#0E172E] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base">Remove Broker Profile?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to delete <strong>{brokerToDelete.name}</strong> ({brokerToDelete.phone})?
            </p>
            <div className="flex items-center space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setBrokerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBroker(brokerToDelete.id);
                  setBrokerToDelete(null);
                  showToast(`Removed broker ${brokerToDelete.name}`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md hover:bg-rose-700 active:scale-95 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

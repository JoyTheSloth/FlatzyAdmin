import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  X,
  Copy,
  Check,
  Sparkles,
  HeartHandshake,
  Home,
  Briefcase,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { KOLKATA_ROOMMATE_LOCALITIES, LIFESTYLE_OPTIONS, AVATAR_OPTIONS } from '../data/roommatesData';
import { matchesSearchQuery } from '../utils/searchUtils';

export default function RoommatesTab({
  roommates,
  onAddRoommate,
  onUpdateRoommate,
  onDeleteRoommate,
  onToggleVerify,
  onToggleStatus,
  showToast,
  isDark,
  openAddModal = false,
  onCloseAddModal,
  onSync,
  isSyncing = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Room in Flat', 'Team-Up'
  const [genderFilter, setGenderFilter] = useState('All'); // 'All', 'Male', 'Female'
  const [bhkFilter, setBhkFilter] = useState('All'); // 'All', '1 BHK', '2 BHK', '3 BHK'
  const [localityFilter, setLocalityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'active', 'paired', 'unverified'

  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const [editingRoommate, setEditingRoommate] = useState(null);
  const [roommateToDelete, setRoommateToDelete] = useState(null);
  const [internalAddModal, setInternalAddModal] = useState(false);
  const showAddModal = openAddModal || internalAddModal;
  const setShowAddModal = (val) => {
    setInternalAddModal(val);
    if (!val && onCloseAddModal) onCloseAddModal();
  };

  // New roommate form state
  const defaultFormState = {
    name: '',
    phone: '',
    age: 24,
    gender: 'Male',
    avatarId: 'avatar-tech-bro',
    profession: 'Working Professional',
    occupationTitle: '',
    listingType: 'Room in Flat',
    lookingForBhk: '2 BHK',
    budgetPerMonth: 8000,
    preferredLocations: 'New Town, Sector V',
    moveInDate: 'Immediate',
    diet: 'Vegetarian',
    smoking: 'Non-Smoker',
    drinking: 'Non-Drinker',
    pets: 'Pet Friendly',
    sleepSchedule: 'Flexible',
    aboutMe: '',
    isVerified: true,
    status: 'active'
  };
  const [formData, setFormData] = useState(defaultFormState);

  // Filtered Roommates list
  const filteredRoommates = useMemo(() => {
    return roommates.filter(item => {
      // 1. Case-insensitive search across all roommate details (name, phone, company, bio, location, BHK)
      const matchesSearch = matchesSearchQuery(
        searchQuery,
        item.name,
        item.contactWhatsApp,
        item.occupationTitle,
        item.profession,
        item.aboutMe,
        item.preferredLocations,
        item.lookingForBhk,
        item.gender,
        item.religion,
        item.listingType,
        item.lifestyleHabits,
        item.id
      );

      if (!matchesSearch) return false;

      // When searching specifically for someone by name, show them directly without chip blockage
      if (searchQuery.trim()) {
        return true;
      }

      // Type filter
      if (typeFilter !== 'All' && item.listingType !== typeFilter) return false;

      // Gender filter (flexible case)
      if (genderFilter !== 'All' && item.gender?.toLowerCase() !== genderFilter.toLowerCase()) return false;

      // BHK filter (flexible format matching "2", "2bhk", "2 BHK")
      if (bhkFilter !== 'All') {
        const itemBhkNum = String(item.lookingForBhk || '').replace(/[^0-9]/g, '');
        const filterBhkNum = String(bhkFilter).replace(/[^0-9]/g, '');
        if (itemBhkNum && filterBhkNum) {
          if (itemBhkNum !== filterBhkNum) return false;
        } else if (item.lookingForBhk !== bhkFilter) {
          return false;
        }
      }

      // Locality filter
      if (localityFilter !== 'All') {
        const locs = Array.isArray(item.preferredLocations)
          ? item.preferredLocations.join(' ').toLowerCase()
          : (item.preferredLocations || '').toLowerCase();
        if (!locs.includes(localityFilter.toLowerCase())) return false;
      }

      // Status filter
      if (statusFilter === 'active' && item.status !== 'active') return false;
      if (statusFilter === 'paired' && item.status !== 'paired') return false;
      if (statusFilter === 'unverified' && item.isVerified) return false;

      return true;
    });
  }, [roommates, searchQuery, typeFilter, genderFilter, bhkFilter, localityFilter, statusFilter]);

  // Key Counts
  const totalCount = roommates.length;
  const roomInFlatCount = roommates.filter(r => r.listingType === 'Room in Flat').length;
  const teamUpCount = roommates.filter(r => r.listingType === 'Team-Up').length;
  const verifiedCount = roommates.filter(r => r.isVerified).length;

  // Copy phone handler
  const copyPhone = (phone, id) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    showToast(`Copied WhatsApp: ${phone}`);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Open WhatsApp with pre-filled message
  const openWhatsApp = (roommate) => {
    const phone = (roommate.contactWhatsApp || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = encodeURIComponent(
      `Hello ${roommate.name}, this is Flatzy Admin! Regarding your flatmate profile for ${roommate.lookingForBhk} in ${Array.isArray(roommate.preferredLocations) ? roommate.preferredLocations.join(', ') : roommate.preferredLocations}: We have interested tenants looking to connect with you.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Handle Form Submit for Add
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('⚠️ Please enter name and WhatsApp number');
      return;
    }

    const locArray = typeof formData.preferredLocations === 'string'
      ? formData.preferredLocations.split(',').map(s => s.trim()).filter(Boolean)
      : formData.preferredLocations;

    const newProfile = {
      id: `roommate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: formData.name.trim(),
      age: Number(formData.age) || 24,
      gender: formData.gender,
      avatarId: formData.avatarId,
      profession: formData.profession,
      occupationTitle: formData.occupationTitle.trim() || 'Working Professional',
      religion: 'Open to All',
      lookingForBhk: formData.lookingForBhk,
      listingType: formData.listingType,
      budgetPerMonth: Number(formData.budgetPerMonth) || 8000,
      preferredLocations: locArray.length > 0 ? locArray : ['New Town'],
      moveInDate: formData.moveInDate || 'Immediate',
      lifestyleHabits: {
        diet: formData.diet,
        smoking: formData.smoking,
        drinking: formData.drinking,
        pets: formData.pets,
        sleepSchedule: formData.sleepSchedule
      },
      aboutMe: formData.aboutMe.trim() || `Looking for ${formData.lookingForBhk} flatmates in ${locArray.join(', ')}.`,
      contactWhatsApp: formData.phone.trim(),
      isVerified: formData.isVerified,
      status: formData.status,
      createdAt: new Date().toISOString()
    };

    onAddRoommate(newProfile);
    setShowAddModal(false);
    setFormData(defaultFormState);
    showToast(`✅ Roommate profile for "${newProfile.name}" created!`);
  };

  // Handle Form Submit for Edit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingRoommate) return;

    onUpdateRoommate(editingRoommate);
    setEditingRoommate(null);
    showToast(`✅ Updated profile for "${editingRoommate.name}"`);
  };

  // Avatar helper with explicit light and dark styling
  const getAvatarBadge = (avatarId, gender) => {
    const found = AVATAR_OPTIONS.find(a => a.id === avatarId);
    if (found) {
      return {
        ...found,
        bg: isDark ? found.bg : (found.bgLight || 'bg-purple-50 text-purple-700 border-purple-200')
      };
    }
    return gender === 'Female'
      ? { emoji: '👩', bg: isDark ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-pink-50 text-pink-700 border-pink-200', label: 'Female' }
      : { emoji: '👨', bg: isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200', label: 'Male' };
  };

  return (
    <div className="space-y-4">
      {/* 2x2 / 4-Col METRICS CARDS FOR FLATZYMATE */}
      <section aria-label="Flatzymate Overview" className="px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Total Roommates */}
          <div className="rounded-[22px] p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] min-h-[110px] flex flex-col justify-between">
            <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none">
              <Users className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <span className="text-3xl font-black tracking-tight leading-none text-white">{totalCount}</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black leading-tight text-white">Total Roommates</p>
              <p className="text-[10px] text-purple-200 font-bold mt-0.5">Flatzymate Profiles</p>
            </div>
          </div>

          {/* 2. Room in Flat */}
          <div className="rounded-[22px] p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-[#0284C7] via-[#0369A1] to-[#075985] min-h-[110px] flex flex-col justify-between">
            <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none">
              <Home className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <span className="text-3xl font-black tracking-tight leading-none text-white">{roomInFlatCount}</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black leading-tight text-white">Room in Flat</p>
              <p className="text-[10px] text-sky-200 font-bold mt-0.5">Existing room offers</p>
            </div>
          </div>

          {/* 3. Team-Up Seekers */}
          <div className="rounded-[22px] p-4 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-[#EA580C] via-[#C2410C] to-[#9A3412] min-h-[110px] flex flex-col justify-between">
            <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none">
              <HeartHandshake className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <span className="text-3xl font-black tracking-tight leading-none text-white">{teamUpCount}</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <HeartHandshake className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black leading-tight text-white">Team-Up Seekers</p>
              <p className="text-[10px] text-orange-200 font-bold mt-0.5">Looking to rent together</p>
            </div>
          </div>

          {/* 4. Verified & Add Action */}
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-[22px] p-4 text-left shadow-lg relative overflow-hidden bg-gradient-to-br from-[#FFC800] via-[#FFD21A] to-[#FFAB00] hover:brightness-105 active:scale-95 text-[#0B132B] min-h-[110px] flex flex-col justify-between group transition-all"
          >
            <div className="absolute -bottom-3 -right-3 text-[#0B132B]/10 pointer-events-none">
              <Sparkles className="w-20 h-20 stroke-[1.2]" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/15 text-[#0B132B] px-2 py-0.5 rounded-md">
                {verifiedCount} Verified
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#FFC800] flex items-center justify-center shadow-md group-hover:rotate-90 transition-transform">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <p className="text-xs font-black leading-tight text-[#0B132B]">+ Add Profile</p>
              <p className="text-[10px] text-slate-900 font-bold mt-0.5">Post new flatmate</p>
            </div>
          </button>
        </div>
      </section>

      {/* SEARCH & FILTERS BAR */}
      <section aria-label="Roommate Filters" className="px-4 space-y-2.5">
        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#7C3AED] absolute left-3.5 z-20 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flatmate name, phone, company, bio, location..."
            className={`w-full text-xs pl-10 pr-10 py-3 rounded-2xl outline-none transition-all font-semibold border ${
              isDark
                ? 'bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20'
                : 'bg-white text-slate-900 placeholder-slate-400 border-slate-300 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 shadow-xs'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips (Horizontal Scroll) */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scrollbar-none py-1 text-[11px] font-bold">
          {/* Type Filter */}
          {['All', 'Room in Flat', 'Team-Up'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border ${
                typeFilter === t
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              {t === 'All' ? '🏠 All Types' : t === 'Room in Flat' ? '🛏️ Room in Flat' : '🤝 Team-Up'}
            </button>
          ))}

          {/* Divider */}
          <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>|</span>

          {/* Gender Filter */}
          {['All', 'Female', 'Male'].map(g => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border ${
                genderFilter === g
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              {g === 'All' ? '👥 Any Gender' : g === 'Female' ? '👩 Female' : '👨 Male'}
            </button>
          ))}

          {/* Divider */}
          <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>|</span>

          {/* BHK Filter */}
          {['All', '1 BHK', '2 BHK', '3 BHK'].map(b => (
            <button
              key={b}
              onClick={() => setBhkFilter(b)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border ${
                bhkFilter === b
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Locality Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1 text-[10px] font-bold">
          <span className={`flex items-center mr-1 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <MapPin className="w-3 h-3 mr-0.5" /> Area:
          </span>
          {KOLKATA_ROOMMATE_LOCALITIES.slice(0, 9).map(loc => (
            <button
              key={loc}
              onClick={() => setLocalityFilter(loc)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all border ${
                localityFilter === loc
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-xs'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </section>

      {/* RESULTS COUNT & CONTROLS */}
      <div className="px-4 flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center space-x-2">
          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Showing <strong className={isDark ? 'text-white' : 'text-slate-900 font-extrabold'}>{filteredRoommates.length}</strong> of {totalCount} flatmates
          </span>
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Sync flatmates from Supabase cloud database"
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                isDark
                  ? 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:bg-purple-900/50'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              } ${isSyncing ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#7C3AED]' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
          )}
        </div>
        {statusFilter !== 'All' || typeFilter !== 'All' || genderFilter !== 'All' || bhkFilter !== 'All' || localityFilter !== 'All' || searchQuery ? (
          <button
            onClick={() => {
              setTypeFilter('All');
              setGenderFilter('All');
              setBhkFilter('All');
              setLocalityFilter('All');
              setStatusFilter('All');
              setSearchQuery('');
            }}
            className="text-[11px] font-black text-[#7C3AED] hover:underline"
          >
            Clear all filters
          </button>
        ) : null}
      </div>

      {/* ROOMMATES CARDS LIST */}
      <section aria-label="Roommate Listings" className="px-4 space-y-3 pb-8">
        {filteredRoommates.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <h4 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {searchQuery.trim() ? `No flatmates matching "${searchQuery.trim()}"` : 'No flatmates found'}
            </h4>
            <p className={`text-xs mt-1 max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery.trim() 
                ? 'Check spelling or search by WhatsApp number, college, or area.' 
                : 'Try clearing filters or search terms, or add a new profile.'}
            </p>
            <div className="flex items-center justify-center space-x-2 mt-4">
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all"
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-all shadow-xs"
              >
                + Add Flatmate Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoommates.map(profile => {
            const avatar = getAvatarBadge(profile.avatarId, profile.gender);
            const isVerified = profile.isVerified ?? true;
            const isActive = profile.status === 'active';
            const locations = Array.isArray(profile.preferredLocations)
              ? profile.preferredLocations
              : [profile.preferredLocations || 'New Town'];

            return (
              <div
                key={profile.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all relative overflow-hidden group ${
                  isDark
                    ? 'bg-slate-900/95 border-slate-800 hover:border-slate-700 shadow-sm'
                    : 'bg-white border-slate-200/90 hover:border-purple-300 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Header Row: Avatar + Name + Badges + Budget */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Emoji Avatar Bubble */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shrink-0 shadow-xs ${avatar.bg}`}>
                      {avatar.emoji}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className={`text-base font-black leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {profile.name}
                        </h3>
                        {profile.age && (
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {profile.age}y
                          </span>
                        )}

                        {/* Verified Badge */}
                        <button
                          onClick={() => onToggleVerify(profile.id, !isVerified)}
                          title={isVerified ? "Verified (click to toggle)" : "Unverified (click to verify)"}
                          className="focus:outline-hidden"
                        >
                          {isVerified ? (
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                              isDark
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            }`}>
                              <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                              isDark
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}>
                              <ShieldAlert className="w-3 h-3 stroke-[2.5]" />
                              <span>Unverified</span>
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Occupation / Profession */}
                      <p className={`text-xs font-semibold flex items-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Briefcase className={`w-3.5 h-3.5 mr-1 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span className="truncate max-w-[190px] sm:max-w-md">{profile.occupationTitle || profile.profession}</span>
                      </p>
                    </div>
                  </div>

                  {/* Top Right: Budget & Type Pills */}
                  <div className="text-right shrink-0">
                    <span className={`text-base font-black block leading-none ${isDark ? 'text-[#A78BFA]' : 'text-[#7C3AED]'}`}>
                      ₹{profile.budgetPerMonth?.toLocaleString('en-IN') || 8000}
                      <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/mo</span>
                    </span>
                    <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                      profile.listingType === 'Room in Flat'
                        ? isDark
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                        : isDark
                          ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {profile.listingType === 'Room in Flat' ? '🛏️ Room in Flat' : '🤝 Team-Up'}
                    </span>
                  </div>
                </div>

                {/* Details Bar: Looking for BHK, Move-in, Locations */}
                <div className={`mt-3.5 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div>
                    <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Looking for
                    </span>
                    <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {profile.lookingForBhk || '2 BHK'}
                    </span>
                  </div>

                  <div>
                    <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Move-in Date
                    </span>
                    <span className={`font-black flex items-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Calendar className={`w-3.5 h-3.5 mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      {profile.moveInDate || 'Immediate'}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Preferred Locations
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {locations.map((loc, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            isDark
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <MapPin className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lifestyle Badges */}
                {profile.lifestyleHabits && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profile.lifestyleHabits.diet && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        isDark
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        🌱 {profile.lifestyleHabits.diet}
                      </span>
                    )}
                    {profile.lifestyleHabits.smoking && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        isDark
                          ? 'bg-slate-500/15 text-slate-300 border-slate-600'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        🚭 {profile.lifestyleHabits.smoking}
                      </span>
                    )}
                    {profile.lifestyleHabits.pets && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        isDark
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        🐾 {profile.lifestyleHabits.pets}
                      </span>
                    )}
                    {profile.lifestyleHabits.sleepSchedule && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        isDark
                          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        🌙 {profile.lifestyleHabits.sleepSchedule}
                      </span>
                    )}
                  </div>
                )}

                {/* About Me snippet */}
                {profile.aboutMe && (
                  <p className={`mt-2.5 text-xs p-2.5 rounded-xl border leading-relaxed font-medium italic ${
                    isDark
                      ? 'bg-slate-800/60 text-slate-300 border-slate-800/80'
                      : 'bg-slate-50 text-slate-700 border-slate-200/90'
                  }`}>
                    "{profile.aboutMe}"
                  </p>
                )}

                {/* Action Bar */}
                <div className={`mt-3.5 pt-3 border-t flex items-center justify-between gap-2 flex-wrap ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  {/* Left: Contact Info & Copy */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => copyPhone(profile.contactWhatsApp, profile.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all border ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                      title="Copy WhatsApp Number"
                    >
                      {copiedPhoneId === profile.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-extrabold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>{profile.contactWhatsApp || 'No phone'}</span>
                        </>
                      )}
                    </button>

                    {/* Status Badge toggle */}
                    <button
                      onClick={() => onToggleStatus(profile.id, isActive ? 'paired' : 'active')}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all border ${
                        isActive
                          ? isDark
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : isDark
                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Toggle active status"
                    >
                      {isActive ? '● Looking' : '✓ Paired / Found'}
                    </button>
                  </div>

                  {/* Right: Connect / Edit / Delete Actions */}
                  <div className="flex items-center space-x-1.5 ml-auto">
                    {/* Call Button */}
                    {profile.contactWhatsApp && (
                      <a
                        href={`tel:${profile.contactWhatsApp}`}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                          isDark
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Direct Phone Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* WhatsApp Connect Button */}
                    {profile.contactWhatsApp && (
                      <button
                        onClick={() => openWhatsApp(profile)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center space-x-1 shadow-xs transition-all"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    )}

                    {/* Edit Profile */}
                    <button
                      onClick={() => setEditingRoommate(profile)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title="Edit Roommate Profile"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Profile */}
                    <button
                      onClick={() => setRoommateToDelete(profile)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                        isDark
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Delete / Moderate Profile"
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

      {/* ADD ROOMMATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-8 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`p-2 rounded-xl ${
                  isDark ? 'bg-[#7C3AED]/20 text-[#A78BFA]' : 'bg-purple-100 text-[#7C3AED]'
                }`}>
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Add Flatzymate Profile
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Create new roommate or room-seeker listing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-1 rounded-xl ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Souvik Roy"
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Age, Gender & Avatar */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="60"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Avatar
                  </label>
                  <select
                    value={formData.avatarId}
                    onChange={(e) => setFormData({ ...formData, avatarId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    {AVATAR_OPTIONS.map(a => (
                      <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profession & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Profession
                  </label>
                  <select
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Working Professional">Working Professional</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Occupation / Company
                  </label>
                  <input
                    type="text"
                    value={formData.occupationTitle}
                    onChange={(e) => setFormData({ ...formData, occupationTitle: e.target.value })}
                    placeholder="e.g. Frontend Dev @ Cognizant"
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Listing Type, BHK & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Listing Type
                  </label>
                  <select
                    value={formData.listingType}
                    onChange={(e) => setFormData({ ...formData, listingType: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Room in Flat">Room in Flat (Have room)</option>
                    <option value="Team-Up">Team-Up (Need flat together)</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Looking for BHK
                  </label>
                  <select
                    value={formData.lookingForBhk}
                    onChange={(e) => setFormData({ ...formData, lookingForBhk: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Budget (₹/month)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={formData.budgetPerMonth}
                    onChange={(e) => setFormData({ ...formData, budgetPerMonth: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Preferred Locations & Move-in Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Preferred Locations
                  </label>
                  <input
                    type="text"
                    value={formData.preferredLocations}
                    onChange={(e) => setFormData({ ...formData, preferredLocations: e.target.value })}
                    placeholder="e.g. New Town, Salt Lake, Shapoorji"
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Move-in Date
                  </label>
                  <input
                    type="text"
                    value={formData.moveInDate}
                    onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    placeholder="e.g. Immediate, 1st Nov"
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Lifestyle Habits */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Diet
                  </label>
                  <select
                    value={formData.diet}
                    onChange={(e) => setFormData({ ...formData, diet: e.target.value })}
                    className={`w-full p-2 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    {LIFESTYLE_OPTIONS.diet.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Smoking
                  </label>
                  <select
                    value={formData.smoking}
                    onChange={(e) => setFormData({ ...formData, smoking: e.target.value })}
                    className={`w-full p-2 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    {LIFESTYLE_OPTIONS.smoking.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Pets
                  </label>
                  <select
                    value={formData.pets}
                    onChange={(e) => setFormData({ ...formData, pets: e.target.value })}
                    className={`w-full p-2 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    {LIFESTYLE_OPTIONS.pets.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              {/* Bio / About Me */}
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  About Me / Bio
                </label>
                <textarea
                  rows="3"
                  value={formData.aboutMe}
                  onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                  placeholder="Share a short bio or flatmate preferences..."
                  className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              {/* Verification & Status */}
              <div className="flex items-center space-x-4 pt-1">
                <label className={`flex items-center space-x-2 cursor-pointer font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Mark as Verified Profile</span>
                </label>
              </div>

              {/* Actions */}
              <div className={`flex items-center justify-end space-x-2 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold shadow-md transition-all"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROOMMATE MODAL */}
      {editingRoommate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-8 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`p-2 rounded-xl ${
                  isDark ? 'bg-[#7C3AED]/20 text-[#A78BFA]' : 'bg-purple-100 text-[#7C3AED]'
                }`}>
                  <Pencil className="w-5 h-5" />
                </span>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Edit Flatzymate Profile
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Modify details for {editingRoommate.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRoommate(null)}
                className={`p-1 rounded-xl ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRoommate.name || ''}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={editingRoommate.contactWhatsApp || ''}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, contactWhatsApp: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Age, Gender & Avatar */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Age
                  </label>
                  <input
                    type="number"
                    value={editingRoommate.age || 24}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, age: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Gender
                  </label>
                  <select
                    value={editingRoommate.gender || 'Male'}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, gender: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Avatar
                  </label>
                  <select
                    value={editingRoommate.avatarId || 'avatar-tech-bro'}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, avatarId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    {AVATAR_OPTIONS.map(a => (
                      <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profession & Occupation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Profession
                  </label>
                  <select
                    value={editingRoommate.profession || 'Working Professional'}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, profession: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Working Professional">Working Professional</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Occupation Title
                  </label>
                  <input
                    type="text"
                    value={editingRoommate.occupationTitle || ''}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, occupationTitle: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Type, BHK, Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Listing Type
                  </label>
                  <select
                    value={editingRoommate.listingType || 'Room in Flat'}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, listingType: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="Room in Flat">Room in Flat</option>
                    <option value="Team-Up">Team-Up</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Looking for BHK
                  </label>
                  <select
                    value={editingRoommate.lookingForBhk || '2 BHK'}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, lookingForBhk: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Budget (₹/mo)
                  </label>
                  <input
                    type="number"
                    value={editingRoommate.budgetPerMonth || 8000}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, budgetPerMonth: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Locations & Move-in */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Preferred Locations (comma separated)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(editingRoommate.preferredLocations) ? editingRoommate.preferredLocations.join(', ') : editingRoommate.preferredLocations || ''}
                    onChange={(e) => setEditingRoommate({
                      ...editingRoommate,
                      preferredLocations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Move-in Date
                  </label>
                  <input
                    type="text"
                    value={editingRoommate.moveInDate || ''}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, moveInDate: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* About Me */}
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  Bio / About Me
                </label>
                <textarea
                  rows="3"
                  value={editingRoommate.aboutMe || ''}
                  onChange={(e) => setEditingRoommate({ ...editingRoommate, aboutMe: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              {/* Verification & Status */}
              <div className="flex items-center space-x-4 pt-1">
                <label className={`flex items-center space-x-2 cursor-pointer font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <input
                    type="checkbox"
                    checked={editingRoommate.isVerified ?? true}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, isVerified: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Verified Profile</span>
                </label>

                <label className={`flex items-center space-x-2 cursor-pointer font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <input
                    type="checkbox"
                    checked={editingRoommate.status === 'active'}
                    onChange={(e) => setEditingRoommate({ ...editingRoommate, status: e.target.checked ? 'active' : 'paired' })}
                    className="w-4 h-4 accent-[#7C3AED] rounded"
                  />
                  <span>Active & Looking</span>
                </label>
              </div>

              {/* Actions */}
              <div className={`flex items-center justify-end space-x-2 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={() => setEditingRoommate(null)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold shadow-md transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {roommateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Delete Profile?
            </h4>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Are you sure you want to remove <strong>{roommateToDelete.name}</strong>? This profile will be permanently removed from the portal and database.
            </p>
            <div className="flex items-center justify-center space-x-3 mt-5">
              <button
                onClick={() => setRoommateToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteRoommate(roommateToDelete.id);
                  setRoommateToDelete(null);
                  showToast(`🗑️ Removed ${roommateToDelete.name}'s profile`);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all"
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

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Flame, 
  Search, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Home, 
  Clock, 
  Plus, 
  X, 
  Copy, 
  Check, 
  PhoneCall,
  Sun,
  Moon,
  Sparkles,
  Calendar,
  Armchair,
  IndianRupee,
  UserCheck,
  HelpCircle,
  Bot,
  FileEdit,
  Send,
  Loader2,
  Wand2,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
  Undo2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { INITIAL_LEADS, KOLKATA_LOCATIONS, FURNISHING_OPTIONS, BUDGET_OPTIONS } from './data/leadsData';
import { parseLeadWithAI } from './services/aiLeadParser';
import { supabase, isSupabaseConfigured } from './services/supabase';

const LOCAL_STORAGE_KEY = 'flatzy_admin_leads_v3';
const THEME_STORAGE_KEY = 'flatzy_admin_theme_v3';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) return savedTheme;
    } catch (e) {
      console.error(e);
    }
    return 'light';
  });

  const [leads, setLeads] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LEADS;
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'hot', 'closed'
  const [shiftingFilter, setShiftingFilter] = useState('All'); // 'All', 'Fresh', 'Immediate', '7 Days', 'This Month', 'Next Month'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const LEADS_PER_PAGE = 15;
  
  // Modals
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // AI Parser state
  const [aiRawInput, setAiRawInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiParsedLead, setAiParsedLead] = useState(null);
  const [aiProviderUsed, setAiProviderUsed] = useState('');

  // Toast & animations with Undo support
  const [toastMessage, setToastMessage] = useState('');
  const [toastUndoAction, setToastUndoAction] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [animatingFireId, setAnimatingFireId] = useState(null);

  // Locality Filter Chip state
  const [locationFilter, setLocationFilter] = useState('All');

  // Swipe gesture & Delete / Book Confirmation State
  const [swipeOffset, setSwipeOffset] = useState({}); // { [leadId]: number }
  const [touchStartX, setTouchStartX] = useState(null);
  const [swipingId, setSwipingId] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null); // lead object to show delete confirmation modal
  const [leadToBook, setLeadToBook] = useState(null);     // lead object to show book confirmation modal
  const [editingLead, setEditingLead] = useState(null);   // lead object being edited via Pencil icon

  // Manual Form states
  const [manualBhk, setManualBhk] = useState('2 BHK');
  const [manualTenantType, setManualTenantType] = useState('Bachelor');
  const [manualShiftingQuick, setManualShiftingQuick] = useState('Now');

  // Edit Direct Call Form states
  const [editBhk, setEditBhk] = useState('2 BHK');
  const [editTenantType, setEditTenantType] = useState('Bachelor');
  const [editShiftingQuick, setEditShiftingQuick] = useState('Now');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
      console.error(e);
    }
  }, [leads]);

  // Fetch leads from Supabase table
  const fetchSupabaseLeads = async (showToastNotice = false) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn("⚠️ Supabase is not configured on this client instance.");
      if (showToastNotice) showToast("⚠️ Supabase credentials not found in env");
      return;
    }
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        if (showToastNotice) showToast("⚠️ Cloud sync failed: " + (error.message || 'Check connection'));
        return;
      }

      if (data) {
        const mapped = data.map(row => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          bhk: row.bhk,
          property: row.property || row.bhk,
          location: row.location,
          furnishing: row.furnishing,
          budget: row.budget,
          shiftingDate: row.shifting_date,
          tenantType: row.tenant_type,
          status: row.status,
          isHot: row.is_hot,
          isClosed: row.is_closed,
          lastFollowUp: row.last_follow_up || 'Recently'
        }));
        setLeads(mapped);
        if (showToastNotice) showToast(`Synced ${mapped.length} inquiries from cloud`);
      }
    } catch (err) {
      console.error("Supabase load exception:", err);
      if (showToastNotice) showToast("⚠️ Sync error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Live Supabase Database Sync (Realtime + Periodic Poll Fallback)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // 1. Initial fetch from cloud
    fetchSupabaseLeads();

    // 2. Realtime WebSocket listener across all team phones/browsers
    const channelName = `realtime_inquiries_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          setLeads(prev => {
            const exists = prev.some(l => l.id === row.id);
            if (exists) {
              return prev.map(l => l.id === row.id ? {
                ...l,
                name: row.name || l.name,
                phone: row.phone || l.phone,
                bhk: row.bhk || l.bhk,
                property: row.property || l.property,
                location: row.location || l.location,
                furnishing: row.furnishing || l.furnishing,
                budget: row.budget || l.budget,
                shiftingDate: row.shifting_date || l.shiftingDate,
                tenantType: row.tenant_type || l.tenantType,
                status: row.status || l.status,
                isHot: row.is_hot !== undefined ? row.is_hot : l.isHot,
                isClosed: row.is_closed !== undefined ? row.is_closed : l.isClosed,
                lastFollowUp: row.last_follow_up || l.lastFollowUp
              } : l);
            }
            return [{
              id: row.id,
              name: row.name,
              phone: row.phone,
              bhk: row.bhk,
              property: row.property || row.bhk,
              location: row.location,
              furnishing: row.furnishing,
              budget: row.budget,
              shiftingDate: row.shifting_date,
              tenantType: row.tenant_type,
              status: row.status,
              isHot: row.is_hot,
              isClosed: row.is_closed,
              lastFollowUp: row.last_follow_up || 'Just now'
            }, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          setLeads(prev => prev.map(l => l.id === row.id ? {
            ...l,
            name: row.name,
            phone: row.phone,
            bhk: row.bhk,
            location: row.location,
            furnishing: row.furnishing,
            budget: row.budget,
            shiftingDate: row.shifting_date,
            tenantType: row.tenant_type,
            status: row.status,
            isHot: row.is_hot,
            isClosed: row.is_closed,
            lastFollowUp: row.last_follow_up || l.lastFollowUp
          } : l));
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old;
          setLeads(prev => prev.filter(l => l.id !== oldRow.id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime channel warning, fallback polling active:', status);
        }
      });

    // 3. Fallback sync poll every 10 seconds to ensure multi-device sync even if mobile WebSocket drops
    const pollInterval = setInterval(() => {
      fetchSupabaseLeads(false);
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(nextTheme === 'dark' ? '🌙 Dark Mode Enabled' : '☀️ Light Mode Enabled');
  };

  const showToast = (msg, undoCallback = null) => {
    setToastMessage(msg);
    setToastUndoAction(undoCallback ? () => undoCallback : null);
    setTimeout(() => {
      setToastMessage('');
      setToastUndoAction(null);
    }, undoCallback ? 4500 : 2500);
  };

  const copyPhoneNumber = (phone, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    showToast(`Copied ${phone} to clipboard`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleHotLead = (leadId, e) => {
    e.stopPropagation();
    setAnimatingFireId(leadId);
    setTimeout(() => setAnimatingFireId(null), 600);

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const isNowHot = lead.isHot !== undefined ? !lead.isHot : lead.status !== 'Hot Lead';
        const updatedStatus = isNowHot ? 'Hot Lead' : 'Active Lead';
        showToast(isNowHot ? `🔥 ${lead.name} marked as Hot Lead!` : `Removed ${lead.name} from Hot Leads`);
        
        // Sync to Supabase
        if (isSupabaseConfigured && supabase) {
          supabase.from('inquiries').update({
            is_hot: isNowHot,
            status: updatedStatus
          }).eq('id', leadId).then(({ error }) => {
            if (error) console.warn("Supabase hot lead update error:", error);
          });
        }

        return {
          ...lead,
          isHot: isNowHot,
          status: updatedStatus
        };
      }
      return lead;
    }));
  };

  const handleCall = (phone, e) => {
    e.stopPropagation();
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  };

  const openEditLead = (lead, e) => {
    e.stopPropagation();
    setEditingLead(lead);
    setEditBhk(lead.bhk && lead.bhk !== 'Flat' ? lead.bhk : '2 BHK');
    setEditTenantType(lead.tenantType || 'Bachelor');
    setEditShiftingQuick(lead.shiftingDate || 'Immediate');
  };

  const handleSaveEditedLead = (e) => {
    e.preventDefault();
    if (!editingLead) return;

    const formData = new FormData(e.target);
    const updatedName = (formData.get('name') || '').trim() || editingLead.name;
    const updatedPhone = (formData.get('phone') || '').trim() || editingLead.phone;
    const updatedLocation = formData.get('location') || 'New Town';
    const updatedFurnishing = formData.get('furnishing') || 'Semi-Furnished';
    const updatedBudget = formData.get('budget') || '₹15,000 – ₹20,000';
    const customShifting = (formData.get('shiftingDate') || '').trim();
    const updatedShifting = customShifting || editShiftingQuick;
    const updatedIsHot = formData.get('isHot') === 'on';

    const updatedStatus = updatedIsHot ? 'Hot Lead' : (editingLead.isClosed ? 'Booked' : 'Active Lead');

    setLeads(prev => prev.map(l => {
      if (l.id === editingLead.id) {
        return {
          ...l,
          name: updatedName,
          phone: updatedPhone,
          bhk: editBhk,
          property: editBhk,
          location: updatedLocation,
          furnishing: updatedFurnishing,
          budget: updatedBudget,
          shiftingDate: updatedShifting,
          tenantType: editTenantType,
          isHot: updatedIsHot,
          status: updatedStatus
        };
      }
      return l;
    }));

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('inquiries').update({
        name: updatedName,
        phone: updatedPhone,
        bhk: editBhk,
        property: editBhk,
        location: updatedLocation,
        furnishing: updatedFurnishing,
        budget: updatedBudget,
        shifting_date: updatedShifting,
        tenant_type: editTenantType,
        is_hot: updatedIsHot,
        status: updatedStatus
      }).eq('id', editingLead.id).then(({ error }) => {
        if (error) console.warn("Supabase update edited lead error:", error);
      });
    }

    showToast(`Updated details for "${updatedName}"!`);
    setEditingLead(null);
  };

  const handleWhatsApp = (phone, name, lead, e) => {
    e.stopPropagation();
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi ${name}, this is Flatzy regarding your inquiry for ${lead.bhk || 'flat'} in ${lead.location || 'Kolkata'} (${lead.furnishing || 'Furnished'}, ${lead.tenantType || 'Tenant'}). Are you free for a quick chat?`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  // AI Extraction Handler (Groq primary, Mistral fallback)
  const handleParseAi = async () => {
    if (!aiRawInput.trim()) {
      showToast('Please paste a WhatsApp message or caller notes');
      return;
    }
    setIsAiParsing(true);
    try {
      const result = await parseLeadWithAI(aiRawInput);
      setAiParsedLead(result.lead);
      setAiProviderUsed(result.source);
      showToast(`Parsed with ${result.source}! Review and save.`);
    } catch (err) {
      showToast(err.message || 'AI parsing failed. Please try manual entry.');
    } finally {
      setIsAiParsing(false);
    }
  };

  // Close AI Modal and reset state
  const handleCloseAiModal = () => {
    setShowAiModal(false);
    setAiRawInput('');
    setAiParsedLead(null);
  };

  // Save AI Lead
  const handleSaveAiLead = () => {
    if (!aiParsedLead) return;
    const newLead = {
      id: `LD-${Date.now().toString().slice(-4)}`,
      name: aiParsedLead.name || 'Caller Inquiry',
      phone: aiParsedLead.phone || '',
      bhk: aiParsedLead.bhk || '',
      property: aiParsedLead.bhk || 'Flat',
      location: aiParsedLead.location || '',
      furnishing: aiParsedLead.furnishing || '',
      budget: aiParsedLead.budget || '',
      shiftingDate: aiParsedLead.shiftingDate || 'Immediate',
      tenantType: aiParsedLead.tenantType || '',
      status: aiParsedLead.isHot ? 'Hot Lead' : 'Active Lead',
      isHot: !!aiParsedLead.isHot,
      lastFollowUp: 'Just now'
    };

    setLeads(prev => [newLead, ...prev]);
    setShowAiModal(false);
    setAiRawInput('');
    setAiParsedLead(null);
    showToast(`Lead "${newLead.name}" saved via AI!`);

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('inquiries').insert([{
        id: newLead.id,
        name: newLead.name,
        phone: newLead.phone,
        bhk: newLead.bhk,
        property: newLead.property,
        location: newLead.location,
        furnishing: newLead.furnishing,
        budget: newLead.budget,
        shifting_date: newLead.shiftingDate,
        tenant_type: newLead.tenantType,
        status: newLead.status,
        is_hot: newLead.isHot,
        is_closed: false,
        last_follow_up: 'Just now'
      }]).then(({ error }) => {
        if (error) console.warn("Supabase insert error:", error);
      });
    }
  };

  // Handle Booking Confirmation
  const requestBookLead = (lead, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (lead.isClosed) {
      // Reopening doesn't need confirmation, or can toggle directly
      toggleClosedDeal(lead.id);
    } else {
      setLeadToBook(lead);
    }
  };

  const confirmBookLead = () => {
    if (!leadToBook) return;
    const targetId = leadToBook.id;
    const targetName = leadToBook.name;
    setLeadToBook(null);
    toggleClosedDeal(targetId);
  };

  const toggleClosedDeal = (leadId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;
    const wasClosed = targetLead.isClosed;
    const isNowClosed = !wasClosed;
    const updatedStatus = isNowClosed ? 'Booked' : (targetLead.isHot ? 'Hot Lead' : 'Active Lead');

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          isClosed: isNowClosed,
          status: updatedStatus
        };
      }
      return lead;
    }));

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('inquiries').update({
        is_closed: isNowClosed,
        status: updatedStatus
      }).eq('id', leadId).then(({ error }) => {
        if (error) console.warn("Supabase update error:", error);
      });
    }

    // Toast with 1-tap Undo
    showToast(
      !wasClosed ? `🎉 ${targetLead.name} marked as Booked!` : `Reopened ${targetLead.name}`,
      () => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, isClosed: wasClosed, status: wasClosed ? 'Booked' : (l.isHot ? 'Hot Lead' : 'Active Lead') } : l));
        if (isSupabaseConfigured && supabase) {
          supabase.from('inquiries').update({
            is_closed: wasClosed,
            status: wasClosed ? 'Booked' : (targetLead.isHot ? 'Hot Lead' : 'Active Lead')
          }).eq('id', leadId);
        }
        showToast(`Restored ${targetLead.name}`);
      }
    );
  };

  // Mark Booked via swipe
  const bookLeadViaSwipe = (lead) => {
    if (!lead.isClosed) {
      setLeadToBook(lead);
    } else {
      showToast(`${lead.name} is already booked`);
    }
  };

  // Delete lead functions
  const requestDeleteLead = (lead, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setLeadToDelete(lead);
  };

  const confirmDeleteLead = () => {
    if (!leadToDelete) return;
    const deletedLead = { ...leadToDelete };
    setLeads(prev => prev.filter(l => l.id !== deletedLead.id));
    setLeadToDelete(null);

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('inquiries').delete().eq('id', deletedLead.id).then(({ error }) => {
        if (error) console.warn("Supabase delete error:", error);
      });
    }

    // Toast with 1-tap Undo
    showToast(`🗑️ Inquiry for ${deletedLead.name} deleted`, () => {
      setLeads(prev => [deletedLead, ...prev]);
      if (isSupabaseConfigured && supabase) {
        supabase.from('inquiries').insert([{
          id: deletedLead.id,
          name: deletedLead.name,
          phone: deletedLead.phone,
          bhk: deletedLead.bhk,
          property: deletedLead.property,
          location: deletedLead.location,
          furnishing: deletedLead.furnishing,
          budget: deletedLead.budget,
          shifting_date: deletedLead.shiftingDate,
          tenant_type: deletedLead.tenantType,
          status: deletedLead.status,
          is_hot: deletedLead.isHot,
          is_closed: deletedLead.isClosed,
          last_follow_up: deletedLead.lastFollowUp
        }]);
      }
      showToast(`Restored inquiry for ${deletedLead.name}`);
    });
  };

  // Touch Swipe Handlers for mobile & desktop drag
  const handleTouchStart = (leadId, clientX) => {
    setTouchStartX(clientX);
    setSwipingId(leadId);
  };

  const handleTouchMove = (leadId, clientX) => {
    if (swipingId !== leadId || touchStartX === null) return;
    const diff = clientX - touchStartX;
    // Limit max swipe distance between -150 and +150
    const clamped = Math.max(-140, Math.min(140, diff));
    setSwipeOffset(prev => ({ ...prev, [leadId]: clamped }));
  };

  const handleTouchEnd = (lead) => {
    const offset = swipeOffset[lead.id] || 0;
    const threshold = 80;

    if (offset > threshold) {
      // Swiped RIGHT -> Call lead directly
      handleCall(lead.phone, { stopPropagation: () => {} });
      showToast(`📞 Dialing ${lead.name}...`);
    } else if (offset < -threshold) {
      // Swiped LEFT -> Shift to Booked Flats
      bookLeadViaSwipe(lead);
    }

    // Reset swipe smoothly
    setSwipeOffset(prev => ({ ...prev, [lead.id]: 0 }));
    setTouchStartX(null);
    setSwipingId(null);
  };

  const totalCount = leads.length;
  const hotLeadsList = leads.filter(l => !l.isClosed && (l.isHot === true || l.status === 'Hot Lead'));
  const hotCount = hotLeadsList.length;
  const closedLeadsList = leads.filter(l => l.isClosed === true || l.status === 'Booked' || l.status === 'Closed');
  const closedCount = closedLeadsList.length;

  const filteredLeads = leads.filter(lead => {
    const isHot = !lead.isClosed && (lead.isHot === true || lead.status === 'Hot Lead');
    const isClosed = lead.isClosed === true || lead.status === 'Booked' || lead.status === 'Closed';
    
    let matchesTab = true;
    if (activeTab === 'all') matchesTab = !lead.isClosed;
    else if (activeTab === 'hot') matchesTab = isHot;
    else if (activeTab === 'closed') matchesTab = isClosed;

    // Timeline / Shifting filter logic
    let matchesTimeline = true;
    const shift = (lead.shiftingDate || '').toLowerCase();
    const follow = (lead.lastFollowUp || '').toLowerCase();

    if (shiftingFilter === 'Fresh') {
      matchesTimeline = follow.includes('just') || follow.includes('min') || follow.includes('hr');
    } else if (shiftingFilter === 'This Month') {
      matchesTimeline = shift.includes('nov') || shift.includes('this month') || shift.includes('now') || shift.includes('immediate') || shift.includes('7 day');
    } else if (shiftingFilter === 'Next Month') {
      matchesTimeline = shift.includes('dec') || shift.includes('next month') || shift.includes('future');
    } else if (shiftingFilter === 'DirectCall') {
      // Direct Call Leads (only name & phone, missing BHK/budget/locality)
      const isDirectCall = !lead.bhk || !lead.budget || lead.bhk === 'Flat' || !lead.location || lead.location === 'Kolkata';
      matchesTimeline = isDirectCall;
    } else if (shiftingFilter === 'WhatsApp') {
      // WhatsApp Leads (full detailed inquiries)
      const isWhatsApp = !!(lead.bhk && lead.bhk !== 'Flat' && lead.budget && lead.location);
      matchesTimeline = isWhatsApp;
    }

    // Locality quick filter logic (Shapoorji, Newtown, Others)
    let matchesLocation = true;
    if (locationFilter === 'Shapoorji') {
      matchesLocation = (lead.location || '').toLowerCase().includes('shapoorji');
    } else if (locationFilter === 'Newtown') {
      const loc = (lead.location || '').toLowerCase();
      matchesLocation = loc.includes('new town') || loc.includes('newtown');
    } else if (locationFilter === 'Others') {
      const loc = (lead.location || '').toLowerCase();
      const isShapoorji = loc.includes('shapoorji');
      const isNewtown = loc.includes('new town') || loc.includes('newtown');
      matchesLocation = !isShapoorji && !isNewtown;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      lead.name.toLowerCase().includes(q) ||
      lead.phone.toLowerCase().includes(q) ||
      (lead.location && lead.location.toLowerCase().includes(q)) ||
      (lead.bhk && lead.bhk.toLowerCase().includes(q)) ||
      (lead.furnishing && lead.furnishing.toLowerCase().includes(q)) ||
      (lead.tenantType && lead.tenantType.toLowerCase().includes(q));

    return matchesTab && matchesTimeline && matchesLocation && matchesSearch;
  });

  // Reset to page 1 whenever search, tab, timeline, or area filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, shiftingFilter, locationFilter]);

  // Pagination Calculations (15 leads per page)
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / LEADS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * LEADS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + LEADS_PER_PAGE);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 selection:bg-[#FFC800] selection:text-[#0B132B] ${
      isDark ? 'bg-[#0B132B] text-slate-100' : 'bg-[#F4F5F9] text-[#0B132B]'
    }`}>
      
      {/* Centralized, Compact & Modern Pill Toast Notification with 1-Tap Undo */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform scale-100">
          <div className="bg-[#0B132B]/95 text-white pl-3.5 pr-2.5 py-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-[#FFC800]/50 backdrop-blur-md text-[11px] font-semibold flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC800] animate-ping"></span>
            <span className="tracking-tight">{toastMessage}</span>
            {toastUndoAction && (
              <button
                onClick={() => {
                  toastUndoAction();
                  setToastMessage('');
                  setToastUndoAction(null);
                }}
                className="bg-[#FFC800] hover:bg-[#ffe580] active:scale-95 text-[#0B132B] px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center space-x-1 transition-all cursor-pointer shadow-xs ml-1"
              >
                <Undo2 className="w-3 h-3 stroke-[3]" />
                <span>Undo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container - Fully Responsive */}
      <div className="w-full max-w-2xl mx-auto min-h-screen flex flex-col relative pb-8">

        {/* ULTRA-MODERN HEADER WITH ILLUMINATED KOLKATA SKYLINE BACKDROP */}
        <header className="relative px-5 pt-6 pb-6 overflow-hidden transition-all rounded-b-[32px] shadow-xl bg-[#080E21]">
          {/* Kolkata Twilight Skyline Image Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-65 mix-blend-luminosity transform scale-105"
            style={{ backgroundImage: `url('/kolkata-header.jpg')` }}
          ></div>

          {/* Cinematic Dark Gradient Overlays for Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#080E21]/80 via-[#0B1530]/60 to-[#080E21]/95"></div>
          <div className="absolute top-0 right-1/4 w-72 h-36 bg-[#FFC800]/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Bar: Brand + Controls (Clean, roomy, non-colliding layout) */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-y-3 gap-x-2 mb-3">
            {/* Brand Logo & Title */}
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Perfectly Circular Logo with yellow border & subtle glow */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFC800] p-[2px] shadow-[0_2px_14px_rgba(255,200,0,0.35)] flex-shrink-0">
                <img 
                  src="/flatzy-logo.jpg" 
                  alt="Flatzy" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>

              {/* Title & Portal Badge */}
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl sm:text-2xl text-white tracking-tight leading-none drop-shadow-sm">
                  Flatzy
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-[#FFC800] border border-[#FFC800]/40 backdrop-blur-md">
                  PORTAL
                </span>
              </div>
            </div>

            {/* Right Controls: Help Guide, Cloud Sync, Theme Toggle & Add Lead Button */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* ❓ Help / Guide Button */}
              <button 
                onClick={() => setShowHelpModal(true)}
                title="Kaise use karein? (Help Guide)"
                aria-label="Help Guide"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md text-[#FFC800] hover:text-white shadow-xs"
              >
                <HelpCircle className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* 🔄 Cloud Sync & Realtime Indicator */}
              <button
                onClick={() => fetchSupabaseLeads(true)}
                disabled={isSyncing}
                title="Sync with Cloud Database (Supabase)"
                aria-label="Sync with Database"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md text-slate-200 hover:text-white shadow-xs relative ${
                  isSyncing ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0B1530]"></span>
              </button>

              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Theme"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all duration-200 border border-white/15 backdrop-blur-md text-slate-200 hover:text-white shadow-xs"
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFC800]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-200" />
                )}
              </button>

              {/* Primary + Add Lead Button */}
              <button 
                onClick={() => setShowChoiceModal(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] hover:brightness-105 active:scale-95 text-[#0B132B] px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black flex items-center space-x-1 shadow-[0_4px_16px_rgba(255,200,0,0.35)] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="tracking-tight text-[11px] sm:text-xs font-black whitespace-nowrap">Add</span>
              </button>
            </div>
          </div>

          {/* Subtitle Message */}
          <p className="relative z-10 text-[11px] text-slate-300 font-medium max-w-sm mt-0.5 mb-3 leading-relaxed drop-shadow-xs">
            Manage your rental inquiries, bookings and leads — all in one place.
          </p>

          {/* High-Contrast Glassmorphic Search Bar */}
          <div className="relative z-10">
            <div className="relative flex items-center">
              <Search 
                className="w-4 h-4 text-[#FFC800] absolute left-3.5 z-20 pointer-events-none drop-shadow-sm" 
                strokeWidth={2.5} 
              />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tenant name, phone, BHK, locality..."
                className="w-full bg-white/[0.12] hover:bg-white/[0.16] focus:bg-[#080E21]/95 text-xs text-white placeholder-slate-300/80 pl-10 pr-11 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#FFC800] border border-white/20 transition-all backdrop-blur-md shadow-inner font-medium"
              />
              <div className="absolute right-3.5 flex items-center space-x-1.5 z-20">
                {searchQuery ? (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-slate-300 hover:text-white transition-colors p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <SlidersHorizontal className="w-4 h-4 text-slate-300 hover:text-white cursor-pointer" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 2x2 METRIC CARDS MATCHING EXACT SCREENSHOT WITH WATERMARK GRAPHICS */}
        <section aria-label="Overview" className="px-4 mt-4 z-10">
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Total Inquiries (Sky Blue with User Watermark) */}
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-[24px] p-4 text-left transition-all active:scale-95 text-white shadow-lg relative overflow-hidden group min-h-[120px] flex flex-col justify-between ${
                activeTab === 'all'
                  ? 'bg-gradient-to-br from-[#0099FF] via-[#0080FF] to-[#0066EE] ring-3 ring-sky-300 shadow-blue-500/30'
                  : 'bg-gradient-to-br from-[#0099FF] via-[#0080FF] to-[#0066EE] hover:brightness-105'
              }`}
            >
              {/* Background Watermark Users Icon */}
              <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none transform group-hover:scale-110 transition-transform">
                <Users className="w-24 h-24 stroke-[1.2]" />
              </div>

              {/* Top row: Number + Small Icon Bubble */}
              <div className="flex items-start justify-between relative z-10">
                <span className="text-3xl font-black tracking-tight text-white leading-none">{totalCount}</span>
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom labels */}
              <div className="relative z-10 mt-3">
                <p className="text-sm font-extrabold text-white leading-tight">Total Inquiries</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-xs"></span>
                  <span className="text-[11px] font-bold text-sky-100">
                    {activeTab === 'all' ? 'Active View' : 'Tap to view'}
                  </span>
                </div>
              </div>
            </button>

            {/* 2. Hot / Urgent (Crimson Red with Flame Watermark) */}
            <button
              onClick={() => setActiveTab('hot')}
              className={`rounded-[24px] p-4 text-left transition-all active:scale-95 text-white shadow-lg relative overflow-hidden group min-h-[120px] flex flex-col justify-between ${
                activeTab === 'hot'
                  ? 'bg-gradient-to-br from-[#FF4359] via-[#F5314D] to-[#E01838] ring-3 ring-rose-300 shadow-red-500/30'
                  : 'bg-gradient-to-br from-[#FF4359] via-[#F5314D] to-[#E01838] hover:brightness-105'
              }`}
            >
              {/* Background Watermark Flame Icon */}
              <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none transform group-hover:scale-110 transition-transform">
                <Flame className="w-24 h-24 stroke-[1.2] fill-white/10" />
              </div>

              {/* Top row: Number + Small Icon Bubble */}
              <div className="flex items-start justify-between relative z-10">
                <span className="text-3xl font-black tracking-tight text-white leading-none">{hotCount}</span>
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner">
                  <Flame className="w-4 h-4 fill-white text-white" />
                </div>
              </div>

              {/* Bottom labels */}
              <div className="relative z-10 mt-3">
                <p className="text-sm font-extrabold text-white leading-tight">Hot / Urgent</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  <span className="text-[11px] font-bold text-rose-100">
                    {activeTab === 'hot' ? 'Active View' : 'Tap to view'}
                  </span>
                </div>
              </div>
            </button>

            {/* 3. Booked Flats (Forest Emerald with Home Watermark) */}
            <button
              onClick={() => setActiveTab('closed')}
              className={`rounded-[24px] p-4 text-left transition-all active:scale-95 text-white shadow-lg relative overflow-hidden group min-h-[120px] flex flex-col justify-between ${
                activeTab === 'closed'
                  ? 'bg-gradient-to-br from-[#0FA968] via-[#0D9158] to-[#0A6B41] ring-3 ring-emerald-300 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-[#0FA968] via-[#0D9158] to-[#0A6B41] hover:brightness-105'
              }`}
            >
              {/* Background Watermark Home Icon */}
              <div className="absolute -bottom-3 -right-3 text-white/15 pointer-events-none transform group-hover:scale-110 transition-transform">
                <Home className="w-24 h-24 stroke-[1.2]" />
              </div>

              {/* Top row: Number + Small Icon Bubble */}
              <div className="flex items-start justify-between relative z-10">
                <span className="text-3xl font-black tracking-tight text-white leading-none">{closedCount}</span>
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom labels */}
              <div className="relative z-10 mt-3">
                <p className="text-sm font-extrabold text-white leading-tight">Booked Flats</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span className="text-[11px] font-bold text-emerald-100">
                    {activeTab === 'closed' ? 'Active View' : 'Tap to view'}
                  </span>
                </div>
              </div>
            </button>

            {/* 4. Add Inquiry (Vibrant Yellow with NEW badge & Form Watermark) */}
            <button
              onClick={() => setShowChoiceModal(true)}
              className="rounded-[24px] p-4 text-left transition-all active:scale-95 shadow-lg relative overflow-hidden bg-gradient-to-br from-[#FFC800] via-[#FFD21A] to-[#FFAB00] hover:brightness-105 text-[#0B132B] min-h-[120px] flex flex-col justify-between group"
            >
              {/* Background Watermark Document Icon */}
              <div className="absolute -bottom-3 -right-3 text-[#0B132B]/10 pointer-events-none transform group-hover:scale-110 transition-transform">
                <FileEdit className="w-24 h-24 stroke-[1.2]" />
              </div>

              {/* Top row: NEW pill + Plus Icon */}
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#0B132B] bg-black/10 px-2.5 py-0.5 rounded-md">
                  NEW
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#0B132B] text-[#FFC800] flex items-center justify-center shadow-md group-hover:rotate-90 transition-transform duration-200">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* Bottom labels */}
              <div className="relative z-10 mt-3">
                <p className="text-sm font-black tracking-tight text-[#0B132B] leading-tight">+ Add Inquiry</p>
                <p className="text-[11px] text-slate-800 font-bold mt-1">AI or Form</p>
              </div>
            </button>
          </div>
        </section>

        {/* LIST TITLE */}
        <div className="px-4 mt-3 flex items-center justify-between text-xs font-semibold">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {activeTab === 'hot' && '🔥 Hot & Urgent Inquiries'}
            {activeTab === 'closed' && '🎉 Booked & Finalized Deals'}
            {activeTab === 'all' && '📋 Active Inquiries'} ({filteredLeads.length})
          </span>
          {activeTab !== 'all' && (
            <button 
              onClick={() => setActiveTab('all')} 
              className="text-xs text-blue-500 font-bold hover:underline"
            >
              Show All Active
            </button>
          )}
        </div>

        {/* FILTERS LINE: Area Dropdown + Timeline Filters (in the same unified line) */}
        <div className="px-4 mt-2">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {/* Area Dropdown (Same line) */}
            <div className="relative flex-shrink-0">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className={`appearance-none text-[11px] font-bold pl-7 pr-7 py-1.5 rounded-full border outline-none cursor-pointer transition-all shadow-2xs ${
                  locationFilter !== 'All'
                    ? 'bg-blue-600 text-white border-blue-500 font-extrabold'
                    : isDark
                      ? 'bg-[#151E2E] text-slate-200 border-slate-700/80 hover:bg-[#1C2638]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <option value="All">📍 All Areas</option>
                <option value="Shapoorji" className={isDark ? 'bg-[#0B132B] text-white' : 'bg-white text-slate-900'}>Shapoorji</option>
                <option value="Newtown" className={isDark ? 'bg-[#0B132B] text-white' : 'bg-white text-slate-900'}>Newtown</option>
                <option value="Others" className={isDark ? 'bg-[#0B132B] text-white' : 'bg-white text-slate-900'}>Others</option>
              </select>
              <MapPin className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                locationFilter !== 'All' ? 'text-white' : 'text-[#FFC800]'
              }`} />
              <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                locationFilter !== 'All' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>

            {/* Filter Pills */}
            {[
              { id: 'All', label: 'All Dates' },
              { id: 'Fresh', label: '⚡ Fresh Inquiries' },
              { id: 'This Month', label: '📅 This Month' },
              { id: 'Next Month', label: '🔮 Next Month' },
              { id: 'DirectCall', label: '📞 Direct Call Leads' },
              { id: 'WhatsApp', label: '💬 WhatsApp Leads' }
            ].map(pill => {
              const active = shiftingFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setShiftingFilter(pill.id)}
                  className={`text-[11px] px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all active:scale-95 border flex-shrink-0 ${
                    active
                      ? (isDark 
                          ? 'bg-amber-400 text-[#0B132B] border-amber-400 shadow-sm' 
                          : 'bg-[#0B132B] text-[#FFC800] border-[#0B132B] shadow-sm')
                      : (isDark 
                          ? 'bg-[#151E2E] text-slate-300 border-slate-700/80 hover:bg-[#1C2638]' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-2xs')
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* GESTURE HELPER PILL HINT */}
        <div className="px-4 mt-2">
          <div className={`py-1 px-3 rounded-xl border flex items-center justify-between text-[10px] font-semibold transition-colors ${
            isDark 
              ? 'bg-[#0F172A]/80 border-slate-800 text-slate-400' 
              : 'bg-slate-100/80 border-slate-200 text-slate-500'
          }`}>
            <span className="flex items-center space-x-1">
              <span className="text-red-500 font-bold">👉 Slide Right</span>
              <span>to Call</span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center space-x-1">
              <span>Shift to Booked</span>
              <span className="text-emerald-500 font-bold">Slide Left 👈</span>
            </span>
          </div>
        </div>

        {/* CARDS LIST WITH RESILIENT MISSING-FIELD QUESTION MARKS */}
        <div className="flex-1 px-4 mt-2.5 mb-3 space-y-3">
          {filteredLeads.length === 0 ? (
            <div className={`text-center py-10 rounded-3xl border border-dashed p-6 mt-4 transition-colors ${
              isDark ? 'bg-[#1E293B]/50 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>No inquiries found</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                Try clearing search/locality filter or tap "+ Add Inquiry".
              </p>
            </div>
          ) : (
            paginatedLeads.map((lead) => {
              const isHot = !lead.isClosed && (lead.isHot === true || lead.status === 'Hot Lead');
              const isClosed = lead.isClosed === true || lead.status === 'Booked' || lead.status === 'Closed';
              const isDirectCall = (!lead.bhk || !lead.budget || lead.bhk === 'Flat' || !lead.location || lead.location === 'Kolkata') && !isClosed;
              const isFireAnimating = animatingFireId === lead.id;
              const currentOffset = swipeOffset[lead.id] || 0;
              const isSwiping = swipingId === lead.id;

              return (
                <div 
                  key={lead.id} 
                  className={`relative overflow-hidden rounded-2xl select-none transition-all ${
                    isClosed ? 'opacity-90' : 'opacity-100'
                  }`}
                >
                  {/* Swipe Action Background Reveal Layers */}
                  <div className="absolute inset-0 flex items-center justify-between rounded-2xl overflow-hidden px-4 pointer-events-none">
                    {/* Swiped Right -> Call Action Reveal */}
                    <div className={`flex items-center space-x-2 text-white font-extrabold text-xs transition-opacity duration-200 ${
                      currentOffset > 25 ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-md">
                        <PhoneCall className="w-5 h-5 fill-white" />
                      </div>
                      <span className="bg-red-700/90 px-2.5 py-1 rounded-lg backdrop-blur-xs">Call Directly</span>
                    </div>

                    {/* Swiped Left -> Mark Booked Action Reveal */}
                    <div className={`flex items-center space-x-2 text-white font-extrabold text-xs transition-opacity duration-200 ml-auto ${
                      currentOffset < -25 ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <span className="bg-emerald-700/90 px-2.5 py-1 rounded-lg backdrop-blur-xs">Shift to Booked</span>
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Foreground Card with Touch & Drag Handlers */}
                  <div 
                    onTouchStart={(e) => handleTouchStart(lead.id, e.touches[0].clientX)}
                    onTouchMove={(e) => handleTouchMove(lead.id, e.touches[0].clientX)}
                    onTouchEnd={() => handleTouchEnd(lead)}
                    onMouseDown={(e) => handleTouchStart(lead.id, e.clientX)}
                    onMouseMove={(e) => {
                      if (swipingId === lead.id) handleTouchMove(lead.id, e.clientX);
                    }}
                    onMouseUp={() => {
                      if (swipingId === lead.id) handleTouchEnd(lead);
                    }}
                    onMouseLeave={() => {
                      if (swipingId === lead.id) handleTouchEnd(lead);
                    }}
                    style={{
                      transform: `translateX(${currentOffset}px)`,
                      transition: isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className={`rounded-2xl p-4 relative group border transition-all duration-200 ${
                      isClosed
                        ? (isDark
                            ? 'bg-[#101929] border-emerald-500/40 border-l-4 border-l-emerald-500 shadow-xs'
                            : 'bg-emerald-50/40 border-emerald-200 border-l-4 border-l-emerald-500 shadow-xs')
                        : isHot
                          ? (isDark
                              ? 'bg-[#162032] border-slate-700/80 border-b-4 border-b-red-500 shadow-md ring-1 ring-red-500/20'
                              : 'bg-white border-slate-200/90 border-b-4 border-b-red-500 shadow-md')
                          : (isDark
                              ? 'bg-[#151E2E] border-slate-800/80 hover:border-slate-700 shadow-sm'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm')
                    } hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing`}
                  >
                    {/* Top Bar: Name + Shifting Time + Delete & Fire Toggles */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className={`font-black text-base leading-tight ${isDark ? 'text-white' : 'text-[#0B132B]'}`}>
                            {lead.name}
                          </h2>
                          {isClosed ? (
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold text-[9px] tracking-wide shadow-xs flex items-center space-x-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>BOOKED</span>
                            </span>
                          ) : isHot ? (
                            <span className="bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold text-[9px] tracking-wide shadow-xs flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              <span>HOT LEAD</span>
                            </span>
                          ) : null}

                          {/* DIRECT CALL LEAD BADGE (Phone & Name only) */}
                          {isDirectCall && (
                            <span className="bg-blue-600/90 text-white px-2 py-0.5 rounded-full font-extrabold text-[9px] tracking-wide shadow-xs flex items-center space-x-1 border border-blue-400/30">
                              <Phone className="w-2.5 h-2.5" />
                              <span>DIRECT CALL</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 mt-1 text-[10px]">
                          <span className={`flex items-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            {lead.lastFollowUp || 'Recently'}
                          </span>
                          <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>•</span>
                          {/* Shifting Date Tag with fallback */}
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {lead.shiftingDate ? (
                              `Shifting: ${lead.shiftingDate}`
                            ) : (
                              <span className="inline-flex items-center text-slate-400 font-normal">
                                Shifting: <HelpCircle className="w-3 h-3 ml-1 text-slate-400" />
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Right Icons: Pencil (Edit for Direct Call) + Delete (Trash) Button + Fire toggle */}
                      <div className="flex items-center space-x-1.5">
                        {/* ✏️ Pencil Edit Button (on Direct Call leads) */}
                        {isDirectCall && (
                          <button
                            onClick={(e) => openEditLead(lead, e)}
                            title="Edit requirements / add missing details"
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-75 ${
                              isDark 
                                ? 'bg-blue-950/70 text-blue-300 hover:text-blue-200 hover:bg-blue-900/80 border border-blue-800/50' 
                                : 'bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 border border-blue-200/80'
                            }`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* 🗑️ Delete Lead Button */}
                        <button
                          onClick={(e) => requestDeleteLead(lead, e)}
                          title="Delete / Clear this inquiry"
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-75 ${
                            isDark 
                              ? 'bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-950/40' 
                              : 'bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 🔥 Fire toggle icon */}
                        <button
                          onClick={(e) => toggleHotLead(lead.id, e)}
                          title={isHot ? "Remove from Hot Leads" : "Mark as Hot Lead"}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-75 ${
                            isFireAnimating ? 'scale-125 rotate-12' : ''
                          } ${
                            isHot 
                              ? 'bg-red-500/15 text-red-500 ring-2 ring-red-500/60 scale-105 shadow-xs' 
                              : (isDark ? 'bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50')
                          }`}
                        >
                          <Flame className={`w-4 h-4 transition-transform duration-200 ${isHot ? 'fill-red-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                  {/* PROMINENT PHONE NUMBER + COPY */}
                  <div className={`mt-2.5 rounded-xl px-3 py-2 flex items-center justify-between transition-colors ${
                    isDark 
                      ? 'bg-[#0F172A] border border-slate-800' 
                      : 'bg-slate-50/90 border border-slate-200/90'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isDark ? 'bg-white/10 text-slate-200' : 'bg-[#0B132B]/5 text-[#0B132B]'
                      }`}>
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className={`font-mono font-black text-sm tracking-wide select-all ${
                        isDark ? 'text-slate-100' : 'text-[#0B132B]'
                      }`}>
                        {lead.phone || '—'}
                      </span>
                    </div>

                    {lead.phone && (
                      <button
                        onClick={(e) => copyPhoneNumber(lead.phone, lead.id, e)}
                        className={`flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-90 ${
                          copiedId === lead.id
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : (isDark 
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs')
                        }`}
                      >
                        {copiedId === lead.id ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* INQUIRY FORM ATTRIBUTES GRID (Hidden for Direct Call leads) */}
                  {!isDirectCall && (
                    <div className={`mt-3 rounded-xl p-2.5 border text-xs grid grid-cols-2 gap-2 ${
                      isDark ? 'bg-[#0E1726] border-slate-800' : 'bg-[#F8FAFC] border-slate-200/70'
                    }`}>
                      {/* BHK badge */}
                      <div className="flex items-center space-x-1.5">
                        <Home className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        {lead.bhk || lead.property ? (
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-[#0B132B]'}`}>
                            {lead.bhk || lead.property}
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center font-medium">
                            BHK: <HelpCircle className="w-3 h-3 ml-1 text-slate-400" />
                          </span>
                        )}
                      </div>

                      {/* Location badge */}
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        {lead.location ? (
                          <span className={`font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {lead.location}
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center font-medium">
                            Area: <HelpCircle className="w-3 h-3 ml-1 text-slate-400" />
                          </span>
                        )}
                      </div>

                      {/* Furnishing badge */}
                      <div className="flex items-center space-x-1.5">
                        <Armchair className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        {lead.furnishing ? (
                          <span className={`font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {lead.furnishing}
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center font-medium">
                            Furnish: <HelpCircle className="w-3 h-3 ml-1 text-slate-400" />
                          </span>
                        )}
                      </div>

                      {/* Tenant type badge (Family vs Bachelor) */}
                      <div className="flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {lead.tenantType ? (
                          <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            lead.tenantType === 'Family' 
                              ? (isDark ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60')
                              : (isDark ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60')
                          }`}>
                            {lead.tenantType}
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center font-medium">
                            Tenant: <HelpCircle className="w-3 h-3 ml-1 text-slate-400" />
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Budget Highlight (Hidden for Direct Call leads) */}
                  {!isDirectCall && (
                    <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                      <span className="text-[11px] text-slate-400 font-semibold">Budget Range:</span>
                      {lead.budget ? (
                        <span className="font-extrabold text-red-600 dark:text-red-400 text-xs">
                          {lead.budget}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center font-semibold text-xs">
                          Not specified <HelpCircle className="w-3 h-3 ml-1 text-slate-400" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* ACTION BUTTONS: Call Directly + WhatsApp + Mark as Booked */}
                  <div className={`mt-3 pt-2.5 border-t flex items-center space-x-2 ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    {/* Call Directly */}
                    <button
                      onClick={(e) => handleCall(lead.phone, e)}
                      className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-[0.97] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all duration-150"
                      title="Call directly via Phone Dialpad"
                    >
                      <PhoneCall className="w-3.5 h-3.5 fill-white text-white" />
                      <span>Call Directly</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={(e) => handleWhatsApp(lead.phone, lead.name, lead, e)}
                      className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1caa51] active:scale-[0.97] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all duration-150"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Mark as Booked / Closed Deal Toggle */}
                    <button
                      onClick={(e) => requestBookLead(lead, e)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-all active:scale-95 ${
                        lead.isClosed
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : (isDark 
                              ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-emerald-950/40' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')
                      }`}
                      title={lead.isClosed ? "Click to Reopen" : "Mark Deal as Finalized / Booked"}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lead.isClosed ? 'Booked' : 'Mark Booked'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* PAGINATION CONTROLS (15 LEADS PER PAGE) */}
        {filteredLeads.length > LEADS_PER_PAGE && (
          <div className="px-4 mb-3 flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing {startIndex + 1}–{Math.min(startIndex + LEADS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length}
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
                  validCurrentPage <= 1
                    ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                    : isDark 
                      ? 'bg-[#151E2E] text-white border-slate-700 hover:bg-[#1E293B] active:scale-95' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 active:scale-95 shadow-2xs'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Chips */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                const isActive = pageNum === validCurrentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-xl text-xs font-black transition-all ${
                      isActive
                        ? 'bg-[#FFC800] text-[#0B132B] shadow-xs scale-105'
                        : isDark
                          ? 'bg-[#151E2E] text-slate-400 border border-slate-700 hover:text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
                  validCurrentPage >= totalPages
                    ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                    : isDark 
                      ? 'bg-[#151E2E] text-white border-slate-700 hover:bg-[#1E293B] active:scale-95' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 active:scale-95 shadow-2xs'
                }`}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM STATUS BAR */}
        <footer className={`border-t px-4 py-3 mt-1 rounded-2xl flex items-center justify-between text-xs transition-colors ${
          isDark ? 'bg-[#1E293B] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
            <span className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Connected to Supabase (Realtime Sync)
            </span>
          </div>
          <span className={`text-[11px] font-bold ${isDark ? 'text-[#FFC800]' : 'text-[#0B132B]'}`}>
            {filteredLeads.length} {filteredLeads.length === 1 ? 'inquiry' : 'inquiries'} {totalPages > 1 && `(Page ${validCurrentPage} of ${totalPages})`}
          </span>
        </footer>

        {/* ======================================================== */}
        {/* 1. INITIAL CHOICE MODAL: Pure Theme Styles & Simple Terms */}
        {showChoiceModal && (
          <div 
            onClick={() => setShowChoiceModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border transition-all ${
                isDark 
                  ? 'bg-[#151E2E] border-slate-700/80 text-white shadow-black/50' 
                  : 'bg-white border-slate-200 text-[#0B132B] shadow-slate-300/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-base tracking-tight">Add New Inquiry</h3>
                <button 
                  onClick={() => setShowChoiceModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                How would you like to add this lead?
              </p>

              <div className="space-y-2.5">
                {/* Option 1: AI Auto Fill */}
                <button
                  onClick={() => {
                    setShowChoiceModal(false);
                    setShowAiModal(true);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border active:scale-[0.98] transition-all flex items-center space-x-3.5 group ${
                    isDark 
                      ? 'bg-[#1C2638] border-amber-500/30 hover:border-amber-400 text-white' 
                      : 'bg-amber-50/60 border-amber-200 hover:border-amber-300 text-[#0B132B]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block">
                      ⚡ Add using AI
                    </span>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Paste a WhatsApp message or caller note. Details are auto-filled for you!
                    </p>
                  </div>
                </button>

                {/* Option 2: Fill Form Manually */}
                <button
                  onClick={() => {
                    setShowChoiceModal(false);
                    setShowManualModal(true);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border active:scale-[0.98] transition-all flex items-center space-x-3.5 ${
                    isDark 
                      ? 'bg-[#1C2638] border-slate-700 hover:border-slate-600 text-white' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-[#0B132B]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block">
                      📝 Fill Form Manually
                    </span>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Type in name, phone, BHK, and budget manually.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. AI PARSER DIALOG: Clean Theme & Simple Layman Terms */}
        {showAiModal && (
          <div 
            onClick={handleCloseAiModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl p-5 shadow-2xl border max-h-[90vh] overflow-y-auto transition-all ${
                isDark 
                  ? 'bg-[#151E2E] border-slate-700/80 text-white' 
                  : 'bg-white border-slate-200 text-[#0B132B]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Wand2 className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight">Auto-Fill Lead using AI</h3>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Paste any inquiry message or notes
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseAiModal}
                  className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Textarea for raw text */}
              <div className="mt-2">
                <textarea
                  rows={4}
                  value={aiRawInput}
                  onChange={(e) => setAiRawInput(e.target.value)}
                  placeholder="Paste WhatsApp message or call notes here... (e.g. 'Rahul 9830123456 needs 2 BHK in New Town, furnished, budget 20k')"
                  className={`w-full rounded-2xl p-3 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] transition-colors ${
                    isDark 
                      ? 'bg-[#0E1726] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-[#0B132B] placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Quick sample buttons */}
              <div className="flex items-center space-x-2 my-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">Try Sample:</span>
                <button
                  type="button"
                  onClick={() => setAiRawInput("Hi, I am Soumya (9876543210). Need 3 BHK in Salt Lake Sector 5 for my family, fully furnished, budget 35k. Moving immediately.")}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border flex-shrink-0 transition-colors ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Family (Salt Lake)
                </button>
                <button
                  type="button"
                  onClick={() => setAiRawInput("Call note: Debabrata, 9830998877. Wants 1BHK Rajarhat, budget 12k. Bachelor.")}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border flex-shrink-0 transition-colors ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Bachelor (Rajarhat)
                </button>
              </div>

              {/* Action Button: Raised, Pop-up Amber Glow Hover */}
              <button
                type="button"
                disabled={isAiParsing}
                onClick={handleParseAi}
                className="w-full bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] hover:brightness-105 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,200,0,0.4)] text-[#0B132B] font-black text-xs py-3 rounded-2xl flex items-center justify-center space-x-2 shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-50 mt-1 cursor-pointer"
              >
                {isAiParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reading details with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Fill Details</span>
                  </>
                )}
              </button>

              {/* AI Parsed Results Preview */}
              {aiParsedLead && (
                <div className={`mt-3.5 p-3.5 rounded-2xl border animate-in fade-in duration-200 ${
                  isDark ? 'bg-[#0E1726] border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Extracted Information
                    </span>
                    {aiParsedLead.isHot && (
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                        HOT LEAD
                      </span>
                    )}
                  </div>

                  {/* Extracted Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Name</span>
                      <p className="font-extrabold">{aiParsedLead.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Phone</span>
                      <p className="font-mono font-bold">{aiParsedLead.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Looking for BHK</span>
                      <p className="font-bold text-amber-500">{aiParsedLead.bhk || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Location</span>
                      <p className="font-bold">{aiParsedLead.location || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Furnishing</span>
                      <p className="font-medium">{aiParsedLead.furnishing || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Tenant Type</span>
                      <p className="font-medium">{aiParsedLead.tenantType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Budget</span>
                      <p className="font-bold text-red-600 dark:text-red-400">{aiParsedLead.budget || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Shifting Date</span>
                      <p className="font-medium">{aiParsedLead.shiftingDate || '—'}</p>
                    </div>
                  </div>

                  {/* Save to portal button */}
                  <button
                    onClick={handleSaveAiLead}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save to Portal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. MANUAL INQUIRY FORM MODAL                            */}
        {/* ======================================================== */}
        {showManualModal && (
          <div 
            onClick={() => setShowManualModal(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg mx-auto rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border-t sm:border max-h-[92vh] overflow-y-auto no-scrollbar ${
                isDark ? 'bg-[#1E293B] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0B132B]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-extrabold text-base">Manual Lead Entry</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter lead details matching the Flatzy inquiry form
                  </p>
                </div>
                <button 
                  onClick={() => setShowManualModal(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const isMarkedHot = formData.get('isHot') === 'on';
                const name = (formData.get('name') || '').trim();
                const phone = (formData.get('phone') || '').trim();
                const location = formData.get('location') || 'New Town';
                const furnishing = formData.get('furnishing') || 'Semi-Furnished';
                const budget = formData.get('budget') || '₹15,000 – ₹20,000';
                const shiftingDateCustom = (formData.get('shiftingDate') || '').trim();
                const shiftingDate = shiftingDateCustom || manualShiftingQuick;

                if (!name || !phone) {
                  showToast('Please enter lead name & WhatsApp number');
                  return;
                }

                const newLead = {
                  id: `LD-${Date.now().toString().slice(-4)}`,
                  name,
                  phone,
                  bhk: manualBhk,
                  property: manualBhk,
                  location,
                  furnishing,
                  budget,
                  shiftingDate,
                  tenantType: manualTenantType,
                  status: isMarkedHot ? 'Hot Lead' : 'Active Lead',
                  isHot: isMarkedHot,
                  lastFollowUp: 'Just now'
                };

                setLeads(prev => [newLead, ...prev]);
                setShowManualModal(false);
                showToast(`Lead "${newLead.name}" added successfully!`);

                // Sync to Supabase
                if (isSupabaseConfigured && supabase) {
                  supabase.from('inquiries').insert([{
                    id: newLead.id,
                    name: newLead.name,
                    phone: newLead.phone,
                    bhk: newLead.bhk,
                    property: newLead.property,
                    location: newLead.location,
                    furnishing: newLead.furnishing,
                    budget: newLead.budget,
                    shifting_date: newLead.shiftingDate,
                    tenant_type: newLead.tenantType,
                    status: newLead.status,
                    is_hot: newLead.isHot,
                    is_closed: false,
                    last_follow_up: 'Just now'
                  }]).then(({ error }) => {
                    if (error) console.warn("Supabase manual insert error:", error);
                  });
                }
              }} className="space-y-3 mt-3">

                {/* Name & Phone */}
                <div className="space-y-2">
                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Your Name *
                    </label>
                    <input 
                      name="name" 
                      required 
                      placeholder="e.g. Rahul Sen" 
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#FFC800] border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      WhatsApp Number *
                    </label>
                    <input 
                      name="phone" 
                      required 
                      type="tel"
                      placeholder="+91 98300 12345" 
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#FFC800] border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    />
                  </div>
                </div>

                {/* BHK selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Looking for BHK *
                    </label>
                    <span className="text-[10px] text-slate-400">Tap to switch</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1 BHK', '2 BHK', '3 BHK'].map((bhk) => (
                      <button
                        type="button"
                        key={bhk}
                        onClick={() => setManualBhk(bhk)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          manualBhk === bhk
                            ? 'bg-[#FFC800] text-[#0B132B] border-[#FFC800] shadow-sm scale-[1.02]'
                            : (isDark ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200')
                        }`}
                      >
                        {manualBhk === bhk && '● '} {bhk}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location & Furnishing */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Location *
                    </label>
                    <select 
                      name="location" 
                      defaultValue="New Town"
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    >
                      {KOLKATA_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Furnishing *
                    </label>
                    <select 
                      name="furnishing" 
                      defaultValue="Semi-Furnished"
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    >
                      {FURNISHING_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Budget Range ({manualBhk}) *
                  </label>
                  <select 
                    name="budget" 
                    defaultValue="₹15,000 – ₹20,000"
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                    }`}
                  >
                    {BUDGET_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Shifting Date & Tenant Type */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <label className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center mb-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      Shifting Date
                    </label>
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {['Now', '7 Days', 'Nov', 'Dec'].map(t => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setManualShiftingQuick(t)}
                          className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                            manualShiftingQuick === t
                              ? 'bg-[#FFC800] text-[#0B132B] border-[#FFC800]'
                              : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Family or Bachelor *
                    </label>
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setManualTenantType('Family')}
                        className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          manualTenantType === 'Family'
                            ? 'bg-[#0B132B] text-white border-[#0B132B] dark:bg-white dark:text-[#0B132B]'
                            : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                        }`}
                      >
                        Family
                      </button>

                      <button
                        type="button"
                        onClick={() => setManualTenantType('Bachelor')}
                        className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          manualTenantType === 'Bachelor'
                            ? 'bg-[#FFC800] text-[#0B132B] border-[#FFC800]'
                            : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                        }`}
                      >
                        Bachelor
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mark as Hot */}
                <div className="flex items-center space-x-2 py-1">
                  <input 
                    type="checkbox" 
                    id="isManualHot" 
                    name="isHot" 
                    className="w-4 h-4 accent-[#FF5722] rounded cursor-pointer" 
                  />
                  <label htmlFor="isManualHot" className={`text-xs font-bold flex items-center cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Flame className="w-3.5 h-3.5 text-[#FF5722] fill-[#FF5722] mr-1" />
                    Mark as Hot Lead immediately
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] hover:brightness-105 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,200,0,0.4)] text-[#0B132B] active:scale-[0.98] py-3 rounded-2xl font-black text-xs mt-2 shadow-md flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Save Lead Requirement</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. EDIT DIRECT CALL LEAD MODAL (Pencil Icon)            */}
        {/* ======================================================== */}
        {editingLead && (
          <div 
            onClick={() => setEditingLead(null)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg mx-auto rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border-t sm:border max-h-[92vh] overflow-y-auto no-scrollbar ${
                isDark ? 'bg-[#1E293B] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0B132B]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Edit Inquiry Details</h3>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Add flat, area, and budget details for Direct Call lead
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingLead(null)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedLead} className="space-y-3 mt-3">
                {/* Name & Phone */}
                <div className="space-y-2">
                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Lead Name *
                    </label>
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingLead.name}
                      placeholder="e.g. Rahul Sen" 
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#FFC800] border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Phone / WhatsApp *
                    </label>
                    <input 
                      name="phone" 
                      required 
                      type="tel"
                      defaultValue={editingLead.phone}
                      placeholder="+91 98300 12345" 
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#FFC800] border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    />
                  </div>
                </div>

                {/* BHK selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Looking for BHK *
                    </label>
                    <span className="text-[10px] text-slate-400">Tap to select</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1 BHK', '2 BHK', '3 BHK'].map((bhk) => (
                      <button
                        type="button"
                        key={bhk}
                        onClick={() => setEditBhk(bhk)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          editBhk === bhk
                            ? 'bg-[#FFC800] text-[#0B132B] border-[#FFC800] shadow-sm scale-[1.02]'
                            : (isDark ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200')
                        }`}
                      >
                        {editBhk === bhk && '● '} {bhk}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location & Furnishing */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Location *
                    </label>
                    <select 
                      name="location" 
                      defaultValue={editingLead.location && editingLead.location !== 'Kolkata' ? editingLead.location : 'New Town'}
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    >
                      {KOLKATA_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Furnishing *
                    </label>
                    <select 
                      name="furnishing" 
                      defaultValue={editingLead.furnishing || 'Semi-Furnished'}
                      className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                      }`}
                    >
                      {FURNISHING_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Budget Range ({editBhk}) *
                  </label>
                  <select 
                    name="budget" 
                    defaultValue={editingLead.budget || '₹15,000 – ₹20,000'}
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-[#FFC800] ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-[#0B132B]'
                    }`}
                  >
                    {BUDGET_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Shifting Date & Tenant Type */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <label className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center mb-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      Shifting Date
                    </label>
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {['Immediate', '7 Days', 'Nov', 'Dec'].map(t => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setEditShiftingQuick(t)}
                          className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                            editShiftingQuick === t
                              ? 'bg-[#FFC800] text-[#0B132B] border-[#FFC800]'
                              : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-2xl border ${
                    isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Family or Bachelor *
                    </label>
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setEditTenantType('Family')}
                        className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          editTenantType === 'Family'
                            ? 'bg-[#0B132B] text-white border-[#0B132B] dark:bg-white dark:text-[#0B132B]'
                            : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                        }`}
                      >
                        Family
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditTenantType('Bachelor')}
                        className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          editTenantType === 'Bachelor'
                            ? 'bg-[#FFC800] text-[#0B132B] border-[#FFC800]'
                            : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                        }`}
                      >
                        Bachelor
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mark as Hot */}
                <div className="flex items-center space-x-2 py-1">
                  <input 
                    type="checkbox" 
                    id="isEditHot" 
                    name="isHot" 
                    defaultChecked={editingLead.isHot || editingLead.status === 'Hot Lead'}
                    className="w-4 h-4 accent-[#FF5722] rounded cursor-pointer" 
                  />
                  <label htmlFor="isEditHot" className={`text-xs font-bold flex items-center cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Flame className="w-3.5 h-3.5 text-[#FF5722] fill-[#FF5722] mr-1" />
                    Mark as Hot Lead
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] hover:brightness-105 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,200,0,0.4)] text-[#0B132B] active:scale-[0.98] py-3 rounded-2xl font-black text-xs mt-2 shadow-md flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Changes</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* COMPACT CONFIRMATION POP-UP MODAL BEFORE CLEARING / DELETING INQUIRY */}
        {leadToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className={`w-full max-w-xs rounded-2xl p-5 shadow-2xl border transition-all transform scale-100 ${
              isDark ? 'bg-[#151E2E] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0B132B]'
            }`}>
              <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>

              <h3 className="font-black text-center text-sm leading-snug">
                Clear this inquiry?
              </h3>

              <p className={`text-xs text-center mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Do you want to clear <span className="font-bold text-red-500">"{leadToDelete.name}"</span>? This will remove it from your inquiries list.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setLeadToDelete(null)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isDark 
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteLead}
                  className="py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors active:scale-95"
                >
                  Clear Inquiry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPACT CONFIRMATION POP-UP MODAL BEFORE MARKING AS BOOKED */}
        {leadToBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className={`w-full max-w-xs rounded-2xl p-5 shadow-2xl border transition-all transform scale-100 ${
              isDark ? 'bg-[#151E2E] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0B132B]'
            }`}>
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              <h3 className="font-black text-center text-sm leading-snug">
                Mark as Booked Flat?
              </h3>

              <p className={`text-xs text-center mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Confirm booking for <span className="font-bold text-emerald-500">"{leadToBook.name}"</span> ({leadToBook.bhk || 'Flat'} in {leadToBook.location || 'Kolkata'})? This will move it to Booked Flats.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setLeadToBook(null)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isDark 
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmBookLead}
                  className="py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors active:scale-95"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ❓ HINGLISH HELP GUIDE MODAL */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border transition-all max-h-[85vh] overflow-y-auto ${
              isDark ? 'bg-[#151E2E] border-slate-700 text-white' : 'bg-white border-slate-200 text-[#0B132B]'
            }`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFC800]/20 text-[#FFC800] flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm leading-tight">Portal Kaise Use Karein?</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Flatzy Admin Simple Guide</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Guide Points in Hinglish (Crisp & Short) */}
              <div className="mt-3.5 space-y-2 text-xs">
                {/* 1. Hot Lead */}
                <div className={`p-2.5 rounded-xl border flex items-start space-x-2.5 ${
                  isDark ? 'bg-slate-900/60 border-red-500/20' : 'bg-red-50/60 border-red-100'
                }`}>
                  <Flame className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-500 block text-[11px]">Hot Lead</span>
                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <b>Fire icon</b> dabayein jab customer turant flat lene ko ready ho.
                    </p>
                  </div>
                </div>

                {/* 2. Booked Flat */}
                <div className={`p-2.5 rounded-xl border flex items-start space-x-2.5 ${
                  isDark ? 'bg-slate-900/60 border-emerald-500/20' : 'bg-emerald-50/60 border-emerald-100'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-500 block text-[11px]">Booked Flats</span>
                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Flat final hone par <b>"Mark Booked"</b> dabayein ya card ko <b>Left Swipe 👈</b> karein.
                    </p>
                  </div>
                </div>

                {/* 3. Useless / Clear Inquiry */}
                <div className={`p-2.5 rounded-xl border flex items-start space-x-2.5 ${
                  isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Trash2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 block text-[11px]">Clear / Delete Lead</span>
                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Fake ya useless inquiry ko <b>Trash icon</b> se remove karein.
                    </p>
                  </div>
                </div>

                {/* 4. Add Inquiry with AI */}
                <div className={`p-2.5 rounded-xl border flex items-start space-x-2.5 ${
                  isDark ? 'bg-slate-900/60 border-amber-500/20' : 'bg-amber-50/60 border-amber-100'
                }`}>
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-500 block text-[11px]">AI 1-Tap Entry</span>
                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Customer ka WhatsApp message paste karein, AI apne aap lead bana dega.
                    </p>
                  </div>
                </div>

                {/* 5. Direct Call Swipe */}
                <div className={`p-2.5 rounded-xl border flex items-start space-x-2.5 ${
                  isDark ? 'bg-slate-900/60 border-blue-500/20' : 'bg-blue-50/60 border-blue-100'
                }`}>
                  <PhoneCall className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-500 block text-[11px]">Direct Call Swipe</span>
                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Card ko <b>Right Swipe 👉</b> karke seedha dialpad se call karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full mt-4 bg-[#FFC800] hover:bg-[#ffd233] active:scale-98 text-[#0B132B] font-black text-xs py-2.5 rounded-2xl transition-all shadow-md"
              >
                Samajh Gaya (Close)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

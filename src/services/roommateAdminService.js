import { INITIAL_ROOMMATES } from '../data/roommatesData';

const LOCAL_STORAGE_KEY = 'flatzy_admin_roommates_v1';
const DELETED_ROOMMATES_KEY = 'flatzy_deleted_roommates_v1';

export const getDeletedRoommateIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_ROOMMATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markRoommateAsDeleted = (id) => {
  try {
    const list = getDeletedRoommateIds();
    if (!list.includes(id)) {
      localStorage.setItem(DELETED_ROOMMATES_KEY, JSON.stringify([...list, id]));
    }
  } catch (err) {
    console.error('[RoommateAdminService] Error saving deleted ID:', err);
  }
};

export const getLocalRoommates = () => {
  const deletedIds = new Set(getDeletedRoommateIds());
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(p => !deletedIds.has(p.id));
      }
    }
  } catch (err) {
    console.warn('[RoommateAdminService] Error reading local storage:', err);
  }
  return INITIAL_ROOMMATES.filter(p => !deletedIds.has(p.id));
};

export const saveLocalRoommates = (profiles) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error('[RoommateAdminService] Error saving local storage:', err);
  }
};

export const fetchRoommatesFromCloud = async (supabase) => {
  const localList = getLocalRoommates();
  if (!supabase) {
    return { data: localList, fromCloud: false };
  }

  try {
    // 1. Fetch from 'roommates' table
    const { data: cloudRoommates, error } = await supabase
      .from('roommates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[RoommateAdminService] Supabase roommates table fetch error:', error.message);
      return { data: localList, fromCloud: false, error: error.message };
    }

    if (Array.isArray(cloudRoommates) && cloudRoommates.length > 0) {
      const mapped = cloudRoommates.map(row => ({
        id: row.id,
        name: row.name || 'Anonymous',
        age: row.age || 24,
        gender: row.gender || 'Male',
        avatarId: row.avatar_id || 'avatar-tech-bro',
        profession: row.profession || 'Working Professional',
        occupationTitle: row.occupation_title || '',
        religion: row.religion || 'Open to All',
        lookingForBhk: row.looking_for_bhk || '2 BHK',
        listingType: row.listing_type || (row.about_me?.toLowerCase().includes('team up') || row.about_me?.toLowerCase().includes('team-up') ? 'Team-Up' : 'Room in Flat'),
        budgetPerMonth: Number(row.budget_per_month) || 8000,
        preferredLocations: Array.isArray(row.preferred_locations)
          ? row.preferred_locations
          : (typeof row.preferred_locations === 'string' ? row.preferred_locations.replace(/[{}]/g, '').split(',').map(s => s.trim()) : ['New Town']),
        moveInDate: row.move_in_date || 'Immediate',
        isVerified: row.is_approved !== undefined ? Boolean(row.is_approved) : (row.is_verified ?? true),
        status: row.status || 'active',
        lifestyleHabits: typeof row.lifestyle_habits === 'object' && row.lifestyle_habits !== null ? row.lifestyle_habits : {
          diet: 'Vegetarian',
          smoking: 'Non-Smoker',
          drinking: 'Non-Drinker',
          pets: 'Pet Friendly',
          sleepSchedule: 'Flexible'
        },
        aboutMe: row.about_me || '',
        contactWhatsApp: row.contact_whatsapp || '',
        createdAt: row.created_at || new Date().toISOString()
      }));

      // Combine with initial seeds if any aren't present (excluding deleted ones)
      const deletedIds = new Set(getDeletedRoommateIds());
      const cloudFiltered = mapped.filter(m => !deletedIds.has(m.id));
      const cloudIds = new Set(cloudFiltered.map(m => m.id));
      const initialRemaining = INITIAL_ROOMMATES.filter(init => !cloudIds.has(init.id) && !deletedIds.has(init.id));
      const combined = [...cloudFiltered, ...initialRemaining];

      saveLocalRoommates(combined);
      return { data: combined, fromCloud: true };
    }

    return { data: localList, fromCloud: false };
  } catch (err) {
    console.error('[RoommateAdminService] Fetch exception:', err);
    return { data: localList, fromCloud: false, error: err.message };
  }
};

export const createRoommateInCloud = async (supabase, profile) => {
  // Always update local cache immediately
  const local = getLocalRoommates();
  const updated = [profile, ...local.filter(p => p.id !== profile.id)];
  saveLocalRoommates(updated);

  if (!supabase) return { success: true, localOnly: true };

  try {
    const payload = {
      id: profile.id,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      avatar_id: profile.avatarId,
      profession: profile.profession,
      occupation_title: profile.occupationTitle,
      religion: profile.religion || 'Open to All',
      looking_for_bhk: profile.lookingForBhk,
      budget_per_month: profile.budgetPerMonth,
      preferred_locations: profile.preferredLocations,
      move_in_date: profile.moveInDate,
      lifestyle_habits: profile.lifestyleHabits,
      about_me: profile.listingType === 'Team-Up' && !profile.aboutMe.toLowerCase().includes('team')
        ? `[Team-Up] ${profile.aboutMe}`
        : profile.aboutMe,
      contact_whatsapp: profile.contactWhatsApp,
      is_approved: profile.isVerified ?? true,
      created_at: profile.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('roommates').insert([payload]);
    if (error) {
      console.warn('[RoommateAdminService] Supabase insert warning:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[RoommateAdminService] Create exception:', err);
    return { success: false, error: err.message };
  }
};

export const updateRoommateInCloud = async (supabase, profile) => {
  const local = getLocalRoommates();
  const updated = local.map(p => p.id === profile.id ? profile : p);
  saveLocalRoommates(updated);

  if (!supabase) return { success: true, localOnly: true };

  try {
    const payload = {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      avatar_id: profile.avatarId,
      profession: profile.profession,
      occupation_title: profile.occupationTitle,
      religion: profile.religion || 'Open to All',
      looking_for_bhk: profile.lookingForBhk,
      budget_per_month: profile.budgetPerMonth,
      preferred_locations: profile.preferredLocations,
      move_in_date: profile.moveInDate,
      lifestyle_habits: profile.lifestyleHabits,
      about_me: profile.aboutMe,
      contact_whatsapp: profile.contactWhatsApp,
      is_approved: profile.isVerified ?? true
    };

    const { error } = await supabase.from('roommates').update(payload).eq('id', profile.id);
    if (error) {
      console.warn('[RoommateAdminService] Supabase update warning:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[RoommateAdminService] Update exception:', err);
    return { success: false, error: err.message };
  }
};

export const deleteRoommateFromCloud = async (supabase, id) => {
  markRoommateAsDeleted(id);
  const local = getLocalRoommates();
  const updated = local.filter(p => p.id !== id);
  saveLocalRoommates(updated);

  if (!supabase) return { success: true, localOnly: true };

  try {
    const { error } = await supabase.from('roommates').delete().eq('id', id);
    if (error) {
      console.warn('[RoommateAdminService] Supabase delete warning:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[RoommateAdminService] Delete exception:', err);
    return { success: false, error: err.message };
  }
};

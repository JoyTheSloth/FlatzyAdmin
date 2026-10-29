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

/**
 * Universal mapper to normalize cloud/database rows or realtime payloads
 * into the camelCase model used by FlatzyAdmin UI components.
 */
export const mapCloudRoommate = (row = {}) => {
  const aboutMeText = row.about_me || row.aboutMe || '';
  const isTeamUp =
    row.listing_type === 'Team-Up' ||
    row.listingType === 'Team-Up' ||
    aboutMeText.toLowerCase().includes('team up') ||
    aboutMeText.toLowerCase().includes('team-up') ||
    aboutMeText.toLowerCase().includes('teamup');

  // Locations normalization (handles array, postgres string "{New Town}", or comma-separated)
  let locations = ['New Town'];
  const rawLocs = row.preferred_locations || row.preferredLocations || row.locations || row.location;
  if (Array.isArray(rawLocs) && rawLocs.length > 0) {
    locations = rawLocs.filter(Boolean);
  } else if (typeof rawLocs === 'string' && rawLocs.trim()) {
    locations = rawLocs.replace(/[{}"']/g, '').split(',').map(s => s.trim()).filter(Boolean);
  }

  // Lifestyle habits normalization
  const rawHabits = row.lifestyle_habits || row.lifestyleHabits;
  const habits = typeof rawHabits === 'object' && rawHabits !== null && !Array.isArray(rawHabits) ? {
    diet: rawHabits.diet || 'Vegetarian',
    smoking: rawHabits.smoking || 'Non-Smoker',
    drinking: rawHabits.drinking || 'Non-Drinker',
    pets: rawHabits.pets || 'Pet Friendly',
    sleepSchedule: rawHabits.sleepSchedule || rawHabits.sleep_schedule || 'Flexible'
  } : {
    diet: 'Vegetarian',
    smoking: 'Non-Smoker',
    drinking: 'Non-Drinker',
    pets: 'Pet Friendly',
    sleepSchedule: 'Flexible'
  };

  return {
    id: String(row.id || `roommate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
    name: row.name || 'Anonymous',
    age: Number(row.age) || 24,
    gender: row.gender || 'Male',
    avatarId: row.avatar_id || row.avatarId || 'avatar-tech-bro',
    profession: row.profession || 'Working Professional',
    occupationTitle: row.occupation_title || row.occupationTitle || row.occupation || '',
    religion: row.religion || 'Open to All',
    lookingForBhk: row.looking_for_bhk || row.lookingForBhk || row.bhk || '2 BHK',
    listingType: row.listing_type || row.listingType || (isTeamUp ? 'Team-Up' : 'Room in Flat'),
    budgetPerMonth: Number(row.budget_per_month || row.budgetPerMonth || row.budget) || 8000,
    preferredLocations: locations.length > 0 ? locations : ['New Town'],
    moveInDate: row.move_in_date || row.moveInDate || row.shifting_date || 'Immediate',
    isVerified: row.is_approved !== undefined
      ? Boolean(row.is_approved)
      : (row.is_verified !== undefined ? Boolean(row.is_verified) : (row.isVerified ?? true)),
    status: row.status || 'active',
    lifestyleHabits: habits,
    aboutMe: aboutMeText,
    contactWhatsApp: row.contact_whatsapp || row.contactWhatsApp || row.phone || row.whatsapp || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
};

export const fetchRoommatesFromCloud = async (supabase) => {
  const localList = getLocalRoommates();
  if (!supabase) {
    return { data: localList, fromCloud: false };
  }

  try {
    // Fetch from 'roommates' table
    const { data: cloudRoommates, error } = await supabase
      .from('roommates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[RoommateAdminService] Supabase roommates table fetch error:', error.message);
      return { data: localList, fromCloud: false, error: error.message };
    }

    if (Array.isArray(cloudRoommates)) {
      const mapped = cloudRoommates.map(mapCloudRoommate);
      const deletedIds = new Set(getDeletedRoommateIds());
      const cloudFiltered = mapped.filter(m => !deletedIds.has(m.id));
      const cloudIds = new Set(cloudFiltered.map(m => m.id));

      // Preserve any locally uploaded/created roommates not yet present in the cloud query
      const unsyncedLocals = localList.filter(lp => !cloudIds.has(lp.id) && !deletedIds.has(lp.id));

      // Seed fallbacks only if they are not in cloud, not locally staged, and not deleted
      const initialRemaining = INITIAL_ROOMMATES.filter(init => 
        !cloudIds.has(init.id) && 
        !deletedIds.has(init.id) && 
        !unsyncedLocals.some(u => u.id === init.id)
      );

      const combined = [...unsyncedLocals, ...cloudFiltered, ...initialRemaining];
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
  const normalized = mapCloudRoommate(profile);

  // Always update local cache immediately so UI feels instantaneous
  const local = getLocalRoommates();
  const updated = [normalized, ...local.filter(p => p.id !== normalized.id)];
  saveLocalRoommates(updated);

  if (!supabase) return { success: true, localOnly: true, data: normalized };

  try {
    // Guarantees all NOT-NULL columns in Supabase table have safe defaults
    const payload = {
      id: normalized.id,
      name: normalized.name || 'Flatmate Seeker',
      age: Number(normalized.age) || 24,
      gender: normalized.gender || 'Male',
      avatar_id: normalized.avatarId || 'avatar-tech-bro',
      profession: normalized.profession || 'Working Professional',
      occupation_title: normalized.occupationTitle || '',
      religion: normalized.religion || 'Open to All',
      looking_for_bhk: normalized.lookingForBhk || '2 BHK',
      budget_per_month: Number(normalized.budgetPerMonth) || 8000,
      preferred_locations: Array.isArray(normalized.preferredLocations) && normalized.preferredLocations.length > 0
        ? normalized.preferredLocations
        : ['New Town'],
      move_in_date: normalized.moveInDate || 'Immediate',
      lifestyle_habits: normalized.lifestyleHabits || {},
      about_me: normalized.listingType === 'Team-Up' && !normalized.aboutMe.toLowerCase().includes('team')
        ? `[Team-Up] ${normalized.aboutMe}`
        : normalized.aboutMe,
      contact_whatsapp: normalized.contactWhatsApp || '919830000000',
      is_approved: normalized.isVerified ?? true,
      created_at: normalized.createdAt || new Date().toISOString()
    };

    const { error } = await supabase.from('roommates').insert([payload]);
    if (error) {
      console.warn('[RoommateAdminService] Supabase insert warning:', error);
      return { success: false, error: error.message, data: normalized };
    }
    return { success: true, data: normalized };
  } catch (err) {
    console.error('[RoommateAdminService] Create exception:', err);
    return { success: false, error: err.message, data: normalized };
  }
};

export const updateRoommateInCloud = async (supabase, profile) => {
  const normalized = mapCloudRoommate(profile);
  const local = getLocalRoommates();
  const updated = local.map(p => p.id === normalized.id ? normalized : p);
  saveLocalRoommates(updated);

  if (!supabase) return { success: true, localOnly: true, data: normalized };

  try {
    const payload = {
      name: normalized.name || 'Flatmate Seeker',
      age: Number(normalized.age) || 24,
      gender: normalized.gender || 'Male',
      avatar_id: normalized.avatarId || 'avatar-tech-bro',
      profession: normalized.profession || 'Working Professional',
      occupation_title: normalized.occupationTitle || '',
      religion: normalized.religion || 'Open to All',
      looking_for_bhk: normalized.lookingForBhk || '2 BHK',
      budget_per_month: Number(normalized.budgetPerMonth) || 8000,
      preferred_locations: Array.isArray(normalized.preferredLocations) && normalized.preferredLocations.length > 0
        ? normalized.preferredLocations
        : ['New Town'],
      move_in_date: normalized.moveInDate || 'Immediate',
      lifestyle_habits: normalized.lifestyleHabits || {},
      about_me: normalized.aboutMe || '',
      contact_whatsapp: normalized.contactWhatsApp || '919830000000',
      is_approved: normalized.isVerified ?? true
    };

    const { error } = await supabase.from('roommates').update(payload).eq('id', normalized.id);
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

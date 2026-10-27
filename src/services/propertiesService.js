import { supabase } from './supabase';

const LOCAL_PROPERTIES_KEY = 'flatzy_admin_properties_v1';

export const INITIAL_PROPERTIES = [];

const DELETED_PROPERTIES_KEY = 'flatzy_deleted_properties_v1';
const MOCK_PROP_IDS = new Set(['prop-1', 'prop-2', 'prop-3']);

export const getDeletedPropertyIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_PROPERTIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markPropertyAsDeleted = (id) => {
  try {
    const list = getDeletedPropertyIds();
    if (!list.includes(id)) {
      localStorage.setItem(DELETED_PROPERTIES_KEY, JSON.stringify([...list, id]));
    }
  } catch (err) {
    console.error('[PropertiesService] Error marking deleted property:', err);
  }
};

export const getLocalProperties = () => {
  const deletedIds = new Set(getDeletedPropertyIds());
  try {
    const raw = localStorage.getItem(LOCAL_PROPERTIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(p => !MOCK_PROP_IDS.has(p.id) && !deletedIds.has(p.id));
        if (cleaned.length !== parsed.length) {
          saveLocalProperties(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('[PropertiesService] Error reading local properties:', err);
  }
  return [];
};

export const saveLocalProperties = (properties) => {
  try {
    localStorage.setItem(LOCAL_PROPERTIES_KEY, JSON.stringify(properties));
  } catch (err) {
    console.error('[PropertiesService] Error saving local properties:', err);
  }
};

/**
 * Fetch all properties from Supabase (or fallback to LocalStorage)
 */
export const fetchProperties = async (supabaseClient, brokerIdFilter = null) => {
  const localList = getLocalProperties();

  if (!supabaseClient) {
    if (brokerIdFilter) {
      return { data: localList.filter(p => p.brokerId === brokerIdFilter), fromCloud: false };
    }
    return { data: localList, fromCloud: false };
  }

  try {
    let query = supabaseClient.from('properties').select('*').order('created_at', { ascending: false });
    if (brokerIdFilter) {
      query = query.eq('broker_id', brokerIdFilter);
    }

    const { data: cloudProps, error } = await query;
    if (error) {
      console.warn('[PropertiesService] Supabase properties fetch warning:', error.message);
      if (brokerIdFilter) {
        return { data: localList.filter(p => p.brokerId === brokerIdFilter), fromCloud: false };
      }
      return { data: localList, fromCloud: false };
    }

    if (Array.isArray(cloudProps)) {
      const mapped = cloudProps.map(row => ({
        id: row.id,
        brokerId: row.broker_id,
        brokerName: row.broker_name || 'Partner Broker',
        brokerPhone: row.broker_phone || '',
        title: row.title || 'Kolkata Flat',
        listingType: row.listing_type || 'rent',
        bhk: row.bhk || '2 BHK',
        sqft: Number(row.sqft) || Number(row.square_feet) || 1050,
        postingDate: row.posting_date || 'Recently',
        location: row.location || 'New Town',
        subLocation: row.sub_location || '',
        price: Number(row.price) || 15000,
        securityDeposit: Number(row.security_deposit) || 0,
        furnishing: row.furnishing || 'Semi Furnished',
        amenities: Array.isArray(row.amenities) ? row.amenities : [],
        status: row.status || 'available',
        isVerified: row.is_verified ?? true,
        images: Array.isArray(row.images) ? row.images.slice(0, 4) : [],
        description: row.description || '',
        createdAt: row.created_at || new Date().toISOString()
      }));

      saveLocalProperties(mapped);
      if (brokerIdFilter) {
        return { data: mapped.filter(p => p.brokerId === brokerIdFilter), fromCloud: true };
      }
      return { data: mapped, fromCloud: true };
    }

    return { data: localList, fromCloud: false };
  } catch (err) {
    console.error('[PropertiesService] Fetch exception:', err);
    return { data: localList, fromCloud: false };
  }
};

/**
 * Create a new property listing with optional images
 */
export const createProperty = async (supabaseClient, property) => {
  const local = getLocalProperties();
  const updated = [property, ...local.filter(p => p.id !== property.id)];
  saveLocalProperties(updated);

  if (!supabaseClient) return { success: true, localOnly: true };

  try {
    const payload = {
      id: property.id,
      broker_id: property.brokerId,
      broker_name: property.brokerName,
      broker_phone: property.brokerPhone,
      title: property.title,
      listing_type: property.listingType,
      bhk: property.bhk,
      sqft: property.sqft || 1000,
      posting_date: property.postingDate || 'Today',
      location: property.location,
      sub_location: property.subLocation,
      price: property.price,
      security_deposit: property.securityDeposit || 0,
      furnishing: property.furnishing,
      amenities: property.amenities || [],
      status: property.status || 'available',
      is_verified: property.isVerified ?? false,
      images: (property.images || []).filter(Boolean).slice(0, 4),
      description: property.description,
      created_at: property.createdAt || new Date().toISOString()
    };

    const { error } = await supabaseClient.from('properties').insert([payload]);
    if (error) {
      console.warn('[PropertiesService] Supabase insert warning:', error.message);
      return { success: true, localOnly: true, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.warn('[PropertiesService] Create error:', err);
    return { success: true, localOnly: true };
  }
};

/**
 * Update an existing property listing
 */
export const updateProperty = async (supabaseClient, property) => {
  const local = getLocalProperties();
  const updated = local.map(p => p.id === property.id ? property : p);
  saveLocalProperties(updated);

  if (!supabaseClient) return { success: true, localOnly: true };

  try {
    const payload = {
      title: property.title,
      listing_type: property.listingType,
      bhk: property.bhk,
      sqft: property.sqft || 1000,
      posting_date: property.postingDate,
      location: property.location,
      sub_location: property.subLocation,
      price: property.price,
      security_deposit: property.securityDeposit || 0,
      furnishing: property.furnishing,
      amenities: property.amenities || [],
      status: property.status,
      images: (property.images || []).filter(Boolean).slice(0, 4),
      description: property.description
    };

    const { error } = await supabaseClient.from('properties').update(payload).eq('id', property.id);
    if (error) {
      console.warn('[PropertiesService] Supabase update warning:', error.message);
      return { success: true, localOnly: true };
    }
    return { success: true };
  } catch (err) {
    console.warn('[PropertiesService] Update error:', err);
    return { success: true, localOnly: true };
  }
};

/**
 * Delete a property listing
 */
export const deleteProperty = async (supabaseClient, id) => {
  markPropertyAsDeleted(id);
  const local = getLocalProperties();
  const updated = local.filter(p => p.id !== id);
  saveLocalProperties(updated);

  if (!supabaseClient) return { success: true, localOnly: true };

  try {
    const { error } = await supabaseClient.from('properties').delete().eq('id', id);
    if (error) {
      console.warn('[PropertiesService] Supabase delete warning:', error.message);
      return { success: true, localOnly: true };
    }
    return { success: true };
  } catch (err) {
    console.warn('[PropertiesService] Delete error:', err);
    return { success: true, localOnly: true };
  }
};

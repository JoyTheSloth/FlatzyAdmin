import { supabase, isSupabaseConfigured } from './supabase';

const BROKERS_STORAGE_KEY = 'flatzy_admin_brokers_v1';

export const VASTU_NIWAS_BROKER_PROFILE = {
  id: 'broker-vastu-niwas',
  name: 'Vaastu Nivas',
  phone: '9830123456',
  agencyName: 'Vaastu Nivas',
  isVerified: true,
  status: 'active',
  totalProperties: 0,
  rentCount: 0,
  saleCount: 0,
  joinedDate: 'Oct 2026',
  notes: 'Verified Broker Partner (Login: vaastunivas / vaastu)'
};

export const INITIAL_BROKERS = [VASTU_NIWAS_BROKER_PROFILE];

const MOCK_BROKER_IDS = new Set(['broker-1', 'broker-2', 'broker-3', 'broker-4']);

export const getLocalBrokers = () => {
  try {
    const raw = localStorage.getItem(BROKERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let cleaned = parsed.filter(b => !MOCK_BROKER_IDS.has(b.id));
        if (!cleaned.some(b => b.id === 'broker-vastu-niwas' || b.name === 'Vaastu Nivas' || b.name === 'Vastu Niwas')) {
          cleaned = [VASTU_NIWAS_BROKER_PROFILE, ...cleaned];
        }
        if (cleaned.length !== parsed.length) {
          saveLocalBrokers(cleaned);
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.error('[BrokersService] Error reading localStorage:', e);
  }
  return [VASTU_NIWAS_BROKER_PROFILE];
};

export const saveLocalBrokers = (brokers) => {
  try {
    localStorage.setItem(BROKERS_STORAGE_KEY, JSON.stringify(brokers || []));
  } catch (e) {
    console.error('[BrokersService] Error saving localStorage:', e);
  }
};

/**
 * Fetch brokers from Supabase or localStorage fallback
 * Broker profile details include Name and Phone Number only (no email, no location)
 */
export const fetchBrokers = async (client = supabase) => {
  if (!isSupabaseConfigured || !client) {
    return { data: getLocalBrokers(), source: 'local' };
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('role', 'broker')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[BrokersService] Supabase fetch error, fallback to local:', error.message);
      return { data: getLocalBrokers(), source: 'local' };
    }

    if (Array.isArray(data)) {
      let mapped = data.map(row => ({
        id: row.id,
        name: row.name || row.full_name || 'Broker Partner',
        phone: row.phone || row.whatsapp || '',
        agencyName: row.agency_name || '',
        isVerified: row.is_verified ?? true,
        status: row.status || 'active',
        totalProperties: row.total_properties || 0,
        rentCount: row.rent_count || 0,
        saleCount: row.sale_count || 0,
        joinedDate: row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently',
        notes: row.notes || ''
      }));
      // Always guarantee Vaastu Nivas is included in the active broker directory
      if (!mapped.some(b => b.id === 'broker-vastu-niwas' || b.name === 'Vaastu Nivas' || b.name === 'Vastu Niwas')) {
        mapped = [VASTU_NIWAS_BROKER_PROFILE, ...mapped];
      }
      saveLocalBrokers(mapped);
      return { data: mapped, source: 'cloud' };
    }

    return { data: getLocalBrokers(), source: 'local' };
  } catch (err) {
    console.error('[BrokersService] Exception fetching brokers:', err);
    return { data: getLocalBrokers(), source: 'local' };
  }
};

/**
 * Create or onboard a new broker with name and phone number only
 */
export const createBroker = async (client = supabase, broker) => {
  const cleanBroker = {
    id: broker.id || `broker-${Date.now()}`,
    name: (broker.name || '').trim(),
    phone: (broker.phone || '').trim(),
    agencyName: (broker.agencyName || '').trim(),
    isVerified: broker.isVerified ?? false,
    status: broker.status || 'active',
    notes: (broker.notes || '').trim(),
    totalProperties: 0,
    rentCount: 0,
    saleCount: 0,
    joinedDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  };

  const current = getLocalBrokers();
  const updated = [cleanBroker, ...current];
  saveLocalBrokers(updated);

  if (isSupabaseConfigured && client) {
    try {
      await client.from('profiles').insert([{
        id: cleanBroker.id,
        role: 'broker',
        name: cleanBroker.name,
        phone: cleanBroker.phone,
        agency_name: cleanBroker.agencyName,
        is_verified: cleanBroker.isVerified,
        status: cleanBroker.status,
        notes: cleanBroker.notes
      }]);
    } catch (e) {
      console.warn('[BrokersService] Supabase insert warning:', e);
    }
  }

  return { success: true, data: cleanBroker };
};

/**
 * Update an existing broker's profile (name & phone number only)
 */
export const updateBroker = async (client = supabase, updatedBroker) => {
  const current = getLocalBrokers();
  const updated = current.map(b => b.id === updatedBroker.id ? {
    ...b,
    name: updatedBroker.name,
    phone: updatedBroker.phone,
    agencyName: updatedBroker.agencyName || '',
    isVerified: updatedBroker.isVerified,
    status: updatedBroker.status,
    notes: updatedBroker.notes || ''
  } : b);
  saveLocalBrokers(updated);

  if (isSupabaseConfigured && client) {
    try {
      await client.from('profiles').update({
        name: updatedBroker.name,
        phone: updatedBroker.phone,
        agency_name: updatedBroker.agencyName || '',
        is_verified: updatedBroker.isVerified,
        status: updatedBroker.status,
        notes: updatedBroker.notes || ''
      }).eq('id', updatedBroker.id);
    } catch (e) {
      console.warn('[BrokersService] Supabase update warning:', e);
    }
  }

  return { success: true, data: updatedBroker };
};

/**
 * Delete a broker profile
 */
export const deleteBroker = async (client = supabase, id) => {
  const current = getLocalBrokers();
  const updated = current.filter(b => b.id !== id);
  saveLocalBrokers(updated);

  if (isSupabaseConfigured && client) {
    try {
      await client.from('profiles').delete().eq('id', id);
    } catch (e) {
      console.warn('[BrokersService] Supabase delete warning:', e);
    }
  }

  return { success: true };
};

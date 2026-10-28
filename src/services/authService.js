import { supabase, isSupabaseConfigured } from './supabase';
import { getLocalBrokers } from './brokersService';

const SESSION_USER_KEY = 'flatzy_admin_active_session_v2';
const LOCAL_USER_KEY = 'flatzy_admin_current_user_v1';

// Default mock admin profile for authorized Super Admin
export const DEFAULT_ADMIN_USER = {
  id: 'admin-master',
  email: 'minudon',
  role: 'admin',
  name: 'Super Admin',
  agencyName: 'Flatzy HQ',
  phone: '918910376054'
};

// Vaastu Nivas verified broker profile
export const VASTU_NIWAS_BROKER_USER = {
  id: 'broker-vastu-niwas',
  email: 'vaastunivas@flatzy.in',
  role: 'broker',
  name: 'Vaastu Nivas',
  agencyName: 'Vaastu Nivas',
  phone: '9830123456',
  isVerified: true
};

export const DEFAULT_BROKER_USER = VASTU_NIWAS_BROKER_USER;

/**
 * Retrieve current logged-in user from active session.
 * Does NOT default to any user, strictly requiring login.
 */
export const getCurrentUser = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[AuthService] Error reading user session:', err);
  }
  return null;
};

export const saveCurrentUser = (user) => {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
    // Purge old persistent storage so anyone opening the site starts fresh and locked
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem('flatzy_current_user');
  } catch (err) {
    console.error('[AuthService] Error saving user session:', err);
  }
};

/**
 * Sign in with strictly verified credentials.
 */
export const signInWithEmail = async (email, password, portalType = null) => {
  const cleanId = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim().toLowerCase();

  if (!cleanId || !cleanPassword) {
    return { success: false, error: 'Please enter both ID and Password.' };
  }

  // 1. Super Admin Credentials: id: 'minudon', password: 'dududon'
  const isSuperAdminId = cleanId === 'minudon' || cleanId === 'minudon@flatzy.in' || cleanId === 'admin@flatzy.in';
  const isSuperAdminPassword = cleanPassword === 'dududon' || cleanPassword === 'flatzy2026';

  if (isSuperAdminId) {
    if (isSuperAdminPassword) {
      const adminUser = { ...DEFAULT_ADMIN_USER, email: cleanId.includes('@') ? cleanId : 'minudon' };
      saveCurrentUser(adminUser);
      return { success: true, user: adminUser };
    } else {
      return { success: false, error: 'Incorrect password for Super Admin.' };
    }
  }

  // 2. Broker: Vaastu Nivas (ID: vaastu / vastunivas / vaastunivas / nivas, password: vaastu / vastu / nivas)
  const isVaastuNiwasId = cleanId === 'vaastu' ||
                          cleanId === 'vastu' ||
                          cleanId === 'nivas' ||
                          cleanId === 'niwas' ||
                          cleanId === 'vaastunivas' || 
                          cleanId === 'vastunivas' || 
                          cleanId === 'vaastuniwas' || 
                          cleanId === 'vastuniwas' || 
                          cleanId === 'vaastu nivas' || 
                          cleanId === 'vastu nivas' || 
                          cleanId === 'vaastu niwas' || 
                          cleanId === 'vastu niwas' || 
                          cleanId === 'vaastu-nivas' || 
                          cleanId === 'vastu-nivas' || 
                          cleanId === 'vaastunivas@flatzy.in' ||
                          cleanId === 'vastunivas@flatzy.in' ||
                          cleanId === 'vaastuniwas@flatzy.in' ||
                          cleanId === 'vastuniwas@flatzy.in';

  if (isVaastuNiwasId) {
    const isVaastuPassword = cleanPassword === 'vaastu' || 
                             cleanPassword === 'vastu' ||
                             cleanPassword === 'nivas' ||
                             cleanPassword === 'niwas';

    if (isVaastuPassword) {
      const brokerUser = { ...VASTU_NIWAS_BROKER_USER };
      saveCurrentUser(brokerUser);
      return { success: true, user: brokerUser };
    } else {
      return { success: false, error: 'Incorrect password for Vaastu Nivas.' };
    }
  }

  // 3. Registered phone brokers
  const localBrokers = getLocalBrokers();
  const matched = localBrokers.find(b => b.phone === cleanId || cleanId === 'broker@flatzy.in');
  if (matched) {
    if (cleanPassword === 'vaastu' || cleanPassword === 'vastu' || cleanPassword === 'dududon') {
      const brokerUser = {
        id: matched.id || 'broker-vastu-niwas',
        email: matched.phone || cleanId,
        role: 'broker',
        name: matched.name,
        agencyName: matched.agencyName || 'Vaastu Niwas',
        phone: matched.phone || cleanId
      };
      saveCurrentUser(brokerUser);
      return { success: true, user: brokerUser };
    } else {
      return { success: false, error: 'Incorrect password for broker account.' };
    }
  }

  // 4. Supabase fallback if configured
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Invalid ID or Password. Access denied.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      // Determine role from user_metadata or default to broker (unless admin email)
      const meta = data.user.user_metadata || {};
      const isAdminEmail = cleanEmail === 'admin@flatzy.in' || cleanEmail.endsWith('@flatzy.in');
      const role = meta.role || (isAdminEmail ? 'admin' : 'broker');

      const userProfile = {
        id: data.user.id,
        email: data.user.email,
        role: role,
        name: meta.name || meta.full_name || (role === 'admin' ? 'Admin' : 'Broker'),
        agencyName: meta.agency_name || (role === 'admin' ? 'Flatzy HQ' : 'Verified Broker'),
        phone: meta.phone || meta.whatsapp || ''
      };

      saveCurrentUser(userProfile);
      return { success: true, user: userProfile };
    }

    return { success: false, error: 'User session not found' };
  } catch (err) {
    console.error('[AuthService] Login error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Sign up as a new Broker using Supabase Auth
 */
export const signUpBroker = async ({ email, password, name, phone, agencyName }) => {
  const cleanEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    const fallbackBroker = {
      id: `broker-${Date.now()}`,
      email: cleanEmail,
      role: 'broker',
      name: name || 'Broker Partner',
      agencyName: agencyName || 'Independent Real Estate',
      phone: phone || ''
    };
    saveCurrentUser(fallbackBroker);
    return { success: true, user: fallbackBroker };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          role: 'broker',
          name: name,
          phone: phone,
          agency_name: agencyName
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      const brokerProfile = {
        id: data.user.id,
        email: data.user.email,
        role: 'broker',
        name: name || 'Broker Partner',
        agencyName: agencyName || 'Independent Real Estate',
        phone: phone || ''
      };

      saveCurrentUser(brokerProfile);
      return { success: true, user: brokerProfile };
    }

    return { success: false, error: 'Registration succeeded, check confirmation email.' };
  } catch (err) {
    console.error('[AuthService] Registration error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Sign out
 */
export const signOutUser = async () => {
  saveCurrentUser(null);
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[AuthService] Sign out error:', e);
    }
  }
};

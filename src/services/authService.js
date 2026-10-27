import { supabase, isSupabaseConfigured } from './supabase';
import { getLocalBrokers } from './brokersService';

const LOCAL_USER_KEY = 'flatzy_admin_current_user_v1';

// Default mock admin profile for offline/local fallback
export const DEFAULT_ADMIN_USER = {
  id: 'admin-master',
  email: 'minudon',
  role: 'admin',
  name: 'Super Admin (Minudon)',
  agencyName: 'Flatzy HQ',
  phone: '918910376054'
};

// Default mock broker profile for offline/local fallback
export const DEFAULT_BROKER_USER = {
  id: 'broker-demo-1',
  email: 'broker@flatzy.in',
  role: 'broker',
  name: 'Rajesh Sharma',
  agencyName: 'Kolkata Prime Properties',
  phone: '9830123456'
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
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
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch (err) {
    console.error('[AuthService] Error saving user session:', err);
  }
};

/**
 * Sign in using Supabase Auth (or fallback if offline/mock)
 */
export const signInWithEmail = async (email, password, portalType = null) => {
  const cleanId = (email || '').trim().toLowerCase();

  // Super Admin Credentials: id: 'minudon', password: 'dududon' (also preserves legacy admin@flatzy.in)
  const isSuperAdminId = cleanId === 'minudon' || cleanId === 'minudon@flatzy.in' || cleanId === 'admin@flatzy.in';
  const isSuperAdminPassword = password === 'dududon' || password === 'flatzy2026' || password === 'admin123';

  if (isSuperAdminId) {
    if (isSuperAdminPassword) {
      const adminUser = { ...DEFAULT_ADMIN_USER, email: cleanId.includes('@') ? cleanId : 'minudon' };
      saveCurrentUser(adminUser);
      return { success: true, user: adminUser };
    } else {
      return { success: false, error: 'Incorrect password for Super Admin minudon.' };
    }
  }

  // Broker phone or demo login fallback
  const isBrokerLogin = cleanId === 'broker@flatzy.in' || cleanId === '9830123456' || cleanId === '9876543210' || cleanId === '9831987654' || cleanId === '9123456789' || /^\d{10}$/.test(cleanId);
  if (isBrokerLogin && (password === 'flatzy2026' || password === 'dududon' || password === 'broker123' || password.length >= 4)) {
    const localBrokers = getLocalBrokers();
    const matched = localBrokers.find(b => b.phone === cleanId || cleanId === 'broker@flatzy.in') || DEFAULT_BROKER_USER;
    const brokerUser = {
      id: matched.id || 'broker-demo-1',
      email: matched.phone || cleanId,
      role: 'broker',
      name: matched.name,
      agencyName: matched.agencyName || 'Independent Real Estate',
      phone: matched.phone || cleanId
    };
    saveCurrentUser(brokerUser);
    return { success: true, user: brokerUser };
  }

  if (!isSupabaseConfigured || !supabase) {
    // Local demo login fallback
    const role = cleanId.includes('admin') ? 'admin' : 'broker';
    const fallbackUser = {
      id: `user-${Date.now()}`,
      email: cleanId,
      role,
      name: role === 'admin' ? 'Flatzy Admin' : 'Broker Partner',
      agencyName: role === 'broker' ? 'Local Agency' : 'Flatzy Kolkata',
      phone: ''
    };
    saveCurrentUser(fallbackUser);
    return { success: true, user: fallbackUser };
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

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Building,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Crown,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { signInWithEmail, signUpBroker } from '../services/authService';

export default function AuthModal({ onLoginSuccess, onClose, isDark }) {
  // Main login type: 'admin' (Super Admin) or 'broker' (Broker Partner)
  const [portalMode, setPortalMode] = useState('admin');
  
  // For broker mode: 'login' or 'register'
  const [brokerSubMode, setBrokerSubMode] = useState('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Switch to Admin Portal Login
  const switchToAdmin = () => {
    setPortalMode('admin');
    setErrorMsg('');
    setEmail('');
    setPassword('');
  };

  // Switch to Broker Portal
  const switchToBroker = () => {
    setPortalMode('broker');
    setErrorMsg('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (portalMode === 'admin') {
        // Super Admin Login
        const res = await signInWithEmail(email, password, 'admin');
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'Invalid Super Admin credentials.');
        }
      } else if (brokerSubMode === 'register') {
        // Broker Registration
        if (!name.trim() || !phone.trim()) {
          setErrorMsg('Please enter your full name and WhatsApp phone number.');
          setLoading(false);
          return;
        }

        const brokerEmail = email.trim() || `${phone.trim()}@flatzy.in`;
        const res = await signUpBroker({
          email: brokerEmail,
          password,
          name: name.trim(),
          phone: phone.trim(),
          agencyName: agencyName.trim() || 'Independent Real Estate'
        });

        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'Registration failed. Please check details.');
        }
      } else {
        // Broker Sign In
        const res = await signInWithEmail(email, password, 'broker');
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'Invalid broker phone number or password.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Fill for Admin (minudon / dududon)
  const fillAdminCredentials = () => {
    setEmail('minudon');
    setPassword('dududon');
    setErrorMsg('');
  };

  // 1-Click Fast Fill for Broker
  const fillBrokerCredentials = () => {
    setEmail('9830123456');
    setPassword('flatzy2026');
    setErrorMsg('');
  };

  const isAdmin = portalMode === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080E21]/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border transition-all my-auto relative overflow-hidden ${
        isDark ? 'bg-[#0E172E] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/40'
      }`}>
        
        {/* Glow backdrop based on role */}
        <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-colors ${
          isAdmin ? 'bg-[#FFC800]/15' : 'bg-[#7C3AED]/20'
        }`}></div>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all active:scale-90"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center relative z-10 mb-4">
          <div className="w-13 h-13 rounded-full overflow-hidden bg-[#FFC800] p-[2px] shadow-[0_4px_20px_rgba(255,200,0,0.4)] mx-auto mb-2">
            <img 
              src="/flatzy-logo.jpg" 
              alt="Flatzy" 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>

          <div className="flex items-center justify-center space-x-2">
            <h2 className="text-2xl font-black tracking-tight">Flatzy</h2>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-[#FFC800] border border-[#FFC800]/40">
              PORTAL ACCESS
            </span>
          </div>
        </div>

        {/* 2 MAIN LOGINS SELECTOR: SUPER ADMIN vs BROKER */}
        <div className="relative z-10 grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 mb-5">
          {/* Tab 1: Super Admin */}
          <button
            type="button"
            onClick={switchToAdmin}
            className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              isAdmin
                ? 'bg-gradient-to-r from-[#FFC800] to-[#FFAE00] text-[#0B132B] shadow-md ring-1 ring-[#FFC800]/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Super Admin</span>
          </button>

          {/* Tab 2: Broker */}
          <button
            type="button"
            onClick={switchToBroker}
            className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              !isAdmin
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-md ring-1 ring-purple-500/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Broker Portal</span>
          </button>
        </div>

        {/* Role Sub-Header Context Badge */}
        <div className={`p-3 rounded-2xl mb-4 border relative z-10 ${
          isAdmin
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
            : 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300'
        }`}>
          <div className="flex items-center space-x-2">
            {isAdmin ? <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" /> : <Building className="w-4 h-4 shrink-0 text-purple-500" />}
            <div>
              <p className="font-extrabold text-xs">
                {isAdmin ? '👑 Super Admin Master Login' : '🤝 Partner Broker Portal'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isAdmin 
                  ? 'Overall control of tenant leads, Flatzymate, and broker listings.'
                  : 'Post and manage your flats for Rent or Sale with 4 images each.'}
              </p>
            </div>
          </div>
        </div>

        {/* If Broker Mode: Toggle between Sign In and Register */}
        {!isAdmin && (
          <div className="relative z-10 flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-300/70 dark:border-slate-700 mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setBrokerSubMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                brokerSubMode === 'login'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Broker Sign In
            </button>
            <button
              type="button"
              onClick={() => { setBrokerSubMode('register'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                brokerSubMode === 'register'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              New Broker Register
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-3 relative z-10 text-xs">
          
          {/* Extra fields only when Broker is Registering */}
          {!isAdmin && brokerSubMode === 'register' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Your Full Name *</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sagnik Roy"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-3.5 py-2.5 outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp Phone *</label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-[#7C3AED] font-medium text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agency Name</label>
                  <div className="relative flex items-center">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. New Town Realty"
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-[#7C3AED] font-medium text-xs"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Super Admin ID or Broker Phone Number (Only needed for Login mode) */}
          {(isAdmin || brokerSubMode === 'login') && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAdmin ? 'Super Admin ID *' : 'Broker Phone Number *'}
              </label>
              <div className="relative flex items-center">
                {isAdmin ? (
                  <Crown className="w-4 h-4 text-amber-500 absolute left-3.5 pointer-events-none" />
                ) : (
                  <Phone className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none" />
                )}
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdmin ? "minudon" : "9830123456"}
                  className={`w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-medium ${
                    isAdmin 
                      ? 'focus:border-[#FFC800] focus:ring-2 focus:ring-[#FFC800]/20' 
                      : 'focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-medium ${
                  isAdmin 
                    ? 'focus:border-[#FFC800] focus:ring-2 focus:ring-[#FFC800]/20' 
                    : 'focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20'
                }`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 cursor-pointer mt-4 ${
              isAdmin
                ? 'bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] text-[#0B132B] hover:brightness-105 shadow-amber-500/20'
                : 'bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] text-white hover:brightness-105 shadow-purple-500/20'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {isAdmin
                    ? 'Sign In to Super Admin'
                    : brokerSubMode === 'register'
                      ? 'Register & Access Broker Dashboard'
                      : 'Sign In to Broker Portal'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast Credentials for Quick Testing */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-center text-slate-400">
          <p className="font-semibold mb-2">⚡ 1-Tap Quick Fill for Testing:</p>
          <div className="flex items-center justify-center space-x-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/25 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Fill Super Admin (minudon / dududon)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={fillBrokerCredentials}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-500/25 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Fill Demo Broker (9830123456)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

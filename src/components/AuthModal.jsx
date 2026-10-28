import React, { useState } from 'react';
import {
  Lock,
  Building,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
  Crown,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { signInWithEmail } from '../services/authService';

export default function AuthModal({ onLoginSuccess, onClose }) {
  // Main login type: 'admin' (Super Admin) or 'broker' (Vaastu Nivas)
  const [portalMode, setPortalMode] = useState('admin');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
        const res = await signInWithEmail(email, password, 'admin');
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'Invalid Admin credentials.');
        }
      } else {
        const res = await signInWithEmail(email, password, 'broker');
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'Invalid broker username or password.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = portalMode === 'admin';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat overflow-y-auto animate-in fade-in duration-300"
      style={{ backgroundImage: `url('/signin-bg.jpg')` }}
    >
      {/* Light atmospheric overlay over the Kolkata artwork */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-amber-950/15 to-black/35 backdrop-blur-[0.5px]"></div>

      {/* Main Elegant Light-Theme Dialogue Card */}
      <div className="w-full max-w-[400px] rounded-3xl p-7 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-white/80 bg-white/95 backdrop-blur-2xl text-slate-900 transition-all relative overflow-hidden z-10 my-auto">
        
        {/* Subtle decorative glow */}
        <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isAdmin ? 'bg-[#FFC800]/25' : 'bg-[#7C3AED]/20'
        }`}></div>

        {/* Close button top right if dismissable */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 z-20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Centralized Brand Header with Large Prominent Logo */}
        <div className="relative z-10 flex flex-col items-center text-center mb-5 pb-4 border-b border-slate-100">
          
          {/* Large Logo Frame with Golden Ambient Ring */}
          <div className="relative group mb-3">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FFC800] via-amber-400 to-[#F59E0B] opacity-60 blur-md group-hover:opacity-90 transition duration-300 pointer-events-none"></div>
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#FFC800] to-amber-300 p-[2.5px] shadow-xl">
              <img 
                src="/flatzy-logo.jpg" 
                alt="Flatzy" 
                className="w-full h-full rounded-[14px] object-cover" 
              />
            </div>
          </div>
          
          <h2 className="font-black text-xl tracking-tight text-slate-900">
            Flatzy Sign In
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Kolkata Rental & Property Management
          </p>

          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-700 border border-amber-500/25 mt-2">
            <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
            <span>SECURE ACCESS PORTAL</span>
          </div>
        </div>

        {/* Segmented 2-Tab Switcher */}
        <div className="relative z-10 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={switchToAdmin}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              isAdmin
                ? 'bg-[#FFC800] text-[#0B132B] shadow-sm font-black scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Super Admin</span>
          </button>

          <button
            type="button"
            onClick={switchToBroker}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              !isAdmin
                ? 'bg-[#7C3AED] text-white shadow-sm font-black scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Vaastu Nivas</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Direct Sign-In Form (ID & Password) */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10 text-xs">
          
          {/* Username / ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAdmin ? 'Admin ID' : 'Broker ID / Phone'}
            </label>
            <div className="relative flex items-center">
              {isAdmin ? (
                <Crown className="w-4 h-4 text-amber-500 absolute left-3.5 pointer-events-none" />
              ) : (
                <Building className="w-4 h-4 text-purple-500 absolute left-3.5 pointer-events-none" />
              )}
              <input
                type="text"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAdmin ? "Enter Admin ID" : "Enter Broker ID or Phone"}
                className={`w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 text-slate-900 rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-semibold text-xs sm:text-sm transition-all ${
                  isAdmin 
                    ? 'focus:border-[#FFC800] focus:ring-2 focus:ring-[#FFC800]/25' 
                    : 'focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25'
                }`}
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 text-slate-900 rounded-xl pl-10 pr-10 py-2.5 outline-none font-semibold text-xs sm:text-sm transition-all ${
                  isAdmin 
                    ? 'focus:border-[#FFC800] focus:ring-2 focus:ring-[#FFC800]/25' 
                    : 'focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer p-1 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.99] cursor-pointer mt-4 ${
              isAdmin
                ? 'bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] text-[#0B132B] hover:brightness-105 shadow-amber-500/25'
                : 'bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] text-white hover:brightness-105 shadow-purple-500/25'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isAdmin ? 'Sign In as Super Admin' : 'Sign In as Vaastu Nivas'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security watermark footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
          <span>🔒 256-bit Encrypted Session • Flatzy Kolkata HQ</span>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getEmailFromUsername } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { motion } from 'framer-motion';
import { AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';
import { BRAND, CONTACT_INFO } from '../constants/branding';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Show any auth notices from redirects (e.g., deactivated account)
  useEffect(() => {
    const notice = sessionStorage.getItem('auth_notice');
    if (notice) {
      sessionStorage.removeItem('auth_notice');
      setTimeout(() => toast.error('Access Denied', notice), 300);
    }
  }, []);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#e0e5ec' }}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl mb-4">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-slate-500 font-semibold text-sm tracking-wider">SECURE LOGIN...</p>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanUsername = username.trim();
      const email = getEmailFromUsername(cleanUsername);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed') || signInError.code === 'email_not_confirmed') {
          setError('Your email is not confirmed. Please contact the administrator.');
          return;
        }
        throw signInError;
      }

      if (data.user) {
        localStorage.setItem('md_courier_username', cleanUsername);
        setTimeout(() => navigate('/', { replace: true }), 100);
      }
    } catch (err: any) {
      if (err.code === 'invalid_credentials' || err.message.includes('Invalid login credentials')) {
        setError('Invalid username or password. Please try again.');
      } else {
        setError(err.message || 'Login failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'transparent' }}>

      {/* Left Panel - Dark Hero */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex-col items-center justify-center p-12 overflow-hidden"
      >
        {/* Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-3/4 left-1/3 w-40 h-40 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative z-10 text-center space-y-6 max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
            className="w-28 h-28 mx-auto rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl p-5"
          >
            <Logo showText={false} isBranded className="w-full h-full" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-5xl font-black text-white tracking-tight">MD</h1>
            <p className="text-blue-300 font-bold tracking-[0.4em] uppercase text-sm mt-1">Logistics</p>
          </motion.div>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-400 text-base leading-relaxed"
          >
            Streamlined courier management for modern logistics operations.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-2 justify-center pt-4"
          >
            {['📦 Pickups', '🚚 Deliveries', '💰 Billing', '📊 Reports'].map((item) => (
              <span key={item} className="px-3 py-1.5 bg-white/10 text-white/70 rounded-full text-xs font-medium border border-white/10">
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom Badge */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">
            {CONTACT_INFO.address}  |  {CONTACT_INFO.phone}  |  {CONTACT_INFO.email}
          </p>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-xl p-4">
              <Logo showText={false} className="w-full h-full" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-slate-800">MD</h1>
              <p className="text-blue-600 font-bold tracking-widest text-xs uppercase">Logistics</p>
            </div>
          </div>

          {/* Form Card */}
          <div
            className="rounded-3xl p-8 border border-white/60"
            style={{
              background: 'linear-gradient(135deg, #eef2f7, #d3d8df)',
              boxShadow: '12px 12px 24px rgba(163,177,198,0.6), -12px -12px 24px rgba(255,255,255,0.8)'
            }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-800">Welcome back 👋</h2>
              <p className="text-slate-500 mt-1 text-sm">Sign in to your MD Logistics account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{
                    background: '#e0e5ec',
                    boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.4), inset -4px -4px 8px rgba(255,255,255,0.7)'
                  }}
                >
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    required
                    className="flex-1 px-4 py-3.5 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{
                    background: '#e0e5ec',
                    boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.4), inset -4px -4px 8px rgba(255,255,255,0.7)'
                  }}
                >
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="flex-1 px-4 py-3.5 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-4 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex gap-2.5 items-start border border-red-100"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <span className="leading-tight">{error}</span>
                  </motion.div>
                )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2.5 transition-all mt-2 shadow-xl shadow-slate-700/30 hover:shadow-2xl hover:shadow-slate-700/40"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </motion.button>
            </form>
          </div>

          <p className="text-center text-slate-400 text-[10px] font-bold tracking-widest uppercase">
            MD Logistics  ·  Kondotty, Malappuram Dt.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

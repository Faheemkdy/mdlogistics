import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../../components/ui/DashboardCard';
import { Package, Truck, User, LogOut, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const UserDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#e0e5ec]">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* ... existing animated blobs and side elements ... */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-48 -right-48 w-[700px] h-[700px] bg-teal-500/5 rounded-full blur-[150px]"
        />

        {/* Decorative Side Elements - Optimized for very wide screens */}
        <div className="hidden xl:block">
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [12, 15, 12] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-20 w-48 h-48 bg-white/20 backdrop-blur-3xl rounded-[3.5rem] border border-white/40 shadow-glass"
          />
          <motion.div
            animate={{ y: [0, 30, 0], rotate: [-12, -15, -12] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 -right-20 w-64 h-64 bg-white/10 backdrop-blur-2xl rounded-[4.5rem] border border-white/30 shadow-glass"
          />
          
          {/* Floating Icons */}
          <motion.div
            animate={{ y: [0, -30, 0], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-[15%] text-slate-400"
          >
            <Package size={140} strokeWidth={0.3} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 40, 0], opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-20 left-[15%] text-slate-400"
          >
            <Truck size={180} strokeWidth={0.3} />
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center min-h-screen landscape:py-6">
        <div className="w-full space-y-12 sm:space-y-16 lg:space-y-20">
          {/* Top Profile Bar - Balanced width */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto w-full flex items-center justify-between bg-glass backdrop-blur-xl border border-white/40 p-3 sm:p-5 rounded-[2rem] shadow-glass"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-lg sm:text-xl font-black text-white shadow-lg border-2 border-white/20">
                {profile?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Active Now</p>
                <h2 className="text-lg sm:text-2xl font-black text-slate-800 leading-none truncate">{profile?.username}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/profile')}
                className="p-2.5 sm:px-5 sm:py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-xs sm:text-sm shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2.5 sm:px-5 sm:py-2.5 bg-red-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Hero Section - Perfectly centered text */}
          <div className="text-center space-y-4 px-4">
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter"
            >
              MD <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Logistics</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 font-semibold text-base sm:text-xl lg:text-2xl max-w-2xl mx-auto leading-relaxed"
            >
              Manage your courier operations with precision and speed.
            </motion.p>
          </div>

          {/* Action Grid - Responsive columns and gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 lg:gap-16 max-w-5xl mx-auto w-full landscape:grid-cols-2 landscape:gap-4">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-blue-500/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <DashboardCard 
                onClick={() => navigate('/pickup')}
                className="relative h-64 sm:h-80 lg:h-96 flex flex-col items-center justify-center gap-6 sm:gap-8 cursor-pointer bg-white/40 backdrop-blur-xl border border-white/60 shadow-glass hover:border-blue-300 transition-all rounded-[2.5rem] group overflow-hidden"
              >
                <div className="p-7 sm:p-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[2rem] text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Package size={52} className="sm:w-16 sm:h-16" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800">New Pickup</h3>
                  <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] mt-2">Inventory Management</p>
                </div>
              </DashboardCard>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-green-500/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <DashboardCard 
                onClick={() => navigate('/delivery')}
                className="relative h-64 sm:h-80 lg:h-96 flex flex-col items-center justify-center gap-6 sm:gap-8 cursor-pointer bg-white/40 backdrop-blur-xl border border-white/60 shadow-glass hover:border-green-300 transition-all rounded-[2.5rem] group overflow-hidden"
              >
                <div className="p-7 sm:p-10 bg-gradient-to-br from-green-400 to-green-600 rounded-[2rem] text-white shadow-xl transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <Truck size={52} className="sm:w-16 sm:h-16" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800">New Delivery</h3>
                  <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] mt-2">Client Fulfillment</p>
                </div>
              </DashboardCard>
            </motion.div>
          </div>

          {/* System Status - Clean footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center landscape:hidden"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/30 border border-white/40 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.3em] shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              MD-CORE System: Online
            </div>
          </motion.div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-red-500 shadow-inner">
            <AlertCircle size={40} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Are you sure?</h3>
            <p className="text-slate-500 font-medium mt-1">You will need to login again to access your account.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 py-4 font-bold"
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSignOut}
              className="flex-1 py-4 font-bold bg-red-500 text-white shadow-lg shadow-red-500/30"
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

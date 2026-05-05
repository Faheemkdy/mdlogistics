import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Building2, Store, FileText, Users, Menu, X, Truck, Package, Receipt, ChevronRight, ClipboardList, BarChart2, AlertCircle, Compass, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Logo } from './ui/Logo';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

const NavItem = ({ to, icon: Icon, label, badge, isActive, onClick }: { to: string; icon: any; label: string; badge?: string; isActive: boolean; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group",
        isActive
          ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
      )}
    >
      <div className={clsx(
        "w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
        isActive
          ? "bg-white/10"
          : "bg-slate-50 group-hover:bg-white shadow-sm"
      )}>
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className="font-bold text-sm flex-1 text-left tracking-tight">{label}</span>
      {badge && (
        <span className="text-[10px] font-black px-2 py-0.5 bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-200">{badge}</span>
      )}
      {isActive && (
        <motion.div layoutId="activePill" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
      )}
    </button>
  );
};

const SidebarContent = ({ 
  profile, 
  location, 
  navigate, 
  setIsSidebarOpen, 
  setShowLogoutConfirm 
}: { 
  profile: any; 
  location: any; 
  navigate: any; 
  setIsSidebarOpen: (open: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
}) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center gap-3 mb-8 px-2 pt-2 pb-6 border-b border-slate-100">
      <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden p-2.5">
        <Logo showText={false} className="w-full h-full filter brightness-0 invert" />
      </div>
      <div className="min-w-0">
        <h1 className="font-black text-xl text-slate-900 leading-none tracking-tighter">MD LOGISTICS</h1>
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Global Network</p>
      </div>
      <button
        onClick={() => setIsSidebarOpen(false)}
        className="lg:hidden ml-auto p-2 text-slate-400 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <X size={20} />
      </button>
    </div>

    <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
      {profile?.role === 'admin' ? (
        <>
          <div className="mb-4">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Main Navigation</p>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isActive={location.pathname === "/"} onClick={() => { navigate("/"); setIsSidebarOpen(false); }} />
            <NavItem to="/companies" icon={Building2} label="Companies" isActive={location.pathname === "/companies"} onClick={() => { navigate("/companies"); setIsSidebarOpen(false); }} />
            <NavItem to="/shops" icon={Store} label="Partner Shops" isActive={location.pathname === "/shops"} onClick={() => { navigate("/shops"); setIsSidebarOpen(false); }} />
          </div>
          
          <div className="mb-4 pt-4 border-t border-slate-50">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Core Operations</p>
            <NavItem to="/pickup" icon={Package} label="Pickup Requests" isActive={location.pathname === "/pickup"} onClick={() => { navigate("/pickup"); setIsSidebarOpen(false); }} />
            <NavItem to="/delivery" icon={Truck} label="Final Delivery" isActive={location.pathname === "/delivery"} onClick={() => { navigate("/delivery"); setIsSidebarOpen(false); }} />
            <NavItem to="/dispatch" icon={ClipboardList} label="Dispatch Hub" isActive={location.pathname === "/dispatch"} onClick={() => { navigate("/dispatch"); setIsSidebarOpen(false); }} />
            <NavItem to="/day-sheet" icon={FileText} label="Accounting" isActive={location.pathname === "/day-sheet"} onClick={() => { navigate("/day-sheet"); setIsSidebarOpen(false); }} />
            <NavItem to="/vouchers" icon={Receipt} label="Expense Vouchers" isActive={location.pathname === "/vouchers"} onClick={() => { navigate("/vouchers"); setIsSidebarOpen(false); }} />
          </div>

          {profile?.username === 'md' && (
            <div className="mb-4 pt-4 border-t border-slate-50">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Advanced Control</p>
              <NavItem to="/reconciliation" icon={Compass} label="Reconciliation" isActive={location.pathname === "/reconciliation"} onClick={() => { navigate("/reconciliation"); setIsSidebarOpen(false); }} />
              <NavItem to="/reports" icon={BarChart2} label="Analytical Reports" isActive={location.pathname === "/reports"} onClick={() => { navigate("/reports"); setIsSidebarOpen(false); }} />
              <NavItem to="/billing" icon={Receipt} label="Invoicing & Billing" isActive={location.pathname === "/billing"} onClick={() => { navigate("/billing"); setIsSidebarOpen(false); }} />
              <NavItem to="/users" icon={Users} label="Access Management" isActive={location.pathname === "/users"} onClick={() => { navigate("/users"); setIsSidebarOpen(false); }} />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-1.5">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isActive={location.pathname === "/"} onClick={() => { navigate("/"); setIsSidebarOpen(false); }} />
          <NavItem to="/pickup" icon={Package} label="My Pickups" isActive={location.pathname === "/pickup"} onClick={() => { navigate("/pickup"); setIsSidebarOpen(false); }} />
          <NavItem to="/delivery" icon={Truck} label="My Deliveries" isActive={location.pathname === "/delivery"} onClick={() => { navigate("/delivery"); setIsSidebarOpen(false); }} />
        </div>
      )}
    </nav>

    <div className="pt-6 border-t border-slate-100 space-y-4 mt-auto pb-4">
      <NavItem to="/profile" icon={User} label="Profile Settings" isActive={location.pathname === "/profile"} onClick={() => { navigate("/profile"); setIsSidebarOpen(false); }} />
      
      <div className="mx-1 p-4 bg-slate-50/80 rounded-[2rem] border border-slate-100 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-lg flex-shrink-0">
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 truncate tracking-tight">{profile?.username}</p>
          <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-widest">
             <Shield size={10} /> {profile?.role}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-black text-sm group"
      >
        <div className="w-8 h-8 rounded-xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center transition-colors">
          <LogOut size={18} strokeWidth={2.5} />
        </div>
        Logout
      </button>
    </div>
  </div>
);

export const Layout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      {/* Mobile Header */}
      {(profile?.role === 'admin' || (profile?.role !== 'admin' && location.pathname !== '/')) && (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[80] flex items-center justify-between px-6 py-4 pt-[calc(env(safe-area-inset-top)+12px)] bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center p-2 shadow-md">
              <Logo showText={false} className="filter brightness-0 invert" />
            </div>
            <span className="font-black tracking-tighter text-slate-900">MD LOGISTICS</span>
          </div>
          {profile?.role === 'admin' ? (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 text-slate-600 bg-slate-50 rounded-2xl hover:bg-slate-100 active:scale-95 transition-all border border-slate-100"
            >
              <Menu size={22} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="p-2.5 text-slate-600 bg-slate-50 rounded-2xl hover:bg-slate-100 active:scale-95 transition-all border border-slate-100"
            >
              <LayoutDashboard size={22} />
            </button>
          )}
        </div>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {profile?.role === 'admin' && (
        <motion.aside
          className={clsx(
            "fixed inset-y-0 left-0 w-72 z-[100] flex flex-col p-6 pb-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl lg:shadow-none",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(30px)',
            borderRight: '1px solid rgba(241, 245, 249, 1)'
          }}
        >
          <SidebarContent 
            profile={profile} 
            location={location} 
            navigate={navigate} 
            setIsSidebarOpen={setIsSidebarOpen} 
            setShowLogoutConfirm={setShowLogoutConfirm} 
          />
        </motion.aside>
      )}

      {/* Main Content */}
      <main className={clsx(
        "flex-1 min-w-0 relative overflow-y-auto h-screen scroll-smooth custom-scrollbar",
        profile?.role === 'admin' && "lg:ml-72",
        (profile?.role === 'admin' || location.pathname !== '/')
          ? "pt-[calc(80px+env(safe-area-inset-top))] lg:pt-0"
          : "pt-0"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={clsx(
              "max-w-7xl mx-auto pb-12 min-h-full",
              (profile?.role === 'admin' || location.pathname !== '/') ? "p-6 lg:p-10" : "p-0"
            )}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
      >
        <div className="text-center space-y-8 p-4">
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-rose-500 shadow-inner group">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
               <AlertCircle size={48} strokeWidth={2.5} />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sign Out?</h3>
            <p className="text-slate-500 font-bold">Are you sure you want to terminate your current active session?</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={handleSignOut}
              className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

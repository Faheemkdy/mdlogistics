import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Building2, Store, FileText, Users, Menu, X, Truck, Package, Receipt, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Logo } from './ui/Logo';

export const Layout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label, badge }: { to: string; icon: any; label: string; badge?: string }) => {
    const isActive = location.pathname === to;
    return (
      <button
        onClick={() => { navigate(to); setIsSidebarOpen(false); }}
        className={clsx(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group",
          isActive
            ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30"
            : "text-slate-400 hover:text-white hover:bg-white/10"
        )}
      >
        <div className={clsx(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
          isActive
            ? "bg-white/20"
            : "bg-white/5 group-hover:bg-white/10"
        )}>
          <Icon size={17} />
        </div>
        <span className="font-semibold text-sm flex-1 text-left">{label}</span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/20 rounded-full">{badge}</span>
        )}
        {isActive && (
          <ChevronRight size={14} className="opacity-60" />
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo Area */}
      <div className="flex items-center gap-3 mb-8 px-2 pt-4 pb-2 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden p-2">
          <Logo showText={false} className="w-full h-full filter brightness-0 invert" />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-lg text-white leading-none tracking-wide">MD</h1>
          <p className="text-[0.6rem] font-bold text-indigo-300 uppercase tracking-[0.2em] mt-0.5">Logistics</p>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden ml-auto p-1.5 text-slate-400 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {profile?.role === 'admin' ? (
          <>
            <div className="mb-2">
              <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Main</p>
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/companies" icon={Building2} label="Companies" />
              <NavItem to="/shops" icon={Store} label="Shops" />
            </div>
            <div className="mb-2 pt-2 border-t border-white/10">
              <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Operations</p>
              <NavItem to="/pickup" icon={Package} label="Pickup" />
              <NavItem to="/delivery" icon={Truck} label="Delivery" />
              <NavItem to="/day-sheet" icon={FileText} label="Day Sheet" />
              <NavItem to="/reports" icon={FileText} label="Reports" />
              <NavItem to="/billing" icon={Receipt} label="Billing & Invoice" />
            </div>
            <div className="mb-2 pt-2 border-t border-white/10">
              <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin</p>
              <NavItem to="/users" icon={Users} label="User Management" />
            </div>
          </>
        ) : (
          <>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/pickup" icon={Package} label="Pickup" />
            <NavItem to="/delivery" icon={Truck} label="Delivery" />
          </>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="pt-4 border-t border-white/10 space-y-2 mt-auto pb-[env(safe-area-inset-bottom)]">
        <NavItem to="/profile" icon={User} label="Profile" />

        {/* User Card */}
        <div className="mx-1 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-md flex-shrink-0">
            {profile?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.username}</p>
            <p className="text-xs text-indigo-300 font-medium capitalize">{profile?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all font-semibold text-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <LogOut size={16} />
          </div>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#e0e5ec] flex overflow-hidden">

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 pt-[calc(env(safe-area-inset-top)+8px)] landscape:py-1.5"
        style={{
          background: 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 landscape:w-7 landscape:h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center p-1.5 landscape:p-1">
            <Logo showText={false} className="filter brightness-0 invert" />
          </div>
          <span className="font-black text-white tracking-wider text-sm landscape:text-xs">MD LOGISTICS</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 landscape:p-1.5 text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
        >
          <Menu size={20} className="landscape:w-4 landscape:h-4" />
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={clsx(
          "fixed lg:sticky top-0 left-0 h-screen w-64 z-[100] flex flex-col p-4 pt-[env(safe-area-inset-top)]",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #1a1f3a 100%)',
          borderRight: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-[calc(52px+env(safe-area-inset-top))] landscape:pt-[calc(44px+env(safe-area-inset-top))] lg:pt-0 relative overflow-y-auto h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8 min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

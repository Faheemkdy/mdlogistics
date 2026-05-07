import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Package, Truck, User, LogOut, AlertCircle, Clock, Users, Zap, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { clsx } from 'clsx';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export const UserDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalShipments: 0,
    activeDrivers: 0,
    pendingToday: 0,
    inTransit: 0,
    recentShipments: [] as any[],
    weeklyData: [] as any[]
  });

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');

      // 1. Fetch Total Shipments (Total Dispatches)
      const { count: totalShipments } = await supabase
        .from('dispatches')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Active Drivers (Profiles with role 'user')
      const { count: activeDrivers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      // 3. Fetch Pending Today (Dispatches for today)
      const { count: pendingToday } = await supabase
        .from('dispatches')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // 4. Fetch In Transit (Sum of dispatches - Sum of deliveries) - Simplified for dashboard
      // For now, let's just get the count of deliveries today
      const { count: inTransit } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // 5. Fetch Recent Shipments (Latest Deliveries)
      const { data: recentDeliveries } = await supabase
        .from('deliveries')
        .select('id, item_number, shop_id, date, shops(name, location)')
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedRecent = (recentDeliveries || []).map((d: any) => ({
        id: `#MDL-${d.id.substring(0, 4).toUpperCase()}`,
        location: d.shops?.name || 'Unknown',
        status: 'Delivered',
        color: 'bg-emerald-500'
      }));

      // 6. Fetch Weekly Data
      const { data: weeklyDeliveries } = await supabase
        .from('deliveries')
        .select('date')
        .gte('date', sevenDaysAgo)
        .lte('date', today);

      const days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });

      const weeklyFormatted = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = (weeklyDeliveries || []).filter(d => d.date === dayStr).length;
        return {
          day: format(day, 'EEE'),
          value: count,
          highlight: dayStr === today
        };
      });

      setStatsData({
        totalShipments: totalShipments || 0,
        activeDrivers: activeDrivers || 0,
        pendingToday: pendingToday || 0,
        inTransit: inTransit || 0,
        recentShipments: formattedRecent,
        weeklyData: weeklyFormatted
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Shipments', value: statsData.totalShipments.toLocaleString(), trend: 'Overall', icon: Package, color: 'text-blue-600', trendUp: null },
    { label: "Today's Pickups", value: statsData.pendingToday.toString(), trend: 'Live', icon: Clock, color: 'text-teal-600', trendUp: true },
    { label: "Today's Deliveries", value: statsData.inTransit.toString(), trend: 'Live', icon: Truck, color: 'text-indigo-600', trendUp: true },
    { label: 'Active Drivers', value: statsData.activeDrivers.toString(), trend: 'Stable', icon: Users, color: 'text-amber-600', trendUp: null },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Loading MD-Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-teal-100/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Top Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
              MD
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                MD <span className="text-teal-600">Logistics</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Now: {profile?.username}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2 text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Welcome back</p>
              <p className="text-sm font-black text-slate-800">{profile?.username}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black border-2 border-white shadow-sm overflow-hidden">
               {profile?.username?.charAt(0).toUpperCase()}
            </div>
            <button 
              onClick={() => navigate('/profile')}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              Profile
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-md shadow-slate-900/10"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Hero Banner Section */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6"
          >
            <Zap size={14} className="fill-blue-600" />
            Operations Dashboard
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 mb-6"
          >
            MD <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Logistics</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 font-medium text-lg max-w-2xl mx-auto"
          >
            Manage your courier operations with precision and speed.
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[2rem] shadow-premium"
            >
              <div className="flex flex-col items-center text-center">
                <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{stat.label}</p>
                {stat.trend && (
                  <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black",
                    stat.trendUp === true ? "bg-emerald-50 text-emerald-600" : 
                    stat.trendUp === false ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
                  )}>
                    {stat.trend}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* New Pickup Card */}
          <motion.div
            whileHover={{ y: -8 }}
            onClick={() => navigate('/pickup')}
            className="group cursor-pointer bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[3rem] shadow-premium hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Package size={160} strokeWidth={0.5} />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-8 transform group-hover:rotate-6 transition-transform">
                <Package size={40} />
              </div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Inventory Management</p>
              <h3 className="text-3xl font-black text-slate-800 mb-4">New Pickup</h3>
              <p className="text-slate-400 font-medium text-sm max-w-xs mb-8">
                Schedule package collections from sender locations across your network.
              </p>
              
              <div className="flex items-center justify-between w-full mt-4">
                <div className="text-left">
                  <p className="text-2xl font-black text-slate-800">{statsData.pendingToday}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Today</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* New Delivery Card */}
          <motion.div
            whileHover={{ y: -8 }}
            onClick={() => navigate('/delivery')}
            className="group cursor-pointer bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[3rem] shadow-premium hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-500 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Truck size={160} strokeWidth={0.5} />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-teal-500/20 mb-8 transform group-hover:-rotate-6 transition-transform">
                <Truck size={40} />
              </div>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-2">Client Fulfillment</p>
              <h3 className="text-3xl font-black text-slate-800 mb-4">New Delivery</h3>
              <p className="text-slate-400 font-medium text-sm max-w-xs mb-8">
                Dispatch and track outbound deliveries to their final destinations.
              </p>
              
              <div className="flex items-center justify-between w-full mt-4">
                <div className="text-left">
                  <p className="text-2xl font-black text-slate-800">{statsData.inTransit}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Transit</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-all">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Data Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Shipments */}
          <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[3rem] shadow-premium">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800">Recent Shipments</h3>
              <button onClick={() => navigate('/today-activity')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            
            <div className="space-y-6">
              {statsData.recentShipments.length > 0 ? statsData.recentShipments.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm", item.color)}>
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{item.id}</p>
                      <p className="text-[10px] font-medium text-slate-400">→ {item.location}</p>
                    </div>
                  </div>
                  <div className={clsx(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                    item.status === 'Delivered' ? "bg-emerald-100 text-emerald-700" :
                    item.status === 'In Transit' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {item.status}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm font-medium">No recent shipments found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Deliveries Chart */}
          <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[3rem] shadow-premium">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-slate-800">Weekly Deliveries</h3>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">This Week</div>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">
                  {statsData.weeklyData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Updated Live</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Last 7 Days</p>
            </div>
            
            <div className="flex items-end justify-between gap-2 h-40 pt-4">
              {statsData.weeklyData.map((data, idx) => {
                const maxVal = Math.max(...statsData.weeklyData.map(d => d.value), 1);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.value / maxVal) * 100}%` }}
                      transition={{ delay: 0.1 * idx, duration: 1, ease: "easeOut" }}
                      className={clsx(
                        "w-full rounded-t-lg transition-all duration-500",
                        data.highlight ? "bg-gradient-to-t from-teal-400 to-teal-300" : "bg-slate-100"
                      )}
                    />
                    <span className={clsx(
                      "text-[9px] font-bold uppercase tracking-tighter",
                      data.highlight ? "text-teal-600" : "text-slate-400"
                    )}>
                      {data.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-slate-400">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 border border-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
             <CheckCircle2 size={12} className="text-emerald-500" />
             MD Logistics System Status: Operational
           </div>
        </footer>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
      >
        <div className="text-center space-y-6 p-4">
          <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto text-red-500 shadow-inner">
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
              className="flex-1 py-4 font-black rounded-2xl"
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSignOut}
              className="flex-1 py-4 font-black bg-red-500 text-white shadow-lg shadow-red-500/30 rounded-2xl"
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

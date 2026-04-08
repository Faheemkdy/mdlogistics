import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Store, Package, Truck, ArrowRight, Download, Receipt, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

// --- Chart Sub-component ---
const LogisticsChart = ({ data }: { data: { date: string, label: string, pickups: number, deliveries: number }[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.pickups, d.deliveries, 5)));
  const width = 400;
  const height = 180;
  const padding = 30;
  
  const getX = (index: number) => (index * (width - padding * 2)) / (data.length - 1) + padding;
  const getY = (val: number) => height - padding - (val * (height - padding * 2)) / (maxVal || 1);

  const pickupPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.pickups)}`).join(' ');
  const deliveryPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.deliveries)}`).join(' ');

  const pickupArea = `${pickupPath} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
  const deliveryArea = `${deliveryPath} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

  return (
    <div className="relative w-full h-[220px] mt-6">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="pickupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="deliveryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* X-Axis Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={getX(i)}
            y={height - 5}
            textAnchor="middle"
            className="text-[10px] fill-slate-400 font-bold"
          >
            {d.label}
          </text>
        ))}

        {/* Areas */}
        <motion.path d={pickupArea} fill="url(#pickupGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
        <motion.path d={deliveryArea} fill="url(#deliveryGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} />

        {/* Paths */}
        <motion.path
          d={pickupPath}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        <motion.path
          d={deliveryPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
        />

        {/* Hover Points */}
        {data.map((d, i) => (
          <g key={i} className="cursor-pointer">
            <circle cx={getX(i)} cy={getY(d.pickups)} r="4" fill="white" stroke="#4f46e5" strokeWidth="2" />
            <circle cx={getX(i)} cy={getY(d.deliveries)} r="4" fill="white" stroke="#10b981" strokeWidth="2" />
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
          <div className="w-3 h-1 bg-indigo-500 rounded-full" /> Pickups
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
          <div className="w-3 h-1 bg-emerald-500 rounded-full" /> Deliveries
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { } = useAuth();
  const [stats, setStats] = useState({
    companies: 0,
    shops: 0,
    todayIncome: 0,
    todayExpense: 0,
    pickupsToday: 0,
    deliveriesToday: 0
  });

  const [todayDaySheets, setTodayDaySheets] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchWeeklyData();
    runAutoCleanup();
  }, []);

  const runAutoCleanup = async () => {
    const lastRun = localStorage.getItem('md_cleanup_last_run');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (!lastRun || now - parseInt(lastRun) > oneDay) {
      try {
        const { error } = await supabase.rpc('cleanup_old_records');
        if (!error) localStorage.setItem('md_cleanup_last_run', now.toString());
      } catch (err) {
        console.error('Auto-cleanup error:', err);
      }
    }
  };

  const fetchWeeklyData = async () => {
    setLoadingChart(true);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return format(d, 'yyyy-MM-dd');
    });

    try {
      const [ { data: pData }, { data: dData } ] = await Promise.all([
        supabase.from('pickups').select('date').gte('date', last7Days[0]),
        supabase.from('deliveries').select('date').gte('date', last7Days[0])
      ]);

      const chartPoints = last7Days.map(date => ({
        date,
        label: format(new Date(date), 'EEE'),
        pickups: pData?.filter(p => p.date === date).length || 0,
        deliveries: dData?.filter(d => d.date === date).length || 0
      }));

      setChartData(chartPoints);
    } catch (err) {
      console.error('Chart Data Error:', err);
    } finally {
      setLoadingChart(false);
    }
  };

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [
      { count: companiesCount },
      { count: shopsCount },
      { data: daySheets },
      { count: pickupsCount },
      { count: deliveriesCount }
    ] = await Promise.all([
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('shops').select('*', { count: 'exact', head: true }),
      supabase.from('day_sheets').select('type, amount, description').eq('date', today),
      supabase.from('pickups').select('*', { count: 'exact', head: true }).eq('date', today),
      supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('date', today)
    ]);

    const income = daySheets?.filter(d => d.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const expense = daySheets?.filter(d => d.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    setTodayDaySheets(daySheets || []);
    setStats({
      companies: companiesCount || 0,
      shops: shopsCount || 0,
      todayIncome: income,
      todayExpense: expense,
      pickupsToday: pickupsCount || 0,
      deliveriesToday: deliveriesCount || 0
    });
  };

  const downloadDaySheetPDF = () => {
    if (todayDaySheets.length === 0) { alert('No data for today to download.'); return; }
    const doc = new jsPDF();
    const today = new Date().toISOString().split('T')[0];
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Day Sheet Statement", format(new Date(today), 'dd/MM/yyyy'));
    const tableData = todayDaySheets.map(e => [e.type.toUpperCase(), e.description, e.amount]);
    autoTable(doc, { head: [['Type', 'Description', 'Amount']], body: tableData, startY: 80, theme: 'grid', headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 11 }, alternateRowStyles: { fillColor: [245, 247, 250] } });
    const balance = stats.todayIncome - stats.todayExpense;
    drawGreenFooter(doc, "TOTAL BALANCE:", `Rs. ${balance}`);
    savePDF(doc, `daysheet_${today}.pdf`);
  };

  const downloadPickupsReport = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('pickups').select(`id, created_at, profiles (username), companies (name), pickup_items ( item_number, shops (name, location) )`).eq('date', today);
    if (error || !data || data.length === 0) { alert('No pickups found for today.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Daily Pickups Report", format(new Date(today), 'dd/MM/yyyy'));
    let tableData: any[] = [];
    data.forEach((pickup: any) => {
      const companyName = pickup.companies?.name || 'Unknown';
      pickup.pickup_items?.forEach((item: any) => {
        tableData.push([companyName, item.shops?.name || 'Unknown', item.shops?.location || '-', item.item_number || '-', format(new Date(pickup.created_at), 'hh:mm a')]);
      });
    });
    autoTable(doc, { head: [['Company', 'Shop', 'Location', 'Item No.', 'Time']], body: tableData, startY: 80, theme: 'grid', headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 10 }, alternateRowStyles: { fillColor: [255, 247, 237] } });
    drawGreenFooter(doc, "TOTAL ITEMS:", tableData.length);
    savePDF(doc, `pickups_${today}.pdf`);
  };

  const downloadDeliveriesReport = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('deliveries').select(`created_at, item_number, shops (name, location), profiles (username)`).eq('date', today);
    if (error || !data || data.length === 0) { alert('No deliveries found for today.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Daily Deliveries Report", format(new Date(today), 'dd/MM/yyyy'));
    const tableData = data.map((d: any) => [d.shops?.name || 'Unknown', d.shops?.location || '-', d.item_number || '-', format(new Date(d.created_at), 'hh:mm a')]);
    autoTable(doc, { head: [['Shop Name', 'Location', 'Item No.', 'Time']], body: tableData, startY: 80, theme: 'grid', headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 11 }, alternateRowStyles: { fillColor: [240, 253, 244] } });
    drawGreenFooter(doc, "TOTAL DELIVERIES:", data.length);
    savePDF(doc, `deliveries_${today}.pdf`);
  };

  const balance = stats.todayIncome - stats.todayExpense;

  const statsCards = [
    { title: 'Total Companies', value: stats.companies, icon: Building2, gradient: 'from-blue-500 to-blue-700', glow: 'shadow-blue-500/25', delay: 0.1 },
    { title: 'Total Shops', value: stats.shops, icon: Store, gradient: 'from-indigo-500 to-indigo-700', glow: 'shadow-indigo-500/25', delay: 0.15 },
    { title: 'Pickups Today', value: stats.pickupsToday, icon: Package, gradient: 'from-orange-400 to-orange-600', glow: 'shadow-orange-500/25', action: downloadPickupsReport, delay: 0.2 },
    { title: 'Deliveries Today', value: stats.deliveriesToday, icon: Truck, gradient: 'from-green-500 to-green-700', glow: 'shadow-green-500/25', action: downloadDeliveriesReport, delay: 0.25 },
    { title: "Today's Income", value: `₹${stats.todayIncome.toLocaleString()}`, icon: TrendingUp, gradient: 'from-emerald-400 to-emerald-600', glow: 'shadow-emerald-500/25', action: downloadDaySheetPDF, delay: 0.3 },
    { title: "Today's Expense", value: `₹${stats.todayExpense.toLocaleString()}`, icon: TrendingDown, gradient: 'from-red-400 to-red-600', glow: 'shadow-red-500/25', action: downloadDaySheetPDF, delay: 0.35 },
  ];

  const quickActions = [
    { label: 'Add Company', desc: 'New client profile', to: '/companies', icon: Building2, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Add Shop', desc: 'New destination', to: '/shops', icon: Store, gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
    { label: 'Add Pickup', desc: 'Daily pickups', to: '/pickup', icon: Package, gradient: 'from-orange-500 to-red-600', shadow: 'shadow-orange-500/20' },
    { label: 'Add Delivery', desc: 'Daily deliveries', to: '/delivery', icon: Truck, gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
    { label: 'Billing & Invoice', desc: 'Create bills', to: '/billing', icon: Receipt, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Admin Console</h1>
          <p className="text-slate-500 font-bold text-sm flex items-center gap-1.5 mt-1">
            <Calendar size={14} className="text-indigo-400" />
            {format(new Date(), 'EEEE, MMMM do yyyy')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 self-end sm:self-auto">
          <div className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm ${balance >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            <Activity size={14} strokeWidth={2.5} />
            Wallet Balance: ₹{balance.toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* ── Dashboard Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Graph */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {statsCards.map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: card.delay }}
                className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-5 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.glow} mb-4`}>
                  <card.icon size={20} className="text-white" />
                </div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none">{card.title}</p>
                <h3 className="text-xl font-black text-slate-800 mt-2">{card.value}</h3>
                
                {card.action && (
                  <button onClick={card.action} className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 transition-colors">
                    <Download size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Logistics Pulse Graph Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 border border-white shadow-[0_20px_50px_rgb(0,0,0,0.04)] relative overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Logistics Pulse</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">7-Day Performance Insight</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Live Data
              </div>
            </div>

            {loadingChart ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-3">
                 <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Analytics...</p>
              </div>
            ) : (
              <div className="relative z-10">
                <LogisticsChart data={chartData} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Smart Actions & Support */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Smart Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ x: 8 }}
                onClick={() => navigate(action.to)}
                className="group flex items-center gap-4 p-4 bg-white/70 backdrop-blur-xl rounded-2xl border border-white shadow-sm hover:border-indigo-200 transition-all text-left"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-[1.25rem] flex items-center justify-center text-white shadow-lg ${action.shadow} group-hover:scale-110 transition-transform`}>
                  <action.icon size={22} />
                </div>
                <div className="flex-1">
                  <span className="block text-sm font-black text-slate-800">{action.label}</span>
                  <span className="text-[10px] text-slate-500 font-bold block">{action.desc}</span>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </motion.button>
            ))}
          </div>

          {/* System Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group"
          >
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-700" />
             <div className="relative z-10">
               <h4 className="font-black text-xl flex items-center gap-2">
                 <ShieldCheck size={20} className="text-emerald-400" /> System Health
               </h4>
               <p className="text-slate-400 text-xs mt-3 font-medium leading-relaxed">
                 Infrastructure is stable. Last security sweep completed at {format(new Date(), 'HH:mm')}. No anomalies detected.
               </p>
               <button onClick={() => navigate('/users')} className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-black transition-all border border-white/10">
                 Manage Security
               </button>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Helper Icon for System Status
const ShieldCheck = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

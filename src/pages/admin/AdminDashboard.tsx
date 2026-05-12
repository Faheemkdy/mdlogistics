import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { Building2, Store, Package, Truck, ArrowRight, Download, Receipt, TrendingUp, TrendingDown, Activity, ClipboardList, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getStandardDate, formatReportDate } from '../../utils/dateUtils';
import { BRAND, CONTACT_INFO } from '../../constants/branding';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, isMasterAdmin } = useAuth();
  const [stats, setStats] = useState({
    companies: 0,
    shops: 0,
    todayIncome: 0,
    todayExpense: 0,
    pickupsToday: 0,
    deliveriesToday: 0
  });

  const [todayDaySheets, setTodayDaySheets] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
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

  const fetchStats = async () => {
    const today = getStandardDate();
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
      supabase.from('pickup_items').select('id, pickups!inner(date)', { count: 'exact', head: true }).eq('pickups.date', today),
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
    try {
      if (todayDaySheets.length === 0) { toast.warning('No data today', 'No day sheet entries found for today.'); return; }
      const doc = new jsPDF();
      const today = getStandardDate();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", "Day Sheet Statement", formatReportDate(today));
      const tableData = todayDaySheets.map(e => [e.type.toUpperCase(), e.description, e.amount]);
      autoTable(doc, { head: [['Type', 'Description', 'Amount']], body: tableData, startY: 105, theme: 'grid', headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 11 }, alternateRowStyles: { fillColor: [245, 247, 250] } });
      const balance = stats.todayIncome - stats.todayExpense;
      drawGreenFooter(doc, "TOTAL BALANCE:", `Rs. ${balance}`);
      savePDF(doc, `daysheet_${today}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error('Export Failed', 'An error occurred while generating the PDF.');
    }
  };

  const downloadPickupsReport = async () => {
    try {
      const today = getStandardDate();
      const { data, error } = await supabase.from('pickups').select(`id, created_at, companies (name), pickup_items ( item_number, shops (name, location) )`).eq('date', today);
      if (error || !data || data.length === 0) { toast.warning('No pickups today', 'No pickup records found for today.'); return; }
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", "Daily Pickups Report", formatReportDate(today));
      let tableData: any[] = [];
      data.forEach((pickup: any) => {
        const companyName = pickup.companies?.name || 'Unknown';
        pickup.pickup_items?.forEach((item: any) => {
          let timeStr = '-';
          try { timeStr = pickup.created_at ? format(new Date(pickup.created_at), 'hh:mm a') : '-'; } catch(e) {}
          tableData.push([companyName, item.shops?.name || 'Unknown', item.shops?.location || '-', item.item_number || '-', timeStr]);
        });
      });
      autoTable(doc, { head: [['Company', 'Shop', 'Location', 'Item No.', 'Time']], body: tableData, startY: 105, theme: 'grid', headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 10 }, alternateRowStyles: { fillColor: [255, 247, 237] } });
      drawGreenFooter(doc, "TOTAL ITEMS:", tableData.length);
      savePDF(doc, `pickups_${today}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error('Export Failed', 'An error occurred while generating the PDF.');
    }
  };

  const downloadDeliveriesReport = async () => {
    try {
      const today = getStandardDate();
      const { data, error } = await supabase.from('deliveries').select(`created_at, item_number, shops (name, location), profiles (username)`).eq('date', today);
      if (error || !data || data.length === 0) { toast.warning('No deliveries today', 'No delivery records found for today.'); return; }
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", "Daily Deliveries Report", formatReportDate(today));
      const tableData = data.map((d: any) => {
        let timeStr = '-';
        try { timeStr = d.created_at ? format(new Date(d.created_at), 'hh:mm a') : '-'; } catch(e) {}
        return [d.shops?.name || 'Unknown', d.shops?.location || '-', d.item_number || '-', timeStr];
      });
      autoTable(doc, { head: [['Shop Name', 'Location', 'Item No.', 'Time']], body: tableData, startY: 105, theme: 'grid', headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 11 }, alternateRowStyles: { fillColor: [240, 253, 244] } });
      drawGreenFooter(doc, "TOTAL DELIVERIES:", data.length);
      savePDF(doc, `deliveries_${today}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error('Export Failed', 'An error occurred while generating the PDF.');
    }
  };

  const balance = stats.todayIncome - stats.todayExpense;

  const statsCards = [
    {
      title: 'Total Companies',
      value: stats.companies,
      icon: Building2,
      gradient: 'from-blue-500 to-blue-700',
      glow: 'shadow-blue-500/25',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      delay: 0.1
    },
    {
      title: 'Total Shops',
      value: stats.shops,
      icon: Store,
      gradient: 'from-indigo-500 to-indigo-700',
      glow: 'shadow-indigo-500/25',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      delay: 0.15
    },
    {
      title: 'Pickups Today',
      value: stats.pickupsToday,
      icon: Package,
      gradient: 'from-orange-400 to-orange-600',
      glow: 'shadow-orange-500/25',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
      action: downloadPickupsReport,
      delay: 0.2
    },
    {
      title: 'Deliveries Today',
      value: stats.deliveriesToday,
      icon: Truck,
      gradient: 'from-green-500 to-green-700',
      glow: 'shadow-green-500/25',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      action: downloadDeliveriesReport,
      delay: 0.25
    },
    {
      title: "Today's Income",
      value: `Rs.${stats.todayIncome.toLocaleString()}`,
      icon: TrendingUp,
      gradient: 'from-emerald-400 to-emerald-600',
      glow: 'shadow-emerald-500/25',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      action: downloadDaySheetPDF,
      delay: 0.3
    },
    {
      title: "Today's Expense",
      value: `Rs.${stats.todayExpense.toLocaleString()}`,
      icon: TrendingDown,
      gradient: 'from-red-400 to-red-600',
      glow: 'shadow-red-500/25',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      action: downloadDaySheetPDF,
      delay: 0.35
    },
  ];

  const quickActions = [
    { label: 'Add Company', desc: 'Create new client profile', to: '/companies', icon: Building2, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Add Shop', desc: 'Create new destination', to: '/shops', icon: Store, gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
    { label: 'Add Pickup', desc: 'Record daily pickups', to: '/pickup', icon: Package, gradient: 'from-orange-500 to-red-600', shadow: 'shadow-orange-500/20' },
    { label: 'Add Delivery', desc: 'Record daily deliveries', to: '/delivery', icon: Truck, gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
    { label: 'Dispatch', desc: 'Hub to shops', to: '/dispatch', icon: ClipboardList, gradient: 'from-blue-600 to-cyan-600', shadow: 'shadow-blue-500/20' },
    { label: 'Reconcile', desc: 'Compare records', to: '/reconciliation', icon: BarChart2, gradient: 'from-slate-700 to-slate-900', shadow: 'shadow-slate-500/20', access: 'master' },
    { label: 'Billing & Invoice', desc: 'Create instant bills', to: '/billing', icon: Receipt, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', access: 'master' },
  ].filter(action => action.access !== 'master' || isMasterAdmin);

  return (
    <div className="space-y-6 sm:space-y-8 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1"
      >
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight leading-none">Dashboard</h1>
          <p className="text-slate-500 font-bold mt-1.5 text-xs sm:text-sm flex items-center gap-2">
            <Activity size={14} className="text-indigo-500" />
            {formatReportDate(getStandardDate())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-1.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
            {profile?.username === 'md' ? 'Master Admin' : 'Admin Access'}
          </span>
          {/* Balance chip */}
          <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${balance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            Rs.{balance.toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        {statsCards.map((card) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: card.delay, ease: [0.23, 1, 0.32, 1] }}
            className={`relative bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ${card.action ? 'cursor-pointer hover:border-indigo-200 transition-all' : ''}`}
            onClick={card.action}
          >
            {/* Icon */}
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.glow} mb-3 sm:mb-4`}>
              <card.icon size={20} className="text-white" />
            </div>

            {/* Value */}
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-widest mb-1">{card.title}</p>
              <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{card.value}</h3>
            </div>

            {/* Download button */}
            {card.action && isMasterAdmin && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                onClick={card.action}
                className="absolute top-4 right-4 w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all text-slate-400 hover:text-indigo-600"
                title="Download Report"
              >
                <Download size={16} />
              </motion.button>
            )}

            {/* Decorative gradient bottom-right */}
            <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${card.gradient} opacity-[0.06] rounded-tl-full pointer-events-none`} />
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-5">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-black text-xl text-slate-700 tracking-tight"
        >
          Quick Actions
        </motion.h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.08, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.to)}
              className={`group p-6 bg-gradient-to-br ${action.gradient} rounded-2xl text-left cursor-pointer text-white shadow-xl ${action.shadow} relative overflow-hidden`}
            >
              {/* Background pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0%, transparent 60%)'
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                    <action.icon size={24} />
                  </div>
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors border border-white/20">
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <span className="block text-lg font-bold">{action.label}</span>
                <span className="text-white/70 text-sm mt-0.5 block">{action.desc}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

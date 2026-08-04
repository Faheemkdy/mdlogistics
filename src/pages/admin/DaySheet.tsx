import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
  Download, Trash2, Edit2, Check, X, TrendingUp, TrendingDown, 
  FileText, Calendar, Wallet, ArrowUpRight, ArrowDownRight, 
  ChevronRight, Package, Truck, Search 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePDF } from '../../utils/pdfGenerator';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { getStandardDate, getDateRange } from '../../utils/dateUtils';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter } from '../../utils/pdfGenerator';
import { BRAND } from '../../constants/branding';

export const DaySheet = () => {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getStandardDate());
  const [filterDate, setFilterDate] = useState(getStandardDate());
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { 
    fetchEntries(); 
    setCurrentPage(1);
  }, [filterDate, viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchEntries = async () => {
    try {
      let query = supabase
        .from('day_sheets')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false });
        
      if (viewMode === 'monthly') {
        const [year, month] = filterDate.split('-');
        const start = `${year}-${month}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const end = `${year}-${month}-${lastDay}`;
        query = query.gte('date', start).lte('date', end);
      } else {
        query = query.eq('date', filterDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      toast.error('Failed to load entries', err.message);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    try {
      const { error } = await supabase.from('day_sheets').insert([{ 
        type, 
        amount: parseFloat(amount), 
        description: description || 'No description', 
        date,
        created_by: user?.id ?? null
      }]);
      if (error) throw error;
      toast.success('Entry saved!');
      setAmount(''); 
      setDescription(''); 
      fetchEntries();
    } catch (err: any) {
      toast.error('Failed to add entry', err.message);
    }
  };

  const startEdit = (entry: any) => { 
    setEditingId(entry.id); 
    setEditAmount(entry.amount != null ? entry.amount.toString() : ''); 
    setEditDescription(entry.description || ''); 
    setEditType(entry.type); 
  };
  
  const cancelEdit = () => { 
    setEditingId(null); 
    setEditAmount(''); 
    setEditDescription(''); 
  };

  const saveEdit = async () => {
    if (!editAmount || !editingId) return;
    try {
      const { error } = await supabase.from('day_sheets').update({ 
        amount: parseFloat(editAmount), 
        description: editDescription || 'No description', 
        type: editType 
      }).eq('id', editingId);
      if (error) throw error;
      toast.success('Entry updated!');
      setEditingId(null); 
      fetchEntries();
    } catch (err: any) {
      toast.error('Update failed', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('day_sheets').delete().eq('id', id);
      if (error) throw error;
      toast.success('Entry deleted');
      fetchEntries();
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
  };

  const filteredEntries = entries.filter(e => 
    (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.amount != null && e.amount.toString().includes(searchQuery)) ||
    (e.type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalIncome = filteredEntries.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalExpense = filteredEntries.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const downloadPDF = () => {
    if (filteredEntries.length === 0) { 
      toast.warning('Nothing to download', 'No entries found for this date.'); 
      return; 
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", viewMode === 'monthly' ? "Monthly Financial Statement" : "Daily Financial Statement", viewMode === 'monthly' ? formatReportDate(filterDate, 'MMMM yyyy') : formatReportDate(filterDate));

    // Summary Cards in PDF
    const cardY = 70;
    const cardH = 22;
    const cardW = (pageWidth - 28 - 8) / 3;

    doc.setFillColor(209, 250, 229);
    doc.roundedRect(14, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(6, 95, 70);
    doc.text('TOTAL INCOME', 22, cardY + 7);
    doc.setFontSize(14); doc.text(`Rs. ${totalIncome.toFixed(2)}`, 22, cardY + 17);

    const card2X = 14 + cardW + 4;
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(card2X, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(8); doc.setTextColor(153, 27, 27);
    doc.text('TOTAL EXPENSE', card2X + 8, cardY + 7);
    doc.setFontSize(14); doc.text(`Rs. ${totalExpense.toFixed(2)}`, card2X + 8, cardY + 17);

    const card3X = 14 + (cardW + 4) * 2;
    const isProfit = balance >= 0;
    doc.setFillColor(isProfit ? 219 : 254, isProfit ? 234 : 243, isProfit ? 254 : 199);
    doc.roundedRect(card3X, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(8); doc.setTextColor(isProfit ? 55 : 120, isProfit ? 48 : 53, isProfit ? 163 : 15);
    doc.text('NET BALANCE', card3X + 8, cardY + 7);
    doc.setFontSize(14); doc.text(`Rs. ${Math.abs(balance).toFixed(2)}${isProfit ? '' : ' (-)'}`, card3X + 8, cardY + 17);

    autoTable(doc, {
      startY: 106,
      head: [['#', 'Type', 'Description', 'Amount']],
      body: filteredEntries.map((e, i) => [i + 1, e.type.toUpperCase(), e.description || 'No description', `Rs. ${Number(e.amount).toFixed(2)}`]),
      theme: 'plain',
      headStyles: { fillColor: BRAND.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4, lineColor: BRAND.border, lineWidth: 0.3 },
    });

    drawGreenFooter(doc, 'TOTAL BALANCE', `Rs. ${balance.toFixed(2)}${balance >= 0 ? '' : ' (-)'}`);
    savePDF(doc, `daysheet_${filterDate}.pdf`);
  };

  const downloadRangePDF = async (days: number) => {
    const { start, end } = getDateRange(days, filterDate);
    try {
      const { data, error } = await supabase.from('day_sheets').select('*').gte('date', start).lte('date', end).order('date', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { 
        toast.error("No data", "No entries found in this range."); 
        return; 
      }
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", `${days} Days Financial Statement`, `${formatReportDate(start, 'dd MMM')} to ${formatReportDate(end, 'dd MMM yyyy')}`);
      const rangeIncome = data.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
      const rangeExpense = data.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);
      autoTable(doc, {
        startY: 100,
        head: [['#', 'Date', 'Type', 'Description', 'Amount']],
        body: data.map((e, i) => [i + 1, formatReportDate(e.date, 'dd/MM/yy'), e.type.toUpperCase(), e.description || 'No description', `Rs. ${Number(e.amount).toFixed(2)}`]),
      });
      drawGreenFooter(doc, 'NET BALANCE', `Rs. ${(rangeIncome - rangeExpense).toFixed(2)}`);
      savePDF(doc, `DaySheet_${days}days_${end}.pdf`);
    } catch (err: any) {
      toast.error("Report failed", err.message);
    }
  };

  const downloadMonthlyPDF = async (monthStr: string) => {
    if (!monthStr) return;
    toast.info('Generating...', `Fetching Day Sheet report for ${monthStr}`);
    
    const [year, month] = monthStr.split('-');
    const start = `${monthStr}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const end = `${monthStr}-${lastDay}`;
    
    try {
      const { data, error } = await supabase.from('day_sheets').select('*').gte('date', start).lte('date', end).order('date', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { 
        toast.error("No data", "No entries found in this month."); 
        return; 
      }
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", `Monthly Financial Statement`, formatReportDate(start, 'MMMM yyyy'));
      const rangeIncome = data.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
      const rangeExpense = data.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);
      autoTable(doc, {
        startY: 100,
        head: [['#', 'Date', 'Type', 'Description', 'Amount']],
        body: data.map((e, i) => [i + 1, formatReportDate(e.date, 'dd/MM/yy'), e.type.toUpperCase(), e.description || 'No description', `Rs. ${Number(e.amount).toFixed(2)}`]),
      });
      drawGreenFooter(doc, 'NET BALANCE', `Rs. ${(rangeIncome - rangeExpense).toFixed(2)}`);
      savePDF(doc, `DaySheet_${monthStr}.pdf`);
    } catch (err: any) {
      toast.error("Report failed", err.message);
    }
  };

  return (
    <div className="relative space-y-8 pb-32 lg:pb-12 min-h-screen">
      {/* ── Background Decorations (Desktop Only) ── */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
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

      {/* ── Header Section ── */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Day Sheet</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Financial Records</p>
            </div>
          </div>
        </motion.div>

        {/* Date Filter & Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="flex flex-wrap items-center gap-3 p-2 bg-glass rounded-[2rem] shadow-glass border border-white/40"
        >
          <div className="flex items-center gap-1 bg-white/30 p-1 rounded-2xl">
            <button
              onClick={() => { setViewMode('monthly'); setFilterDate(getStandardDate()); }}
              className={clsx("px-4 py-1.5 rounded-xl text-xs font-black transition-all", viewMode === 'monthly' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Month
            </button>
            <button
              onClick={() => { setViewMode('daily'); setFilterDate(getStandardDate()); }}
              className={clsx("px-4 py-1.5 rounded-xl text-xs font-black transition-all", viewMode === 'daily' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Day
            </button>
          </div>
          <div className="relative flex-1 lg:w-48 min-w-[160px]">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input 
              type={viewMode === 'monthly' ? 'month' : 'date'} 
              value={viewMode === 'monthly' ? filterDate.substring(0, 7) : filterDate} 
              onChange={(e) => {
                if (viewMode === 'monthly') {
                  setFilterDate(`${e.target.value}-01`);
                } else {
                  setFilterDate(e.target.value);
                }
              }}
              className="w-full pl-12 pr-4 py-2.5 bg-white/50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm shadow-inner"
            />
          </div>
          {/* Download options - Only for 'md' and only on desktop */}
          {profile?.username === 'md' && (
            <div className="hidden lg:flex items-center gap-1.5 px-2">
              <Button variant="secondary" onClick={() => downloadRangePDF(7)} className="!px-4 !py-2 text-[10px] h-10 border-none bg-white/60 hover:bg-white shadow-sm font-black text-slate-600 whitespace-nowrap">7D</Button>
              <Button variant="secondary" onClick={() => downloadRangePDF(15)} className="!px-4 !py-2 text-[10px] h-10 border-none bg-white/60 hover:bg-white shadow-sm font-black text-slate-600 whitespace-nowrap">15D</Button>
              <div className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-white/60 hover:bg-white shadow-sm transition-colors border-none">
                <span className="text-[10px] font-black text-slate-600 uppercase">1M:</span>
                <input 
                  type="month"
                  className="text-[10px] font-black text-slate-600 outline-none cursor-pointer bg-transparent"
                  onChange={e => {
                    if (e.target.value) {
                      downloadMonthlyPDF(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <Button variant="danger" onClick={downloadPDF} className="h-10 w-10 !p-0 flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                <Download size={18} />
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Stats Row ── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-emerald-500 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <ArrowUpRight size={80} />
          </div>
          <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mb-1">{viewMode === 'monthly' ? 'Monthly Income' : 'Daily Income'}</p>
          <h3 className="text-4xl font-black">₹{totalIncome.toLocaleString()}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 bg-rose-500 rounded-[2.5rem] text-white shadow-xl shadow-rose-500/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <ArrowDownRight size={80} />
          </div>
          <p className="text-rose-100 font-bold text-xs uppercase tracking-widest mb-1">{viewMode === 'monthly' ? 'Monthly Expense' : 'Daily Expense'}</p>
          <h3 className="text-4xl font-black">₹{totalExpense.toLocaleString()}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={clsx(
            "p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group",
            balance >= 0 ? "bg-indigo-600 shadow-indigo-500/20" : "bg-amber-500 shadow-amber-500/20"
          )}
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <Wallet size={80} />
          </div>
          <p className={clsx("font-bold text-xs uppercase tracking-widest mb-1", balance >= 0 ? "text-indigo-100" : "text-amber-500")}>Net Balance</p>
          <h3 className="text-4xl font-black">₹{balance.toLocaleString()}</h3>
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-col gap-8">
        {/* ── Entry Form ── */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[2.5rem] shadow-glass space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-white shadow-lg">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-800">Add Transaction</h3>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col xl:flex-row gap-5 items-end">
              <div className="flex p-1.5 bg-slate-200/50 rounded-2xl gap-2 shadow-inner w-full xl:w-64 flex-shrink-0">
                {(['income', 'expense'] as const).map(t => (
                  <button
                    key={t} type="button" onClick={() => setType(t)}
                    className={clsx(
                      "flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2",
                      type === t 
                        ? t === 'income' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                        : "text-slate-500 hover:bg-white/50"
                    )}
                  >
                    {t === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <Input type="number" label="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="!py-3 font-black text-xl !bg-white/60 !rounded-2xl" />
                <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" className="!py-3 !bg-white/60 !rounded-2xl" />
                <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="!py-3 !bg-white/60 !rounded-2xl" />
              </div>

              <Button type="submit" className="w-full xl:w-auto xl:px-8 py-4 rounded-[1.5rem] font-black text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 border-none">
                Save Record
              </Button>
            </form>
          </div>
        </motion.div>

        {/* ── Transaction List ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 mb-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Transaction History</h4>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-white/40 border border-white/60 rounded-full text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 transition-all"
                />
              </div>
              <span className="px-3 py-1 bg-white/40 border border-white/60 rounded-full text-[10px] font-bold text-slate-500 whitespace-nowrap">{filteredEntries.length} Entries</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-glass">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white/50 text-[11px] uppercase text-slate-500 font-bold border-b border-white/60">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">Type</th>
                  <th className="px-4 py-4">Description</th>
                  <th className="px-4 py-4 text-center">Date</th>
                  <th className="px-4 py-4 text-center">Added By</th>
                  <th className="px-4 py-4 text-right">Amount</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                <AnimatePresence mode="popLayout">
                  {filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((entry, index) => {
                    const isEditing = editingId === entry.id;
                    const currentType = isEditing ? editType : entry.type;
                    
                    return (
                      <motion.tr
                        key={entry.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={clsx(
                          "hover:bg-white/50 transition-colors group",
                          isEditing && "bg-white/70"
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <div className={clsx(
                            "w-8 h-8 mx-auto rounded-xl flex items-center justify-center shadow-sm",
                            currentType === 'income' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {currentType === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {isEditing ? (
                            <input 
                              value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full bg-white/80 border-none rounded-lg px-2 py-1 font-bold text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          ) : (
                            entry.description
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-center text-slate-500 whitespace-nowrap">
                          {format(new Date(entry.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-xs text-center text-slate-500">
                          {entry.profiles?.username || 'System'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input 
                              type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 bg-white/80 border-none rounded-lg px-2 py-1 font-black text-slate-800 text-sm text-right focus:ring-2 focus:ring-indigo-500/20 outline-none inline-block"
                            />
                          ) : (
                            <span className={clsx(
                              "font-black whitespace-nowrap",
                              entry.type === 'income' ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {entry.type === 'income' ? '+' : '-'}₹{Number(entry.amount || 0).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} className="p-2 rounded-lg bg-emerald-500 text-white hover:scale-105 transition-transform" title="Save"><Check size={14} /></button>
                                <button onClick={cancelEdit} className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:scale-105 transition-transform" title="Cancel"><X size={14} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(entry)} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Edit"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(entry.id)} className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors" title="Delete"><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {entries.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-sm">No entries found.</p>
              </div>
            )}
          </div>

          {filteredEntries.length > itemsPerPage && (
            <div className="flex justify-between items-center px-4 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/60 border border-white/60 rounded-2xl text-xs font-bold text-slate-600 disabled:opacity-50 transition-all hover:bg-white"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-500">
                Page {currentPage} of {Math.ceil(filteredEntries.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEntries.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredEntries.length / itemsPerPage)}
                className="px-4 py-2 bg-white/60 border border-white/60 rounded-2xl text-xs font-bold text-slate-600 disabled:opacity-50 transition-all hover:bg-white"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Mobile Static Bottom Bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-slate-200/50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
        <motion.div 
          initial={{ y: 50 }} 
          animate={{ y: 0 }}
          className="px-4 py-3 sm:py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-sm",
              balance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Net Balance</p>
              <h3 className={clsx("text-lg sm:text-xl font-black leading-none", balance >= 0 ? "text-emerald-700" : "text-rose-700")}>
                Rs.{balance.toLocaleString()}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden xs:block">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Entries</p>
              <p className="text-sm font-black leading-none text-slate-700">{entries.length}</p>
            </div>
            
            {profile?.username === 'md' && (
              <>
                <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRangeModal(true)}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100"
                >
                  <FileText size={18} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={downloadPDF}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20"
                >
                  <Download size={20} />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Range Report Modal - Mobile Friendly */}
      <Modal 
        isOpen={showRangeModal} 
        onClose={() => setShowRangeModal(false)}
        title="Download Range Report"
      >
        <div className="space-y-4">
          <p className="text-slate-500 font-medium text-sm text-center mb-6">Select a time period to generate a combined financial report.</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Last 7 Days', days: 7 },
              { label: 'Last 15 Days', days: 15 },
              { label: 'Last 1 Month', days: 30 }
            ].map((range) => (
              <button
                key={range.days}
                onClick={() => { downloadRangePDF(range.days); setShowRangeModal(false); }}
                className="w-full p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Calendar size={20} />
                  </div>
                  <span className="font-black text-slate-800">{range.label}</span>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setShowRangeModal(false)}
            className="w-full py-4 mt-4 font-bold border-none bg-slate-100 text-slate-500"
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

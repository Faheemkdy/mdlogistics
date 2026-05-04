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
  ChevronRight, Package, Truck 
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');

  useEffect(() => { 
    fetchEntries(); 
  }, [filterDate]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('day_sheets')
        .select('*, profiles(username)')
        .eq('date', filterDate)
        .order('created_at', { ascending: false });
      
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
    setEditAmount(entry.amount.toString()); 
    setEditDescription(entry.description); 
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

  const totalIncome = entries.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const downloadPDF = () => {
    if (entries.length === 0) { 
      toast.warning('Nothing to download', 'No entries found for this date.'); 
      return; 
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Daily Day Sheet Statement", filterDate);

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
      head: [['Type', 'Description', 'Amount']],
      body: entries.map(e => [e.type.toUpperCase(), e.description || 'No description', `Rs. ${Number(e.amount).toFixed(2)}`]),
      theme: 'plain',
      headStyles: { fillColor: BRAND.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4, lineColor: BRAND.border, lineWidth: 0.3 },
    });

    drawGreenFooter(doc, 'TOTAL BALANCE', `Rs. ${balance.toFixed(2)}${balance >= 0 ? '' : ' (-)'}`);
    savePDF(doc, `daysheet_${filterDate}.pdf`);
  };

  const downloadRangePDF = async (days: number) => {
    const { start, end } = getDateRange(days);
    try {
      const { data, error } = await supabase.from('day_sheets').select('*').gte('date', start).lte('date', end).order('date', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { 
        toast.error("No data", "No entries found in this range."); 
        return; 
      }
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", `${days} Days Financial Statement`, `${format(new Date(start), 'dd MMM')} to ${format(new Date(end), 'dd MMM yyyy')}`);
      const rangeIncome = data.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
      const rangeExpense = data.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);
      autoTable(doc, {
        startY: 100,
        head: [['Date', 'Type', 'Description', 'Amount']],
        body: data.map(e => [format(new Date(e.date), 'dd/MM/yy'), e.type.toUpperCase(), e.description || 'No description', `Rs. ${Number(e.amount).toFixed(2)}`]),
      });
      drawGreenFooter(doc, 'NET BALANCE', `Rs. ${(rangeIncome - rangeExpense).toFixed(2)}`);
      savePDF(doc, `DaySheet_${days}days_${end}.pdf`);
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
          <div className="relative flex-1 lg:w-48 min-w-[160px]">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white/50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm shadow-inner"
            />
          </div>
          {/* Download options - Only for 'md' and only on desktop */}
          {profile?.username === 'md' && (
            <div className="hidden lg:flex items-center gap-1.5 px-2">
              <Button variant="secondary" onClick={() => downloadRangePDF(7)} className="!px-4 !py-2 text-[10px] h-10 border-none bg-white/60 hover:bg-white shadow-sm font-black text-slate-600 whitespace-nowrap">7D</Button>
              <Button variant="secondary" onClick={() => downloadRangePDF(15)} className="!px-4 !py-2 text-[10px] h-10 border-none bg-white/60 hover:bg-white shadow-sm font-black text-slate-600 whitespace-nowrap">15D</Button>
              <Button variant="secondary" onClick={() => downloadRangePDF(30)} className="!px-4 !py-2 text-[10px] h-10 border-none bg-white/60 hover:bg-white shadow-sm font-black text-slate-600 whitespace-nowrap">1M</Button>
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
          <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mb-1">Daily Income</p>
          <h3 className="text-4xl font-black">₹{totalIncome.toLocaleString()}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 bg-rose-500 rounded-[2.5rem] text-white shadow-xl shadow-rose-500/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <ArrowDownRight size={80} />
          </div>
          <p className="text-rose-100 font-bold text-xs uppercase tracking-widest mb-1">Daily Expense</p>
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

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ── Entry Form (Sticky on Desktop) ── */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-4 lg:sticky lg:top-8"
        >
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[3rem] shadow-glass space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-white shadow-lg">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-800">Add Transaction</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div className="flex p-1.5 bg-slate-200/50 rounded-2xl gap-2 shadow-inner">
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

              <div className="space-y-4">
                <Input type="number" label="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="!py-4 font-black text-2xl !bg-white/60 !rounded-2xl" />
                <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" className="!py-4 !bg-white/60 !rounded-2xl" />
                <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="!py-4 !bg-white/60 !rounded-2xl" />
              </div>

              <Button type="submit" className="w-full py-5 rounded-[1.5rem] font-black text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 border-none mt-4">
                Save Record
              </Button>
            </form>
          </div>
        </motion.div>

        {/* ── Transaction List ── */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-8 space-y-4"
        >
          <div className="flex items-center justify-between px-4 mb-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Transaction History</h4>
            <span className="px-3 py-1 bg-white/40 border border-white/60 rounded-full text-[10px] font-bold text-slate-500">{entries.length} Entries</span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, index) => {
                const isEditing = editingId === entry.id;
                const currentType = isEditing ? editType : entry.type;
                
                return (
                  <motion.div
                    key={entry.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={clsx(
                      "relative group bg-white/40 backdrop-blur-xl border border-white/60 p-5 sm:p-6 rounded-[2.5rem] shadow-glass flex items-center gap-5 sm:gap-6",
                      isEditing && "ring-2 ring-indigo-500 ring-offset-2"
                    )}
                  >
                    <div className={clsx(
                      "w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                      currentType === 'income' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {currentType === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input 
                            value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full bg-white/60 border-none rounded-xl px-3 py-2 font-bold text-slate-800"
                          />
                          <input 
                            type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full bg-white/60 border-none rounded-xl px-3 py-2 font-black text-xl"
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="text-lg sm:text-xl font-black text-slate-800 truncate leading-tight mb-1">{entry.description}</h4>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">Recorded by {entry.profiles?.username || 'System'}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      {!isEditing && (
                        <div className={clsx(
                          "text-xl sm:text-2xl font-black whitespace-nowrap",
                          entry.type === 'income' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {entry.type === 'income' ? '+' : '-'}₹{Number(entry.amount || 0).toLocaleString()}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:scale-105 transition-transform"><Check size={18} /></button>
                            <button onClick={cancelEdit} className="p-3 bg-slate-200 text-slate-600 rounded-2xl shadow-lg hover:scale-105 transition-transform"><X size={18} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(entry)} className="p-3 bg-white/80 text-blue-600 border border-slate-100 rounded-2xl shadow-sm hover:scale-110 transition-transform"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(entry.id)} className="p-3 bg-white/80 text-rose-500 border border-slate-100 rounded-2xl shadow-sm hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {entries.length === 0 && (
              <div className="text-center py-24 bg-white/20 rounded-[3rem] border-2 border-dashed border-white/40">
                <div className="w-20 h-20 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText size={40} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-lg">No entries found for this date.</p>
                <p className="text-slate-300 text-sm mt-1">Start by adding a transaction on the left.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Mobile Static Bottom Bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <motion.div 
          initial={{ y: 50 }} 
          animate={{ y: 0 }}
          className="p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
              balance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Net Balance</p>
              <h3 className={clsx("text-xl font-black leading-none", balance >= 0 ? "text-emerald-700" : "text-rose-700")}>
                ₹{balance.toLocaleString()}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-4 pr-1">
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Entries</p>
              <p className="text-sm font-black leading-none text-slate-700">{entries.length}</p>
            </div>
            
            {profile?.username === 'md' && (
              <>
                <div className="w-px h-8 bg-slate-200" />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowRangeModal(true)}
                  className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm"
                >
                  <FileText size={20} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={downloadPDF}
                  className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20"
                >
                  <Download size={22} />
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

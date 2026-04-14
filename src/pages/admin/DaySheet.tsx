import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, Trash2, Edit2, Check, X, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const DaySheet = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');

  useEffect(() => { fetchEntries(); }, [filterDate]);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('day_sheets')
      .select('*, profiles(username)')
      .eq('date', filterDate)
      .order('created_at', { ascending: false });
    setEntries(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    const { error } = await supabase.from('day_sheets').insert([{ 
      type, 
      amount: parseFloat(amount), 
      description: description || 'No description', 
      date,
      created_by: user?.id ?? null
    }]);
    if (error) { toast.error('Failed to add entry', error.message); return; }
    toast.success('Entry saved!');
    setAmount(''); setDescription(''); fetchEntries();
  };

  const startEdit = (entry: any) => { setEditingId(entry.id); setEditAmount(entry.amount.toString()); setEditDescription(entry.description); setEditType(entry.type); };
  const cancelEdit = () => { setEditingId(null); setEditAmount(''); setEditDescription(''); };

  const saveEdit = async () => {
    if (!editAmount || !editingId) return;
    const { error } = await supabase.from('day_sheets').update({ amount: parseFloat(editAmount), description: editDescription || 'No description', type: editType }).eq('id', editingId);
    if (error) { toast.error('Update failed', error.message); return; }
    toast.success('Entry updated!');
    setEditingId(null); fetchEntries();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('day_sheets').delete().eq('id', id);
    if (error) { toast.error('Delete failed', error.message); return; }
    toast.success('Entry deleted');
    fetchEntries();
  };

  const downloadPDF = () => {
    if (entries.length === 0) { toast.warning('Nothing to download', 'No entries found for this date.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Day Sheet Statement", format(new Date(filterDate), 'dd/MM/yyyy'));
    const tableData = entries.map(e => [e.type.toUpperCase(), e.description, e.amount]);
    autoTable(doc, { head: [['Type', 'Description', 'Amount']], body: tableData, startY: 80, theme: 'grid', headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 4, fontSize: 11 }, alternateRowStyles: { fillColor: [245, 247, 250] } });
    const balance = entries.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount), 0) - entries.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
    drawGreenFooter(doc, "TOTAL BALANCE:", `Rs. ${balance}`);
    savePDF(doc, `daysheet_${filterDate}.pdf`);
  };

  const totalIncome = entries.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">Day Sheet</h1>
        <p className="text-xs lg:text-slate-500 font-medium mt-1 landscape:hidden">Track daily income & expenses</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Add Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
          className="lg:col-span-1 space-y-5"
        >
          <div className="bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-3xl p-6 shadow-[10px_10px_24px_rgba(163,177,198,0.5),-10px_-10px_24px_rgba(255,255,255,0.8)] border border-white/50">
            <div className="flex items-center gap-3 mb-3 lg:mb-5">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                <FileText size={16} className="text-white" />
              </div>
              <h3 className="font-black text-base lg:text-lg text-slate-800">Add Entry</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2 p-1.5 bg-[#e0e5ec] rounded-2xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]">
                {(['income', 'expense'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-300 flex items-center justify-center gap-1.5',
                      type === t
                        ? t === 'income'
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {t === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {t === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>

              <Input type="number" label="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="font-bold text-lg" />
              <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" />
              <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button type="submit" className="w-full py-4 font-bold">Save Entry</Button>
            </form>
          </div>
        </motion.div>

        {/* Right: Entries List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Filter + Download */}
          <div className="flex gap-3 sticky top-0 bg-[#e0e5ec] z-10 py-1">
            <div className="flex-1">
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="!py-2" />
            </div>
            <Button variant="secondary" onClick={downloadPDF} className="p-2 lg:px-5 flex-shrink-0">
              <Download size={18} />
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {entries.map((entry, index) => {
                const isEditing = editingId === entry.id;
                const currentType = isEditing ? editType : entry.type;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    className={clsx(
                      'flex items-center gap-4 p-4 bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-2xl shadow-[6px_6px_14px_rgba(163,177,198,0.4),-6px_-6px_14px_rgba(255,255,255,0.7)] border-l-4 border border-white/50',
                    )}
                    style={{ borderLeftColor: currentType === 'income' ? '#10b981' : '#ef4444' }}
                  >
                    {/* Type Icon */}
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md',
                      currentType === 'income'
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                        : 'bg-gradient-to-br from-red-400 to-rose-500'
                    )}>
                      {currentType === 'income'
                        ? <TrendingUp size={18} className="text-white" />
                        : <TrendingDown size={18} className="text-white" />
                      }
                    </div>

                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          {(['income', 'expense'] as const).map(t => (
                            <button key={t} type="button" onClick={() => setEditType(t)}
                              className={clsx('flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                                editType === t
                                  ? t === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  : 'bg-slate-200 text-slate-500'
                              )}>
                              {t === 'income' ? 'Income' : 'Expense'}
                            </button>
                          ))}
                        </div>
                        <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="!py-2" />
                        <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Amount" className="!py-2 font-bold" />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{entry.description}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">By {entry.profiles?.username}</p>
                      </div>
                    )}

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!isEditing && (
                        <span className={clsx(
                          'font-black text-xl whitespace-nowrap',
                          entry.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                        )}>
                          {entry.type === 'income' ? '+' : '-'}₹{entry.amount}
                        </span>
                      )}
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button onClick={saveEdit} className="!p-2.5 text-green-600 !rounded-xl"><Check size={16} /></Button>
                            <Button onClick={cancelEdit} className="!p-2.5 text-slate-500 !rounded-xl"><X size={16} /></Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => startEdit(entry)} className="!p-2.5 text-blue-500 !rounded-xl"><Edit2 size={15} /></Button>
                            <Button onClick={() => handleDelete(entry.id)} className="!p-2.5 text-red-500 !rounded-xl" variant="danger"><Trash2 size={15} /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {entries.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">No entries for this date</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sticky Footer Totals */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-[#e0e5ec]/90 backdrop-blur-md border-t border-white/50 p-4 grid grid-cols-3 gap-4 z-40 shadow-[0_-10px_20px_rgba(163,177,198,0.3)] lg:static lg:shadow-none lg:border-0 lg:bg-transparent lg:mt-4 lg:p-0 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-0"
      >
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-3 rounded-2xl text-center shadow-inner">
          <p className="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-1">Income</p>
          <p className="font-black text-emerald-700 text-lg">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-3 rounded-2xl text-center shadow-inner">
          <p className="text-red-600 text-xs font-bold uppercase tracking-wide mb-1">Expense</p>
          <p className="font-black text-red-700 text-lg">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className={clsx(
          'p-3 rounded-2xl text-center shadow-inner border',
          balance >= 0
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200'
            : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
        )}>
          <p className={clsx('text-xs font-bold uppercase tracking-wide mb-1', balance >= 0 ? 'text-indigo-600' : 'text-red-600')}>Balance</p>
          <p className={clsx('font-black text-lg', balance >= 0 ? 'text-indigo-700' : 'text-red-700')}>₹{balance.toLocaleString()}</p>
        </div>
      </motion.div>
    </div>
  );
};

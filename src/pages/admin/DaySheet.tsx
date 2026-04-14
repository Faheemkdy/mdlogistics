import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, Trash2, Edit2, Check, X, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePDF } from '../../utils/pdfGenerator';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const DaySheet = () => {
  const { user, profile } = useAuth();
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
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // ── HEADER BACKGROUND ──
    doc.setFillColor(30, 27, 75); // Deep indigo
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Accent strip
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, 38, pageWidth, 4, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('MD LOGISTICS', pageWidth / 2, 20, { align: 'center' });

    // Address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text('Kondotty, Malappuram Dt.  |  +91 9633606862  |  mdcourierkdy@gmail.com', pageWidth / 2, 31, { align: 'center' });

    // ── DATE & REFERENCE SECTION ──
    doc.setFillColor(243, 244, 246);
    doc.rect(14, 48, pageWidth - 28, 15, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Date:', 20, 56);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(79, 70, 229);
    doc.text(format(new Date(filterDate + 'T12:00:00'), 'dd MMMM yyyy'), 38, 56);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Entries:', pageWidth - 50, 56);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(String(entries.length), pageWidth - 28, 56);

    // ── SUMMARY CARDS ──
    const cardY = 70;
    const cardH = 22;
    const cardW = (pageWidth - 28 - 8) / 3;

    // Income Card (Green)
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(14, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(14, cardY, 4, cardH, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('TOTAL INCOME', 22, cardY + 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text(`Rs. ${totalIncome.toFixed(2)}`, 22, cardY + 17);

    // Expense Card (Red)
    const card2X = 14 + cardW + 4;
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(card2X, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(card2X, cardY, 4, cardH, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 27, 27);
    doc.text('TOTAL EXPENSE', card2X + 8, cardY + 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`Rs. ${totalExpense.toFixed(2)}`, card2X + 8, cardY + 17);

    // Balance Card (Blue or Amber)
    const card3X = 14 + (cardW + 4) * 2;
    const isProfit = balance >= 0;
    doc.setFillColor(isProfit ? 219 : 254, isProfit ? 234 : 243, isProfit ? 254 : 199);
    doc.roundedRect(card3X, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFillColor(isProfit ? 99 : 245, isProfit ? 102 : 158, isProfit ? 241 : 11);
    doc.roundedRect(card3X, cardY, 4, cardH, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isProfit ? 55 : 120, isProfit ? 48 : 53, isProfit ? 163 : 15);
    doc.text('NET BALANCE', card3X + 8, cardY + 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isProfit ? 67 : 161, isProfit ? 56 : 98, isProfit ? 202 : 7);
    doc.text(`Rs. ${Math.abs(balance).toFixed(2)}${isProfit ? '' : ' (-)'}`, card3X + 8, cardY + 17);

    // ── TABLE SECTION TITLE ──
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 75);
    doc.text('Transaction Entries', 14, 100);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(14, 102, 55, 102);

    // ── ENTRIES TABLE ──
    const tableBody = entries.map(e => [
      e.type.toUpperCase(),
      e.description || 'No description',
      `Rs. ${Number(e.amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 106,
      head: [['Type', 'Description', 'Amount']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: [30, 27, 75],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 10,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        lineColor: [229, 231, 235],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const entry = entries[data.row.index];
          if (entry?.type === 'income') {
            data.cell.styles.textColor = [4, 120, 87];
            if (data.column.index === 2) {
              data.cell.styles.fillColor = [209, 250, 229];
            }
          } else if (entry?.type === 'expense') {
            data.cell.styles.textColor = [185, 28, 28];
            if (data.column.index === 2) {
              data.cell.styles.fillColor = [254, 226, 226];
            }
          }
        }
      },
    });

    // ── FOOTER ──
    const footerY = pageHeight - 16;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, footerY);
    doc.text('MD Logistics — Confidential', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Page 1', pageWidth - 14, footerY, { align: 'right' });

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
            {profile?.username === 'md' && (
              <Button variant="secondary" onClick={downloadPDF} className="p-2 lg:px-5 flex-shrink-0">
                <Download size={18} />
              </Button>
            )}
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

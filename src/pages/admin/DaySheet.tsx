import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, Trash2, Edit2, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export const DaySheet = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    fetchEntries();
  }, [filterDate]);

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
      date
    }]);

    if (!error) {
      setAmount('');
      setDescription('');
      fetchEntries();
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
    
    const { error } = await supabase
      .from('day_sheets')
      .update({
        amount: parseFloat(editAmount),
        description: editDescription || 'No description',
        type: editType
      })
      .eq('id', editingId);

    if (!error) {
      setEditingId(null);
      fetchEntries();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      const { error } = await supabase.from('day_sheets').delete().eq('id', id);
      if (!error) fetchEntries();
    }
  };

  const downloadPDF = () => {
    if (entries.length === 0) {
        alert('No data to download');
        return;
    }
    const doc = new jsPDF();
    
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Day Sheet Statement", format(new Date(filterDate), 'dd/MM/yyyy'));
    
    const tableData = entries.map(e => [
      e.type.toUpperCase(),
      e.description,
      e.amount
    ]);

    autoTable(doc, {
      head: [['Type', 'Description', 'Amount']],
      body: tableData,
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 4, fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    const totalIncome = entries.filter(e => e.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
    const totalExpense = entries.filter(e => e.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
    const balance = totalIncome - totalExpense;
    
    drawGreenFooter(doc, "TOTAL BALANCE:", `Rs. ${balance}`);

    savePDF(doc, `daysheet_${filterDate}.pdf`);
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">Day Sheet</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card delay={0.1} className="h-fit">
          <h3 className="font-bold text-lg mb-6 text-slate-700">Add Entry</h3>
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="flex gap-3 p-1.5 bg-[#e0e5ec] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]">
              <button 
                type="button" 
                onClick={() => setType('income')} 
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${type === 'income' ? 'bg-white shadow-md text-emerald-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Income
              </button>
              <button 
                type="button" 
                onClick={() => setType('expense')} 
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${type === 'expense' ? 'bg-white shadow-md text-red-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Expense
              </button>
            </div>
            <Input type="number" label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="text-lg font-bold" />
            <Input label="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" />
            <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button type="submit" className="w-full py-4 text-lg mt-2">Save Entry</Button>
          </form>
        </Card>

        <Card delay={0.2} className="lg:col-span-2">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-3 w-full">
               <div className="flex-1 relative">
                  <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full" />
               </div>
               <Button variant="secondary" onClick={downloadPDF} className="whitespace-nowrap h-[52px] px-6"><Download size={20} /></Button>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {entries.map((entry, index) => (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center justify-between p-5 bg-[#e0e5ec] rounded-2xl border-l-4 shadow-[inset_3px_3px_6px_rgba(255,255,255,0.6),3px_3px_10px_rgba(163,177,198,0.4)]" 
                  style={{ borderLeftColor: (editingId === entry.id ? editType : entry.type) === 'income' ? '#10b981' : '#ef4444' }}
                >
                  {editingId === entry.id ? (
                    <div className="flex-1 flex flex-col gap-3 mr-4">
                       <div className="flex gap-2">
                          <button type="button" onClick={() => setEditType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${editType === 'income' ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'bg-slate-200 text-slate-500'}`}>Income</button>
                          <button type="button" onClick={() => setEditType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${editType === 'expense' ? 'bg-red-100 text-red-700 shadow-inner' : 'bg-slate-200 text-slate-500'}`}>Expense</button>
                       </div>
                       <Input 
                          value={editDescription} 
                          onChange={(e) => setEditDescription(e.target.value)} 
                          placeholder="Description"
                          className="!py-2"
                       />
                       <Input 
                          type="number"
                          value={editAmount} 
                          onChange={(e) => setEditAmount(e.target.value)} 
                          placeholder="Amount"
                          className="!py-2 font-bold text-lg"
                       />
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1 mr-4 pl-2">
                      <p className="font-bold text-lg text-slate-800 truncate">{entry.description}</p>
                      <p className="text-sm font-medium text-slate-500 mt-1">Added by {entry.profiles?.username}</p>
                    </div>
                  )}

                  <div className="flex flex-col items-end gap-3">
                      {editingId !== entry.id && (
                          <span className={`font-black text-2xl whitespace-nowrap ${entry.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {entry.type === 'income' ? '+' : '-'} ₹{entry.amount}
                          </span>
                      )}
                      
                      <div className="flex items-center gap-2">
                          {editingId === entry.id ? (
                              <>
                                  <Button onClick={saveEdit} className="!p-2.5 text-green-600 !rounded-xl"><Check size={18} /></Button>
                                  <Button onClick={cancelEdit} className="!p-2.5 text-slate-500 !rounded-xl"><X size={18} /></Button>
                              </>
                          ) : (
                              <>
                                  <Button onClick={() => startEdit(entry)} className="!p-2.5 text-blue-500 !rounded-xl"><Edit2 size={16} /></Button>
                                  <Button onClick={() => handleDelete(entry.id)} className="!p-2.5 text-red-500 !rounded-xl" variant="danger"><Trash2 size={16} /></Button>
                              </>
                          )}
                      </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {entries.length === 0 && <p className="text-center text-slate-400 py-10 font-medium">No entries for this date.</p>}
          </div>
          
          {/* Mobile Sticky Footer for Totals */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#e0e5ec]/90 backdrop-blur-md border-t border-white/50 p-4 grid grid-cols-3 gap-4 text-center z-40 shadow-[0_-10px_20px_rgba(163,177,198,0.3)] lg:static lg:shadow-none lg:border-0 lg:bg-transparent lg:mt-8 lg:pt-6 lg:p-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
             <div className="bg-white/40 p-3 rounded-2xl shadow-inner border border-white/50"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Income</p><p className="font-black text-emerald-500 text-lg lg:text-xl">₹{entries.filter(e => e.type === 'income').reduce((a,b) => a + Number(b.amount), 0)}</p></div>
             <div className="bg-white/40 p-3 rounded-2xl shadow-inner border border-white/50"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Expense</p><p className="font-black text-red-500 text-lg lg:text-xl">₹{entries.filter(e => e.type === 'expense').reduce((a,b) => a + Number(b.amount), 0)}</p></div>
             <div className="bg-white/40 p-3 rounded-2xl shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] border border-white/50"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Balance</p><p className="font-black text-slate-800 text-lg lg:text-xl">₹{entries.filter(e => e.type === 'income').reduce((a,b) => a + Number(b.amount), 0) - entries.filter(e => e.type === 'expense').reduce((a,b) => a + Number(b.amount), 0)}</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

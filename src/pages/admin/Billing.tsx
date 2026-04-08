import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Trash2, Download, Share2, Package, ShoppingCart, FileText, Search, Calendar, Edit3, Trash } from 'lucide-react';
import { generateBillingPDF, getBillingPDFFile } from '../../utils/billingPdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export const Billing = () => {
  const [mode, setMode] = useState<'delivery' | 'product' | 'history'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [savedBills, setSavedBills] = useState<any[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [deliveryItems, setDeliveryItems] = useState([
    { id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }
  ]);

  // Product State: no rate field, only amount
  const [productItems, setProductItems] = useState([
    { id: 1, name: '', qty: 1, amount: 0 }
  ]);

  const [deliveryTotalQty, setDeliveryTotalQty] = useState(0);
  const [deliveryTotalAmount, setDeliveryTotalAmount] = useState(0);
  const [productTotal, setProductTotal] = useState(0);

  // --- Delivery Logic ---
  const updateDeliveryItem = (id: number, field: string, value: string) => {
    setDeliveryItems(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (['q20', 'q25', 'q30', 'q35', 'q40', 'q50'].includes(field)) {
            const q20 = Number(newItem.q20) || 0;
            const q25 = Number(newItem.q25) || 0;
            const q30 = Number(newItem.q30) || 0;
            const q35 = Number(newItem.q35) || 0;
            const q40 = Number(newItem.q40) || 0;
            const q50 = Number(newItem.q50) || 0;
            newItem.total = q20 + q25 + q30 + q35 + q40 + q50;
            newItem.amount = ((q20 * 20) + (q25 * 25) + (q30 * 30) + (q35 * 35) + (q40 * 40) + (q50 * 50)).toFixed(2);
        }
        return newItem;
      }
      return item;
    }));
  };

  const addDeliveryRow = () => setDeliveryItems(prev => [...prev, { id: Date.now(), description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
  const removeDeliveryRow = (id: number) => { if (deliveryItems.length > 1) setDeliveryItems(prev => prev.filter(i => i.id !== id)); };

  // --- Product Logic (no rate) ---
  const updateProductItem = (id: number, field: string, value: string | number) => {
    setProductItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const addProductRow = () => setProductItems(prev => [...prev, { id: Date.now(), name: '', qty: 1, amount: 0 }]);
  const removeProductRow = (id: number) => { if (productItems.length > 1) setProductItems(prev => prev.filter(i => i.id !== id)); };

  // --- Database Logic ---
  const fetchSavedBills = async () => {
    setLoading(true);
    let query = supabase.from('bills').select('*').order('date', { ascending: false });
    if (searchName) query = query.ilike('customer_name', `%${searchName}%`);
    if (searchDate) query = query.eq('date', searchDate);
    
    const { data, error } = await query;
    if (error) console.error('Error fetching bills:', error);
    else setSavedBills(data || []);
    setLoading(false);
  };

  const saveBill = async () => {
    if (!customerName) return alert('Please enter customer name');
    
    const billData = {
      type: mode === 'history' ? 'delivery' : mode, // Fallback if somehow called in history
      customer_name: customerName,
      date,
      items: mode === 'delivery' ? deliveryItems : productItems,
      totals: mode === 'delivery' ? { qty: deliveryTotalQty, amount: deliveryTotalAmount } : { amount: productTotal }
    };

    setLoading(true);
    const { error } = editingBillId 
      ? await supabase.from('bills').update(billData).eq('id', editingBillId).select()
      : await supabase.from('bills').insert(billData).select();

    if (error) {
      alert('Error saving bill: ' + error.message);
      setLoading(false);
      return;
    }

    // Trigger PDF Download after saving
    handlePDF();
    
    // Reset if it was a new bill
    if (!editingBillId) {
      setCustomerName('');
      setDeliveryItems([{ id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
      setProductItems([{ id: 1, name: '', qty: 1, amount: 0 }]);
    }
    
    setEditingBillId(null);
    setLoading(false);
    fetchSavedBills();
    alert('Bill saved and PDF generated!');
  };

  const deleteBill = async (id: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this bill?')) return;
      setLoading(true);
      const { error } = await supabase.from('bills').delete().eq('id', id);
      
      if (error) {
        console.error('Delete error:', error);
        alert('Error deleting: ' + error.message);
      } else {
        await fetchSavedBills();
        alert('Bill deleted successfully');
      }
    } catch (e: any) {
      console.error('Delete exception:', e);
      alert('An unexpected error occurred while deleting.');
    } finally {
      setLoading(false);
    }
  };

  const editSavedBill = (bill: any) => {
    setMode(bill.type);
    setCustomerName(bill.customer_name);
    setDate(bill.date);
    setEditingBillId(bill.id);
    if (bill.type === 'delivery') setDeliveryItems(bill.items);
    else setProductItems(bill.items);
  };

  // --- PDF / Share Logic ---
  const handlePDF = () => {
    if (mode === 'delivery') {
      generateBillingPDF('delivery', customerName, date, deliveryItems, { qty: deliveryTotalQty, amount: deliveryTotalAmount });
    } else if (mode === 'product') {
      generateBillingPDF('product', customerName, date, productItems, { amount: productTotal });
    }
  };

  const handleNativeShare = async () => {
    if (mode === 'history') return; // Cannot share from history tab directly (use the row button)

    if (!customerName) return alert('Please enter customer name');

    const billData = {
      type: mode,
      customer_name: customerName,
      date,
      items: mode === 'delivery' ? deliveryItems : productItems,
      totals: mode === 'delivery' ? { qty: deliveryTotalQty, amount: deliveryTotalAmount } : { amount: productTotal }
    };

    setLoading(true);
    const { error } = editingBillId 
      ? await supabase.from('bills').update(billData).eq('id', editingBillId)
      : await supabase.from('bills').insert(billData);

    if (error) {
      alert('Error saving bill before share: ' + error.message);
      setLoading(false);
      return;
    }

    const file = getBillingPDFFile(
      mode as 'delivery' | 'product', customerName, date,
      mode === 'delivery' ? deliveryItems : productItems,
      mode === 'delivery' ? { qty: deliveryTotalQty, amount: deliveryTotalAmount } : { amount: productTotal }
    );
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `Invoice for ${customerName}`, text: `Here is the invoice for ${customerName}.` }); }
      catch (e) { console.log('Sharing cancelled', e); }
    } else {
      alert('Direct sharing not supported. Downloading instead.');
      handlePDF();
    }

    // Reset Form if it's a new bill
    if (!editingBillId) {
      setCustomerName('');
      setDeliveryItems([{ id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
      setProductItems([{ id: 1, name: '', qty: 1, amount: 0 }]);
    }
    setEditingBillId(null);
    setLoading(false);
    fetchSavedBills();
  };

  // --- Effects ---
  useEffect(() => {
    setDeliveryTotalQty(deliveryItems.reduce((acc, curr) => acc + curr.total, 0));
    setDeliveryTotalAmount(deliveryItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));
  }, [deliveryItems]);

  useEffect(() => {
    setProductTotal(productItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0));
  }, [productItems]);

  useEffect(() => {
    if (mode === 'history') fetchSavedBills();
  }, [mode, searchName, searchDate]);

  const currentTotal = mode === 'delivery' ? deliveryTotalAmount : productTotal;

  return (
    <div className="space-y-6 pb-28">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Billing & Invoice</h1>
          <p className="text-slate-500 font-medium mt-1">Create and export professional invoices</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-2xl shadow-inner border border-slate-200 overflow-x-auto no-scrollbar">
          {(['delivery', 'product', 'history'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap',
                mode === m
                  ? m === 'delivery'
                    ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5'
                    : m === 'product'
                      ? 'bg-white text-emerald-600 shadow-md ring-1 ring-black/5'
                      : 'bg-white text-slate-800 shadow-md ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              )}
            >
              {m === 'delivery' ? <Package size={16} /> : m === 'product' ? <ShoppingCart size={16} /> : <FileText size={16} />}
              <span className="capitalize">{m}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {mode !== 'history' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Panel ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-5"
          >
            {/* Customer Details Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FileText size={18} className="text-white" />
                </div>
                <h3 className="font-black text-lg text-slate-800">Invoice Details</h3>
              </div>
              <div className="space-y-4">
                <Input
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
                <Input
                  type="date"
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Total Summary Card */}
            <div className={clsx(
              'rounded-3xl p-6 text-white shadow-xl',
              mode === 'delivery'
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30'
            )}>
              <p className="text-white/70 text-sm font-bold uppercase tracking-widest">Total Amount</p>
              <p className="text-4xl font-black mt-2 tracking-tight">Rs. {currentTotal.toFixed(2)}</p>
              {mode === 'delivery' && (
                <p className="text-white/60 text-sm mt-1.5 font-medium">
                  {deliveryTotalQty} packages total
                </p>
              )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex flex-col gap-3">
              <Button onClick={handleNativeShare} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:text-white font-bold shadow-lg shadow-green-500/30 border-none py-3.5">
                <Share2 size={18} /> Share via WhatsApp
              </Button>
              <Button onClick={saveBill} disabled={loading} className="w-full py-3.5 bg-slate-800 text-white hover:bg-slate-700">
                <Download size={18} /> {loading ? 'Saving...' : editingBillId ? 'Update & Download' : 'Save & Download'}
              </Button>
              {editingBillId && (
                <Button variant="secondary" onClick={() => {
                  setEditingBillId(null);
                  setCustomerName('');
                  setDeliveryItems([{ id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
                  setProductItems([{ id: 1, name: '', qty: 1, amount: 0 }]);
                }} className="w-full py-2 text-xs">Cancel Edit</Button>
              )}
            </div>
          </motion.div>

          {/* ── Right Panel: Table ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden">
              
              {/* Table Header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/30">
                <h3 className="font-black text-xl text-slate-800">
                  {mode === 'delivery' ? 'Package Details' : 'Item Details'}
                </h3>
                <p className="text-slate-500 text-sm mt-0.5 font-medium">
                  {mode === 'delivery'
                    ? 'Enter quantities per price tier — totals calculate automatically'
                    : 'Enter items and their amounts'}
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ minWidth: mode === 'delivery' ? '700px' : '400px' }}>
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                      {mode === 'delivery' ? (
                        <>
                          <th className="px-4 py-3.5 font-bold rounded-none w-28 text-left">Date</th>
                          <th className="px-3 py-3.5 font-bold text-center w-14 text-yellow-300">Total</th>
                          {['20', '25', '30', '35', '40', '50'].map(s => (
                            <th key={s} className="px-2 py-3.5 font-bold text-center text-slate-300">{s}</th>
                          ))}
                          <th className="px-4 py-3.5 font-bold text-right text-green-300">Amount</th>
                          <th className="px-3 py-3.5 w-8"></th>
                        </>
                      ) : (
                        <>
                          <th className="px-5 py-3.5 font-bold text-left">Item Name</th>
                          <th className="px-4 py-3.5 font-bold text-center w-20">Qty</th>
                          <th className="px-4 py-3.5 font-bold text-right w-32 text-green-300">Amount (Rs.)</th>
                          <th className="px-3 py-3.5 w-8"></th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="wait">
                      {mode === 'delivery' ? (
                        deliveryItems.map((item, idx) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.04 }}
                            className={clsx(
                              'border-b border-white/20 group hover:bg-white/20 transition-colors',
                              idx % 2 === 0 ? 'bg-white/10' : 'bg-transparent'
                            )}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={item.description}
                                onChange={(e) => updateDeliveryItem(item.id, 'description', e.target.value)}
                                className="w-full bg-white/60 border border-white/40 rounded-lg text-slate-700 text-xs p-1.5 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="font-black text-slate-800 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-sm">{item.total}</span>
                            </td>
                            {['q20', 'q25', 'q30', 'q35', 'q40', 'q50'].map((size) => (
                              <td key={size} className="px-1.5 py-2">
                                <input
                                  type="number"
                                  placeholder="—"
                                  // @ts-ignore
                                  value={item[size]}
                                  onChange={(e) => updateDeliveryItem(item.id, size, e.target.value)}
                                  className="w-full bg-white/60 border border-white/40 rounded-lg text-center text-slate-700 p-1.5 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white text-xs font-bold transition-all"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right">
                              <span className="font-black text-blue-700 text-sm">
                                {item.amount ? `${Number(item.amount).toFixed(2)}` : '—'}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => removeDeliveryRow(item.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        productItems.map((item, idx) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.04 }}
                            className={clsx(
                              'border-b border-white/20 group hover:bg-white/20 transition-colors',
                              idx % 2 === 0 ? 'bg-white/10' : 'bg-transparent'
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                placeholder="Product name..."
                                value={item.name}
                                onChange={(e) => updateProductItem(item.id, 'name', e.target.value)}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg text-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white text-sm transition-all shadow-inner"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateProductItem(item.id, 'qty', e.target.value)}
                                className="w-full bg-white/60 border border-white/40 rounded-lg text-center text-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white text-sm font-bold transition-all"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                placeholder="0.00"
                                value={item.amount || ''}
                                onChange={(e) => updateProductItem(item.id, 'amount', e.target.value)}
                                className="w-full bg-white/60 border border-white/40 rounded-lg text-right text-emerald-700 font-black p-2 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white text-sm transition-all"
                              />
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button
                                onClick={() => removeProductRow(item.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Add Row Button */}
              <div className="p-5 border-t border-white/20">
                <button
                  onClick={mode === 'delivery' ? addDeliveryRow : addProductRow}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold text-sm hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200"
                >
                  <Plus size={18} /> Add New Row
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        /* History View */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Search Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
             <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-white/50 focus:ring-2 focus:ring-slate-400 outline-none transition-all shadow-inner"
                />
             </div>
             <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-white/50 focus:ring-2 focus:ring-slate-400 outline-none transition-all shadow-inner"
                />
             </div>
          </div>

          {/* List of Bills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loading ? (
              <div className="lg:col-span-2 text-center py-20 text-slate-400 font-bold">Loading saved bills...</div>
            ) : savedBills.length === 0 ? (
              <div className="lg:col-span-2 text-center py-20 text-slate-400 font-bold">No saved bills found.</div>
            ) : savedBills.map((bill) => (
              <div key={bill.id} className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white flex items-center gap-4 group hover:shadow-lg transition-all">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white font-black",
                  bill.type === 'delivery' ? 'bg-blue-500' : 'bg-emerald-500'
                )}>
                  {bill.type === 'delivery' ? 'D' : 'P'}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800">{bill.customer_name}</h4>
                  <p className="text-slate-500 text-xs font-medium">{format(new Date(bill.date), 'dd MMM yyyy')} · Rs.{bill.totals.amount.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => generateBillingPDF(bill.type, bill.customer_name, bill.date, bill.items, bill.totals)} className="p-2.5 rounded-xl bg-white/60 text-slate-600 hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                    <Download size={16} />
                  </button>
                  <button onClick={() => editSavedBill(bill)} className="p-2.5 rounded-xl bg-white/60 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteBill(bill.id)} className="p-2.5 rounded-xl bg-white/60 text-slate-600 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Mobile Action Bar ── */}
      {mode !== 'history' && (
        <motion.div
           initial={{ y: 100 }}
           animate={{ y: 0 }}
           className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex gap-3 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <Button
            onClick={handleNativeShare}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:text-white font-bold shadow-lg shadow-green-500/30 border-none py-4"
          >
            <Share2 size={20} /> Share
          </Button>
          <Button onClick={saveBill} disabled={loading} className="flex-1 py-4 bg-slate-800 text-white">
            <Download size={20} /> {loading ? 'Saving...' : 'Save'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

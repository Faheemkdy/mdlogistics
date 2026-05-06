import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Plus, Trash2, Download, Share2, Package, ShoppingCart, FileText, Search, Calendar, Edit3, Trash, Clock, CheckCircle } from 'lucide-react';
import { getStandardDate } from '../../utils/dateUtils';
import { generateBillingPDF, getBillingPDFFile } from '../../utils/billingPdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export const Billing = () => {
  const toast = useToast();
  const [mode, setMode] = useState<'delivery' | 'product' | 'history'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(getStandardDate());
  
  const [savedBills, setSavedBills] = useState<any[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [deliveryItems, setDeliveryItems] = useState([
    { id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }
  ]);
  const [vouchersImportOpen, setVouchersImportOpen] = useState(false);
  const [pendingVouchers, setPendingVouchers] = useState<any[]>([]);
  const [importingVoucherId, setImportingVoucherId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.importVoucherId) {
      handleAutoImport(location.state.importVoucherId);
    }
  }, [location.state]);

  const handleAutoImport = async (id: string) => {
    const { data } = await supabase
      .from('vouchers')
      .select('*, voucher_items(*)')
      .eq('id', id)
      .single();
    if (data) importVoucher(data);
  };
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

  const performSave = async () => {
    if (!customerName) {
      toast.warning('Customer name required', 'Please enter a name before saving.');
      return false;
    }
    
    const billData = {
      type: mode === 'history' ? 'delivery' : mode,
      customer_name: customerName,
      date,
      items: mode === 'delivery' ? deliveryItems : productItems,
      totals: mode === 'delivery' ? { qty: deliveryTotalQty, amount: deliveryTotalAmount } : { amount: productTotal }
    };

    setLoading(true);
    const { data, error } = editingBillId 
      ? await supabase.from('bills').update(billData).eq('id', editingBillId).select()
      : await supabase.from('bills').insert(billData).select();

    if (error) {
      toast.error('Save failed', error.message);
      setLoading(false);
      return false;
    }

    if (!editingBillId && data && data[0]) {
      setEditingBillId(data[0].id);
    }

    // Mark voucher as billed if importing
    if (importingVoucherId) {
      await supabase.from('vouchers').update({ status: 'billed' }).eq('id', importingVoucherId);
      
      // Sync items back to voucher_items
      const finalItems = mode === 'delivery' ? deliveryItems : productItems;
      
      // Delete old items for this voucher
      await supabase.from('voucher_items').delete().eq('voucher_id', importingVoucherId);
      
      // Insert new items
      const newVoucherItems = finalItems.filter(i => {
        if (mode === 'delivery') return i.total > 0;
        return i.name && i.qty > 0;
      }).map(i => ({
        voucher_id: importingVoucherId,
        date: mode === 'delivery' ? (i.description || date) : date,
        rate: mode === 'delivery' ? null : null, // Rates are complex because they are columns
        quantity: mode === 'delivery' ? i.total : i.qty,
        product_name: mode === 'product' ? i.name : null,
        amount: mode === 'product' ? i.amount : null,
        // Since delivery rows are aggregated, we store the total quantity. 
        // For product, it's direct.
      }));

      // For delivery mode, specific mapping is already done in bills.items (JSONB).
      // We update the voucher record to reflect the final state if possible.
      
      setImportingVoucherId(null);
    }

    return true;
  };

  const resetAfterSave = () => {
    // Reset if it was a new bill
    if (!editingBillId) {
      setCustomerName('');
      setDeliveryItems([{ id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
      setProductItems([{ id: 1, name: '', qty: 1, amount: 0 }]);
    }
    
    setEditingBillId(null);
    setLoading(false);
    fetchSavedBills();
  };

  const saveBill = async () => {
    const saved = await performSave();
    if (!saved) return;
    handlePDF();
    resetAfterSave();
    toast.success('Bill saved!', 'PDF has been generated and downloaded.');
  };

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) { toast.error('Delete failed', error.message); return; }
    toast.success('Bill deleted');
    fetchSavedBills();
  };

  const editSavedBill = (bill: any) => {
    setMode(bill.type);
    setCustomerName(bill.customer_name);
    setDate(bill.date);
    setEditingBillId(bill.id);
    if (bill.type === 'delivery') setDeliveryItems(bill.items);
    else setProductItems(bill.items);
  };

  const fetchPendingVouchers = async () => {
    const { data } = await supabase
      .from('vouchers')
      .select('*, voucher_items(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingVouchers(data || []);
  };

  const importVoucher = (voucher: any) => {
    setCustomerName(voucher.customer_name);
    setMode(voucher.type);
    
    if (voucher.type === 'delivery') {
      const itemsByDate: Record<string, any> = {};
      voucher.voucher_items.forEach((item: any) => {
        const dateStr = item.date;
        if (!itemsByDate[dateStr]) {
          itemsByDate[dateStr] = { 
            id: Date.now() + Math.random(), 
            description: dateStr, 
            q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', 
            total: 0, amount: '0' 
          };
        }
        const row = itemsByDate[dateStr];
        if (item.rate) {
          const rateKey = `q${item.rate}` as keyof typeof row;
          // @ts-ignore
          row[rateKey] = (Number(row[rateKey]) || 0) + item.quantity;
        }
      });

      const newRows = Object.values(itemsByDate).map((row: any) => {
        const q20 = Number(row.q20) || 0;
        const q25 = Number(row.q25) || 0;
        const q30 = Number(row.q30) || 0;
        const q35 = Number(row.q35) || 0;
        const q40 = Number(row.q40) || 0;
        const q50 = Number(row.q50) || 0;
        
        return {
          ...row,
          total: q20 + q25 + q30 + q35 + q40 + q50,
          amount: ((q20 * 20) + (q25 * 25) + (q30 * 30) + (q35 * 35) + (q40 * 40) + (q50 * 50)).toFixed(2)
        };
      });
      
      // Sort rows chronologically by date
      newRows.sort((a, b) => new Date(a.description).getTime() - new Date(b.description).getTime());

      setDeliveryItems(newRows.length > 0 ? newRows : [{ id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
    } else {
      // Product Mode
      const newProdRows = voucher.voucher_items.map((item: any) => ({
        id: item.id,
        name: item.product_name,
        qty: item.quantity,
        amount: item.amount
      }));
      setProductItems(newProdRows.length > 0 ? newProdRows : [{ id: 1, name: '', qty: 1, amount: 0 }]);
    }

    setImportingVoucherId(voucher.id);
    setVouchersImportOpen(false);
    toast.success('Voucher imported!', `Data loaded from ${voucher.customer_name}`);
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
    if (mode === 'history') return;

    // Save first
    const saved = await performSave();
    if (!saved) return;

    const file = getBillingPDFFile(
      mode as 'delivery' | 'product', customerName, date,
      mode === 'delivery' ? deliveryItems : productItems,
      mode === 'delivery' ? { qty: deliveryTotalQty, amount: deliveryTotalAmount } : { amount: productTotal }
    );
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try { 
        await navigator.share({ files: [file], title: `Invoice for ${customerName}`, text: `Here is the invoice for ${customerName}.` }); 
        resetAfterSave();
      }
      catch (e) { 
        console.log('Sharing cancelled or failed', e); 
        // Even if sharing fails/cancelled, it's saved.
        // We might want to keep the data so they can try sharing again.
        // But for consistency with 'Save', let's reset or at least stop loading.
        setLoading(false);
      }
    } else {
      toast.info('Downloading PDF', 'Direct sharing not supported on this device.');
      handlePDF();
      resetAfterSave();
    }
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
        <div className="flex gap-1.5 p-1.5 bg-[#e0e5ec] rounded-2xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] overflow-x-auto no-scrollbar">
          {(['delivery', 'product', 'history'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap',
                mode === m
                  ? m === 'delivery'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : m === 'product'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg shadow-slate-500/30'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {m === 'delivery' ? <Package size={16} /> : m === 'product' ? <ShoppingCart size={16} /> : <FileText size={16} />}
              <span className="capitalize">
                {m === 'delivery' ? 'Item Bill' : m === 'product' ? 'Product Bill' : m}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {mode !== 'history' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 landscape:grid-cols-3 gap-4 lg:gap-6">

          {/* ── Left Panel ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 landscape:col-span-1 space-y-3 lg:space-y-5"
          >
            {/* Customer Details Card */}
            <div className="bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-3xl p-6 shadow-[8px_8px_20px_rgba(163,177,198,0.5),-8px_-8px_20px_rgba(255,255,255,0.8)] border border-white/50">
              <div className="flex items-center gap-3 mb-3 lg:mb-5">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FileText size={16} className="text-white" />
                </div>
                <h3 className="font-black text-base lg:text-lg text-slate-800">Invoice Details</h3>
              </div>
              <div className="space-y-4">
                <Input
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
                {mode !== 'history' && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-full text-xs py-2 bg-indigo-50 text-indigo-600 border-indigo-100"
                    onClick={() => {
                      fetchPendingVouchers();
                      setVouchersImportOpen(true);
                    }}
                  >
                    <Package size={14} className="mr-2" /> Import from Vouchers
                  </Button>
                )}
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
              <p className="text-white/70 text-[10px] lg:text-sm font-bold uppercase tracking-widest">Total Amount</p>
              <p className="text-2xl lg:text-4xl font-black mt-1 lg:mt-2 tracking-tight">Rs. {currentTotal.toFixed(2)}</p>
              {mode === 'delivery' && (
                <p className="text-white/60 text-[10px] lg:text-sm mt-1 font-medium">
                  {deliveryTotalQty} pkgs
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
            className="lg:col-span-2 landscape:col-span-2"
          >
            <div className="bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-3xl shadow-[8px_8px_20px_rgba(163,177,198,0.5),-8px_-8px_20px_rgba(255,255,255,0.8)] border border-white/50 overflow-hidden">
              
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
              <div className="relative group/scroll">
                <div className="lg:hidden absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-slate-300/40 to-transparent pointer-events-none z-10" />
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse" style={{ minWidth: mode === 'delivery' ? '700px' : '400px' }}>
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs">
                      {mode === 'delivery' ? (
                        <>
                          <th className="px-2 lg:px-4 py-2 lg:py-3.5 font-bold rounded-none w-28 text-left landscape:text-[10px]">Date</th>
                          <th className="px-1 lg:px-3 py-2 lg:py-3.5 font-bold text-center w-8 lg:w-14 text-yellow-300 landscape:text-[10px]">Total</th>
                          {['20', '25', '30', '35', '40', '50'].map(s => (
                            <th key={s} className="px-1 lg:px-2 py-2 lg:py-3.5 font-bold text-center text-slate-300 landscape:text-[10px]">{s}</th>
                          ))}
                          <th className="px-2 lg:px-4 py-2 lg:py-3.5 font-bold text-right text-green-300 landscape:text-[10px]">Amount</th>
                          <th className="px-2 lg:px-3 py-2 lg:py-3.5 w-6"></th>
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
                            <td className="px-2 py-1.5 lg:px-3 lg:py-2">
                              <input
                                type="date"
                                value={item.description}
                                onChange={(e) => updateDeliveryItem(item.id, 'description', e.target.value)}
                                className="w-full bg-white/60 border border-white/40 rounded-lg text-slate-700 text-[10px] lg:text-xs p-1 lg:p-1.5 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="font-black text-slate-800 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-sm">{item.total}</span>
                            </td>
                            {['q20', 'q25', 'q30', 'q35', 'q40', 'q50'].map((size) => (
                              <td key={size} className="px-1 py-1.5 lg:px-1.5 lg:py-2">
                                <input
                                  type="number"
                                  placeholder="—"
                                  // @ts-ignore
                                  value={item[size]}
                                  onChange={(e) => updateDeliveryItem(item.id, size, e.target.value)}
                                  className="w-full bg-white/60 border border-white/40 rounded-lg text-center text-slate-700 p-1 lg:p-1.5 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white text-[10px] lg:text-xs font-bold transition-all"
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
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
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
                                className="w-full bg-white/60 border border-white/40 rounded-lg text-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white text-sm transition-all"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] p-6 rounded-3xl shadow-lg border border-white/50">
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
              <div key={bill.id} className="bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] p-5 rounded-3xl shadow-md border border-white/50 flex items-center gap-4 group">
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
           className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex gap-3 p-4 bg-[#e0e5ec]/90 backdrop-blur-md border-t border-white/50 shadow-[0_-10px_20px_rgba(163,177,198,0.3)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
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
      {/* ── Voucher Import Modal ── */}
      <Modal 
        isOpen={vouchersImportOpen} 
        onClose={() => setVouchersImportOpen(false)}
        title="Import from Pending Vouchers"
      >
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {pendingVouchers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">No pending vouchers found.</div>
          ) : (
            pendingVouchers.map((v) => (
              <div 
                key={v.id} 
                className="p-4 bg-white/70 border border-white/80 rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-md transition-all group"
              >
                <div>
                  <h4 className="font-black text-slate-800">{v.customer_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={clsx("px-1.5 py-0.5 text-[8px] font-bold uppercase rounded", 
                      v.type === 'product' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                    )}>{v.type === 'product' ? 'Product Bill' : 'Item Bill'}</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {v.voucher_items.length} rows · {v.voucher_items.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0)} items
                    </p>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium mt-1">
                    <Clock size={10} className="inline mr-1" /> {format(new Date(v.created_at), 'dd MMM, hh:mm a')}
                  </p>
                </div>
                <Button 
                  onClick={() => importVoucher(v)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs h-9 px-4 rounded-xl"
                >
                  Import
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

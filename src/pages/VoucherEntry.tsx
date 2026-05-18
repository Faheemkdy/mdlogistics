import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, Send, Calendar, User, Package, Calculator, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/ui/Logo';
import { clsx } from 'clsx';
import { ShieldCheck, ShieldAlert, Fingerprint } from 'lucide-react';

interface VoucherItem {
  id: string;
  rate?: string;
  quantity?: string;
  product_name?: string;
  amount?: string;
}

interface DateSection {
  id: string;
  date: string;
  items: VoucherItem[];
}

export const VoucherEntry = () => {
  const toast = useToast();
  const [customerName, setCustomerName] = useState('');
  const [type, setType] = useState<'delivery' | 'product'>('delivery');
  const [sections, setSections] = useState<DateSection[]>([
    { id: '1', date: new Date().toISOString().split('T')[0], items: [{ id: '1', rate: '', quantity: '', product_name: '', amount: '' }] }
  ]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Security States
  const [honeypot, setHoneypot] = useState('');
  const [isHuman, setIsHuman] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const [securityCheckPassed, setSecurityCheckPassed] = useState(true);

  const addSection = () => {
    setSections([...sections, { 
      id: Date.now().toString(), 
      date: new Date().toISOString().split('T')[0], 
      items: [{ id: Date.now().toString() + '1', rate: '', quantity: '', product_name: '', amount: '' }] 
    }]);
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const addItem = (sectionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, items: [...s.items, { id: Date.now().toString(), rate: '', quantity: '', product_name: '', amount: '' }] };
      }
      return s;
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        if (s.items.length > 1) {
          return { ...s, items: s.items.filter(i => i.id !== itemId) };
        }
      }
      return s;
    }));
  };

  const updateItem = (sectionId: string, itemId: string, field: 'rate' | 'quantity' | 'product_name' | 'amount', value: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
        };
      }
      return s;
    }));
  };

  const updateDate = (sectionId: string, date: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, date } : s));
  };

  const calculateSectionTotal = (section: DateSection) => {
    return section.items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  };

  const calculateGrandTotal = () => {
    return sections.reduce((acc, section) => acc + calculateSectionTotal(section), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      toast.warning('Customer name required', 'Please enter a name or label.');
      return;
    }

    // 1. Honeypot check
    if (honeypot) {
      console.warn('Bot detected via honeypot');
      setSecurityCheckPassed(false);
      toast.error('Security Check Failed', 'Automated submission detected.');
      return;
    }

    // 2. Human verification check
    if (!isHuman) {
      toast.warning('Verification Required', 'Please confirm you are human.');
      return;
    }

    // 3. Rate limiting (5 second cooldown)
    const now = Date.now();
    if (now - lastSubmitTime < 5000) {
      toast.warning('Slow down', 'Please wait a few seconds before submitting again.');
      return;
    }

    const voucherData = {
      voucher: { 
        customer_name: customerName, 
        status: 'pending', 
        type 
      },
      items: sections.flatMap(section => 
        section.items
          .filter(i => type === 'delivery' ? (i.rate && i.quantity) : (i.product_name && i.quantity && i.amount))
          .map(i => ({
            date: section.date,
            rate: type === 'delivery' ? Number(i.rate) : null,
            quantity: Number(i.quantity),
            product_name: type === 'product' ? i.product_name : null,
            amount: type === 'product' ? Number(i.amount) : null
          }))
      )
    };

    if (voucherData.items.length === 0) {
      toast.warning('No items', `Please add at least one valid item for ${type}.`);
      setLoading(false);
      return;
    }

    try {
      if (navigator.onLine) {
        const { data: voucher, error: vError } = await supabase
          .from('vouchers')
          .insert([voucherData.voucher])
          .select().single();

        if (vError) throw vError;

        const itemsWithId = voucherData.items.map(i => ({ ...i, voucher_id: voucher.id }));
        const { error: iError } = await supabase.from('voucher_items').insert(itemsWithId);
        if (iError) throw iError;

        toast.success('Submitted successfully!', 'Admin will process your voucher soon.');
      } else {
        const { offlineSync } = await import('../lib/offlineSync');
        await offlineSync.addItem('voucher', voucherData);
        toast.success('Saved to offline queue', 'Will sync when connection is restored.');
      }

      setSubmitted(true);
      setLastSubmitTime(Date.now());
    } catch (err: any) {
      if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        const { offlineSync } = await import('../lib/offlineSync');
        await offlineSync.addItem('voucher', voucherData);
        toast.success('Saved to offline queue', 'Network error detected. Data will sync later.');
        setSubmitted(true);
      } else {
        toast.error('Submission failed', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/60 backdrop-blur-md rounded-[40px] p-10 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] text-center max-w-md w-full border border-white"
        >
          <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Voucher Sent!</h2>
          <p className="text-slate-500 font-medium mb-8">Thank you. Your entries have been submitted successfully.</p>
          <Button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-800">
            Send Another
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl p-3">
             <Logo showText={false} className="filter brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Voucher Entry</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Digital submission for MD Logistics</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl shadow-inner border border-white/50">
            <button
              onClick={() => setType('delivery')}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all',
                type === 'delivery' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Package size={16} /> Item Bill
            </button>
            <button
              onClick={() => setType('product')}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all',
                type === 'product' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Calculator size={16} /> Product Bill
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/40 backdrop-blur-sm p-8 rounded-[32px] shadow-[12px_12px_24px_rgba(163,177,198,0.4),-12px_-12px_24px_rgba(255,255,255,0.7)] border border-white"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <User size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-lg">Customer Information</h3>
            </div>
            <Input
              label="Customer Name / Label"
              placeholder="Enter customer name or label"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-white/80 border-slate-200"
              required
            />

            {/* Honeypot Field (Hidden from humans) */}
            <div className="absolute opacity-0 -z-10 pointer-events-none h-0 w-0 overflow-hidden">
              <label htmlFor="website_url">Leave this field blank if you are human</label>
              <input
                id="website_url"
                type="text"
                name="website_url"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
          </motion.div>

          {/* Date Sections */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {sections.map((section, sIdx) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/40 backdrop-blur-sm p-6 lg:p-8 rounded-[32px] shadow-[12px_12px_24px_rgba(163,177,198,0.4),-12px_-12px_24px_rgba(255,255,255,0.7)] border border-white group relative"
                >
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <Calendar size={20} />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                         <h3 className="font-black text-slate-800">Section {sIdx + 1}</h3>
                         <input
                           type="date"
                           value={section.date}
                           onChange={(e) => updateDate(section.id, e.target.value)}
                           className="bg-white/80 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                         />
                      </div>
                    </div>
                    <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 self-start sm:self-auto">
                      <Package size={16} /> Total: {calculateSectionTotal(section)}
                    </div>
                  </div>

                  {/* Items Table-like UI */}
                  <div className="space-y-3">
                    {type === 'delivery' ? (
                      <>
                        <div className="grid grid-cols-12 gap-3 mb-1 px-4 hidden sm:grid">
                          <div className="col-span-5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Rate (Amount)</div>
                          <div className="col-span-5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantity (Count)</div>
                        </div>
                        
                        <AnimatePresence mode="popLayout">
                          {section.items.map((item, iIdx) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="grid grid-cols-12 gap-2 sm:gap-3 items-center group/item bg-white/60 p-3 rounded-2xl border border-white/50 hover:bg-white/80 transition-colors"
                            >
                               <div className="col-span-5 relative">
                                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                   <Package size={14} />
                                 </div>
                                 <select
                                   value={item.rate || ''}
                                   onChange={(e) => updateItem(section.id, item.id, 'rate', e.target.value)}
                                   className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none"
                                 >
                                    <option value="">Rate</option>
                                    {[20, 25, 30, 35, 40, 50].map(r => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                 </select>
                                 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                   <ChevronDown size={14} />
                                 </div>
                              </div>
                              <div className="col-span-5 relative">
                                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                   <Calculator size={14} />
                                 </div>
                                 <input
                                   type="number"
                                   placeholder="Qty"
                                   value={item.quantity || ''}
                                   onChange={(e) => updateItem(section.id, item.id, 'quantity', e.target.value)}
                                   onWheel={(e) => e.currentTarget.blur()}
                                   className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                 />
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeItem(section.id, item.id)}
                                  className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-12 gap-3 mb-1 px-4 hidden sm:grid">
                          <div className="col-span-5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Product Name</div>
                          <div className="col-span-2 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Qty</div>
                          <div className="col-span-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Amount</div>
                        </div>
                        
                        <AnimatePresence mode="popLayout">
                          {section.items.map((item, iIdx) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:gap-3 items-center group/item bg-white/60 p-3 rounded-2xl border border-white/50 hover:bg-white/80 transition-colors"
                            >
                              <div className="col-span-12 sm:col-span-5">
                                 <input
                                   type="text"
                                   placeholder="Product name"
                                   value={item.product_name || ''}
                                   onChange={(e) => updateItem(section.id, item.id, 'product_name', e.target.value)}
                                   className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                 />
                              </div>
                              <div className="col-span-6 sm:col-span-2">
                                 <input
                                   type="number"
                                   placeholder="Qty"
                                   value={item.quantity || ''}
                                   onChange={(e) => updateItem(section.id, item.id, 'quantity', e.target.value)}
                                   onWheel={(e) => e.currentTarget.blur()}
                                   className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                 />
                              </div>
                              <div className="col-span-6 sm:col-span-3">
                                 <input
                                   type="number"
                                   placeholder="Rs."
                                   value={item.amount || ''}
                                   onChange={(e) => updateItem(section.id, item.id, 'amount', e.target.value)}
                                   onWheel={(e) => e.currentTarget.blur()}
                                   className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                 />
                              </div>
                              <div className="col-span-12 sm:col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeItem(section.id, item.id)}
                                  className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => addItem(section.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all font-bold text-xs"
                    >
                      <Plus size={14} /> Add Row
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {type === 'delivery' && (
              <button
                type="button"
                 onClick={addSection}
                className="w-full flex items-center justify-center gap-2 py-5 rounded-[32px] border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all font-black text-sm uppercase tracking-widest bg-white/20"
              >
                <Plus size={20} /> Add Another Date Section
              </button>
            )}
          </div>

          {/* Grand Total & Submit */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800 rounded-[32px] p-6 lg:p-8 shadow-xl border border-white/10 mt-8">
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Grand Total Qty</span>
              <span className="text-2xl font-black text-white">{calculateGrandTotal()} Items</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Human Verification */}
              <div 
                onClick={() => setIsHuman(!isHuman)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border select-none",
                  isHuman 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                )}
              >
                <div className={clsx(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  isHuman ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                )}>
                  {isHuman && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">I am human</span>
                <Fingerprint size={16} className={clsx("transition-colors", isHuman ? "text-emerald-400" : "text-white/20")} />
              </div>

              <Button
                type="submit"
                disabled={loading || !securityCheckPassed}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {!securityCheckPassed ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                    Submit Voucher
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

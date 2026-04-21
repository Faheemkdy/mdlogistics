import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Package, Trash2, Clock, CheckCircle, ExternalLink, Edit3, Save, X, Calendar, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';

export const VoucherAdmin = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vouchers')
      .select(`
        *,
        voucher_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Fetch failed', error.message);
    } else {
      setVouchers(data || []);
    }
    setLoading(false);
  };

  const deleteVoucher = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this voucher?')) return;
    
    const { error } = await supabase.from('vouchers').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed', error.message);
    } else {
      toast.success('Voucher deleted');
      setVouchers(vouchers.filter(v => v.id !== id));
    }
  };

  const toggleDate = (dateId: string) => {
    setExpandedDates(prev => ({ ...prev, [dateId]: !prev[dateId] }));
  };

  const startEdit = (voucher: any) => {
    setEditingId(voucher.id);
    setEditData(JSON.parse(JSON.stringify(voucher))); // deep copy
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleEditItemChange = (itemId: string, field: string, value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      voucher_items: prev.voucher_items.map((i: any) => i.id === itemId ? { ...i, [field]: value } : i)
    }));
  };

  const saveEdit = async () => {
    try {
      for (const item of editData.voucher_items) {
        await supabase
          .from('voucher_items')
          .update({
            rate: editData.type === 'delivery' ? Number(item.rate) : null,
            quantity: Number(item.quantity),
            product_name: editData.type === 'product' ? item.product_name : null,
            amount: editData.type === 'product' ? Number(item.amount) : null
          })
          .eq('id', item.id);
      }
      toast.success('Voucher edited successfully');
      setEditingId(null);
      setEditData(null);
      fetchVouchers();
    } catch (err: any) {
      toast.error('Edit failed', err.message);
    }
  };

  const groupItemsByDate = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesText = v.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                       v.status.toLowerCase().includes(search.toLowerCase());
    
    const matchesDate = !searchDate || v.voucher_items?.some((item: any) => item.date.includes(searchDate));
    
    return matchesText && matchesDate;
  });

  const VERCEL_URL = "https://mdlogistics-six.vercel.app/entry";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Voucher Submissions</h1>
          <p className="text-slate-500 font-medium mt-1">Review vouchers submitted via the public link</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-10 py-2.5 rounded-2xl bg-white border border-white/50 focus:ring-2 focus:ring-slate-400 outline-none transition-all shadow-sm w-full sm:w-56"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
           </div>

           <div className="relative group hidden sm:block">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="pl-12 pr-10 py-2.5 rounded-2xl bg-white border border-white/50 focus:ring-2 focus:ring-indigo-400 outline-none transition-all shadow-sm w-full"
              />
              {searchDate && (
                <button onClick={() => setSearchDate('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
           </div>

           <button 
             onClick={fetchVouchers}
             className="p-3 bg-white rounded-2xl text-slate-600 hover:bg-slate-800 hover:text-white transition-all shadow-sm border border-white/50"
           >
             <Clock size={20} />
           </button>
        </div>
      </div>

      <div className="sm:hidden">
         <div className="relative group">
            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-12 pr-10 py-2.5 rounded-2xl bg-white border border-white/50 focus:ring-2 focus:ring-indigo-400 outline-none transition-all shadow-sm w-full"
            />
            {searchDate && (
              <button onClick={() => setSearchDate('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
         </div>
      </div>

      {/* Share Instructions - Moved to Top */}
      <div className="bg-slate-800 rounded-[32px] p-8 text-white shadow-xl shadow-slate-800/20">
         <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl">
               <ExternalLink size={24} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-black">Public Entry Link</h2>
         </div>
         <p className="text-slate-300 font-medium mb-6">Send this link to your workers or clients to have them submit their voucher data directly into the system.</p>
         
         <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 font-mono text-sm break-all flex items-center">
               {VERCEL_URL}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(VERCEL_URL);
                toast.success('Link copied to clipboard!');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-black px-8 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/30 whitespace-nowrap"
            >
              Copy Link
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">Loading submissions...</div>
        ) : filteredVouchers.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">No submissions found.</div>
        ) : (
          filteredVouchers.map((voucher) => (
            <div 
              key={voucher.id} 
              className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/80 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div 
                className="p-5 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === voucher.id ? null : voucher.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white font-black",
                    voucher.status === 'pending' ? 'bg-orange-500' : 'bg-emerald-500'
                  )}>
                    {voucher.status === 'pending' ? <Clock size={20} /> : <CheckCircle size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 text-lg">{voucher.customer_name}</h4>
                      <span className={clsx("px-2 py-0.5 text-[10px] font-bold uppercase rounded-md", 
                        voucher.type === 'product' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {voucher.type === 'product' ? 'Product Bill' : 'Item Bill'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs font-medium">
                      {format(new Date(voucher.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hidden sm:block",
                    voucher.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                  )}>
                    {voucher.status}
                  </div>

                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                     {profile?.username === 'md' && editingId === voucher.id ? (
                       <>
                         <button onClick={saveEdit} className="p-2 text-green-500 hover:bg-green-50 transition-colors rounded-xl"><Save size={18} /></button>
                         <button onClick={cancelEdit} className="p-2 text-red-500 hover:bg-red-50 transition-colors rounded-xl"><X size={18} /></button>
                       </>
                     ) : (
                       <>
                         {profile?.username === 'md' && (
                           <>
                             <button onClick={() => startEdit(voucher)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit3 size={18} /></button>
                             <button onClick={() => deleteVoucher(voucher.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                           </>
                         )}
                       </>
                     )}
                  </div>
                  {expandedId === voucher.id ? <ChevronUp size={20} className="text-slate-400 ml-1" /> : <ChevronDown size={20} className="text-slate-400 ml-1" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === voucher.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/50 bg-white/30 p-2 sm:p-4"
                  >
                    <div className="space-y-2">
                       {groupItemsByDate(editingId === voucher.id ? editData.voucher_items : voucher.voucher_items).map(([date, items]) => {
                         const dateId = `${voucher.id}-${date}`;
                         const isDateExpanded = expandedDates[dateId];
                         
                         return (
                           <div key={date} className="bg-white/40 rounded-2xl overflow-hidden border border-white/50">
                             <button 
                               onClick={() => toggleDate(dateId)}
                               className="w-full flex items-center justify-between p-4 bg-white/40 hover:bg-white/60 transition-colors text-left"
                             >
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                      <Calendar size={14} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-800">{format(new Date(date), 'dd MMMM yyyy')}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">{items.length} Entries</p>
                                   </div>
                                </div>
                                {isDateExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                             </button>

                             <AnimatePresence>
                               {isDateExpanded && (
                                 <motion.div
                                   initial={{ height: 0, opacity: 0 }}
                                   animate={{ height: 'auto', opacity: 1 }}
                                   exit={{ height: 0, opacity: 0 }}
                                   className="px-4 pb-4 overflow-x-auto"
                                 >
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100/50">
                                          {voucher.type === 'product' ? (
                                            <>
                                              <th className="py-3 px-2">Product Name</th>
                                              <th className="py-3 px-2 text-center">Qty</th>
                                              <th className="py-3 px-2 text-right">Amount</th>
                                            </>
                                          ) : (
                                            <>
                                              <th className="py-3 px-2">Rate</th>
                                              <th className="py-3 px-2 text-center">Quantity</th>
                                            </>
                                          )}
                                          <th className="py-3 px-2 text-right">Time</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100/30">
                                        {items.map((item: any) => (
                                          <tr key={item.id} className="text-sm">
                                            {voucher.type === 'product' ? (
                                              <>
                                                <td className="py-3 px-2">
                                                  {editingId === voucher.id ? (
                                                    <input type="text" value={item.product_name} onChange={e => handleEditItemChange(item.id, 'product_name', e.target.value)} className="w-full px-2 py-1 border rounded" />
                                                  ) : (
                                                    <span className="font-black text-slate-800">{item.product_name}</span>
                                                  )}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                  {editingId === voucher.id ? (
                                                    <input type="number" value={item.quantity} onChange={e => handleEditItemChange(item.id, 'quantity', e.target.value)} className="w-16 px-2 py-1 border rounded text-center" />
                                                  ) : (
                                                    <span className="font-black text-slate-800">{item.quantity}</span>
                                                  )}
                                                </td>
                                                <td className="py-3 px-2 text-right">
                                                  {editingId === voucher.id ? (
                                                    <input type="number" value={item.amount} onChange={e => handleEditItemChange(item.id, 'amount', e.target.value)} className="w-20 px-2 py-1 border rounded text-right" />
                                                  ) : (
                                                    <span className="font-black text-emerald-600">{item.amount}</span>
                                                  )}
                                                </td>
                                              </>
                                            ) : (
                                              <>
                                                <td className="py-3 px-2">
                                                  {editingId === voucher.id ? (
                                                    <input type="number" value={item.rate} onChange={e => handleEditItemChange(item.id, 'rate', e.target.value)} className="w-16 px-2 py-1 border rounded text-center" />
                                                  ) : (
                                                    <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-black">{item.rate}</span>
                                                  )}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                  {editingId === voucher.id ? (
                                                    <input type="number" value={item.quantity} onChange={e => handleEditItemChange(item.id, 'quantity', e.target.value)} className="w-16 px-2 py-1 border rounded text-center" />
                                                  ) : (
                                                    <span className="font-black text-slate-800">{item.quantity}</span>
                                                  )}
                                                </td>
                                              </>
                                            )}
                                            <td className="py-3 px-2 text-right text-slate-400 text-xs">{format(new Date(item.created_at), 'hh:mm a')}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                         <tr className="bg-slate-800/5">
                                            <td colSpan={1} className="py-3 px-2 text-xs font-black text-slate-500 uppercase">Subtotal Items</td>
                                            <td className="py-3 px-2 text-center font-black text-blue-600">
                                              {items.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0)}
                                            </td>
                                            {voucher.type === 'product' && <td></td>}
                                            <td></td>
                                         </tr>
                                      </tfoot>
                                    </table>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                           </div>
                         );
                       })}
                    </div>

                    {voucher.status === 'pending' && (
                      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-3 mb-4 sm:mb-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                            <Package size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-indigo-900">Ready for Billing</p>
                             <p className="text-[10px] text-indigo-700 font-medium whitespace-nowrap">This voucher can be fetched in the Billing section.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                           <span className="text-[10px] font-black uppercase text-indigo-500 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100 hidden md:inline-block">Pending Import</span>
                           {profile?.username === 'md' && (
                             <button 
                               onClick={() => navigate('/billing', { state: { importVoucherId: voucher.id } })}
                               className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                             >
                               <Plus size={14} /> Create Bill
                             </button>
                           )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

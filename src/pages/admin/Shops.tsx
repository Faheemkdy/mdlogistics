import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Trash2, Plus, MapPin, Edit2, X, Check, Upload, Search, Store, LayoutGrid, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export const Shops = () => {
  const toast = useToast();
  const [shops, setShops] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ added: number; skipped: number } | null>(null);

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    setShops(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('shops').insert([{ name, location }]);
    if (error) { toast.error('Failed to add shop', error.message); }
    else { toast.success('Shop added!', `"${name}" has been registered.`); }
    setName(''); setLocation('');
    fetchShops();
    setLoading(false);
  };

  const startEdit = (shop: any) => { setEditingId(shop.id); setEditName(shop.name); setEditLocation(shop.location); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditLocation(''); };
  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    const { error } = await supabase.from('shops').update({ name: editName, location: editLocation }).eq('id', editingId);
    if (error) { toast.error('Update failed', error.message); return; }
    toast.success('Shop updated!');
    setEditingId(null);
    fetchShops();
  };

  const handleDelete = async (id: string, shopName: string) => {
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) { toast.error('Delete failed', error.message); return; }
    toast.success('Shop removed', `"${shopName}" has been deleted.`);
    fetchShops();
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportSummary(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        if (data.length === 0) { toast.warning('Empty file', 'The Excel file has no data rows.'); setImporting(false); return; }
        const { data: existingShops } = await supabase.from('shops').select('name, location');
        const existingSet = new Set((existingShops || []).map(s => `${s.name.toLowerCase().trim()}|${(s.location || '').toLowerCase().trim()}`));
        const newShops: any[] = [];
        let skippedCount = 0;
        data.forEach(row => {
          const rowKeys = Object.keys(row);
          const nameKey = rowKeys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('shop'));
          const locationKey = rowKeys.find(k => k.toLowerCase().includes('location') || k.toLowerCase().includes('place') || k.toLowerCase().includes('area'));
          const shopName = nameKey ? String(row[nameKey] || '').trim() : '';
          const shopLocation = locationKey ? String(row[locationKey] || '').trim() : '';
          if (shopName) {
            const key = `${shopName.toLowerCase()}|${shopLocation.toLowerCase()}`;
            if (existingSet.has(key)) { skippedCount++; }
            else { newShops.push({ name: shopName, location: shopLocation }); existingSet.add(key); }
          }
        });
        if (newShops.length > 0) { const { error } = await supabase.from('shops').insert(newShops); if (error) throw error; }
        setImportSummary({ added: newShops.length, skipped: skippedCount });
        toast.success('Import complete!', `Added: ${newShops.length}, Skipped: ${skippedCount}`);
        fetchShops();
      } catch (err: any) {
        toast.error('Import failed', err.message);
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* ── Page Header & Quick Actions ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 px-1"
      >
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Partner Outlets</h1>
          <p className="text-slate-500 font-semibold text-xs sm:text-sm flex items-center gap-2">
            <LayoutGrid size={14} className="text-indigo-500" />
            Control and monitor your retail network
          </p>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <div className="px-4 py-2 sm:px-5 sm:py-3 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm flex flex-col items-center min-w-[80px] sm:min-w-[100px]">
            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Shops</span>
            <span className="text-lg sm:text-xl font-black text-slate-900">{shops.length}</span>
          </div>
          <div className="px-4 py-2 sm:px-5 sm:py-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 flex flex-col items-center min-w-[80px] sm:min-w-[100px] text-white">
            <span className="text-[8px] sm:text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">Region</span>
            <span className="text-lg sm:text-xl font-black">All</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* ── Left Column: Controls (Add & Import) ── */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Add Shop Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                <Store size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Quick Add</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Establishment Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Moonlight Cafe"
                  className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-black text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Geographic Location</label>
                <div className="relative group">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Area / Landmark"
                    className="w-full pl-12 pr-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-black text-sm"
                  />
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                </div>
              </div>

              <motion.button 
                type="submit" 
                disabled={loading || !name.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-slate-100"
              >
                {loading ? (
                   <motion.div
                     animate={{ rotate: 360 }}
                     transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                     className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                   />
                ) : <Plus size={18} strokeWidth={3} />}
                Add Outlet
              </motion.button>
            </form>
          </motion.div>

          {/* Bulk Import Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-emerald-600" />
              </div>
              <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em]">Bulk Migration</h4>
            </div>

            <input type="file" id="excel-upload" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={importing} />
            <label htmlFor="excel-upload" className="block cursor-pointer">
              <motion.div
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(236, 253, 245, 0.8)' }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  "flex flex-col items-center justify-center gap-3 px-4 py-6 sm:px-6 sm:py-8 rounded-[2rem] border-2 border-dashed transition-all",
                  "border-emerald-100 bg-emerald-50/30 text-emerald-700",
                  importing && "opacity-60 cursor-not-allowed"
                )}
              >
                {importing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-700 rounded-full" />
                ) : (
                  <>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                      <Upload size={20} className="text-emerald-500" />
                    </div>
                    <span className="font-black text-xs sm:text-sm">Upload Excel (.xlsx)</span>
                  </>
                )}
              </motion.div>
            </label>

            <AnimatePresence>
              {importSummary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl"
                >
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 size={12} /> Sync Summary
                  </p>
                  <div className="flex justify-between">
                    <div className="text-center flex-1 border-r border-indigo-100">
                      <p className="text-xl font-black text-indigo-700">{importSummary.added}</p>
                      <p className="text-[10px] font-bold text-indigo-400">ADDED</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xl font-black text-slate-400">{importSummary.skipped}</p>
                      <p className="text-[10px] font-bold text-slate-400">SKIPPED</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                 Ensure columns are named <strong>"Shop Name"</strong> and <strong>"Location"</strong> for automatic mapping.
               </p>
            </div>
          </motion.div>
        </div>

        {/* ── Right Column: Shops Directory ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Search Header */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <input
                type="text"
                placeholder="Find outlet by name or area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-bold shadow-sm"
              />
              <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            
            <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] flex items-center gap-3 shadow-sm min-w-[150px]">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Directory Live</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {filteredShops.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24 bg-white/30 rounded-[3rem] border border-dashed border-slate-200"
                >
                  <Store size={64} className="mx-auto mb-4 text-slate-200" />
                  <p className="font-black text-slate-400 text-xl tracking-tight">No outlets discovered</p>
                  <p className="text-slate-400 text-sm font-medium">Refine your search or add a new shop</p>
                </motion.div>
              ) : (
                filteredShops.map((shop, index) => (
                  <motion.div
                    key={shop.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                    className="group flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-indigo-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
                  >
                    {/* Shop Brand Icon */}
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shadow-inner flex-shrink-0 group-hover:from-indigo-600 group-hover:to-blue-600 transition-all duration-500">
                      <span className="text-slate-400 group-hover:text-white font-black text-2xl transition-colors">
                        {shop.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 px-2">
                      {editingId === shop.id ? (
                        <div className="space-y-2 py-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-indigo-200 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            autoFocus
                          />
                          <div className="relative">
                            <input
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-indigo-100 rounded-xl text-slate-600 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                              placeholder="Location"
                            />
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={saveEdit} className="px-4 py-2 bg-emerald-500 text-white font-black rounded-lg text-xs hover:bg-emerald-600 transition-all flex items-center gap-1.5"><Check size={14} /> SAVE</button>
                            <button onClick={cancelEdit} className="px-4 py-2 bg-slate-100 text-slate-500 font-black rounded-lg text-xs hover:bg-slate-200 transition-all flex items-center gap-1.5"><X size={14} /> CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h4 className="font-black text-xl text-slate-900 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                            {shop.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                             <div className="flex items-center gap-1.5 text-slate-400">
                                <MapPin size={14} className="text-indigo-400" />
                                <span className="text-sm font-bold truncate max-w-[200px]">{shop.location || 'Unknown Location'}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">Live Outlet</span>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 justify-end">
                      {editingId !== shop.id && (
                        <>
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => startEdit(shop)} 
                            className="p-3.5 text-indigo-500 hover:bg-indigo-50 rounded-2xl transition-all"
                          >
                            <Edit2 size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(shop.id, shop.name)} 
                            className="p-3.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

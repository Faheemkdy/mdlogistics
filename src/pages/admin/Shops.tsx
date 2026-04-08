import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, Plus, MapPin, Edit2, X, Check, Upload, Search, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export const Shops = () => {
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
    await supabase.from('shops').insert([{ name, location }]);
    setName(''); setLocation('');
    fetchShops();
    setLoading(false);
  };

  const startEdit = (shop: any) => { setEditingId(shop.id); setEditName(shop.name); setEditLocation(shop.location); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditLocation(''); };
  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    await supabase.from('shops').update({ name: editName, location: editLocation }).eq('id', editingId);
    setEditingId(null);
    fetchShops();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this shop?')) {
      await supabase.from('shops').delete().eq('id', id);
      fetchShops();
    }
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
        if (data.length === 0) { alert('Excel file is empty.'); setImporting(false); return; }
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
        fetchShops();
      } catch (err: any) {
        alert('Error importing Excel: ' + err.message);
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Shops</h1>
        <p className="text-slate-500 font-medium mt-1">{shops.length} shop{shops.length !== 1 ? 's' : ''} registered</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Add Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
          className="lg:col-span-1 space-y-5"
        >
          {/* Add Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Store size={18} className="text-white" />
              </div>
              <h3 className="font-black text-lg text-slate-800">Add New Shop</h3>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input label="Shop Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter shop name" />
              <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Area / City" />
              <Button type="submit" isLoading={loading} className="w-full mt-1">
                <Plus size={20} /> Add Shop
              </Button>
            </form>
          </div>

          {/* Bulk Import Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            <h4 className="font-black text-sm text-slate-600 uppercase tracking-widest mb-4">Bulk Import</h4>
            <input type="file" id="excel-upload" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={importing} />
            <label htmlFor="excel-upload" className="block">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={clsx(
                  'flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all border',
                  'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200 hover:shadow-md',
                  importing && 'opacity-60 cursor-not-allowed'
                )}
              >
                {importing
                  ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
                  : <><Upload size={16} /> Import from Excel</>
                }
              </motion.div>
            </label>
            <AnimatePresence>
              {importSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs"
                >
                  <p className="text-blue-700 font-bold flex items-center gap-1.5 mb-1.5"><Check size={13} /> Import Complete</p>
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>✅ Added: {importSummary.added}</span>
                    <span>⏭ Skipped: {importSummary.skipped}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
              Excel must have <strong>"Shop Name"</strong> and <strong>"Location"</strong> columns.
            </p>
          </div>
        </motion.div>

        {/* Right: Shops List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shops..."
              className="w-full bg-white/80 backdrop-blur-md rounded-2xl pl-12 pr-4 py-4 font-medium text-slate-800 outline-none shadow-[0_4px_12px_rgb(0,0,0,0.02)] border border-white focus:border-blue-500/20 focus:bg-white transition-all"
            />
          </div>

          {/* List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            <AnimatePresence>
              {filteredShops.map((shop, index) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
                >
                  {/* Shop Icon */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-black text-lg">{shop.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {editingId === shop.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="!py-2" autoFocus />
                      <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="!py-2" placeholder="Location" />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-base leading-tight truncate">{shop.name}</p>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mt-0.5">
                        <MapPin size={12} className="text-blue-400 flex-shrink-0" />
                        <span className="truncate">{shop.location || 'No location'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === shop.id ? (
                      <>
                        <Button onClick={saveEdit} className="!p-2.5 text-green-600 !rounded-xl"><Check size={17} /></Button>
                        <Button onClick={cancelEdit} className="!p-2.5 text-slate-500 !rounded-xl"><X size={17} /></Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => startEdit(shop)} className="!p-2.5 text-blue-500 !rounded-xl"><Edit2 size={17} /></Button>
                        <Button onClick={() => handleDelete(shop.id)} className="!p-2.5 text-red-500 !rounded-xl" variant="danger"><Trash2 size={17} /></Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredShops.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Store size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">No shops found</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

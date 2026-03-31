import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, Plus, MapPin, Edit2, X, Check, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export const Shops = () => {
  const [shops, setShops] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  
  // Excel Upload State
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ added: number, skipped: number } | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    setShops(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await supabase.from('shops').insert([{ name, location }]);
    setName('');
    setLocation('');
    fetchShops();
    setLoading(false);
  };

  const startEdit = (shop: any) => {
    setEditingId(shop.id);
    setEditName(shop.name);
    setEditLocation(shop.location);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditLocation('');
  };

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
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert('Excel file is empty.');
          setImporting(false);
          return;
        }

        // Fetch all existing shops to check for duplicates locally (name + location)
        const { data: existingShops } = await supabase.from('shops').select('name, location');
        const existingSet = new Set(
          (existingShops || []).map(s => `${s.name.toLowerCase().trim()}|${(s.location || '').toLowerCase().trim()}`)
        );

        const newShops: any[] = [];
        let skippedCount = 0;

        data.forEach(row => {
          // Try to find Name and Location columns (case insensitive)
          const rowKeys = Object.keys(row);
          const nameKey = rowKeys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('shop'));
          const locationKey = rowKeys.find(k => k.toLowerCase().includes('location') || k.toLowerCase().includes('place') || k.toLowerCase().includes('area'));

          const shopName = nameKey ? String(row[nameKey] || '').trim() : '';
          const shopLocation = locationKey ? String(row[locationKey] || '').trim() : '';

          if (shopName) {
            const key = `${shopName.toLowerCase()}|${shopLocation.toLowerCase()}`;
            if (existingSet.has(key)) {
              skippedCount++;
            } else {
              newShops.push({ name: shopName, location: shopLocation });
              existingSet.add(key); // Mark as added to avoid duplicates within the same Excel
            }
          }
        });

        if (newShops.length > 0) {
          const { error } = await supabase.from('shops').insert(newShops);
          if (error) throw error;
        }

        setImportSummary({ added: newShops.length, skipped: skippedCount });
        fetchShops();
      } catch (err: any) {
        alert('Error importing Excel: ' + err.message);
      } finally {
        setImporting(false);
        // Clear input
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">Shops Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card delay={0.1} className="lg:col-span-1 h-fit">
          <h3 className="font-bold text-lg mb-6 text-slate-700">Add New Shop</h3>
          <form onSubmit={handleAdd} className="space-y-5">
            <Input 
              label="Shop Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter shop name"
            />
            <Input 
              label="Location" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Area / City"
            />
            <Button type="submit" isLoading={loading} className="w-full mt-2">
              <Plus size={20} /> Add Shop
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Bulk Import</h4>
            <input 
              type="file" 
              id="excel-upload" 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleExcelUpload}
              disabled={importing}
            />
            <label htmlFor="excel-upload" className="block w-full">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className={clsx(
                  "px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 outline-none border border-white/40 overflow-hidden cursor-pointer",
                  "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
                  importing && "opacity-70 cursor-not-allowed"
                )}
              >
                {importing ? (
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={18} className="mr-2" /> Import from Excel
                  </>
                )}
              </motion.div>
            </label>
            
            <AnimatePresence>
              {importSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs flex flex-col gap-1"
                >
                  <p className="text-blue-700 font-bold flex items-center gap-1.5">
                    <Check size={14} /> Import Complete
                  </p>
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Added: {importSummary.added}</span>
                    <span>Skipped: {importSummary.skipped}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <p className="text-[10px] text-slate-400 mt-3 px-1 leading-relaxed">
              * Excel should have columns like <strong>"Shop Name"</strong> and <strong>"Location"</strong>.
            </p>
          </div>
        </Card>

        <Card delay={0.2} className="lg:col-span-2">
          <div className="mb-6">
             <Input 
                placeholder="Search shops..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
            <AnimatePresence>
              {filteredShops.map((shop, index) => (
                <motion.div 
                  key={shop.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center justify-between p-5 bg-[#e0e5ec] rounded-2xl shadow-[inset_4px_4px_8px_rgb(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.6)] border border-white/30"
                >
                  {editingId === shop.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-3 mr-4">
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        className="!py-2"
                      />
                      <Input 
                        value={editLocation} 
                        onChange={(e) => setEditLocation(e.target.value)} 
                        className="!py-2"
                      />
                    </div>
                  ) : (
                    <div className="pl-2">
                      <h4 className="font-bold text-lg text-slate-800">{shop.name}</h4>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-1">
                        <MapPin size={14} className="text-blue-400" />
                        {shop.location || 'No location'}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {editingId === shop.id ? (
                      <>
                        <Button onClick={saveEdit} className="!p-2.5 text-green-600 !rounded-xl"><Check size={18} /></Button>
                        <Button onClick={cancelEdit} className="!p-2.5 text-slate-500 !rounded-xl"><X size={18} /></Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => startEdit(shop)} className="!p-2.5 text-blue-500 !rounded-xl"><Edit2 size={18} /></Button>
                        <Button onClick={() => handleDelete(shop.id)} className="!p-2.5 text-red-500 !rounded-xl" variant="danger"><Trash2 size={18} /></Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredShops.length === 0 && (
              <p className="text-center text-slate-400 py-8 font-medium">No shops found.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

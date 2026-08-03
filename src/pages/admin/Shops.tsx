import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import {
  Trash2, Plus, MapPin, Edit2, X, Check, Upload, Search,
  Store, LayoutGrid, FileSpreadsheet, CheckCircle2, ChevronLeft, ChevronRight, Rate
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useSupabasePagination } from '../../hooks/useSupabasePagination';

export const Shops = () => {
  const toast = useToast();
  const [name, setName] = useState(() => localStorage.getItem('shops_draft_name') || '');
  const [location, setLocation] = useState(() => localStorage.getItem('shops_draft_location') || '');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ added: number; skipped: number } | null>(null);
  
  const {
    data: shops,
    loading,
    searchQuery: search,
    setSearchQuery: setSearch,
    hasMore,
    totalCount,
    refetch,
    currentPage,
    goToPage
  } = useSupabasePagination({
    table: 'shops',
    searchFields: ['name', 'location'],
    limit: 30,
    mode: 'page'
  });
  
  // Location Rates States
  const [showRates, setShowRates] = useState(false);
  const [locationRates, setLocationRates] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocRate, setNewLocRate] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [showLocDropdown, setShowLocDropdown] = useState(false);

  // Edit Location Rates states
  const [editingLocId, setEditingLocId] = useState<string | null>(null);

  // Persistence
  useEffect(() => { localStorage.setItem('shops_draft_name', name); }, [name]);
  useEffect(() => { localStorage.setItem('shops_draft_location', location); }, [location]);

  useEffect(() => { 
    fetchLocationRates();
    fetchRouteLocations();
  }, []);

  const fetchRouteLocations = async () => {
    const { data } = await supabase.from('route_locations').select('location_name');
    if (data) {
      setAvailableLocations(data.map(d => d.location_name));
    }
  };

  const fetchLocationRates = async () => {
    const { data } = await supabase.from('location_rates').select('*').order('location_name');
    setLocationRates(data || []);
  };

  const handleAddLocationRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName || !newLocRate) return;
    setLocLoading(true);
    
    const { error } = editingLocId 
      ? await supabase.from('location_rates').update({ location_name: newLocName.trim(), rate: parseFloat(newLocRate) }).eq('id', editingLocId)
      : await supabase.from('location_rates').insert([{ location_name: newLocName.trim(), rate: parseFloat(newLocRate) }]);
    if (error) toast.error('Failed to add rate', error.message);
    else {
      toast.success(editingLocId ? 'Rate updated!' : 'Rate added!');
      setNewLocName(''); setNewLocRate('');
      setEditingLocId(null);
      fetchLocationRates();
    }
    setLocLoading(false);
  };

  const startEditLocRate = (rate: any) => {
    setEditingLocId(rate.id);
    setNewLocName(rate.location_name);
    setNewLocRate(rate.rate != null ? rate.rate.toString() : '');
  };

  const cancelLocEdit = () => {
    setEditingLocId(null);
    setNewLocName('');
    setNewLocRate('');
  };

  const handleDeleteLocationRate = async (id: string) => {
    const { error } = await supabase.from('location_rates').delete().eq('id', id);
    if (error) toast.error('Delete failed', error.message);
    else {
      toast.success('Rate deleted');
      fetchLocationRates();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Duplicate Check: Same name and place (case-insensitive)
    const isDuplicate = shops.some(s => 
      s.name.toLowerCase().trim() === name.toLowerCase().trim() && 
      (s.location || '').toLowerCase().trim() === (location || '').toLowerCase().trim()
    );

    if (isDuplicate) {
      toast.warning('Duplicate Shop', `A shop with the name "${name}" at "${location || 'this location'}" already exists.`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('shops').insert([{ name: name.trim(), location: location.trim() }]);
    if (error) { toast.error('Failed to add shop', error.message); }
    else { 
      toast.success('Shop added!', `"${name}" has been registered.`); 
      setName(''); setLocation('');
      localStorage.removeItem('shops_draft_name');
      localStorage.removeItem('shops_draft_location');
      refetch();
    }
    setSubmitting(false);
  };

  const startEdit = (shop: any) => { setEditingId(shop.id); setEditName(shop.name); setEditLocation(shop.location || ''); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditLocation(''); };
  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    const { error } = await supabase.from('shops').update({ name: editName.trim(), location: editLocation.trim() }).eq('id', editingId);
    if (error) { toast.error('Update failed', error.message); return; }
    toast.success('Shop updated!');
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: string, shopName: string) => {
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) { toast.error('Delete failed', error.message); return; }
    toast.success('Shop removed', `"${shopName}" has been deleted.`);
    refetch();
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
        refetch();
      } catch (err: any) {
        toast.error('Import failed', err.message);
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const uniqueShopLocations = Array.from(new Set(
    shops.map(s => (s.location || '').trim())
         .filter(Boolean)
         .map(loc => loc.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '))
  )).sort();

  const getInitials = (shopName: string) => {
    if (!shopName) return '??';
    const clean = shopName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return shopName.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="w-full space-y-4 pb-20">
      
      {/* ── Page Header Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 lg:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight leading-tight">
              Partner Outlets
            </h1>
          </div>
          <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 pl-0.5">
            <LayoutGrid size={13} className="text-indigo-500" />
            Control and monitor your retail network of partner shops
          </p>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowRates(!showRates)}
            className={clsx(
              "px-3.5 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold shadow-sm active:scale-95",
              showRates 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20" 
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
            )}
          >
            <FileSpreadsheet size={15} />
            <span>Rates ({locationRates.length})</span>
          </button>

          <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl flex items-center gap-2 shadow-md shadow-indigo-500/20">
            <span className="text-xs font-black uppercase tracking-wider">Total Shops:</span>
            <span className="text-base font-black">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* ── Location Rates Drawer / Panel ── */}
      <AnimatePresence>
        {showRates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-md space-y-4 mb-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h3 className="font-black text-sm text-gray-900">Location-wise Shipping Rates</h3>
                </div>
                <button onClick={() => setShowRates(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form */}
                <form onSubmit={handleAddLocationRate} className="space-y-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {editingLocId ? 'Update Existing Rate' : 'Add New Location Rate'}
                  </p>
                  <div className="relative">
                    <input 
                      placeholder="Location Name (e.g. Kozhikode)" 
                      value={newLocName} 
                      onChange={e => { setNewLocName(e.target.value); setShowLocDropdown(true); }}
                      onFocus={() => setShowLocDropdown(true)}
                      className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                    
                    <AnimatePresence>
                      {showLocDropdown && !editingLocId && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-[100] left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-[180px] overflow-y-auto custom-scrollbar"
                        >
                          {uniqueShopLocations.filter(loc => loc.toLowerCase().includes(newLocName.toLowerCase())).length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400 italic">No matching locations found</div>
                          ) : (
                            uniqueShopLocations.filter(loc => loc.toLowerCase().includes(newLocName.toLowerCase())).map(loc => (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => { setNewLocName(loc); setShowLocDropdown(false); }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 text-gray-700 text-xs font-semibold transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between"
                              >
                                {loc}
                                <Plus size={13} className="text-indigo-400" />
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {showLocDropdown && !editingLocId && (
                      <div className="fixed inset-0 z-[90]" onClick={() => setShowLocDropdown(false)} />
                    )}
                  </div>

                  <input 
                    type="number" 
                    placeholder="Rate per item (e.g. 20)" 
                    value={newLocRate} 
                    onChange={e => setNewLocRate(e.target.value)} 
                    className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={locLoading}
                      className={clsx(
                        "flex-1 h-9 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm",
                        editingLocId ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
                      )}
                    >
                      {editingLocId ? 'Update Rate' : 'Set Rate'}
                    </button>
                    {editingLocId && (
                      <button
                        type="button"
                        onClick={cancelLocEdit}
                        className="px-4 h-9 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Existing Rates List */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Defined Location Rates</p>
                  <div className="max-h-[190px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {locationRates.length === 0 ? (
                      <p className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 rounded-xl">No rates defined yet.</p>
                    ) : (
                      locationRates.map(rate => (
                        <div key={rate.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group">
                          <div>
                            <span className="font-bold text-gray-800 text-xs">{rate.location_name}</span>
                            <span className="ml-2.5 text-xs font-black text-indigo-600">₹{rate.rate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEditLocRate(rate)} className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDeleteLocationRate(rate.id)} className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Controls: Add Outlet + Excel Import ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Add Outlet Form */}
        <div className="xl:col-span-2 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-white p-4 lg:p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Plus size={16} strokeWidth={3} />
            </div>
            <h3 className="font-black text-sm text-gray-900 tracking-tight">Register New Outlet</h3>
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-0.5">Establishment Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Moonlight Cafe"
                className="w-full h-10 px-3.5 bg-white border border-indigo-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-0.5">Geographic Location</label>
              <div className="relative">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Area / Landmark"
                  list="partner-locations-list"
                  className="w-full h-10 pl-9 pr-3.5 bg-white border border-indigo-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
              </div>
              
              <datalist id="partner-locations-list">
                {Array.from(new Set([...availableLocations, ...(shops || []).map(s => (s.location || '').trim())].filter(Boolean)))
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                  .map(loc => (
                    <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className={clsx(
                  'h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md',
                  name.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                )}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={16} strokeWidth={3} />
                )}
                Add Outlet
              </button>
            </div>
          </form>
        </div>

        {/* Excel Import Box */}
        <div className="bg-white p-4 lg:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet size={16} />
            </div>
            <h4 className="font-black text-xs text-gray-700 uppercase tracking-wider">Bulk Migration</h4>
          </div>

          <input type="file" id="excel-upload" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={importing} />
          <label htmlFor="excel-upload" className="block cursor-pointer">
            <div className={clsx(
              "flex items-center justify-center gap-2 h-11 px-4 rounded-xl border-2 border-dashed transition-all",
              "border-emerald-200 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50",
              importing && "opacity-60 cursor-not-allowed"
            )}>
              {importing ? (
                <span className="w-4 h-4 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
              ) : (
                <>
                  <Upload size={16} className="text-emerald-600" />
                  <span className="font-bold text-xs">Upload Excel (.xlsx)</span>
                </>
              )}
            </div>
          </label>

          {importSummary && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs flex justify-around">
              <span className="font-bold text-emerald-800">Added: {importSummary.added}</span>
              <span className="font-bold text-gray-500">Skipped: {importSummary.skipped}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white p-3.5 lg:p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Find outlet by name or area location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-10 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 text-xs font-bold text-gray-500">
            <span>{search.trim() ? 'Search Results' : 'All Outlets'}</span>
            <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-[11px]">{totalCount} Total</span>
          </div>
        </div>
      </div>

      {/* ── Outlets Responsive Cards Grid ── */}
      {loading && shops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
          <p className="text-gray-400 text-xs font-medium mt-2">Loading partner outlets...</p>
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
          <Store size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-bold text-sm">No outlets discovered</p>
          <p className="text-gray-400 text-xs mt-1">Try another search term or register a new outlet above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {shops.map((shop: any) => (
              <motion.div
                key={shop.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Initials Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {getInitials(shop.name)}
                  </div>

                  {/* Shop Info / Edit Inputs */}
                  <div className="min-w-0 flex-1">
                    {editingId === shop.id ? (
                      <div className="space-y-1.5">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-indigo-50 border border-indigo-300 rounded-lg px-2 py-1 font-bold text-gray-900 text-xs focus:outline-none"
                          placeholder="Shop Name"
                          autoFocus
                        />
                        <input
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 font-semibold text-gray-700 text-xs focus:outline-none"
                          placeholder="Location"
                        />
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {shop.name}
                        </h4>
                        {shop.location && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-indigo-400 flex-shrink-0" />
                            <span className="text-[11px] text-gray-500 truncate">{shop.location}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Row: Status & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <Check size={10} strokeWidth={3} /> Live
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {editingId === shop.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="w-7 h-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-sm"
                          title="Save"
                        >
                          <Check size={13} strokeWidth={3} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(shop)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(shop.id, shop.name)}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {(hasMore || currentPage > 0) && (
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            disabled={currentPage === 0} 
            onClick={() => goToPage(currentPage - 1)}
            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-colors border border-gray-200"
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-xs font-bold text-gray-500">
            Page {currentPage + 1}
          </span>
          <button 
            disabled={!hasMore} 
            onClick={() => goToPage(currentPage + 1)}
            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-colors border border-gray-200"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

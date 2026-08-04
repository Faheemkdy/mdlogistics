import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Search, Check, MapPin, Truck, Plus, X, Hash, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { isFuzzyMatch, sortSearchResults } from '../../utils/search';
import { formatReportDate } from '../../utils/dateUtils';

export const Delivery = () => {
  const { user, profile } = useAuth();
  const toast = useToast();
  interface Shop {
    id: string;
    name: string;
    location: string | null;
  }

  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // Load initial state with 5-hour expiration check
  const [initialSearch] = useState(() => {
    const saved = localStorage.getItem('delivery_draft_search');
    const timestamp = localStorage.getItem('delivery_draft_timestamp');
    const now = Date.now();
    const fiveHours = 5 * 60 * 60 * 1000;
    
    if (timestamp && now - parseInt(timestamp) > fiveHours) {
      localStorage.removeItem('delivery_draft_search');
      localStorage.removeItem('delivery_draft_selections');
      localStorage.removeItem('delivery_draft_date');
      localStorage.removeItem('delivery_draft_timestamp');
      return '';
    }
    return saved || '';
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const saved = localStorage.getItem('delivery_draft_date');
    const timestamp = localStorage.getItem('delivery_draft_timestamp');
    const now = Date.now();
    const fiveHours = 5 * 60 * 60 * 1000;
    
    if (timestamp && now - parseInt(timestamp) > fiveHours) {
      return new Date().toISOString().split('T')[0];
    }
    return saved || new Date().toISOString().split('T')[0];
  });

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Fetch all shops on mount
  useEffect(() => {
    const fetchAllShops = async () => {
      try {
        setLoadingShops(true);
        const { data, error } = await supabase
          .from('shops')
          .select('id, name, location')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setShops(data || []);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to load shops', err.message);
      } finally {
        setLoadingShops(false);
      }
    };
    fetchAllShops();
  }, []);

  const filteredShops = React.useMemo(() => {
    if (!search.trim()) return shops;
    const filtered = shops.filter(shop => 
      isFuzzyMatch(shop.name, search) || 
      (shop.location && isFuzzyMatch(shop.location, search))
    );
    return sortSearchResults(filtered, search, shop => shop.name);
  }, [shops, search]);

  const [visibleCount, setVisibleCount] = useState(40);
  
  useEffect(() => {
    setVisibleCount(40);
  }, [search]);

  const paginatedShops = React.useMemo(() => {
    return filteredShops.slice(0, visibleCount);
  }, [filteredShops, visibleCount]);

  const hasMore = filteredShops.length > visibleCount;
  const loadMore = () => setVisibleCount(prev => prev + 40);
  const loadingMore = false;
  const totalCount = filteredShops.length;

  const [loading, setLoading] = useState(false);
  const [isDirectDelivery, setIsDirectDelivery] = useState(false);
  const currentHour = new Date().getHours();
  const [shift, setShift] = useState<'morning' | 'evening'>(currentHour < 12 ? 'morning' : 'evening');
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('delivery_draft_selections');
    const timestamp = localStorage.getItem('delivery_draft_timestamp');
    const now = Date.now();
    const fiveHours = 5 * 60 * 60 * 1000;
    
    if (timestamp && now - parseInt(timestamp) > fiveHours) return {};
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    const fetchLocs = async () => {
      const { data } = await supabase.from('route_locations').select('location_name');
      const routeLocs = data ? data.map(d => d.location_name) : [];
      const shopLocs = shops.map(s => s.location);
      const combined = Array.from(new Set([...routeLocs, ...shopLocs].map(l => (l||'').trim()).filter(Boolean)));
      setAvailableLocations(combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    };
    if (shops.length > 0) fetchLocs();
  }, [shops]);
  const [addingShop, setAddingShop] = useState(false);

  // Persist state to localStorage with timestamp
  useEffect(() => {
    localStorage.setItem('delivery_draft_search', search);
    localStorage.setItem('delivery_draft_timestamp', Date.now().toString());
  }, [search]);

  useEffect(() => {
    localStorage.setItem('delivery_draft_selections', JSON.stringify(selections));
    localStorage.setItem('delivery_draft_timestamp', Date.now().toString());
  }, [selections]);

  useEffect(() => {
    localStorage.setItem('delivery_draft_date', selectedDate);
    localStorage.setItem('delivery_draft_timestamp', Date.now().toString());
  }, [selectedDate]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(selections).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selections]);

  const handleQuickAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    setAddingShop(true);
    try {
      // Check for duplicates
      const { data: existingShops } = await supabase
        .from('shops')
        .select('id, location')
        .ilike('name', newShopName.trim());
        
      const duplicate = existingShops?.find(s => (s.location || '').toLowerCase() === newShopLocation.trim().toLowerCase());
      
      if (duplicate) {
        toast.error('Shop already exists', 'This shop is already in the system.');
        return;
      }

      const { data, error } = await supabase
        .from('shops').insert([{ name: newShopName.trim(), location: newShopLocation.trim() }])
        .select().single();
      if (error) throw error;
      
      setShops(prev => [data, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      toggleShop(data.id);
      setSearch(newShopName.trim());
      setNewShopName(''); setNewShopLocation('');
      setIsAddModalOpen(false);
      toast.success('Shop added!', `"${data.name}" selected for delivery.`);
    } catch (err: any) { toast.error('Failed to add shop', err.message); }
    finally { setAddingShop(false); }
  };

  const handleDeliver = async () => {
    const shopIds = Object.keys(selections);
    if (shopIds.length === 0 || !user) return;
    setLoading(true);
    
    const deliveryData = shopIds.map(id => ({
      shop_id: id, user_id: user.id,
      date: selectedDate || new Date().toISOString().split('T')[0],
      item_number: selections[id] || null,
      shift: shift
    }));

    try {
      // Try to save directly if online
      if (navigator.onLine) {
        const { error } = await supabase.from('deliveries').insert(deliveryData);
        if (error) throw error;
        
        if (isDirectDelivery) {
          const { error: dispatchError } = await supabase.from('dispatches').insert(deliveryData);
          if (dispatchError) console.error("Failed auto-dispatch:", dispatchError);
        }
        
        toast.success('Deliveries recorded!', `${shopIds.length} shop(s) delivered.`);
      } else {
        // Queue for later if offline
        const { offlineSync } = await import('../../lib/offlineSync');
        await offlineSync.addItem('delivery', deliveryData);
        if (isDirectDelivery) await offlineSync.addItem('dispatch', deliveryData);
        toast.success('Saved to offline queue', 'Will sync when connection is restored.');
      }

      setSelections({});
      ['delivery_draft_selections', 'delivery_draft_search', 'delivery_draft_date', 'delivery_draft_timestamp'].forEach(k => localStorage.removeItem(k));
      setSelectedDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      // If it's a network error, queue it anyway
      if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        const { offlineSync } = await import('../../lib/offlineSync');
        await offlineSync.addItem('delivery', deliveryData);
        if (isDirectDelivery) await offlineSync.addItem('dispatch', deliveryData);
        toast.success('Saved to offline queue', 'Network error detected. Data will sync later.');
        
        setSelections({});
        ['delivery_draft_selections', 'delivery_draft_date'].forEach(k => localStorage.removeItem(k));
        setSelectedDate(new Date().toISOString().split('T')[0]);
      } else {
        toast.error('Failed to save deliveries', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleShop = (id: string) =>
    setSelections(prev => { const n = { ...prev }; if (n[id] !== undefined) delete n[id]; else n[id] = ''; return n; });

  const updateItemNumber = (id: string, val: string) =>
    setSelections(prev => ({ ...prev, [id]: val }));

  const selectedCount = Object.keys(selections).length;

  // Selected Shop Objects for tag chips rendering
  const selectedShopObjects = React.useMemo(() => {
    const ids = Object.keys(selections);
    return ids.map(id => shops.find(s => s.id === id)).filter((s): s is Shop => Boolean(s));
  }, [selections, shops]);

  // Helper for generating initial avatars
  const getInitials = (name: string) => {
    if (!name) return '??';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return name.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28">
      {/* ── Main Full-Width Edge-to-Edge Container ── */}
      <div className="w-full space-y-3">
        
        {/* ── Page Title Header Card ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 lg:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight leading-tight">
              New Delivery
            </h1>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">
              {selectedCount > 0 ? `${selectedCount} shop(s) selected for delivery` : 'Tap to mark delivery'}
            </p>
          </div>

          {/* Green DELIVERY Badge */}
          <div className="self-start sm:self-center inline-flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md shadow-green-500/20 uppercase tracking-wider flex-shrink-0">
            <Truck size={14} /> DELIVERY
          </div>
        </div>

        {/* ── Desktop/Mobile Controls Card: Date + Search Side by Side ── */}
        <div className="bg-white p-3.5 lg:p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            
            {/* Date Picker Card */}
            <div className="relative bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl px-3.5 py-2.5 transition-all flex items-center justify-between cursor-pointer group w-full md:w-60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Calendar size={17} className="text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-800">
                  {formatReportDate(selectedDate, 'dd MMM yyyy')}
                </span>
              </div>
              <ChevronDown size={16} className="text-gray-400 group-hover:text-green-500 transition-colors" />
              
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                onClick={e => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
            </div>

            {/* Search Input Box + Add Shop Button */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  placeholder="Type shop name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Quick Add Shop Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="h-10 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-green-500/20 transition-all active:scale-95 flex-shrink-0"
                title="Add new shop"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Add Shop</span>
              </button>
            </div>
          </div>

          {/* Search Helper Subtitle */}
          <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 pt-0.5 pl-0.5">
            {search.trim() ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block" />
                Searching shops...
              </>
            ) : (
              <>
                <span className="text-green-500 font-bold">⚡</span> Start typing to search shops for delivery
              </>
            )}
          </p>
        </div>

        {/* ── SHOPS LIST SECTION ── */}
        <div className="space-y-3 pt-1">

          {/* Selected Shops Tag Chips */}
          {selectedCount > 0 && (
            <div className="bg-green-50/60 border border-green-100/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">
                  Selected Shops ({selectedCount})
                </span>
                <button
                  onClick={() => setSelections({})}
                  className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors"
                >
                  Clear all
                </button>
              </div>

              {/* Tag Chips Container */}
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pt-0.5">
                {selectedShopObjects.map(shop => (
                  <div
                    key={shop.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-green-200 rounded-full text-xs font-bold text-green-800 shadow-sm transition-all"
                  >
                    <span>{shop.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleShop(shop.id); }}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-green-100 text-green-600 hover:text-green-900 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-700">
              {search.trim() ? 'Search Results' : 'All Shops'}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {search.trim() ? `(${filteredShops.length} found)` : `Total ${totalCount}`}
            </span>
          </div>

          {/* Shops Loader */}
          {loadingShops && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <span className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-gray-400 text-xs font-medium mt-2">Loading shops...</p>
            </div>
          )}

          {/* Shops Full-Width Responsive Grid (3-4 columns on desktop / 1-column on mobile) */}
          {!loadingShops && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedShops.map((shop) => {
                const isSelected = selections[shop.id] !== undefined;
                const isSearching = search.trim().length > 0;

                return (
                  <div
                    key={shop.id}
                    onClick={() => toggleShop(shop.id)}
                    className={clsx(
                      'rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden',
                      isSelected
                        ? 'bg-green-50/70 border-green-300 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    )}
                  >
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Initials Avatar */}
                        <div className={clsx(
                          'w-9 h-9 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm transition-transform',
                          isSelected
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-105'
                            : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                        )}>
                          {getInitials(shop.name)}
                        </div>

                        {/* Shop Info */}
                        <div className="min-w-0">
                          <p className={clsx(
                            'font-bold text-xs sm:text-sm truncate transition-colors',
                            isSelected ? 'text-green-950' : 'text-gray-900'
                          )}>
                            {shop.name}
                          </p>
                          {shop.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className={clsx('flex-shrink-0', isSelected ? 'text-green-500' : 'text-gray-400')} />
                              <span className="text-[11px] text-gray-500 truncate">{shop.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Selection Button */}
                      <div className="flex-shrink-0 pl-1">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm shadow-green-500/30">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : isSearching ? (
                          <div className="w-5 h-5 rounded-full border-2 border-green-400 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all">
                            <Plus size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center" />
                        )}
                      </div>
                    </div>

                    {/* Optional Quantity Input when Selected */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-0" onClick={e => e.stopPropagation()}>
                        <div className="bg-white rounded-xl p-2 border border-green-200 flex items-center gap-2 shadow-inner">
                          <Hash size={13} className="text-green-500 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Item count (optional)..."
                            value={selections[shop.id] || ''}
                            onChange={e => updateItemNumber(shop.id, e.target.value)}
                            className="w-full text-xs font-bold text-gray-800 placeholder-green-300 focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loadingShops && filteredShops.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
              <Search size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-bold text-sm">No shops found</p>
              <p className="text-gray-400 text-xs mt-1 mb-4">Try searching another shop name</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                <Plus size={14} /> Add New Shop
              </button>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-xs hover:bg-green-100 transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load More Shops'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sleek Floating Action Bar at Bottom ── */}
      {selectedCount > 0 && (
        <div
          className={clsx(
            "fixed bottom-4 z-40 px-4 transition-all duration-300 pointer-events-none",
            profile?.role === 'admin'
              ? "left-0 lg:left-72 right-0"
              : "left-0 right-0"
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
            {/* Left Info & Shift Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 flex-shrink-0 font-black text-sm">
                  {selectedCount}
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-sm leading-none">
                    {selectedCount === 1 ? '1 Shop Selected' : `${selectedCount} Shops Selected`}
                  </p>
                  <p className="text-gray-400 text-[10px] font-semibold mt-0.5">
                    Ready for delivery confirmation
                  </p>
                </div>
              </div>

              {/* Shift & Direct Checkbox */}
              <div className="flex items-center gap-2">
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as 'morning' | 'evening')}
                  className="bg-gray-50 text-[10px] font-bold text-gray-700 uppercase tracking-wide border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>

                <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={isDirectDelivery} 
                    onChange={(e) => setIsDirectDelivery(e.target.checked)}
                    className="w-3.5 h-3.5 text-green-500 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap">Direct</span>
                </label>
              </div>
            </div>

            {/* Confirm Delivery Button */}
            <button
              onClick={handleDeliver}
              disabled={selectedCount === 0 || loading}
              className={clsx(
                'w-full sm:w-auto flex items-center justify-center gap-2 h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex-shrink-0 shadow-md',
                selectedCount > 0
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              )}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Truck size={15} /> CONFIRM DELIVERY <ChevronRight size={16} strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Add New Shop Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Shop">
        <form onSubmit={handleQuickAddShop} className="space-y-4">
          <Input
            label="Shop Name"
            placeholder="Enter shop name"
            value={newShopName}
            onChange={e => setNewShopName(e.target.value)}
            required
            autoFocus
          />
          
          <Input
            label="Location / Area"
            placeholder="e.g. Kozhikode, Manjeri"
            list="delivery-locations-list"
            value={newShopLocation}
            onChange={e => setNewShopLocation(e.target.value)}
          />
            
          <datalist id="delivery-locations-list">
            {availableLocations.map(loc => (
              <option key={loc} value={loc} />
            ))}
          </datalist>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={addingShop}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none"
            >
              Add & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Truck, Search, ArrowLeft, Calendar, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export const TodayActivity = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickups, setPickups] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pickups' | 'deliveries'>('all');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      // Fetch Pickups
      const { data: pickupsData } = await supabase
        .from('pickups')
        .select('id, date, companies(name), pickup_items(shops(name))')
        .eq('date', today)
        .order('created_at', { ascending: false });

      // Fetch Deliveries
      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('id, item_number, date, shops(name, location)')
        .eq('date', today)
        .order('created_at', { ascending: false });

      setPickups(pickupsData || []);
      setDeliveries(deliveriesData || []);
    } catch (error) {
      console.error('Error fetching today\'s data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPickups = pickups.filter(p =>
    p.companies?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pickup_items?.some((item: any) => item.shops?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDeliveries = deliveries.filter(d =>
    d.item_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.shops?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.shops?.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Today's Activity</h1>
              <p className="text-slate-400 text-sm font-bold flex items-center gap-2 mt-1">
                <Calendar size={14} /> {format(new Date(), 'EEEE, dd MMMM yyyy')}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              placeholder="Search product, shop, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-700 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
            {(['all', 'pickups', 'deliveries'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === tab
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Updating Activity...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pickups Section */}
            {(activeTab === 'all' || activeTab === 'pickups') && (
              <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Package size={16} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Today's Pickups</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {filteredPickups.length} Records
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredPickups.map((pickup, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={pickup.id}
                      className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <Building2 size={24} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800">{pickup.companies?.name}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {pickup.pickup_items?.map((item: any, i: number) => (
                                <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {item.shops?.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                          Pickup
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {filteredPickups.length === 0 && (
                    <div className="py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-center">
                      <p className="text-slate-400 font-medium text-sm">No pickups found for today.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Deliveries Section */}
            {(activeTab === 'all' || activeTab === 'deliveries') && (
              <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                    <Truck size={16} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Today's Deliveries</h3>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {filteredDeliveries.length} Records
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredDeliveries.map((delivery, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={delivery.id}
                      className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors">
                            <MapPin size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-800">{delivery.shops?.name}</h4>
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider">ID: {delivery.item_number}</span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium mt-1 flex items-center gap-1">
                              <MapPin size={12} /> {delivery.shops?.location}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider">
                            Delivered
                          </span>
                          <CheckCircle2 size={16} className="text-teal-500" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredDeliveries.length === 0 && (
                    <div className="py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-center">
                      <p className="text-slate-400 font-medium text-sm">No deliveries found for today.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        <footer className="mt-12 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">MD Logistics · Premium Core</p>
        </footer>
      </div>
    </div>
  );
};

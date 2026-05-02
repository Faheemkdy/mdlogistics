import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, ChevronDown, ChevronUp, Clock, User, FileText, Box, Trash2, Search, Package, Truck, CalendarDays } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { useToast } from '../../components/ui/Toast';
import { getStandardDate, getDateRange } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'pickups' | 'deliveries';

export const Reports = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('pickups');
  const [date, setDate] = useState(getStandardDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [pickupData, setPickupData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'pickups') fetchPickups();
    else fetchDeliveries();
  }, [date, activeTab]);

  const fetchPickups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pickups')
      .select(`id, created_at, companies (id, name), profiles (username), pickup_items ( id, item_number, shops (id, name, location) )`)
      .eq('date', date);
    if (error) console.error(error);
    const grouped = (data || []).reduce((acc: any, curr: any) => {
      const companyId = curr.companies?.id;
      if (!acc[companyId]) acc[companyId] = { id: companyId, name: curr.companies?.name || 'Unknown', items: [] };
      const time = format(new Date(curr.created_at), 'hh:mm a');
      const user = curr.profiles?.username || 'Unknown';
      const shops = curr.pickup_items?.map((pi: any) => ({ ...pi.shops, itemId: pi.id, itemNumber: pi.item_number, pickupTime: time, pickupUser: user })) || [];
      acc[companyId].items.push(...shops);
      return acc;
    }, {});
    setPickupData(Object.values(grouped));
    setLoading(false);
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deliveries')
      .select(`id, created_at, item_number, shops (name, location), profiles (username)`)
      .eq('date', date)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setDeliveryData(data || []);
    setLoading(false);
  };

  const downloadPickupPDF = (companyName: string, items: any[]) => {
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Customer:', companyName, date);
    autoTable(doc, {
      head: [['#', 'Shop', 'Location', 'Item No.', 'Time']],
      body: items.map((item, i) => [i + 1, item.name, item.location || '-', item.itemNumber || '-', item.pickupTime]),
      startY: 75, theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 },
    });
    drawGreenFooter(doc, 'TOTAL SHOPS:', items.length);
    savePDF(doc, `${companyName}_Pickups_${date}.pdf`);
  };

  const downloadAllPickupsPDF = () => {
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Report:', 'Master Pickup Log', date);
    let y = 75; let total = 0;
    pickupData.forEach((c) => {
      total += c.items.length;
      if (y > 250) { doc.addPage(); drawPDFHeader(doc); y = 60; }
      doc.setFontSize(12); doc.setTextColor(79, 70, 229); doc.setFont('helvetica', 'bold');
      doc.text(c.name, 14, y);
      autoTable(doc, {
        head: [['#', 'Shop', 'Location', 'Item No.', 'Time']],
        body: c.items.map((item: any, i: number) => [i + 1, item.name, item.location || '-', item.itemNumber || '-', item.pickupTime]),
        startY: y + 5, theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { cellPadding: 3, fontSize: 10 }, margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    });
    drawGreenFooter(doc, 'TOTAL SHOPS:', total);
    savePDF(doc, `Master_Pickup_${date}.pdf`);
  };

  const downloadDeliveryPDF = () => {
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Report:', 'Daily Delivery Log', date);
    autoTable(doc, {
      head: [['#', 'Shop', 'Location', 'Item No.', 'Time']],
      body: deliveryData.map((d, i) => [i + 1, d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-', format(new Date(d.created_at), 'hh:mm a')]),
      startY: 75, theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 },
    });
    drawGreenFooter(doc, 'TOTAL DELIVERIES:', deliveryData.length);
    savePDF(doc, `Delivery_${date}.pdf`);
  };

  const downloadPickupRangePDF = async (days: number) => {
    const { start, end } = getDateRange(days);
    toast.info('Generating...', `Fetching ${days}-day pickup report`);
    const { data, error } = await supabase.from('pickups')
      .select(`date, created_at, companies (name), pickup_items ( item_number, shops (name, location) )`)
      .gte('date', start).lte('date', end).order('date', { ascending: false });
    if (error || !data?.length) { toast.error('No data', 'No pickups in this range.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Report:', `${days}-Day Pickup Report`, `${format(new Date(start), 'dd MMM')} to ${format(new Date(end), 'dd MMM yyyy')}`);
    const rows: any[] = [];
    data.forEach((p: any) => {
      p.pickup_items?.forEach((item: any) => {
        rows.push([format(new Date(p.date), 'dd/MM/yy'), p.companies?.name || '-', item.shops?.name || '-', item.item_number || '-', format(new Date(p.created_at), 'hh:mm a')]);
      });
    });
    autoTable(doc, { head: [['Date', 'Company', 'Shop', 'Item No.', 'Time']], body: rows, startY: 75, theme: 'grid', headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 3, fontSize: 9 } });
    drawGreenFooter(doc, 'TOTAL ITEMS:', rows.length);
    savePDF(doc, `Pickups_${days}days_${end}.pdf`);
  };

  const downloadDeliveryRangePDF = async (days: number) => {
    const { start, end } = getDateRange(days);
    toast.info('Generating...', `Fetching ${days}-day delivery report`);
    const { data, error } = await supabase.from('deliveries')
      .select(`date, created_at, item_number, shops (name, location)`)
      .gte('date', start).lte('date', end).order('date', { ascending: false });
    if (error || !data?.length) { toast.error('No data', 'No deliveries in this range.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Report:', `${days}-Day Delivery Report`, `${format(new Date(start), 'dd MMM')} to ${format(new Date(end), 'dd MMM yyyy')}`);
    const rows = data.map((d: any) => [format(new Date(d.date), 'dd/MM/yy'), d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-', format(new Date(d.created_at), 'hh:mm a')]);
    autoTable(doc, { head: [['Date', 'Shop', 'Location', 'Item No.', 'Time']], body: rows, startY: 75, theme: 'grid', headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 3, fontSize: 10 } });
    drawGreenFooter(doc, 'TOTAL DELIVERIES:', data.length);
    savePDF(doc, `Deliveries_${days}days_${end}.pdf`);
  };

  const handleDeletePickupItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this pickup item?')) return;
    const { error } = await supabase.from('pickup_items').delete().eq('id', itemId);
    if (error) toast.error('Error', error.message);
    else { toast.success('Deleted', 'Pickup item removed.'); fetchPickups(); }
  };

  const handleDeleteDelivery = async (deliveryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this delivery?')) return;
    const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);
    if (error) toast.error('Error', error.message);
    else { toast.success('Deleted', 'Delivery removed.'); fetchDeliveries(); }
  };

  const lq = searchQuery.toLowerCase();
  const filteredPickups = pickupData.map(c => ({ ...c, items: c.items.filter((item: any) => item.name.toLowerCase().includes(lq) || c.name.toLowerCase().includes(lq)) })).filter(c => c.items.length > 0);
  const filteredDeliveries = deliveryData.filter(d => (d.shops?.name || '').toLowerCase().includes(lq) || (d.shops?.location || '').toLowerCase().includes(lq));

  const RangeBtns = ({ onDownload }: { onDownload: (d: number) => void }) => (
    <div className="flex gap-1.5">
      {[7, 15, 30].map(d => (
        <button key={d} onClick={() => onDownload(d)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm whitespace-nowrap">
          <CalendarDays size={11} />
          {d === 30 ? '1 Month' : `${d} Days`}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Reports</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">View & export logistics data</p>
        </div>
        {/* Date picker */}
        <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
          <CalendarDays size={16} className="text-indigo-500 flex-shrink-0" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold text-sm w-32"
          />
        </label>
      </div>

      {/* ── Tab Toggle ── */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
        {(['pickups', 'deliveries'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchQuery(''); setExpandedCompany(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === tab
                ? tab === 'pickups'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            {tab === 'pickups' ? <Package size={16} /> : <Truck size={16} />}
            <span className="capitalize">{tab}</span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-sm transition-all"
        />
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ══════════ PICKUPS TAB ══════════ */}
      {!loading && activeTab === 'pickups' && (
        <AnimatePresence mode="wait">
          <motion.div key="pickups" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Action bar */}
            <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Download Range (Pickups)</span>
                <button
                  onClick={downloadAllPickupsPDF}
                  disabled={pickupData.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20">
                  <FileText size={12} /> Master PDF
                </button>
              </div>
              <RangeBtns onDownload={downloadPickupRangePDF} />
              <p className="text-[11px] text-slate-400 font-medium">
                {filteredPickups.length} compan{filteredPickups.length !== 1 ? 'ies' : 'y'} · {filteredPickups.reduce((a, c) => a + c.items.length, 0)} shops
              </p>
            </div>

            {/* Company cards */}
            {filteredPickups.map(company => (
              <div key={company.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer active:bg-slate-50 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white font-black text-sm">{company.items.length}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 truncate">{company.name}</h3>
                    <p className="text-slate-400 text-xs font-medium">{company.items.length} shop{company.items.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); downloadPickupPDF(company.name, company.items); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 text-[11px] font-bold transition-all">
                      <Download size={12} /> PDF
                    </button>
                    {expandedCompany === company.id
                      ? <ChevronUp size={18} className="text-slate-400" />
                      : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded items */}
                <AnimatePresence>
                  {expandedCompany === company.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/50 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                    >
                      {company.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="font-bold text-slate-800 text-sm leading-tight">{item.name}</span>
                            <button
                              onClick={e => handleDeletePickupItem(item.itemId, e)}
                              className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100 flex-shrink-0 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {item.location && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.location}</span>
                            )}
                            {item.itemNumber && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                <Box size={9} />{item.itemNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                            <span className="flex items-center gap-1"><Clock size={9} />{item.pickupTime}</span>
                            <span className="flex items-center gap-1"><User size={9} />{item.pickupUser}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {filteredPickups.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">{searchQuery ? 'No pickups match your search' : 'No pickups found for this date'}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ══════════ DELIVERIES TAB ══════════ */}
      {!loading && activeTab === 'deliveries' && (
        <AnimatePresence mode="wait">
          <motion.div key="deliveries" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Action bar */}
            <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Download Range (Deliveries)</span>
                <button
                  onClick={downloadDeliveryPDF}
                  disabled={deliveryData.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20">
                  <Download size={12} /> Today's PDF
                </button>
              </div>
              <RangeBtns onDownload={downloadDeliveryRangePDF} />
              <p className="text-[11px] text-slate-400 font-medium">
                {filteredDeliveries.length} deliveries recorded
              </p>
            </div>

            {/* Delivery cards */}
            <div className="space-y-2">
              {filteredDeliveries.map((delivery, idx) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm border-l-4"
                  style={{ borderLeftColor: '#10b981' }}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white font-black text-sm">{(delivery.shops?.name || '?').charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{delivery.shops?.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">{delivery.shops?.location}</span>
                      {delivery.item_number && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                          <Box size={8} />{delivery.item_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1 justify-end">
                      <Clock size={11} />{format(new Date(delivery.created_at), 'hh:mm a')}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                      <User size={9} />{delivery.profiles?.username}
                    </p>
                  </div>
                  <button
                    onClick={e => handleDeleteDelivery(delivery.id, e)}
                    className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100 flex-shrink-0 transition-colors ml-1">
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </div>

            {filteredDeliveries.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Truck size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">{searchQuery ? 'No deliveries match your search' : 'No deliveries recorded for this date'}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

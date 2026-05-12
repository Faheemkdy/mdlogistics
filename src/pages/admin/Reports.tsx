import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, ChevronDown, ChevronUp, Clock, User, FileText, Box, Trash2, Search, Package, Truck, CalendarDays, Check, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { useToast } from '../../components/ui/Toast';
import { getStandardDate, getDateRange } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '../../constants/branding';
import { clsx } from 'clsx';

type Tab = 'pickups' | 'deliveries';

export const Reports = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('pickups');
  const [date, setDate] = useState(getStandardDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [pickupData, setPickupData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Multi-date selection
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const [multiDateData, setMultiDateData] = useState<any[]>([]);

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
      if (!acc[companyId]) acc[companyId] = { id: companyId, name: curr.companies?.name || 'Unknown', pickupIds: [], items: [] };
      const time = format(new Date(curr.created_at), 'hh:mm a');
      const user = curr.profiles?.username || 'Unknown';
      
      if (!acc[companyId].pickupIds.includes(curr.id)) {
        acc[companyId].pickupIds.push(curr.id);
      }
      
      const shops = curr.pickup_items?.map((pi: any) => ({ ...pi.shops, itemId: pi.id, pickupId: curr.id, itemNumber: pi.item_number, pickupTime: time, pickupUser: user })) || [];
      acc[companyId].items.push(...shops);
      return acc;
    }, {});
    setPickupData(Object.values(grouped));
    setLoading(false);
  };

  const fetchMultiDatePickups = async (dates: string[]) => {
    setLoading(true);
    const { data } = await supabase
      .from('pickups')
      .select(`date, created_at, companies (id, name), pickup_items ( item_number, shops (id, name, location) )`)
      .in('date', dates);
    
    setMultiDateData(data || []);
    setLoading(false);
  };

  const handleSendToBilling = async () => {
    if (selectedDates.length === 0 || pickupData.length === 0) return;
    
    // We'll take the first company from the filtered list for simplicity, 
    // or we could let them choose. For now, we use the active filter results.
    const company = filteredPickups[0];
    if (!company) return;

    setLoading(true);
    try {
      // Fetch all pickups for selected dates and this company
      const { data: pickups } = await supabase
        .from('pickups')
        .select(`date, pickup_items ( item_number, shops (name, location) )`)
        .eq('company_id', company.id)
        .in('date', selectedDates);

      // Fetch location rates
      const { data: rates } = await supabase.from('location_rates').select('*');
      const rateMap = (rates || []).reduce((acc: any, r: any) => {
        acc[r.location_name.toLowerCase()] = r.rate;
        return acc;
      }, {});

      // Group by date
      const billingRows: any[] = [];
      const datesGrouped = (pickups || []).reduce((acc: any, p: any) => {
        if (!acc[p.date]) acc[p.date] = [];
        acc[p.date].push(...(p.pickup_items || []));
        return acc;
      }, {});

      // Validation: Check for missing rates
      const missingLocations = new Set<string>();
      (pickups || []).forEach(p => {
        p.pickup_items?.forEach((item: any) => {
          const loc = (item.shops?.location || '').toLowerCase().trim();
          if (loc && !rateMap[loc]) {
            missingLocations.add(item.shops?.location);
          }
        });
      });

      if (missingLocations.size > 0) {
        toast.error(
          'Missing Location Rates', 
          `Please add rates for: ${Array.from(missingLocations).join(', ')} in the Shops page first.`
        );
        setLoading(false);
        return;
      }

      Object.entries(datesGrouped).forEach(([dateStr, items]: [string, any]) => {
        const row: any = { 
          id: Math.random(), 
          description: dateStr, 
          q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', 
          total: 0, amount: '0' 
        };

        items.forEach((item: any) => {
          const loc = (item.shops?.location || '').toLowerCase().trim();
          const rate = rateMap[loc];
          if (rate) {
            const rateKey = `q${Math.round(rate)}` as keyof typeof row;
            // @ts-ignore
            row[rateKey] = (Number(row[rateKey]) || 0) + 1;
          }
        });

        // Recalculate totals
        const q20 = Number(row.q20) || 0;
        const q25 = Number(row.q25) || 0;
        const q30 = Number(row.q30) || 0;
        const q35 = Number(row.q35) || 0;
        const q40 = Number(row.q40) || 0;
        const q50 = Number(row.q50) || 0;
        
        row.total = q20 + q25 + q30 + q35 + q40 + q50;
        row.amount = ((q20 * 20) + (q25 * 25) + (q30 * 30) + (q35 * 35) + (q40 * 40) + (q50 * 50)).toFixed(2);
        
        if (row.total > 0) billingRows.push(row);
      });

      navigate('/billing', { state: { 
        importCustomerName: company.name,
        importItems: billingRows,
        importMode: 'delivery'
      }});

    } catch (err: any) {
      toast.error('Failed to prepare bill', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDateSelection = (d: string) => {
    setSelectedDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
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
      startY: 105, theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 },
    });
    drawGreenFooter(doc, 'TOTAL SHOPS:', items.length);
    savePDF(doc, `${companyName}_Pickups_${date}.pdf`);
  };

  const downloadAllPickupsPDF = () => {
    if (filteredPickups.length === 0) {
      toast.error('No data', 'No pickups found for this date.');
      return;
    }
    try {
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, 'Report:', 'Master Pickup Log', date);
      let y = 105; let total = 0;
      filteredPickups.forEach((c) => {
        total += c.items.length;
        if (y > 250) { doc.addPage(); drawPDFHeader(doc); y = 60; }
        doc.setFontSize(12); doc.setTextColor(...BRAND.accent); doc.setFont('helvetica', 'bold');
        doc.text(c.name || 'Unknown', 14, y);
        autoTable(doc, {
          head: [['#', 'Shop', 'Location', 'Item No.', 'Time']],
          body: c.items.map((item: any, i: number) => [i + 1, item.name, item.location || '-', item.itemNumber || '-', item.pickupTime || '-']),
          startY: y + 5, theme: 'grid',
          headStyles: { fillColor: BRAND.accent, textColor: 255, fontStyle: 'bold' },
          styles: { cellPadding: 3, fontSize: 10 }, margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : y + 30;
      });
      drawGreenFooter(doc, 'TOTAL SHOPS:', total);
      savePDF(doc, `Master_Pickup_${date}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error('Export Failed', 'An error occurred while generating the PDF.');
    }
  };

  const downloadDeliveryPDF = () => {
    if (filteredDeliveries.length === 0) {
      toast.error('No data', 'No deliveries found for this date.');
      return;
    }
    try {
      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, 'Report:', 'Daily Delivery Log', date);
      autoTable(doc, {
        head: [['#', 'Shop', 'Location', 'Item No.', 'Time']],
        body: filteredDeliveries.map((d, i) => {
          let timeStr = '-';
          try { timeStr = d.created_at ? format(new Date(d.created_at), 'hh:mm a') : '-'; } catch(e) {}
          return [i + 1, d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-', timeStr];
        }),
        startY: 105, theme: 'grid',
        headStyles: { fillColor: BRAND.success, textColor: 255, fontStyle: 'bold' },
        styles: { cellPadding: 3, fontSize: 10 },
      });
      drawGreenFooter(doc, 'TOTAL DELIVERIES:', filteredDeliveries.length);
      savePDF(doc, `Delivery_${date}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error('Export Failed', 'An error occurred while generating the PDF.');
    }
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
    autoTable(doc, { head: [['Date', 'Company', 'Shop', 'Item No.', 'Time']], body: rows, startY: 105, theme: 'grid', headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 3, fontSize: 9 } });
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
    autoTable(doc, { head: [['Date', 'Shop', 'Location', 'Item No.', 'Time']], body: rows, startY: 105, theme: 'grid', headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 3, fontSize: 10 } });
    drawGreenFooter(doc, 'TOTAL DELIVERIES:', data.length);
    savePDF(doc, `Deliveries_${days}days_${end}.pdf`);
  };

  const handleDeletePickupItem = async (itemId: string, pickupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this pickup item?')) return;
    
    const { error } = await supabase.from('pickup_items').delete().eq('id', itemId);
    if (error) { toast.error('Error', error.message); return; }
    
    // Check if the parent pickup has any items left
    if (pickupId) {
      const { count } = await supabase.from('pickup_items').select('*', { count: 'exact', head: true }).eq('pickup_id', pickupId);
      if (count === 0) {
        await supabase.from('pickups').delete().eq('id', pickupId);
      }
    }
    
    toast.success('Deleted', 'Pickup item removed.'); 
    fetchPickups(); 
  };

  const handleDeleteFullPickup = async (pickupIds: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete all pickups for this company? This will remove the entire visit record.')) return;
    
    // Delete the parent pickups directly. Supabase ON DELETE CASCADE handles pickup_items automatically.
    const { error } = await supabase.from('pickups').delete().in('id', pickupIds);
    if (error) toast.error('Error', error.message);
    else {
      toast.success('Deleted', 'Entire company pickup removed.');
      fetchPickups();
    }
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
    <div className="pb-6 flex flex-col">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 px-1 mb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Reports</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">View & export logistics data</p>
        </div>
        {/* Date picker */}
        <label className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white shadow-sm rounded-2xl px-4 py-2.5 cursor-pointer hover:border-indigo-300 transition-all self-end sm:self-auto">
          <CalendarDays size={16} className="text-indigo-500 flex-shrink-0" />
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setIsMultiDateMode(false); setSelectedDates([]); }}
            className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold text-sm w-32 outline-none"
          />
        </label>
      </div>

      {/* ── Multi-date Mode Toggle ── */}
      <div className="mb-5 flex items-center justify-between bg-white/40 p-2 rounded-2xl border border-white/50 backdrop-blur-sm">
        <button 
          onClick={() => { setIsMultiDateMode(!isMultiDateMode); setSelectedDates([]); }}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
            isMultiDateMode ? "bg-indigo-600 text-white shadow-lg" : "text-slate-600 hover:bg-white/60"
          )}
        >
          <CalendarDays size={14} />
          {isMultiDateMode ? 'Multi-Date Mode ON' : 'Multi-Date Mode OFF'}
        </button>
        
        {isMultiDateMode && selectedDates.length > 0 && (
          <button 
            onClick={handleSendToBilling}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20"
          >
            <Send size={14} /> Send {selectedDates.length} Days to Billing
          </button>
        )}
      </div>

      {isMultiDateMode && (
        <div className="mb-5 grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Array.from({ length: 30 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const isSelected = selectedDates.includes(dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => toggleDateSelection(dateStr)}
                className={clsx(
                  "p-2 rounded-xl border transition-all text-center",
                  isSelected ? "bg-indigo-500 border-indigo-500 text-white shadow-md" : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                )}
              >
                <span className="block text-[8px] font-black uppercase opacity-60">{format(d, 'EEE')}</span>
                <span className="block text-xs font-black">{format(d, 'dd')}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Sticky Nav & Search ── */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-xl pb-4 pt-1 -mx-2 px-2 sm:-mx-4 sm:px-4 shadow-sm border-b border-slate-200/50 space-y-3 mb-5">
        {/* ── Tab Toggle ── */}
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl backdrop-blur-sm">
          {(['pickups', 'deliveries'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchQuery(''); setExpandedCompany(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${
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
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder={`Find ${activeTab}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm transition-all font-bold"
          />
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-indigo-600 text-[11px] font-bold hover:bg-indigo-50 transition-all shadow-sm">
                  <FileText size={12} /> Master PDF
                </button>
              </div>
              <div className="overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                <RangeBtns onDownload={downloadPickupRangePDF} />
              </div>
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
                      onClick={e => handleDeleteFullPickup(company.pickupIds, e)}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all mr-1"
                      title="Delete Entire Company Pickup"
                    >
                      <Trash2 size={13} />
                    </button>
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
                              onClick={e => handleDeletePickupItem(item.itemId, item.pickupId, e)}
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

      {/* ── DELIVERIES TAB ══════════ */}
      {!loading && activeTab === 'deliveries' && (
        <AnimatePresence mode="wait">
          <motion.div key="deliveries" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Action bar */}
            <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Download Range (Deliveries)</span>
                <button
                  onClick={downloadDeliveryPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-emerald-600 text-[11px] font-bold hover:bg-emerald-50 transition-all shadow-sm">
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

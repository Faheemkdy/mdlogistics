import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Search, Calendar, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { formatReportDate, getDateRange } from '../../utils/dateUtils';
import { format } from 'date-fns';

export const Reconciliation = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch shops
      const { data: shops } = await supabase.from('shops').select('id, name, location').eq('is_active', true);
      
      // Fetch dispatches for the date
      const { data: dispatches } = await supabase
        .from('dispatches')
        .select('*')
        .eq('date', date);
        
      // Fetch deliveries for the date
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*, profiles(username)')
        .eq('date', date);

      const reconciliationData = (shops || []).map(shop => {
        const shopDispatches = (dispatches || []).filter(d => d.shop_id === shop.id);
        const shopDeliveries = (deliveries || []).filter(d => d.shop_id === shop.id);
        
        const totalDispatched = shopDispatches.reduce((acc, d) => acc + (parseFloat(d.item_number) || 0), 0);
        const totalDelivered = shopDeliveries.reduce((acc, d) => acc + (parseFloat(d.item_number) || 0), 0);
        
        const diff = totalDispatched - totalDelivered;
        const status = totalDispatched === 0 && totalDelivered === 0 ? 'none' : (diff === 0 ? 'match' : 'mismatch');

        return {
          ...shop,
          totalDispatched,
          totalDelivered,
          diff,
          status,
          deliveries: shopDeliveries
        };
      });

      setData(reconciliationData);
    } catch (error: any) {
      toast.error('Failed to fetch data', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return data
      .filter(d => 
        (showAll ? true : (d.totalDispatched > 0 || d.totalDelivered > 0)) &&
        (d.name.toLowerCase().includes(q) || 
        (d.location && d.location.toLowerCase().includes(q)))
      )
      .sort((a, b) => {
        // Sort by mismatch first, then by activity
        if (a.status === 'mismatch' && b.status !== 'mismatch') return -1;
        if (b.status === 'mismatch' && a.status !== 'mismatch') return 1;
        return b.totalDispatched - a.totalDispatched;
      });
  }, [data, debouncedSearch, showAll]);

  const totals = data.reduce((acc, curr) => ({
    dispatched: acc.dispatched + curr.totalDispatched,
    delivered: acc.delivered + curr.totalDelivered,
    mismatches: acc.mismatches + (curr.status === 'mismatch' ? 1 : 0)
  }), { dispatched: 0, delivered: 0, mismatches: 0 });

  const isAllDelivered = totals.dispatched > 0 && totals.mismatches === 0 && totals.dispatched === totals.delivered;

  const handleExport = async () => {
    if (filteredData.length === 0) {
      toast.warning('No data', 'There is no data to export.');
      return;
    }
    
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Reconciliation Report", formatReportDate(date));
    
    const tableData = filteredData.map(d => [
      d.name,
      d.location || '-',
      d.totalDispatched.toString(),
      d.totalDelivered.toString(),
      d.diff === 0 ? 'Match' : (d.diff > 0 ? `+${d.diff} Short` : `${Math.abs(d.diff)} Extra`)
    ]);

    autoTable(doc, { 
      head: [['Shop Name', 'Location', 'Dispatched', 'Delivered', 'Status']], 
      body: tableData, 
      startY: 100, 
      theme: 'grid', 
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, 
      styles: { cellPadding: 4, fontSize: 10 }, 
      alternateRowStyles: { fillColor: [245, 247, 250] } 
    });

    drawGreenFooter(doc, "TOTAL MISMATCHES:", totals.mismatches);
    
    const filename = `reconciliation_${date}.pdf`;
    
    if (navigator.share) {
      try {
        const blob = doc.output('blob');
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({
          title: `Reconciliation Report - ${date}`,
          text: `Reconciliation details for ${formatReportDate(date)}. Dispatched: ${totals.dispatched}, Delivered: ${totals.delivered}.`,
          files: [file]
        });
        toast.success('Shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          savePDF(doc, filename);
        }
      }
    } else {
      savePDF(doc, filename);
    }
  };

  const handleRangeExport = async (days: number) => {
    const { start, end } = getDateRange(days);
    toast.info("Generating Report", `Fetching reconciliation data from ${start} to ${end}...`);
    
    try {
      const { data: shops } = await supabase.from('shops').select('id, name, location').eq('is_active', true);
      const { data: dispatches } = await supabase.from('dispatches').select('*').gte('date', start).lte('date', end);
      const { data: deliveries } = await supabase.from('deliveries').select('*').gte('date', start).lte('date', end);

      const rangeReconciliation = (shops || []).map(shop => {
        const shopDispatches = (dispatches || []).filter(d => d.shop_id === shop.id);
        const shopDeliveries = (deliveries || []).filter(d => d.shop_id === shop.id);
        
        const totalDispatched = shopDispatches.reduce((acc, d) => acc + (parseFloat(d.item_number) || 0), 0);
        const totalDelivered = shopDeliveries.reduce((acc, d) => acc + (parseFloat(d.item_number) || 0), 0);
        
        return {
          ...shop,
          totalDispatched,
          totalDelivered,
          diff: totalDispatched - totalDelivered
        };
      }).filter(d => d.totalDispatched > 0 || d.totalDelivered > 0);

      if (rangeReconciliation.length === 0) {
        toast.error("No data", "No records found in this range.");
        return;
      }

      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", `${days} Days Reconciliation`, `${format(new Date(start), 'dd MMM')} to ${format(new Date(end), 'dd MMM yyyy')}`);

      const tableData = rangeReconciliation.map(d => [
        d.name,
        d.location || '-',
        d.totalDispatched.toString(),
        d.totalDelivered.toString(),
        d.diff === 0 ? 'Match' : (d.diff > 0 ? `+${d.diff} Short` : `${Math.abs(d.diff)} Extra`)
      ]);

      autoTable(doc, {
        head: [['Shop Name', 'Location', 'Total Dispatched', 'Total Delivered', 'Status']],
        body: tableData,
        startY: 100,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { cellPadding: 4, fontSize: 10 },
      });

      const mismatches = rangeReconciliation.filter(d => d.diff !== 0).length;
      drawGreenFooter(doc, "SHOPS WITH MISMATCH:", mismatches);
      savePDF(doc, `Reconciliation_${days}days_${end}.pdf`);
    } catch (error: any) {
      toast.error("Export failed", error.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Reconciliation Report</h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium mt-1">Compare dispatched items vs actual deliveries</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 sm:flex-none flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <Calendar size={18} className="text-slate-400 ml-1" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold pr-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="flex gap-1.5 p-1 bg-white rounded-xl shadow-sm border border-slate-200">
               <button onClick={() => handleRangeExport(7)} className="px-3 py-1.5 text-[10px] font-black uppercase hover:bg-slate-50 rounded-lg transition-colors">7 Days</button>
               <button onClick={() => handleRangeExport(15)} className="px-3 py-1.5 text-[10px] font-black uppercase hover:bg-slate-50 rounded-lg transition-colors">15 Days</button>
               <button onClick={() => handleRangeExport(30)} className="px-3 py-1.5 text-[10px] font-black uppercase hover:bg-slate-50 rounded-lg transition-colors">1 Month</button>
            </div>
            <Button variant="ghost" onClick={fetchData} className="flex-1 sm:flex-none bg-white shadow-sm border border-slate-200 text-sm h-11">
                Refresh
            </Button>
            <Button variant="primary" onClick={handleExport} className="flex-1 sm:flex-none bg-slate-800 text-white hover:bg-slate-900 border-none text-sm h-11 px-4">
                <Share2 size={16} className="mr-2" /> Share Today
            </Button>
          </div>
        </div>
      </div>

      {isAllDelivered && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white flex items-center gap-4 shadow-lg shadow-emerald-500/20 border border-emerald-400/50"
        >
          <div className="p-2 bg-white/20 rounded-full">
            <CheckCircle size={28} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-lg tracking-wide">All Deliveries Complete!</h3>
            <p className="text-emerald-100 font-medium text-sm">Everything dispatched today has been successfully delivered.</p>
          </div>
        </motion.div>
      )}

      {totals.dispatched > 0 && !isAllDelivered && totals.mismatches > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center gap-4 shadow-lg shadow-red-500/20 border border-red-400/50"
        >
          <div className="p-2 bg-white/20 rounded-full">
            <AlertCircle size={28} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-lg tracking-wide">Pending Deliveries / Mismatches</h3>
            <p className="text-red-100 font-medium text-sm">There are {totals.mismatches} shop(s) with incomplete deliveries.</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex flex-row sm:flex-col justify-between items-center sm:items-start">
          <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">Total Dispatched</p>
          <p className="text-2xl sm:text-4xl font-black text-blue-600">{totals.dispatched}</p>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex flex-row sm:flex-col justify-between items-center sm:items-start">
          <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">Total Delivered</p>
          <p className="text-2xl sm:text-4xl font-black text-green-600">{totals.delivered}</p>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex flex-row sm:flex-col justify-between items-center sm:items-start">
          <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">Mismatches</p>
          <p className={clsx("text-2xl sm:text-4xl font-black", totals.mismatches > 0 ? "text-red-500" : "text-slate-400")}>
            {totals.mismatches}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sticky top-0 z-20 backdrop-blur-md bg-white/90">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="Search by shop..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
          <Button 
            variant={showAll ? "primary" : "ghost"} 
            onClick={() => setShowAll(!showAll)}
            className={clsx(
              "h-12 border text-xs sm:text-sm font-black uppercase tracking-widest px-6 rounded-2xl transition-all",
              showAll 
                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200" 
                : "bg-white border-slate-200 text-slate-600 shadow-sm hover:border-blue-300"
            )}
          >
            <Filter size={16} className="mr-2" />
            {showAll ? 'Showing All' : 'Show All'}
          </Button>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Shop Details</th>
                <th className="px-6 py-4">Dispatched</th>
                <th className="px-6 py-4">Delivered</th>
                <th className="px-6 py-4">Diff</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((row, index) => (
                <motion.tr 
                  key={row.id} 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.2) }}
                  className={clsx(
                  "border-b border-slate-50 transition-colors will-change-[transform,opacity]",
                  row.status === 'mismatch' ? "bg-red-50/20 hover:bg-red-50/40" : "hover:bg-slate-50/50"
                )}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700">{row.name}</p>
                    <p className="text-slate-400 text-xs">{row.location}</p>
                  </td>
                  <td className="px-6 py-4 font-black text-blue-600">{row.totalDispatched}</td>
                  <td className="px-6 py-4 font-black text-green-600">{row.totalDelivered}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "font-black",
                      row.diff === 0 ? "text-slate-300" : (row.diff > 0 ? "text-red-500" : "text-amber-500")
                    )}>
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.status === 'match' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Match
                      </span>
                    )}
                    {row.status === 'mismatch' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={12} /> Mismatch
                      </span>
                    )}
                    {row.status === 'none' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <HelpCircle size={12} /> No Data
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        {row.deliveries.length > 0 && (
                            <div className="flex -space-x-2">
                                {row.deliveries.slice(0, 3).map((del: any, i: number) => (
                                    <div key={i} title={del.profiles?.username} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                                        {del.profiles?.username?.substring(0, 2)}
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                            <ArrowRight size={18} />
                        </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredData.map((row) => (
            <div key={row.id} className={clsx(
              "p-4 transition-colors",
              row.status === 'mismatch' ? "bg-red-50/20" : "bg-white"
            )}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-slate-800">{row.name}</h4>
                  <p className="text-slate-400 text-[11px] flex items-center gap-1">
                    <MapPin size={10} /> {row.location}
                  </p>
                </div>
                {row.status === 'match' && <span className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle2 size={16} /></span>}
                {row.status === 'mismatch' && <span className="bg-red-100 text-red-700 p-1 rounded-full"><AlertCircle size={16} /></span>}
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Disp</p>
                  <p className="font-black text-blue-600 text-sm">{row.totalDispatched}</p>
                </div>
                <div className="text-center border-x border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Deliv</p>
                  <p className="font-black text-green-600 text-sm">{row.totalDelivered}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Diff</p>
                  <p className={clsx("font-black text-sm", row.diff === 0 ? "text-slate-400" : (row.diff > 0 ? "text-red-500" : "text-amber-500"))}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                   {row.deliveries.slice(0, 4).map((del: any, i: number) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
                          {del.profiles?.username?.substring(0, 2)}
                      </div>
                   ))}
                </div>
                <button className="text-blue-600 text-xs font-bold flex items-center gap-1">
                  Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && !loading && (
          <div className="py-20 text-center">
            <p className="text-slate-400 font-medium">No records found for this view.</p>
          </div>
        )}
        
        {loading && (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

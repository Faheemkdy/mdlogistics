import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
  Truck, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2,
  Calendar,
  Filter,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';
import { formatReportDate } from '../../utils/dateUtils';
import { subDays, format } from 'date-fns';

interface CourierPartner {
  id: string;
  name: string;
}

interface CourierLog {
  id: string;
  partner_id: string;
  type: 'inward' | 'outward';
  count: number;
  shop_name?: string;
  date: string;
  courier_partners: { name: string };
}

export const CourierExchange = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'logs' | 'partners'>('logs');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inward' | 'outward'>('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  
  // Data
  const [partners, setPartners] = useState<CourierPartner[]>([]);
  const [logs, setLogs] = useState<CourierLog[]>([]);

  // Modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<CourierPartner | null>(null);
  const [editingLog, setEditingLog] = useState<CourierLog | null>(null);
  
  // Form States
  const [partnerName, setPartnerName] = useState('');
  const [logPartnerId, setLogPartnerId] = useState('');
  const [logType, setLogType] = useState<'inward' | 'outward'>('inward');
  const [logCount, setLogCount] = useState('');
  const [logShopName, setLogShopName] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);


  useEffect(() => {
    fetchPartners();
    fetchLogs();
  }, []);

  const fetchPartners = async () => {
    const { data } = await supabase.from('courier_partners').select('*').order('name');
    setPartners(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('courier_logs')
      .select('*, courier_partners(name)')
      .order('date', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;

    try {
      if (editingPartner) {
        const { error } = await supabase
          .from('courier_partners')
          .update({ name: partnerName })
          .eq('id', editingPartner.id);
        if (error) throw error;
        toast.success('Partner updated');
      } else {
        const { error } = await supabase
          .from('courier_partners')
          .insert([{ name: partnerName }]);
        if (error) throw error;
        toast.success('Partner added');
      }
      setPartnerName('');
      setEditingPartner(null);
      setIsPartnerModalOpen(false);
      fetchPartners();
    } catch (err: any) {
      toast.error('Operation failed', err.message);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm('Are you sure? All related logs will be deleted.')) return;
    try {
      const { error } = await supabase.from('courier_partners').delete().eq('id', id);
      if (error) throw error;
      toast.success('Partner deleted');
      fetchPartners();
      fetchLogs();
    } catch (err: any) {
      toast.error('Failed to delete', err.message);
    }
  };

  const handleEditLog = (log: CourierLog) => {
    setEditingLog(log);
    setLogPartnerId(log.partner_id);
    setLogType(log.type);
    setLogCount(log.count != null ? log.count.toString() : '');
    setLogShopName(log.shop_name || '');
    setLogDate(log.date);
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logPartnerId || !logCount) return;

    try {
      const logData = {
        partner_id: logPartnerId,
        type: logType,
        count: parseInt(logCount),
        shop_name: logShopName,
        date: logDate
      };

      if (editingLog) {
        const { error } = await supabase
          .from('courier_logs')
          .update(logData)
          .eq('id', editingLog.id);
        if (error) throw error;
        toast.success('Log entry updated');
      } else {
        const { error } = await supabase
          .from('courier_logs')
          .insert([logData]);
        if (error) throw error;
        toast.success('Log entry saved');
      }
      
      setLogCount('');
      setLogShopName('');
      setEditingLog(null);
      setIsLogModalOpen(false);
      fetchLogs();
    } catch (err: any) {
      toast.error('Failed to save log', err.message);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      const { error } = await supabase.from('courier_logs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Entry removed');
      fetchLogs();
    } catch (err: any) {
      toast.error('Failed to delete', err.message);
    }
  };

  const generateReport = (days: number) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      let filteredLogs = [];
      let periodLabel = "";

      if (days === 0) {
        filteredLogs = logs.filter(l => l.date === todayStr);
        periodLabel = "Today's Daily Report";
      } else {
        const startDate = subDays(new Date(), days);
        filteredLogs = logs.filter(l => new Date(l.date) >= startDate);
        periodLabel = `${days} Days History Statement`;
      }
      
      if (filteredLogs.length === 0) {
        toast.warning('No data', `No logs found for ${days === 0 ? 'today' : 'the selected period'}.`);
        return;
      }

      const doc = new jsPDF();
      drawPDFHeader(doc);
      drawCustomerInfo(doc, "Report Type:", periodLabel, formatReportDate(new Date().toISOString()));

      const tableData = filteredLogs.map(l => [
        format(new Date(l.date), 'dd MMM yyyy'),
        l.courier_partners.name,
        l.shop_name || '-',
        l.type.toUpperCase(),
        l.count
      ]);

      autoTable(doc, {
        head: [['Date', 'Courier Name', 'Shop Name', 'Type', 'Count']],
        body: tableData,
        startY: 105,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { cellPadding: 4, fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      const totalIn = filteredLogs.filter(l => l.type === 'inward').reduce((acc, curr) => acc + curr.count, 0);
      const totalOut = filteredLogs.filter(l => l.type === 'outward').reduce((acc, curr) => acc + curr.count, 0);

      drawGreenFooter(doc, "EXCHANGE SUMMARY:", `INWARD: ${totalIn} | OUTWARD: ${totalOut}`);
      savePDF(doc, `courier_report_${days === 0 ? 'today' : days + 'days'}.pdf`);
    } catch (e: any) {
      toast.error('Report failed', e.message);
    }
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.courier_partners.name.toLowerCase().includes(search.toLowerCase()) || 
                         (l.shop_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || l.type === filterType;
    const matchesDate = !filterDate || l.date === filterDate;
    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Courier Exchange</h1>
          <p className="text-slate-500 text-sm font-medium">Handle Inward and Outward courier handovers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => { setEditingLog(null); setLogCount(''); setLogShopName(''); setIsLogModalOpen(true); }} className="flex-1 sm:flex-none">
            <Plus size={18} className="mr-2" /> New Entry
          </Button>
          <Button variant="ghost" onClick={() => setIsPartnerModalOpen(true)} className="bg-white border-slate-200">
            <Building2 size={18} className="mr-2" /> Partners
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Inward</p>
            <p className="text-2xl font-black text-slate-900">{logs.filter(l => l.type === 'inward').reduce((acc, curr) => acc + curr.count, 0)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Outward</p>
            <p className="text-2xl font-black text-slate-900">{logs.filter(l => l.type === 'outward').reduce((acc, curr) => acc + curr.count, 0)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Partners</p>
            <p className="text-2xl font-black text-slate-900">{partners.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setFilterType('all')}
              className={clsx("px-4 py-2 rounded-xl text-xs font-black transition-all", filterType === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              ALL
            </button>
            <button 
              onClick={() => setFilterType('inward')}
              className={clsx("px-4 py-2 rounded-xl text-xs font-black transition-all", filterType === 'inward' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              INWARD
            </button>
            <button 
              onClick={() => setFilterType('outward')}
              className={clsx("px-4 py-2 rounded-xl text-xs font-black transition-all", filterType === 'outward' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500")}
            >
              OUTWARD
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 flex-1 w-full">
            <div className="relative flex-1 min-w-[150px] md:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                placeholder="Search courier or shop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            
            <div className="relative min-w-[180px]">
              <div 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer z-10"
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <Calendar size={16} />
              </div>
              <input 
                ref={dateInputRef}
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:h-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                title="Filter by Date"
              />
              {filterDate && (
                <button 
                  onClick={() => setFilterDate('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-white rounded-full p-0.5 shadow-sm z-10"
                  title="Clear Date Filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => generateReport(0)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 flex items-center justify-center min-w-[40px]" title="Today's Report"><Download size={18} /></button>
              <button onClick={() => generateReport(7)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 text-xs font-black min-w-[40px]" title="7 Days Report">7</button>
              <button onClick={() => generateReport(15)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 text-xs font-black min-w-[40px]" title="15 Days Report">15</button>
              <button onClick={() => generateReport(30)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 text-xs font-black min-w-[40px]" title="30 Days Report">30</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Courier Partner</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Count</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence>
                {filteredLogs.map((log) => (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">{log.courier_partners.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-600">{log.shop_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        log.type === 'inward' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-900">{log.count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditLog(log)}
                          className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-bold">No logs found</p>
            </div>
          )}
        </div>
      </div>

      {/* Partner Modal */}
      <Modal isOpen={isPartnerModalOpen} onClose={() => setIsPartnerModalOpen(false)} title="Manage Courier Partners">
        <div className="space-y-6">
          <form onSubmit={handleSavePartner} className="flex gap-2">
            <Input 
              placeholder="Courier name (e.g. DTDC)"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" variant="primary">
              {editingPartner ? 'Update' : 'Add'}
            </Button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {partners.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                <span className="font-bold text-slate-700">{p.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setPartnerName(p.name); setEditingPartner(p); }} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => handleDeletePartner(p.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Log Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => { setIsLogModalOpen(false); setEditingLog(null); }} title={editingLog ? "Edit Courier Entry" : "New Courier Entry"}>
        <form onSubmit={handleSaveLog} className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setLogType('inward')}
                className={clsx(
                  "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black transition-all border-2",
                  logType === 'inward' 
                    ? "bg-white border-blue-500 text-blue-600 shadow-sm" 
                    : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100"
                )}
              >
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", logType === 'inward' ? "bg-blue-50" : "bg-slate-100")}>
                  <ArrowDownLeft size={20} />
                </div>
                INWARD
              </button>
              <button 
                type="button"
                onClick={() => setLogType('outward')}
                className={clsx(
                  "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black transition-all border-2",
                  logType === 'outward' 
                    ? "bg-white border-orange-500 text-orange-600 shadow-sm" 
                    : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100"
                )}
              >
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", logType === 'outward' ? "bg-orange-50" : "bg-slate-100")}>
                  <ArrowUpRight size={20} />
                </div>
                OUTWARD
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Courier Partner</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select 
                  value={logPartnerId}
                  onChange={(e) => setLogPartnerId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  required
                >
                  <option value="">Select Courier...</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Filter size={14} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Item Count"
                type="number"
                placeholder="e.g. 5"
                value={logCount}
                onChange={(e) => setLogCount(e.target.value)}
                required
                className="bg-white"
              />
              <Input 
                label="Handover Date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Shops</label>
              <textarea 
                placeholder="List the shops (e.g. Shop A, Shop B...)"
                value={logShopName}
                onChange={(e) => setLogShopName(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[120px] resize-none"
              />
              <p className="text-[10px] text-slate-400 font-medium ml-1">Tip: You can list multiple shops for these items.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsLogModalOpen(false)} className="flex-1 rounded-2xl py-6">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 rounded-2xl py-6 bg-slate-900 hover:bg-black shadow-lg shadow-slate-200">
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

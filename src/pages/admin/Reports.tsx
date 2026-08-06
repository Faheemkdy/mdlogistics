import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, ChevronDown, ChevronUp, Clock, User, FileText, Box, Trash2, Search, Package, Truck, CalendarDays, Check, Send, Edit2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF, calculateTotalItemCount } from '../../utils/pdfGenerator';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getStandardDate, getDateRange, formatReportDate } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '../../constants/branding';
import { clsx } from 'clsx';

type Tab = 'pickups' | 'deliveries';

const SearchableCompanySelect = ({ 
  companies, 
  selectedCompanyId, 
  onSelectCompany 
}: { 
  companies: any[]; 
  selectedCompanyId: string; 
  onSelectCompany: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-white/80 backdrop-blur-md border border-white shadow-sm rounded-2xl px-4 py-2.5 outline-none text-sm font-bold text-slate-700 hover:border-indigo-300 transition-all min-w-[180px] max-w-[220px]"
      >
        <span className="truncate">{selectedCompany ? selectedCompany.name : 'All Companies...'}</span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onSelectCompany('');
                setIsOpen(false);
                setSearch('');
              }}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                !selectedCompanyId ? "bg-indigo-50 text-indigo-700 font-black" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span>All Companies...</span>
              {!selectedCompanyId && <Check size={14} className="text-indigo-600" />}
            </button>
            {filteredCompanies.length === 0 ? (
              <p className="text-[11px] font-medium text-slate-400 text-center py-3">No companies found</p>
            ) : (
              filteredCompanies.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCompany(c.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                    selectedCompanyId === c.id ? "bg-indigo-50 text-indigo-700 font-black" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  {selectedCompanyId === c.id && <Check size={14} className="text-indigo-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Reports = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { isMasterAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('pickups');
  const [date, setDate] = useState(getStandardDate());
  const [fromDate, setFromDate] = useState(getStandardDate());
  const [toDate, setToDate] = useState(getStandardDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [pickupData, setPickupData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingPickupItem, setEditingPickupItem] = useState<{ id: string, itemNumber: string, date: string, pickupId: string } | null>(null);
  const [editingDeliveryItem, setEditingDeliveryItem] = useState<{ id: string, itemNumber: string, date: string } | null>(null);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const itemsPerPage = 30;

  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Bulk date edit: companyId -> new date string
  const [bulkDateEdit, setBulkDateEdit] = useState<Record<string, string>>({});

  // Multi-date selection
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const [multiDateData, setMultiDateData] = useState<any[]>([]);

  // Route Ordering
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [routeLocations, setRouteLocations] = useState<any[]>([]);

  // Dashboard Stats
  const [stats, setStats] = useState({
    dayPickups: 0,
    dayDeliveries: 0,
    monthPickups: 0,
    monthDeliveries: 0
  });

  useEffect(() => {
    fetchDashboardStats(date);
  }, [date]);

  const fetchDashboardStats = async (selectedDateStr: string) => {
    try {
      const { count: dayDeliveries } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('date', selectedDateStr);

      const { data: dayPickupsData } = await supabase
        .from('pickups')
        .select('id')
        .eq('date', selectedDateStr);
      
      let dayPickups = 0;
      if (dayPickupsData && dayPickupsData.length > 0) {
        const { count } = await supabase
          .from('pickup_items')
          .select('*', { count: 'exact', head: true })
          .in('pickup_id', dayPickupsData.map(p => p.id));
        dayPickups = count || 0;
      }

      const startOfMonth = selectedDateStr.substring(0, 8) + '01';
      const [year, month] = selectedDateStr.split('-');
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay}`;

      const { count: monthDeliveries } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: monthPickupsData } = await supabase
        .from('pickups')
        .select('id')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
        
      let monthPickups = 0;
      if (monthPickupsData && monthPickupsData.length > 0) {
        const { count } = await supabase
          .from('pickup_items')
          .select('*', { count: 'exact', head: true })
          .in('pickup_id', monthPickupsData.map(p => p.id));
        monthPickups = count || 0;
      }

      setStats({
        dayPickups: dayPickups || 0,
        dayDeliveries: dayDeliveries || 0,
        monthPickups: monthPickups || 0,
        monthDeliveries: monthDeliveries || 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'pickups') fetchPickups();
    else fetchDeliveries();
  }, [date, activeTab]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').eq('is_active', true).order('name');
    if (data) setCompanies(data);
  };

  useEffect(() => {
    fetchRoutes();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteLocations(selectedRouteId);
    } else {
      setRouteLocations([]);
    }
  }, [selectedRouteId]);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').order('name');
    if (data) setRoutes(data);
  };

  const fetchRouteLocations = async (routeId: string) => {
    const { data } = await supabase.from('route_locations').select('location_name, sequence_order').eq('route_id', routeId);
    if (data) setRouteLocations(data);
  };

  useEffect(() => {
    setDeliveryPage(1);
  }, [activeTab, searchQuery, date]);

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

      // Collect all unique rates used
      const allRatesSet = new Set<number>();
      
      Object.entries(datesGrouped).forEach(([dateStr, items]: [string, any]) => {
        items.forEach((item: any) => {
          const loc = (item.shops?.location || '').toLowerCase().trim();
          const rate = rateMap[loc];
          if (rate) allRatesSet.add(Math.round(rate));
        });
      });
      
      const allRates = Array.from(allRatesSet).sort((a, b) => a - b);
      // If no rates found, use defaults
      const finalRates = allRates.length > 0 ? allRates : [20, 25, 30, 35, 40, 50];

      Object.entries(datesGrouped).forEach(([dateStr, items]: [string, any]) => {
        const quantities: Record<string, string> = {};
        finalRates.forEach(r => { quantities[String(r)] = ''; });
        
        const row: any = { 
          id: Math.random(), 
          description: dateStr, 
          quantities,
          total: 0, amount: '0' 
        };

        items.forEach((item: any) => {
          const loc = (item.shops?.location || '').toLowerCase().trim();
          const rate = rateMap[loc];
          if (rate) {
            const rateKey = String(Math.round(rate));
            row.quantities[rateKey] = String((Number(row.quantities[rateKey]) || 0) + 1);
          }
        });

        // Recalculate totals
        let totalQty = 0;
        let totalAmt = 0;
        finalRates.forEach(r => {
          const qty = Number(row.quantities[String(r)]) || 0;
          totalQty += qty;
          totalAmt += qty * r;
        });
        
        row.total = totalQty;
        row.amount = totalAmt > 0 ? totalAmt.toFixed(2) : '0';
        
        if (row.total > 0) billingRows.push(row);
      });

      navigate('/billing', { state: { 
        importCustomerName: company.name,
        importItems: billingRows,
        importMode: 'delivery',
        importRateColumns: finalRates
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
      // @ts-ignore
      .select(`id, date, created_at, shift, item_number, shop_id, shops (name, location), profiles (username)`)
      .eq('date', date)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setDeliveryData(data || []);
    setLoading(false);
  };

  const downloadPickupPDF = (companyName: string, items: any[]) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const margin = 14;

    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Customer:', companyName, date, 60);

    const totalItemCount = calculateTotalItemCount(items.map((i: any) => i.itemNumber));
    const y = 92;

    // Numbered Badge [01]
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, y, 14, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('01', margin + 3.8, y + 5.5);

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(companyName || 'Unknown Company', margin + 18, y + 6);

    // Total Items Pill on right
    const pillW = 34;
    const pillX = pw - margin - pillW;
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(pillX, y, pillW, 7.5, 3.75, 3.75, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Total Items: ${totalItemCount}`, pillX + 4.5, y + 5);

    // Table Body Construction
    const tableBody: any[] = items.map((item: any, i: number) => [
      i + 1,
      formatReportDate(date, 'dd/MM/yy'),
      item.location && item.location !== '-' ? item.location : '-',
      item.name || '-',
      item.itemNumber || '1'
    ]);

    // Company Total Footer Row
    tableBody.push([
      { 
        content: `Total Items for ${companyName}`, 
        colSpan: 4, 
        styles: { fontStyle: 'bold', textColor: [79, 70, 229], fillColor: [243, 244, 256], halign: 'left' } 
      },
      { 
        content: `${totalItemCount}`, 
        styles: { fontStyle: 'bold', textColor: [79, 70, 229], fillColor: [243, 244, 256], halign: 'center' } 
      }
    ]);

    autoTable(doc, {
      startY: y + 11,
      head: [['#', 'Date', 'Shop / Location', 'Item / Package', 'Item No.']],
      body: tableBody,
      theme: 'plain',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.3 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 26 },
        2: { halign: 'left' },
        3: { halign: 'left' },
        4: { halign: 'center', cellWidth: 26 }
      },
      margin: { left: margin, right: margin }
    });

    drawGreenFooter(doc, 'TOTAL ITEMS:', totalItemCount);
    savePDF(doc, `${companyName}_Pickups_${date}.pdf`);
  };

  const downloadAllPickupsPDF = () => {
    if (filteredPickups.length === 0) {
      toast.error('No data', 'No pickups found for this date.');
      return;
    }
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.width;
      const margin = 14;

      drawPDFHeader(doc);
      drawCustomerInfo(doc, 'Report:', 'Master Pickup Log', date, 60);

      let y = 92;
      const allItemNumbers: string[] = [];

      filteredPickups.forEach((c, idx) => {
        c.items.forEach((item: any) => allItemNumbers.push(item.itemNumber));

        const totalItemCount = calculateTotalItemCount(c.items.map((i: any) => i.itemNumber));
        const numStr = (idx + 1).toString().padStart(2, '0');

        // Check space on current page before drawing company section header
        if (y > 235) {
          doc.addPage();
          drawPDFHeader(doc);
          y = 65;
        }

        // 1. Numbered Badge [01]
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(margin, y, 14, 8, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(numStr, margin + 3.8, y + 5.5);

        // 2. Company Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(c.name || 'Unknown Company', margin + 18, y + 6);

        // 3. Total Items Pill on far right
        const pillW = 34;
        const pillX = pw - margin - pillW;
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(pillX, y, pillW, 7.5, 3.75, 3.75, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Total Items: ${totalItemCount}`, pillX + 4.5, y + 5);

        // Table Body Construction
        const tableBody: any[] = c.items.map((item: any, i: number) => [
          i + 1,
          formatReportDate(date, 'dd/MM/yy'),
          item.location && item.location !== '-' ? item.location : '-',
          item.name || '-',
          item.itemNumber || '1'
        ]);

        // Company Total Footer Row
        tableBody.push([
          { 
            content: `Total Items for ${c.name || 'Company'}`, 
            colSpan: 4, 
            styles: { fontStyle: 'bold', textColor: [79, 70, 229], fillColor: [243, 244, 256], halign: 'left' } 
          },
          { 
            content: `${totalItemCount}`, 
            styles: { fontStyle: 'bold', textColor: [79, 70, 229], fillColor: [243, 244, 256], halign: 'center' } 
          }
        ]);

        autoTable(doc, {
          startY: y + 11,
          head: [['#', 'Date', 'Shop / Location', 'Item / Package', 'Item No.']],
          body: tableBody,
          theme: 'plain',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.3 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'center', cellWidth: 26 },
            2: { halign: 'left' },
            3: { halign: 'left' },
            4: { halign: 'center', cellWidth: 26 }
          },
          margin: { left: margin, right: margin }
        });

        y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : y + 40;
      });

      const totalItems = calculateTotalItemCount(allItemNumbers);
      drawGreenFooter(doc, 'TOTAL ITEMS:', totalItems);
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
      const shiftLabel = shiftFilter !== 'all' ? ` (${shiftFilter.charAt(0).toUpperCase() + shiftFilter.slice(1)})` : '';
      drawCustomerInfo(doc, 'Report:', `Daily Delivery Log${shiftLabel}`, date);
      autoTable(doc, {
        head: [['#', 'Shop', 'Location', 'Item No.']],
        body: filteredDeliveries.map((d, i) => {
          return [i + 1, d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-'];
        }),
        startY: 105, theme: 'grid',
        headStyles: { fillColor: BRAND.success, textColor: 255, fontStyle: 'bold' },
        styles: { cellPadding: 3, fontSize: 10 },
      });
      const totalItems = calculateTotalItemCount(filteredDeliveries.map(d => d.item_number));
      drawGreenFooter(doc, 'TOTAL ITEMS:', totalItems);
      savePDF(doc, `Delivery_${date}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error('Export Failed', 'An error occurred while generating the PDF.');
    }
  };

  const generateGroupedPickupsPDF = (
    doc: jsPDF, 
    pickupsData: any[], 
    reportTitleLabel: string, 
    dateRangeLabel: string, 
    filename: string
  ) => {
    const pw = doc.internal.pageSize.width;
    const margin = 14;

    drawPDFHeader(doc);
    drawCustomerInfo(doc, 'Report:', reportTitleLabel, dateRangeLabel, 60);

    let y = 92;
    const allItemNumbers: string[] = [];

    // Group items by company
    const companyGroups: { id: string; name: string; items: any[] }[] = [];
    const map: { [key: string]: any } = {};

    pickupsData.forEach((p: any) => {
      const cId = p.companies?.id || 'unknown';
      const cName = p.companies?.name || 'Unknown Company';
      if (!map[cId]) {
        map[cId] = { id: cId, name: cName, items: [] };
        companyGroups.push(map[cId]);
      }
      const sortedItems = [...(p.pickup_items || [])].sort((a: any, b: any) => (a.shops?.location || '').localeCompare(b.shops?.location || ''));
      sortedItems.forEach((item: any) => {
        map[cId].items.push({
          date: p.date,
          name: item.shops?.name || '-',
          location: item.shops?.location || '-',
          itemNumber: item.item_number || '1'
        });
      });
    });

    if (companyGroups.length === 0) {
      toast.error('No data', 'No pickup records found.');
      return;
    }

    companyGroups.forEach((c, idx) => {
      c.items.forEach((item: any) => allItemNumbers.push(item.itemNumber));

      const totalItemCount = calculateTotalItemCount(c.items.map((i: any) => i.itemNumber));
      const numStr = (idx + 1).toString().padStart(2, '0');

      // Check space on current page before drawing company section header
      if (y > 235) {
        doc.addPage();
        drawPDFHeader(doc);
        y = 65;
      }

      // 1. Numbered Badge [01]
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(margin, y, 14, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(numStr, margin + 3.8, y + 5.5);

      // 2. Company Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(c.name || 'Unknown Company', margin + 18, y + 6);

      // 3. Total Items Pill on far right
      const pillW = 34;
      const pillX = pw - margin - pillW;
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(pillX, y, pillW, 7.5, 3.75, 3.75, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Total Items: ${totalItemCount}`, pillX + 4.5, y + 5);

      // Table Body Construction
      const tableBody: any[] = c.items.map((item: any, i: number) => [
        i + 1,
        formatReportDate(item.date, 'dd/MM/yy'),
        item.location && item.location !== '-' ? item.location : '-',
        item.name || '-',
        item.itemNumber || '1'
      ]);

      // Company Total Footer Row
      tableBody.push([
        { 
          content: `Total Items for ${c.name || 'Company'}`, 
          colSpan: 4, 
          styles: { fontStyle: 'bold', textColor: [79, 70, 229], fillColor: [243, 244, 256], halign: 'left' } 
        },
        { 
          content: `${totalItemCount}`, 
          styles: { fontStyle: 'bold', textColor: [79, 70, 229], fillColor: [243, 244, 256], halign: 'center' } 
        }
      ]);

      autoTable(doc, {
        startY: y + 11,
        head: [['#', 'Date', 'Shop / Location', 'Item / Package', 'Item No.']],
        body: tableBody,
        theme: 'plain',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.3 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 26 },
          2: { halign: 'left' },
          3: { halign: 'left' },
          4: { halign: 'center', cellWidth: 26 }
        },
        margin: { left: margin, right: margin }
      });

      y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : y + 40;
    });

    const totalItems = calculateTotalItemCount(allItemNumbers);
    drawGreenFooter(doc, 'TOTAL ITEMS:', totalItems);
    savePDF(doc, filename);
  };

  const downloadPickupRangePDF = async (days: number) => {
    const { start, end } = getDateRange(days, date);
    toast.info('Generating...', `Fetching ${days}-day pickup report`);
    
    let query = supabase.from('pickups')
      .select(`date, created_at, companies (id, name), pickup_items ( item_number, shops (name, location) )`)
      .gte('date', start).lte('date', end);
      
    if (selectedCompanyId) {
      query = query.eq('company_id', selectedCompanyId);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error || !data?.length) { toast.error('No data', 'No pickups in this range.'); return; }
    const doc = new jsPDF();
    const companyName = selectedCompanyId && data[0]?.companies ? data[0].companies.name : 'All Companies';
    const reportTitle = `${days}-Day Pickup Report (${companyName})`;
    const dateRange = `${formatReportDate(start, 'dd MMM')} to ${formatReportDate(end, 'dd MMM yyyy')}`;

    generateGroupedPickupsPDF(doc, data, reportTitle, dateRange, `Pickups_${companyName.replace(/\s+/g, '_')}_${days}days_${end}.pdf`);
  };

  const downloadDeliveryRangePDF = async (days: number) => {
    const { start, end } = getDateRange(days, date);
    toast.info('Generating...', `Fetching ${days}-day delivery report`);
    let query = supabase.from('deliveries')
      // @ts-ignore
      .select(`date, created_at, shift, item_number, shops (name, location)`)
      .gte('date', start).lte('date', end).order('date', { ascending: false });
    
    if (shiftFilter !== 'all') {
      // @ts-ignore
      query = query.eq('shift', shiftFilter);
    }
    
    const { data, error } = await query;
    if (error || !data?.length) { toast.error('No data', 'No deliveries in this range.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    const shiftLabel = shiftFilter !== 'all' ? ` (${shiftFilter.charAt(0).toUpperCase() + shiftFilter.slice(1)})` : '';
    drawCustomerInfo(doc, 'Report:', `${days}-Day Delivery Report${shiftLabel}`, `${formatReportDate(start, 'dd MMM')} to ${formatReportDate(end, 'dd MMM yyyy')}`);
    const sortedData = [...data].sort((a: any, b: any) => (a.shops?.location || '').localeCompare(b.shops?.location || ''));
    const rows = sortedData.map((d: any, i: number) => [i + 1, formatReportDate(d.date, 'dd/MM/yy'), d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-']);
    autoTable(doc, { head: [['#', 'Date', 'Shop', 'Location', 'Item No.']], body: rows, startY: 105, theme: 'grid', headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 3, fontSize: 10 } });
    const totalItems = calculateTotalItemCount(rows.map(r => r[4]));
    drawGreenFooter(doc, 'TOTAL ITEMS:', totalItems);
    savePDF(doc, `Deliveries_${days}days_${end}.pdf`);
  };

  const downloadCustomDateRangePDF = async (type: 'pickups' | 'deliveries') => {
    if (!fromDate || !toDate) {
      toast.error('Invalid Date Range', 'Please select both From Date and To Date.');
      return;
    }
    if (fromDate > toDate) {
      toast.error('Invalid Date Range', 'From Date cannot be after To Date.');
      return;
    }

    toast.info('Generating...', `Fetching ${type} report from ${fromDate} to ${toDate}`);

    if (type === 'pickups') {
      let query = supabase.from('pickups')
        .select(`date, created_at, companies (id, name), pickup_items ( item_number, shops (name, location) )`)
        .gte('date', fromDate).lte('date', toDate);
        
      if (selectedCompanyId) {
        query = query.eq('company_id', selectedCompanyId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error || !data?.length) { 
        toast.error('No data', 'No pickups found in this date range.'); 
        return; 
      }
      
      const doc = new jsPDF();
      const companyName = selectedCompanyId && data[0]?.companies ? data[0].companies.name : 'All Companies';
      const dateLabel = `${formatReportDate(fromDate, 'dd MMM yyyy')} to ${formatReportDate(toDate, 'dd MMM yyyy')}`;
      const reportTitle = `Pickup Report (${companyName})`;

      generateGroupedPickupsPDF(doc, data, reportTitle, dateLabel, `Pickups_${companyName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.pdf`);
    } else {
      let query = supabase.from('deliveries')
        // @ts-ignore
        .select(`date, created_at, shift, item_number, shops (name, location)`)
        .gte('date', fromDate).lte('date', toDate).order('date', { ascending: false });
      
      if (shiftFilter !== 'all') {
        // @ts-ignore
        query = query.eq('shift', shiftFilter);
      }
      
      const { data, error } = await query;
      if (error || !data?.length) { 
        toast.error('No data', 'No deliveries found in this date range.'); 
        return; 
      }
      
      const doc = new jsPDF();
      drawPDFHeader(doc);
      const shiftLabel = shiftFilter !== 'all' ? ` (${shiftFilter.charAt(0).toUpperCase() + shiftFilter.slice(1)})` : '';
      const dateLabel = `${formatReportDate(fromDate, 'dd MMM yyyy')} to ${formatReportDate(toDate, 'dd MMM yyyy')}`;
      drawCustomerInfo(doc, 'Report:', `Delivery Report${shiftLabel}`, dateLabel);
      
      const sortedData = [...data].sort((a: any, b: any) => (a.shops?.location || '').localeCompare(b.shops?.location || ''));
      const rows = sortedData.map((d: any, i: number) => [i + 1, formatReportDate(d.date, 'dd/MM/yy'), d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-']);
      autoTable(doc, { 
        head: [['Date', 'Shop', 'Location', 'Item No.']], 
        body: rows, 
        startY: 105, 
        theme: 'grid', 
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, 
        styles: { cellPadding: 3, fontSize: 10 } 
      });
      const totalItems = calculateTotalItemCount(rows.map(r => r[3]));
      drawGreenFooter(doc, 'TOTAL ITEMS:', totalItems);
      savePDF(doc, `Deliveries_${fromDate}_to_${toDate}.pdf`);
    }
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

  const handleBulkDateChange = async (pickupIds: string[], newDate: string, companyId: string) => {
    if (!newDate || pickupIds.length === 0) return;
    if (!window.confirm(`Change date for all ${pickupIds.length} pickup record(s) of this company to ${newDate}?`)) return;

    const { error } = await supabase.from('pickups').update({ date: newDate }).in('id', pickupIds);
    if (error) {
      toast.error('Error', error.message);
    } else {
      toast.success('Updated!', `All pickups moved to ${newDate}.`);
      setBulkDateEdit(prev => { const n = { ...prev }; delete n[companyId]; return n; });
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

  const handleSavePickupItem = async (itemId: string) => {
    if (!editingPickupItem || editingPickupItem.id !== itemId) return;
    
    const { error: itemError } = await supabase.from('pickup_items').update({ item_number: editingPickupItem.itemNumber }).eq('id', itemId);
    if (itemError) {
      toast.error('Error updating item number', itemError.message);
      return;
    }
    
    if (editingPickupItem.pickupId && editingPickupItem.date) {
      const { error: pickupError } = await supabase.from('pickups').update({ date: editingPickupItem.date }).eq('id', editingPickupItem.pickupId);
      if (pickupError) {
        toast.error('Error updating pickup date', pickupError.message);
        return;
      }
    }
    
    toast.success('Saved', 'Pickup details updated.');
    fetchPickups();
    setEditingPickupItem(null);
  };

  const handleSaveDeliveryItem = async (itemId: string) => {
    if (!editingDeliveryItem || editingDeliveryItem.id !== itemId) return;
    const { error } = await supabase.from('deliveries').update({ 
      item_number: editingDeliveryItem.itemNumber,
      date: editingDeliveryItem.date
    }).eq('id', itemId);
    
    if (error) toast.error('Error', error.message);
    else { toast.success('Saved', 'Delivery details updated.'); fetchDeliveries(); }
    setEditingDeliveryItem(null);
  };

  const downloadMonthlyPickupPDF = async (monthStr: string) => {
    if (!monthStr) return;
    toast.info('Generating...', `Fetching pickup report for ${monthStr}`);
    const [year, month] = monthStr.split('-');
    const start = `${monthStr}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const end = `${monthStr}-${lastDay}`;
    
    let query = supabase.from('pickups')
      .select(`date, created_at, companies (id, name), pickup_items ( item_number, shops (name, location) )`)
      .gte('date', start).lte('date', end);
      
    if (selectedCompanyId) {
      query = query.eq('company_id', selectedCompanyId);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
      
    if (error || !data?.length) { toast.error('No data', 'No pickups in this month.'); return; }
    const doc = new jsPDF();
    const companyName = selectedCompanyId && data[0]?.companies ? data[0].companies.name : 'All Companies';
    const reportTitle = `Monthly Pickup Report (${companyName})`;
    const dateRange = format(new Date(start), 'MMMM yyyy');

    generateGroupedPickupsPDF(doc, data, reportTitle, dateRange, `Pickups_${companyName.replace(/\s+/g, '_')}_${monthStr}.pdf`);
  };

  const downloadMonthlyDeliveryPDF = async (monthStr: string) => {
    if (!monthStr) return;
    toast.info('Generating...', `Fetching delivery report for ${monthStr}`);
    const [year, month] = monthStr.split('-');
    const start = `${monthStr}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const end = `${monthStr}-${lastDay}`;
    
    let query = supabase.from('deliveries')
      // @ts-ignore
      .select(`date, created_at, shift, item_number, shops (name, location)`)
      .gte('date', start).lte('date', end).order('date', { ascending: false });
      
    if (shiftFilter !== 'all') {
      // @ts-ignore
      query = query.eq('shift', shiftFilter);
    }
      
    const { data, error } = await query;
      
    if (error || !data?.length) { toast.error('No data', 'No deliveries in this month.'); return; }
    const doc = new jsPDF();
    drawPDFHeader(doc);
    const shiftLabel = shiftFilter !== 'all' ? ` (${shiftFilter.charAt(0).toUpperCase() + shiftFilter.slice(1)})` : '';
    drawCustomerInfo(doc, 'Report:', `Monthly Delivery Report${shiftLabel}`, formatReportDate(start, 'MMMM yyyy'));
    const sortedData = [...data].sort((a: any, b: any) => (a.shops?.location || '').localeCompare(b.shops?.location || ''));
    const rows = sortedData.map((d: any, i: number) => [i + 1, formatReportDate(d.date, 'dd/MM/yy'), d.shops?.name || '-', d.shops?.location || '-', d.item_number || '-']);
    autoTable(doc, { head: [['#', 'Date', 'Shop', 'Location', 'Item No.']], body: rows, startY: 105, theme: 'grid', headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 3, fontSize: 10 } });
    const totalItems = calculateTotalItemCount(rows.map(r => r[4]));
    drawGreenFooter(doc, 'TOTAL ITEMS:', totalItems);
    savePDF(doc, `Deliveries_${monthStr}.pdf`);
  };

  const lq = searchQuery.toLowerCase();
  
  const sequenceMap = new Map(routeLocations.map(rl => [(rl.location_name || '').trim().toLowerCase(), rl.sequence_order]));
  
  const filteredPickups = pickupData.map(c => ({ 
    ...c, 
    items: c.items
      .filter((item: any) => item.name.toLowerCase().includes(lq) || c.name.toLowerCase().includes(lq))
      .sort((a: any, b: any) => (a.location || '').localeCompare(b.location || ''))
  })).filter(c => c.items.length > 0)
    .filter(c => !selectedCompanyId || c.id === selectedCompanyId);
  
  const filteredDeliveries = deliveryData
    .filter(d => (d.shops?.name || '').toLowerCase().includes(lq) || (d.shops?.location || '').toLowerCase().includes(lq))
    .filter(d => shiftFilter === 'all' || d.shift === shiftFilter)
    .sort((a, b) => {
      if (selectedRouteId && routeLocations.length > 0) {
        const aLocation = (a.shops?.location || '').trim().toLowerCase();
        const bLocation = (b.shops?.location || '').trim().toLowerCase();
        const aSeq = sequenceMap.has(aLocation) ? sequenceMap.get(aLocation) : 999999;
        const bSeq = sequenceMap.has(bLocation) ? sequenceMap.get(bLocation) : 999999;
        if (aSeq !== bSeq) return (aSeq as number) - (bSeq as number);
      }
      return (a.shops?.location || '').localeCompare(b.shops?.location || '');
    });

  const RangeBtns = ({ onDownloadRange, onDownloadMonth }: { onDownloadRange: (d: number) => void, onDownloadMonth: (m: string) => void }) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2 items-center flex-wrap">
        {[7, 15].map(d => (
          <button key={d} onClick={() => onDownloadRange(d)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm whitespace-nowrap">
            <CalendarDays size={12} />
            {d} Days
          </button>
        ))}
        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <span className="text-[10px] font-bold text-slate-500 uppercase">1 Month:</span>
          <CalendarDays size={12} className="text-slate-400" />
          <input 
            type="month"
            className="text-xs font-bold text-slate-600 outline-none cursor-pointer bg-transparent"
            onChange={e => {
              if (e.target.value) {
                onDownloadMonth(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Custom From Date to To Date PDF export */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custom Range PDF:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[10px] font-bold text-slate-400">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[10px] font-bold text-slate-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => downloadCustomDateRangePDF(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-xs font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-sm shadow-indigo-500/20 whitespace-nowrap"
          >
            <Download size={12} /> Range PDF
          </button>
        </div>
      </div>
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
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap justify-end">
          {activeTab === 'pickups' && (
            <SearchableCompanySelect
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              onSelectCompany={setSelectedCompanyId}
            />
          )}
          {activeTab === 'deliveries' && (
            <>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="bg-white/80 backdrop-blur-md border border-white shadow-sm rounded-2xl px-4 py-2.5 outline-none text-sm font-bold text-slate-700 hover:border-indigo-300 transition-all max-w-[150px]"
              >
                <option value="">Order by Route...</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as any)}
                className="bg-white/80 backdrop-blur-md border border-white shadow-sm rounded-2xl px-4 py-2.5 outline-none text-sm font-bold text-slate-700 hover:border-indigo-300 transition-all"
              >
                <option value="all">All Shifts</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </>
          )}
          <label className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white shadow-sm rounded-2xl px-4 py-2.5 cursor-pointer hover:border-indigo-300 transition-all">
            <CalendarDays size={16} className="text-indigo-500 flex-shrink-0" />
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setIsMultiDateMode(false); setSelectedDates([]); }}
              className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold text-sm w-32 outline-none"
            />
          </label>
        </div>
      </div>

      {/* ── Dashboard Summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Package className="text-indigo-500" size={20} />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Day Pickups</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none mt-1">{stats.dayPickups}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Truck className="text-emerald-500" size={20} />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Day Deliveries</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none mt-1">{stats.dayDeliveries}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Package className="text-blue-500" size={20} />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Month Pickups</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none mt-1">{stats.monthPickups}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Truck className="text-teal-500" size={20} />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Month Deliveries</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none mt-1">{stats.monthDeliveries}</p>
          </div>
        </div>
      </div>

      {/* ── Multi-date Mode Toggle - Show only for pickups ── */}
      {activeTab === 'pickups' && (
        <>
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
        </>
      )}

      {/* ── Sticky Nav & Search ── */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-xl pb-4 pt-1 -mx-2 px-2 sm:-mx-4 sm:px-4 shadow-sm border-b border-slate-200/50 space-y-3 mb-5">
        {/* ── Tab Toggle ── */}
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl backdrop-blur-sm">
          {(['pickups', 'deliveries'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchQuery(''); setExpandedCompany(null); setSelectedCompanyId(''); }}
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

            {/* Action bar - Master Admin only */}
            {isMasterAdmin && (
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
                  <RangeBtns onDownloadRange={downloadPickupRangePDF} onDownloadMonth={downloadMonthlyPickupPDF} />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {filteredPickups.length} compan{filteredPickups.length !== 1 ? 'ies' : 'y'} · {filteredPickups.reduce((a, c) => a + c.items.length, 0)} shops
                </p>
              </div>
            )}

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
                    {/* Bulk Date Change */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="date"
                        title="Change date for all pickups of this company"
                        value={bulkDateEdit[company.id] || ''}
                        onChange={e => setBulkDateEdit(prev => ({ ...prev, [company.id]: e.target.value }))}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-300 transition-all bg-slate-50 cursor-pointer w-[130px]"
                      />
                      {bulkDateEdit[company.id] && (
                        <button
                          onClick={() => handleBulkDateChange(company.pickupIds, bulkDateEdit[company.id], company.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500 text-white text-[11px] font-black hover:bg-indigo-600 transition-all shadow-sm shadow-indigo-500/30 whitespace-nowrap"
                          title="Apply date to all pickups of this company"
                        >
                          <Check size={11} /> Apply All
                        </button>
                      )}
                    </div>
                    <button
                      onClick={e => handleDeleteFullPickup(company.pickupIds, e)}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                      title="Delete Entire Company Pickup"
                    >
                      <Trash2 size={13} />
                    </button>
                    {isMasterAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); downloadPickupPDF(company.name, company.items); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 text-[11px] font-bold transition-all">
                        <Download size={12} /> PDF
                      </button>
                    )}
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
                      className="border-t border-slate-100 bg-slate-50/50 p-4"
                    >
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-[11px] uppercase text-slate-400 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3">Shop Name</th>
                              <th className="px-4 py-3">Location</th>
                              <th className="px-4 py-3 text-center">Item No.</th>
                              <th className="px-4 py-3 text-center">Time</th>
                              <th className="px-4 py-3 text-center">User</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {company.items.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">{item.location || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  {editingPickupItem?.id === item.itemId ? (
                                    <input 
                                      type="text" 
                                      className="border border-indigo-300 rounded px-2 py-1 w-20 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                                      value={editingPickupItem.itemNumber}
                                      autoFocus
                                      onChange={e => setEditingPickupItem({ ...editingPickupItem, itemNumber: e.target.value })}
                                      onKeyDown={e => e.key === 'Enter' && handleSavePickupItem(item.itemId)}
                                    />
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold text-xs">
                                      <Box size={10} />{item.itemNumber || '-'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-center whitespace-nowrap">
                                  {editingPickupItem?.id === item.itemId ? (
                                    <input 
                                      type="date" 
                                      className="border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                                      value={editingPickupItem.date}
                                      onChange={e => setEditingPickupItem({ ...editingPickupItem, date: e.target.value })}
                                    />
                                  ) : (
                                    <span className="flex items-center justify-center gap-1"><Clock size={11} className="text-slate-400" />{item.pickupTime}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-center"><span className="flex items-center justify-center gap-1"><User size={11} className="text-slate-400" />{item.pickupUser}</span></td>
                                <td className="px-4 py-3 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex justify-end gap-1.5">
                                    {editingPickupItem?.id === item.itemId ? (
                                      <button onClick={() => handleSavePickupItem(item.itemId)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Save">
                                        <Check size={14} />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingPickupItem({ id: item.itemId, itemNumber: item.itemNumber || '', date: date, pickupId: item.pickupId })} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Edit">
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                    <button onClick={e => handleDeletePickupItem(item.itemId, item.pickupId, e)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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

            {/* Action bar - Master Admin only */}
            {isMasterAdmin && (
              <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Download Range (Deliveries)</span>
                  <button
                    onClick={downloadDeliveryPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-emerald-600 text-[11px] font-bold hover:bg-emerald-50 transition-all shadow-sm">
                    <Download size={12} /> Today's PDF
                  </button>
                </div>
                <RangeBtns onDownloadRange={downloadDeliveryRangePDF} onDownloadMonth={downloadMonthlyDeliveryPDF} />
                <p className="text-[11px] text-slate-400 font-medium">
                  {filteredDeliveries.length} deliveries recorded
                </p>
              </div>
            )}

            {/* Delivery Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-400 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Shop Name</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-center">Item No.</th>
                    <th className="px-4 py-3 text-center">Time</th>
                    <th className="px-4 py-3 text-center">User</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliveries.slice((deliveryPage - 1) * itemsPerPage, deliveryPage * itemsPerPage).map((delivery, idx) => (
                    <tr key={delivery.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <div className="w-6 h-6 mx-auto rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">
                          {(deliveryPage - 1) * itemsPerPage + idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{delivery.shops?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{delivery.shops?.location || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {editingDeliveryItem?.id === delivery.id ? (
                          <input 
                            type="text" 
                            className="border border-indigo-300 rounded px-2 py-1 w-20 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                            value={editingDeliveryItem.itemNumber}
                            autoFocus
                            onChange={e => setEditingDeliveryItem({ ...editingDeliveryItem, itemNumber: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleSaveDeliveryItem(delivery.id)}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold text-xs">
                            <Box size={10} />{delivery.item_number || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-center whitespace-nowrap">
                        {editingDeliveryItem?.id === delivery.id ? (
                          <input 
                            type="date" 
                            className="border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                            value={editingDeliveryItem.date}
                            onChange={e => setEditingDeliveryItem({ ...editingDeliveryItem, date: e.target.value })}
                          />
                        ) : (
                          <span className="flex items-center justify-center gap-1"><Clock size={11} className="text-slate-400" />{format(new Date(delivery.created_at), 'hh:mm a')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-center"><span className="flex items-center justify-center gap-1"><User size={11} className="text-slate-400" />{delivery.profiles?.username || '-'}</span></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-end gap-1.5">
                          {editingDeliveryItem?.id === delivery.id ? (
                            <button onClick={() => handleSaveDeliveryItem(delivery.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Save">
                              <Check size={14} />
                            </button>
                          ) : (
                            <button onClick={() => setEditingDeliveryItem({ id: delivery.id, itemNumber: delivery.item_number || '', date: delivery.date || date })} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Edit">
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button onClick={e => handleDeleteDelivery(delivery.id, e)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Math.ceil(filteredDeliveries.length / itemsPerPage) > 1 && (
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <button 
                  disabled={deliveryPage === 1} 
                  onClick={() => setDeliveryPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Page {deliveryPage} of {Math.ceil(filteredDeliveries.length / itemsPerPage)}
                </span>
                <button 
                  disabled={deliveryPage === Math.ceil(filteredDeliveries.length / itemsPerPage)} 
                  onClick={() => setDeliveryPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

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

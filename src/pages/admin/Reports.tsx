import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, ChevronDown, ChevronUp, Clock, User, FileText, Box } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { drawPDFHeader, drawCustomerInfo, drawGreenFooter, savePDF } from '../../utils/pdfGenerator';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState<'pickups' | 'deliveries'>('pickups');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [pickupData, setPickupData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'pickups') fetchPickups();
    else fetchDeliveries();
  }, [date, activeTab]);

  const fetchPickups = async () => {
    // Added item_number to selection
    const { data, error } = await supabase
      .from('pickups')
      .select(`
        id, created_at,
        companies (id, name),
        profiles (username),
        pickup_items ( item_number, shops (id, name, location) )
      `)
      .eq('date', date);
    
    if (error) console.error(error);
    
    const grouped = (data || []).reduce((acc: any, curr: any) => {
      const companyId = curr.companies?.id;
      if (!acc[companyId]) {
        acc[companyId] = {
          id: companyId,
          name: curr.companies?.name || 'Unknown',
          items: []
        };
      }
      const time = format(new Date(curr.created_at), 'hh:mm a');
      const user = curr.profiles?.username || 'Unknown';
      const shops = curr.pickup_items?.map((pi: any) => ({
        ...pi.shops,
        itemNumber: pi.item_number, // Capture item number
        pickupTime: time,
        pickupUser: user
      })) || [];
      acc[companyId].items.push(...shops);
      return acc;
    }, {});

    setPickupData(Object.values(grouped));
  };

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`id, created_at, item_number, shops (name, location), profiles (username)`)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    setDeliveryData(data || []);
  };

  const downloadPickupPDF = (companyName: string, items: any[]) => {
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Customer Name:", companyName, format(new Date(date), 'dd/MM/yyyy'));

    const tableData = items.map((item, index) => [
      index + 1,
      item.name,
      item.location || '-',
      item.itemNumber || '-', // Added to PDF
      item.pickupTime
    ]);

    autoTable(doc, {
      head: [['#', 'Shop Name', 'Location', 'Item No.', 'Time']],
      body: tableData,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    
    drawGreenFooter(doc, "TOTAL SHOPS:", items.length);
    savePDF(doc, `${companyName}_Pickups_${date}.pdf`);
  };

  const downloadAllPickupsPDF = () => {
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Master Pickup Log (All Companies)", format(new Date(date), 'dd/MM/yyyy'));

    let finalY = 75;
    let totalShops = 0;

    pickupData.forEach((company) => {
        totalShops += company.items.length;
        
        if (finalY > 250) {
            doc.addPage();
            drawPDFHeader(doc);
            finalY = 60;
        }

        doc.setFontSize(14);
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text(company.name, 14, finalY);
        
        const tableData = company.items.map((item: any, i: number) => [
            i + 1,
            item.name,
            item.location || '-',
            item.itemNumber || '-', // Added to PDF
            item.pickupTime
        ]);

        autoTable(doc, {
            head: [['#', 'Shop Name', 'Location', 'Item No.', 'Time']],
            body: tableData,
            startY: finalY + 5,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
            styles: { cellPadding: 3, fontSize: 10 },
            margin: { left: 14, right: 14 },
        });

        finalY = (doc as any).lastAutoTable.finalY + 15;
    });

    drawGreenFooter(doc, "TOTAL SHOPS:", totalShops);
    savePDF(doc, `Master_Pickup_Report_${date}.pdf`);
  };

  const downloadDeliveryPDF = () => {
    const doc = new jsPDF();
    drawPDFHeader(doc);
    drawCustomerInfo(doc, "Report Type:", "Daily Delivery Log", format(new Date(date), 'dd/MM/yyyy'));

    const tableData = deliveryData.map((d, index) => [
      index + 1,
      d.shops?.name || 'Unknown',
      d.shops?.location || '-',
      d.item_number || '-',
      format(new Date(d.created_at), 'hh:mm a')
    ]);

    autoTable(doc, {
      head: [['#', 'Shop Name', 'Location', 'Item No.', 'Delivery Time']],
      body: tableData,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    drawGreenFooter(doc, "TOTAL DELIVERIES:", deliveryData.length);
    savePDF(doc, `Delivery_Report_${date}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Reports</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">View and export daily logistics data</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1.5 p-1.5 bg-[#e0e5ec] rounded-2xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] w-full sm:w-fit">
        {(['pickups', 'deliveries'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 capitalize ${
              activeTab === tab
                ? tab === 'pickups'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'pickups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 font-medium text-sm">{pickupData.length} compan{pickupData.length !== 1 ? 'ies' : 'y'} found</p>
            <Button variant="primary" onClick={downloadAllPickupsPDF} disabled={pickupData.length === 0} className="!py-2 !px-4 text-sm whitespace-nowrap">
              <FileText size={16} /> Master PDF
            </Button>
          </div>

          {pickupData.map((company) => (
            <div key={company.id} className="bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-2xl shadow-[6px_6px_14px_rgba(163,177,198,0.4),-6px_-6px_14px_rgba(255,255,255,0.7)] border border-white/50 overflow-hidden">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-black text-lg">{company.items.length}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">{company.name}</h3>
                    <p className="text-slate-500 text-xs font-medium">{company.items.length} shop{company.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" className="!py-2 !px-4 text-sm" onClick={(e) => { e.stopPropagation(); downloadPickupPDF(company.name, company.items); }}>
                    <Download size={15} /> PDF
                  </Button>
                  {expandedCompany === company.id ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                </div>
              </div>

              {expandedCompany === company.id && (
                <div className="bg-white/30 p-5 border-t border-white/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {company.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/60 backdrop-blur-sm p-3.5 rounded-xl border border-white/50 shadow-sm">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="font-bold text-slate-800 text-sm leading-tight">{item.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg whitespace-nowrap flex-shrink-0">{item.location || '-'}</span>
                        </div>
                        {item.itemNumber && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            <Box size={10} /> {item.itemNumber}
                          </span>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 border-t border-slate-100 pt-2 mt-2.5">
                          <span className="flex items-center gap-1"><Clock size={10} /> {item.pickupTime}</span>
                          <span className="flex items-center gap-1"><User size={10} /> {item.pickupUser}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {pickupData.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No pickups found for this date</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 font-medium text-sm">{deliveryData.length} deliveries recorded</p>
            <Button variant="secondary" onClick={downloadDeliveryPDF} disabled={deliveryData.length === 0} className="!py-2 !px-4 text-sm whitespace-nowrap">
              <Download size={15} /> Download PDF
            </Button>
          </div>
          <div className="space-y-3">
            {deliveryData.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center gap-4 p-4 bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-2xl shadow-[6px_6px_14px_rgba(163,177,198,0.4),-6px_-6px_14px_rgba(255,255,255,0.7)] border-l-4 border border-white/50"
                style={{ borderLeftColor: '#10b981' }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-black text-base">{(delivery.shops?.name || '?').charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{delivery.shops?.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">{delivery.shops?.location}</span>
                    {delivery.item_number && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        <Box size={9} /> {delivery.item_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-600 flex items-center justify-end gap-1"><Clock size={13} /> {format(new Date(delivery.created_at), 'hh:mm a')}</p>
                  <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5"><User size={11} /> {delivery.profiles?.username}</p>
                </div>
              </div>
            ))}
            {deliveryData.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">No deliveries recorded for this date</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

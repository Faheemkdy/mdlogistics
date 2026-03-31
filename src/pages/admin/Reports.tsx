import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <Input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="flex gap-4 border-b border-slate-200 pb-1">
          <button onClick={() => setActiveTab('pickups')} className={`pb-2 px-4 font-bold transition-colors ${activeTab === 'pickups' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Pickups</button>
          <button onClick={() => setActiveTab('deliveries')} className={`pb-2 px-4 font-bold transition-colors ${activeTab === 'deliveries' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400'}`}>Deliveries</button>
      </div>

      {activeTab === 'pickups' && (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-slate-500 text-sm">{pickupData.length} Companies found</p>
                <Button variant="primary" onClick={downloadAllPickupsPDF} disabled={pickupData.length === 0} className="!py-2 !px-4 text-sm">
                    <FileText size={16} /> Download All (Master PDF)
                </Button>
            </div>

            {pickupData.map((company) => (
            <Card key={company.id} className="!p-0 overflow-hidden border border-slate-200/50">
                <div 
                className="p-5 flex items-center justify-between cursor-pointer bg-[#e0e5ec] hover:bg-slate-200 transition-colors"
                onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shadow-inner flex items-center justify-center font-bold text-slate-600">
                    {company.items.length}
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">{company.name}</h3>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" className="!py-2 !px-4 text-sm" onClick={(e) => { e.stopPropagation(); downloadPickupPDF(company.name, company.items); }}>
                        <Download size={16} /> PDF
                    </Button>
                    {expandedCompany === company.id ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                </div>
                </div>

                {expandedCompany === company.id && (
                <div className="bg-slate-50/50 p-5 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {company.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{item.location}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {item.itemNumber && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Box size={10} /> {item.itemNumber}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-50 pt-2 mt-2">
                                <span className="flex items-center gap-1"><Clock size={10}/> {item.pickupTime}</span>
                                <span className="flex items-center gap-1"><User size={10}/> {item.pickupUser}</span>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
                )}
            </Card>
            ))}
            {pickupData.length === 0 && <p className="text-center text-slate-400 py-8">No pickups found for this date.</p>}
        </div>
      )}

      {activeTab === 'deliveries' && (
          <Card>
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-700">Daily Delivery Log</h3>
                  <Button variant="secondary" onClick={downloadDeliveryPDF} disabled={deliveryData.length === 0}>
                      <Download size={18} /> Download Report
                  </Button>
              </div>
              <div className="space-y-3">
                  {deliveryData.map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-l-4 border-green-500">
                          <div>
                              <h4 className="font-bold text-slate-800">{delivery.shops?.name}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500">{delivery.shops?.location}</span>
                                {delivery.item_number && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Box size={10} /> {delivery.item_number}
                                    </span>
                                )}
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-bold text-slate-600 flex items-center justify-end gap-1"><Clock size={14} /> {format(new Date(delivery.created_at), 'hh:mm a')}</p>
                              <p className="text-xs text-slate-400 flex items-center justify-end gap-1"><User size={12} /> {delivery.profiles?.username}</p>
                          </div>
                      </div>
                  ))}
                  {deliveryData.length === 0 && <p className="text-center text-slate-400 py-8">No deliveries recorded today.</p>}
              </div>
          </Card>
      )}
    </div>
  );
};

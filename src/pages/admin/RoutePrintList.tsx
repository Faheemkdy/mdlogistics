import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Printer, Compass } from 'lucide-react';
import { format } from 'date-fns';

interface Route {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
  location: string;
  phone?: string;
}

export const RoutePrintList = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [printData, setPrintData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState<'all' | 'today'>('all');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').order('name');
    if (data) setRoutes(data);
  };

  const handleFetchData = async (mode: 'all' | 'today') => {
    if (!selectedRouteId) return;
    setLoading(true);
    setPrintMode(mode);
    setPrintData([]);

    // Get sequence map for this route (using route_locations)
    const { data: routeLocations } = await supabase
      .from('route_locations')
      .select('location_name, sequence_order')
      .eq('route_id', selectedRouteId)
      .order('sequence_order', { ascending: true });

    if (!routeLocations || routeLocations.length === 0) {
      setLoading(false);
      return;
    }

    const routeLocationNamesLower = routeLocations.map(rl => rl.location_name.trim().toLowerCase());
    const sequenceMap = new Map(routeLocations.map(rl => [rl.location_name.trim().toLowerCase(), rl.sequence_order]));

    if (mode === 'all') {
      const { data: allShops, error } = await supabase.from('shops').select('id, name, location');
      if (error) console.error("Error fetching shops:", error);
      
      console.log("=== ROUTE PRINT DEBUG ===");
      console.log("Route Locations:", routeLocations);
      console.log("Total shops fetched:", allShops?.length || 0);
      console.log("Sample shops (first 5):", allShops?.slice(0, 5));
      
      const groupedData = routeLocations.map(rl => {
        const rlLower = rl.location_name.trim().toLowerCase();
        const shopsInLoc = (allShops || [])
          .filter(s => s.location && s.location.trim().toLowerCase() === rlLower)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`Location "${rl.location_name}" (${rlLower}) → Matched shops: ${shopsInLoc.length}`);
          
        return {
          sequence: rl.sequence_order,
          location: rl.location_name,
          shops: shopsInLoc.map(shop => ({
            shop: shop,
            items: '',
            weight: 0
          }))
        };
      });
      
      // Skip locations with no shops
      setPrintData(groupedData.filter(g => g.shops.length > 0));
    } else {
      // Fetch today's pickups
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: pickups } = await supabase
        .from('pickups')
        .select(`id, pickup_items (item_number, shops(id, name, location, phone))`)
        .eq('date', today)
        .limit(10000);
        
      const groupedData = routeLocations.map(rl => {
        return {
          sequence: rl.sequence_order,
          location: rl.location_name,
          shops: [] as any[]
        };
      });
        
      if (pickups) {
        const allItems = pickups.flatMap((p: any) => p.pickup_items || []);
        
        const shopGroups = new Map();
        allItems.forEach((item: any) => {
          if (!item.shops) return;
          const shopId = item.shops.id;
          if (!shopGroups.has(shopId)) {
            shopGroups.set(shopId, {
              shop: item.shops,
              items: [],
              weight: 0
            });
          }
          const group = shopGroups.get(shopId);
          if (item.item_number) group.items.push(item.item_number);
        });

        // Distribute to location groups
        Array.from(shopGroups.values()).forEach(group => {
          const locLower = (group.shop.location || '').trim().toLowerCase();
          const routeGroup = groupedData.find(g => g.location.trim().toLowerCase() === locLower);
          if (routeGroup) {
            routeGroup.shops.push({
              shop: group.shop,
              items: group.items.join(', '),
              weight: group.weight
            });
          }
        });
        
        // Sort shops within each group alphabetically
        groupedData.forEach(g => {
          g.shops.sort((a, b) => a.shop.name.localeCompare(b.shop.name));
        });
      }
      
      // Skip locations with no pickups today
      setPrintData(groupedData.filter(g => g.shops.length > 0));
    }
    
    setLoading(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const colSpan = printMode === 'today' ? 4 : 3;
    const rows = printData.map(locGroup => {
      const locationRow = `<tr style="background:#e5e7eb;border-top:2px solid #9ca3af;">
        <td colspan="${colSpan}" style="padding:3px 6px;font-size:9pt;font-weight:900;color:#374151;">
          ${locGroup.sequence}. ${locGroup.location}
        </td>
      </tr>`;

      const shopRows = locGroup.shops.map((row: any, sIdx: number) => `
        <tr>
          <td style="padding:3px 5px;border:1px solid #d1d5db;text-align:center;font-weight:bold;font-size:9pt;">${sIdx + 1}</td>
          <td style="padding:3px 5px;border:1px solid #d1d5db;font-size:9pt;font-weight:bold;">${row.shop?.name || ''}</td>
          ${printMode === 'today' ? `<td style="padding:3px 5px;border:1px solid #d1d5db;font-size:8pt;">${row.items || ''}</td>` : ''}
          <td style="padding:3px 5px;border:1px solid #d1d5db;width:100px;"></td>
        </tr>
      `).join('');

      return locationRow + shopRows;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Route List - ${selectedRouteName}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    h1 { font-size: 14pt; text-align: center; margin: 0 0 2px 0; }
    h2 { font-size: 11pt; text-align: center; margin: 0 0 2px 0; font-weight: bold; }
    p  { font-size: 9pt; text-align: center; margin: 0 0 6px 0; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th { background: #f3f4f6; padding: 4px 6px; border: 1px solid #d1d5db; font-weight: 900; text-align: left; font-size: 9pt; }
    td { border: 1px solid #d1d5db; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <h1>MD LOGISTICS</h1>
  <h2>Route List: ${selectedRouteName}</h2>
  <p>${printMode === 'today' ? `Today's Pickups - ${format(new Date(), 'dd MMM yyyy')}` : 'Full Route Shop List - ' + format(new Date(), 'dd MMM yyyy')}</p>
  <table>
    <thead>
      <tr>
        <th style="width:35px;text-align:center;">#</th>
        <th>Shop Name</th>
        ${printMode === 'today' ? '<th style="width:120px;">Items</th>' : ''}
        <th style="width:100px;">Remarks / ✓</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:9pt;font-weight:bold;">
    <span>Driver Signature: _________________________</span>
    <span>Date: ${format(new Date(), 'dd/MM/yyyy')}</span>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const selectedRouteName = routes.find(r => r.id === selectedRouteId)?.name || '';

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-surface-200 dark:border-surface-800">
        <h2 className="text-2xl font-black text-surface-900 dark:text-white mb-4">Print Route List</h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-surface-500 uppercase mb-2">Select Route</label>
            <select
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 rounded-xl"
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
            >
              <option value="" disabled>-- Select Route --</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          
          <Button 
            onClick={() => handleFetchData('today')} 
            disabled={!selectedRouteId || loading}
            variant="primary"
          >
            Load Today's Pickups
          </Button>
          
          <Button 
            onClick={() => handleFetchData('all')} 
            disabled={!selectedRouteId || loading}
            variant="secondary"
          >
            Load All Shops
          </Button>
          
          <Button 
            onClick={handlePrint} 
            disabled={printData.length === 0}
            className="bg-emerald-500 text-white"
          >
            <Printer size={18} className="mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      {loading ? (
        <div className="text-center py-12">Loading data...</div>
      ) : printData.length > 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm overflow-x-auto">
          <div className="text-center mb-4">
            <h1 className="text-xl font-black text-black">MD LOGISTICS</h1>
            <h2 className="text-lg font-bold text-gray-800">Route List: {selectedRouteName}</h2>
            <p className="text-gray-600 text-sm">
              {printMode === 'today' ? `Today's Pickups - ${format(new Date(), 'dd MMM yyyy')}` : 'Full Route Shop List'}
            </p>
          </div>

          <table className="w-full text-left border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-800">
                <th className="p-2 border border-gray-300 font-bold w-10 text-center">#</th>
                <th className="p-2 border border-gray-300 font-bold">Shop Name</th>
                {printMode === 'today' && <th className="p-2 border border-gray-300 font-bold">Items</th>}
                <th className="p-2 border border-gray-300 font-bold w-28">Remarks / ✓</th>
              </tr>
            </thead>
            <tbody>
              {printData.map((locGroup, idx) => (
                <React.Fragment key={idx}>
                  <tr className="bg-gray-200">
                    <td colSpan={printMode === 'today' ? 4 : 3} className="p-1.5 border border-gray-300 text-xs font-black text-gray-700">
                      {locGroup.sequence}. {locGroup.location}
                    </td>
                  </tr>
                  {locGroup.shops.map((row: any, sIdx: number) => (
                    <tr key={sIdx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2 border border-gray-300 text-center font-bold text-xs">{sIdx + 1}</td>
                      <td className="p-2 border border-gray-300 font-semibold text-sm">{row.shop?.name}</td>
                      {printMode === 'today' && (
                        <td className="p-2 border border-gray-300 text-xs">{row.items}</td>
                      )}
                      <td className="p-2 border border-gray-300"></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedRouteId ? (
        <div className="text-center py-12 text-surface-500 bg-white rounded-2xl">
          No data found for this selection.
        </div>
      ) : null}
    </div>
  );
};

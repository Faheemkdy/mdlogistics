import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Compass, Trash2, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

interface Route {
  id: string;
  name: string;
}

interface RouteLocation {
  id: string;
  route_id: string;
  location_name: string;
  sequence_order: number;
}

export const RouteSetup = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [routeLocations, setRouteLocations] = useState<RouteLocation[]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteLocations(selectedRouteId);
    } else {
      setRouteLocations([]);
    }
  }, [selectedRouteId]);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').order('created_at', { ascending: true });
    if (data) setRoutes(data);
  };

  const fetchLocations = async () => {
    // Fetch unique locations from shops table
    const { data } = await supabase.from('shops').select('location');
    if (data) {
      const map = new Map<string, string>();
      data.forEach(s => {
        const raw = s.location || '';
        const trimmed = raw.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (!map.has(lower)) {
             map.set(lower, trimmed); // Keep the first original casing found
          }
        }
      });
      const uniqueLocations = Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setAvailableLocations(uniqueLocations);
    }
  };

  const fetchRouteLocations = async (routeId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('route_locations')
      .select('*')
      .eq('route_id', routeId)
      .order('sequence_order', { ascending: true });
    if (data) {
      setRouteLocations(data);
    }
    setLoading(false);
  };

  const handleCreateRoute = async () => {
    if (!newRouteName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('routes')
      .insert([{ name: newRouteName.trim() }])
      .select()
      .single();
    
    if (!error && data) {
      setRoutes([...routes, data]);
      setNewRouteName('');
      setSelectedRouteId(data.id);
    }
    setLoading(false);
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm('Delete this route entirely?')) return;
    await supabase.from('routes').delete().eq('id', id);
    if (selectedRouteId === id) setSelectedRouteId('');
    fetchRoutes();
  };

  const handleAddLocationToRoute = async (locationName: string) => {
    if (!selectedRouteId) return;
    
    // Check if already in route
    if (routeLocations.some(rl => rl.location_name === locationName)) return;

    const nextOrder = routeLocations.length > 0 ? Math.max(...routeLocations.map(s => s.sequence_order)) + 1 : 1;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('route_locations')
      .insert([{
        route_id: selectedRouteId,
        location_name: locationName,
        sequence_order: nextOrder
      }])
      .select('*')
      .single();
      
    if (!error && data) {
      fetchRouteLocations(selectedRouteId);
    }
    setLoading(false);
  };

  const handleRemoveLocationFromRoute = async (id: string) => {
    await supabase.from('route_locations').delete().eq('id', id);
    fetchRouteLocations(selectedRouteId);
  };

  const moveLocation = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === routeLocations.length - 1) return;

    const newLocations = [...routeLocations];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap sequence orders
    const tempOrder = newLocations[index].sequence_order;
    newLocations[index].sequence_order = newLocations[swapIndex].sequence_order;
    newLocations[swapIndex].sequence_order = tempOrder;

    // Save to DB
    await supabase.from('route_locations').upsert([
      { id: newLocations[index].id, route_id: newLocations[index].route_id, location_name: newLocations[index].location_name, sequence_order: newLocations[index].sequence_order },
      { id: newLocations[swapIndex].id, route_id: newLocations[swapIndex].route_id, location_name: newLocations[swapIndex].location_name, sequence_order: newLocations[swapIndex].sequence_order }
    ]);
    
    fetchRouteLocations(selectedRouteId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-surface-900 dark:text-white">Route Setup</h2>
          <p className="text-surface-500">Create routes and order locations (not individual shops).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Selection */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-surface-200 dark:border-surface-800">
          <h3 className="font-bold mb-4">Routes</h3>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="New route name..."
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              className="flex-1 px-4 py-2 bg-surface-50 dark:bg-surface-800 border-none rounded-xl"
            />
            <Button onClick={handleCreateRoute} disabled={!newRouteName.trim() || loading}>Add</Button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {routes.map(route => (
              <div 
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border ${selectedRouteId === route.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-100 hover:border-surface-300'}`}
              >
                <div className="flex items-center gap-3">
                  <Compass size={18} className={selectedRouteId === route.id ? 'text-primary-500' : 'text-surface-400'} />
                  <span className="font-bold">{route.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }} className="text-rose-500 hover:text-rose-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Location Ordering */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-surface-200 dark:border-surface-800">
          {selectedRouteId ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Route Locations Sequence</h3>
              </div>
              
              <div className="flex gap-4 mb-4 relative">
                <div className="flex-1 relative flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={locationSearch}
                      onChange={(e) => {
                        setLocationSearch(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                      onFocus={() => setShowLocationDropdown(true)}
                      onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                      placeholder="Search or type a new location to add..."
                      className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border-none rounded-xl"
                    />
                    {showLocationDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {availableLocations
                          .filter(loc => !routeLocations.some(rl => rl.location_name === loc))
                          .filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase()))
                          .map(loc => (
                            <div 
                              key={loc}
                              onClick={() => {
                                handleAddLocationToRoute(loc);
                                setLocationSearch('');
                                setShowLocationDropdown(false);
                              }}
                              className="px-4 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer"
                            >
                              {loc}
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => {
                      if (locationSearch.trim()) {
                        handleAddLocationToRoute(locationSearch.trim());
                        setLocationSearch('');
                        setShowLocationDropdown(false);
                      }
                    }}
                    disabled={!locationSearch.trim() || loading}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : routeLocations.length === 0 ? (
                <div className="text-center py-8 text-surface-500">No locations in this route yet.</div>
              ) : (
                <div className="space-y-2">
                  {routeLocations.map((rl, index) => (
                    <div key={rl.id} className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                      <div className="font-black text-xl text-surface-300 w-8 text-center">{index + 1}</div>
                      
                      <div className="flex-1 flex items-center gap-3">
                        <MapPin size={18} className="text-surface-400" />
                        <div className="font-bold text-lg">{rl.location_name}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => moveLocation(index, 'up')} disabled={index === 0} className="p-2 text-surface-400 hover:text-primary-500 disabled:opacity-30">
                          <ArrowUp size={18} />
                        </button>
                        <button onClick={() => moveLocation(index, 'down')} disabled={index === routeLocations.length - 1} className="p-2 text-surface-400 hover:text-primary-500 disabled:opacity-30">
                          <ArrowDown size={18} />
                        </button>
                        <div className="w-[1px] h-6 bg-surface-300 mx-2"></div>
                        <button onClick={() => handleRemoveLocationFromRoute(rl.id)} className="p-2 text-rose-400 hover:text-rose-600">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-surface-400 py-12">
              <Compass size={48} className="mb-4 opacity-20" />
              <p>Select a route from the sidebar to manage its locations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

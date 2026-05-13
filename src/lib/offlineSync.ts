import { supabase } from './supabase';

export type SyncItem = {
  id: string;
  type: 'pickup' | 'delivery' | 'voucher';
  data: any;
  timestamp: number;
  retryCount: number;
};

const QUEUE_KEY = 'md_offline_sync_queue';

class OfflineSyncManager {
  private queue: SyncItem[] = [];
  private isSyncing = false;
  private listeners: ((queue: SyncItem[]) => void)[] = [];

  constructor() {
    this.loadQueue();
    // Listen for online event
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      // Check every 30 seconds if online
      setInterval(() => {
        if (navigator.onLine && this.queue.length > 0 && !this.isSyncing) {
          this.sync();
        }
      }, 30000);
    }
  }

  private loadQueue() {
    const saved = localStorage.getItem(QUEUE_KEY);
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (e) {
        this.queue = [];
      }
    }
  }

  private saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.queue));
  }

  subscribe(listener: (queue: SyncItem[]) => void) {
    this.listeners.push(listener);
    listener(this.queue);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getQueue() {
    return this.queue;
  }

  async addItem(type: SyncItem['type'], data: any) {
    const item: SyncItem = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };
    this.queue.push(item);
    this.saveQueue();
    
    if (navigator.onLine) {
      this.sync();
    }
  }

  async sync() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) return;
    
    this.isSyncing = true;
    console.log(`Starting sync for ${this.queue.length} items...`);

    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      const success = await this.processItem(item);
      if (success) {
        this.queue = this.queue.filter(i => i.id !== item.id);
        this.saveQueue();
      } else {
        // If it failed, stop processing the rest of the queue to maintain order (if needed)
        // or just increment retry count
        item.retryCount++;
        this.saveQueue();
        break; 
      }
    }

    this.isSyncing = false;
  }

  private async processItem(item: SyncItem): Promise<boolean> {
    try {
      if (item.type === 'delivery') {
        const { error } = await supabase.from('deliveries').insert(item.data);
        if (error) throw error;
        return true;
      }

      if (item.type === 'pickup') {
        const { pickup, items } = item.data;
        
        // 1. Insert pickup
        const { data: pData, error: pError } = await supabase
          .from('pickups')
          .insert([pickup])
          .select()
          .single();
        
        if (pError) throw pError;

        // 2. Insert items with the new pickup ID
        const pickupItems = items.map((i: any) => ({
          ...i,
          pickup_id: pData.id
        }));

        const { error: iError } = await supabase.from('pickup_items').insert(pickupItems);
        if (iError) throw iError;
        
        return true;
      }

      if (item.type === 'voucher') {
        const { voucher, items } = item.data;
        
        // 1. Insert voucher
        const { data: vData, error: vError } = await supabase
          .from('vouchers')
          .insert([voucher])
          .select()
          .single();
        
        if (vError) throw vError;

        // 2. Insert items with the new voucher ID
        const voucherItems = items.map((i: any) => ({
          ...i,
          voucher_id: vData.id
        }));

        const { error: iError } = await supabase.from('voucher_items').insert(voucherItems);
        if (iError) throw iError;
        
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      return false;
    }
  }
}

export const offlineSync = new OfflineSyncManager();

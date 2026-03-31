import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Trash2, Download, Share2, Package, ShoppingCart } from 'lucide-react';
import { generateBillingPDF, getBillingPDFFile } from '../../utils/billingPdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';

export const Billing = () => {
  const [mode, setMode] = useState<'delivery' | 'product'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Delivery State with updated columns
  // description -> Date (YYYY-MM-DD)
  // amount -> Calculated Price
  const [deliveryItems, setDeliveryItems] = useState([
    { id: 1, description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }
  ]);

  // Product State
  const [productItems, setProductItems] = useState([
    { id: 1, name: '', qty: 1, rate: 0, amount: 0 }
  ]);

  // Totals
  const [deliveryTotalQty, setDeliveryTotalQty] = useState(0);
  const [deliveryTotalAmount, setDeliveryTotalAmount] = useState(0);
  const [productTotal, setProductTotal] = useState(0);

  // --- Delivery Logic ---
  const updateDeliveryItem = (id: number, field: string, value: string) => {
    setDeliveryItems(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        
        // Auto Calculate Totals and Amount if a quantity field changes
        if (['q20', 'q25', 'q30', 'q35', 'q40', 'q50'].includes(field)) {
            const q20 = Number(newItem.q20) || 0;
            const q25 = Number(newItem.q25) || 0;
            const q30 = Number(newItem.q30) || 0;
            const q35 = Number(newItem.q35) || 0;
            const q40 = Number(newItem.q40) || 0;
            const q50 = Number(newItem.q50) || 0;
            
            // Total Quantity
            newItem.total = q20 + q25 + q30 + q35 + q40 + q50;
            
            // Total Amount (Qty * Rate)
            const calculatedAmount = (q20 * 20) + (q25 * 25) + (q30 * 30) + (q35 * 35) + (q40 * 40) + (q50 * 50);
            newItem.amount = calculatedAmount.toFixed(2);
        }
        
        return newItem;
      }
      return item;
    }));
  };

  const addDeliveryRow = () => {
    setDeliveryItems([...deliveryItems, { id: Date.now(), description: '', q20: '', q25: '', q30: '', q35: '', q40: '', q50: '', total: 0, amount: '' }]);
  };

  const removeDeliveryRow = (id: number) => {
    if (deliveryItems.length > 1) {
      setDeliveryItems(deliveryItems.filter(i => i.id !== id));
    }
  };

  // --- Product Logic ---
  const updateProductItem = (id: number, field: string, value: string | number) => {
    setProductItems(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        // Removed auto-calculation of amount = qty * rate
        // Amount is now manually entered or updated independently
        return newItem;
      }
      return item;
    }));
  };

  const addProductRow = () => {
    setProductItems([...productItems, { id: Date.now(), name: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const removeProductRow = (id: number) => {
    if (productItems.length > 1) {
      setProductItems(productItems.filter(i => i.id !== id));
    }
  };

  // --- PDF Logic ---
  const handlePDF = () => {
    if (mode === 'delivery') {
      generateBillingPDF('delivery', customerName, date, deliveryItems, { qty: deliveryTotalQty, amount: deliveryTotalAmount });
    } else {
      generateBillingPDF('product', customerName, date, productItems, { amount: productTotal });
    }
  };

  // --- Native Sharing Logic ---
  const handleNativeShare = async () => {
    const file = getBillingPDFFile(
      mode, 
      customerName, 
      date, 
      mode === 'delivery' ? deliveryItems : productItems, 
      mode === 'delivery' ? { qty: deliveryTotalQty, amount: deliveryTotalAmount } : { amount: productTotal }
    );

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Invoice for ${customerName}`,
          text: `Here is the invoice for ${customerName}.`,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      alert('Direct sharing is not supported on this device/browser. Downloading file instead.');
      handlePDF();
    }
  };

  // --- Effects ---
  useEffect(() => {
    const dQty = deliveryItems.reduce((acc, curr) => acc + curr.total, 0);
    const dAmt = deliveryItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    setDeliveryTotalQty(dQty);
    setDeliveryTotalAmount(dAmt);
  }, [deliveryItems]);

  useEffect(() => {
    // Summing up the manually entered amounts
    const pTotal = productItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    setProductTotal(pTotal);
  }, [productItems]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing & Invoicing</h1>
          <p className="text-slate-500">Create instant bills</p>
        </div>
        
        <div className="flex gap-2 bg-slate-200 p-1 rounded-xl">
          <button 
            onClick={() => setMode('delivery')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm ${mode === 'delivery' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={16} /> Delivery
          </button>
          <button 
            onClick={() => setMode('product')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm ${mode === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingCart size={16} /> Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="h-fit">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Customer Details</h3>
            <div className="space-y-4">
              <Input 
                label="Customer Name" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Name"
              />
              <Input 
                type="date" 
                label="Date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
          </Card>

          {/* Desktop Actions */}
          <Card className="hidden lg:block h-fit">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <Button onClick={handlePDF} className="w-full">
                <Download size={18} /> Download PDF
              </Button>
              <Button onClick={handleNativeShare} className="w-full bg-green-600 text-white hover:text-white">
                <Share2 size={18} /> Share (WhatsApp)
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Panel: Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-700">
                {mode === 'delivery' ? 'Package Details' : 'Item Details'}
              </h3>
              <div className="text-right">
                <p className="text-sm text-slate-400">Total Amount</p>
                <p className={`text-2xl font-black ${mode === 'delivery' ? 'text-blue-600' : 'text-emerald-600'}`}>
                  Rs. {mode === 'delivery' ? deliveryTotalAmount.toFixed(2) : productTotal.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-slate-500 text-sm border-b border-slate-200 bg-slate-50">
                    {mode === 'delivery' ? (
                      <>
                        <th className="p-2 w-32">Date</th>
                        <th className="p-2 text-center w-16 font-bold text-slate-700">Total</th>
                        <th className="p-2 text-center">20</th>
                        <th className="p-2 text-center">25</th>
                        <th className="p-2 text-center">30</th>
                        <th className="p-2 text-center">35</th>
                        <th className="p-2 text-center">40</th>
                        <th className="p-2 text-center">50</th>
                        <th className="p-2 text-right w-24">Amount</th>
                        <th className="p-2 w-8"></th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 w-1/3">Item Name</th>
                        <th className="p-3 text-center w-20">Qty</th>
                        <th className="p-3 text-right w-32">Rate</th>
                        <th className="p-3 text-right w-32">Amount</th>
                        <th className="p-3 w-10"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {mode === 'delivery' ? (
                      deliveryItems.map((item) => (
                        <motion.tr 
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="border-b border-slate-100 group hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-2">
                            <input 
                              type="date" 
                              value={item.description}
                              onChange={(e) => updateDeliveryItem(item.id, 'description', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-slate-700 p-1 text-sm"
                            />
                          </td>
                          <td className="p-2 text-center font-bold text-slate-700 bg-slate-50">{item.total}</td>
                          {['q20', 'q25', 'q30', 'q35', 'q40', 'q50'].map((size) => (
                            <td key={size} className="p-1">
                              <input 
                                type="number" 
                                placeholder="-"
                                // @ts-ignore
                                value={item[size]}
                                onChange={(e) => updateDeliveryItem(item.id, size, e.target.value)}
                                className="w-full bg-slate-100 rounded text-center text-slate-700 p-1 outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                              />
                            </td>
                          ))}
                          <td className="p-2">
                            <input 
                              type="text" 
                              placeholder="0.00"
                              value={item.amount}
                              readOnly
                              className="w-full bg-transparent border-b border-transparent outline-none text-right font-bold text-blue-600 p-1 text-sm cursor-default"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeDeliveryRow(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      productItems.map((item) => (
                        <motion.tr 
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="border-b border-slate-100 group hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-2">
                            <input 
                              type="text" 
                              placeholder="Product Name"
                              value={item.name}
                              onChange={(e) => updateProductItem(item.id, 'name', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-slate-700 p-1"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={item.qty}
                              onChange={(e) => updateProductItem(item.id, 'qty', e.target.value)}
                              className="w-full bg-slate-100 rounded text-center text-slate-700 p-1 outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={item.rate}
                              onChange={(e) => updateProductItem(item.id, 'rate', e.target.value)}
                              className="w-full bg-slate-100 rounded text-right text-slate-700 p-1 outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number"
                              placeholder="0.00"
                              value={item.amount || ''}
                              onChange={(e) => updateProductItem(item.id, 'amount', e.target.value)}
                              className="w-full bg-slate-100 rounded text-right font-bold text-emerald-600 p-1 outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeProductRow(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button 
                onClick={mode === 'delivery' ? addDeliveryRow : addProductRow} 
                variant="ghost" 
                className="w-full border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50"
              >
                <Plus size={18} /> Add New Row
              </Button>
            </div>
          </Card>

          {/* Mobile Actions */}
          <div className="lg:hidden space-y-3">
             <Button onClick={handleNativeShare} className="w-full bg-green-600 text-white hover:text-white shadow-lg shadow-green-500/20 py-4 text-lg">
                <Share2 size={20} /> Share (WhatsApp)
             </Button>
             <Button onClick={handlePDF} variant="secondary" className="w-full">
                <Download size={20} /> Download PDF
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

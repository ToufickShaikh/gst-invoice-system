import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';
import { formatCurrency } from '../utils/dateHelpers';
import { toast } from 'react-hot-toast';

const PosQuickBilling = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await itemsAPI.getAll();
      setItems(res || []);
    })();
  }, []);

  const addEmpty = () => setSaleItems(prev => ([...prev, { id: Date.now(), itemId: '', quantity: 1, price: 0, taxSlab: 0, priceType: 'Exclusive' }]));

  const updateLine = (i, field, val) => {
    const copy = [...saleItems];
    copy[i] = { ...copy[i], [field]: val };
    // if selecting an item, populate defaults
    if (field === 'itemId') {
      const sel = items.find(x => x._id === val);
      if (sel) {
        copy[i].price = sel.rate ?? sel.price ?? 0;
        copy[i].taxSlab = sel.taxSlab ?? 0;
        copy[i].priceType = sel.priceType ?? 'Exclusive';
      }
    }
    setSaleItems(copy);
  };

  const removeLine = (i) => setSaleItems(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = saleItems.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
  const totalTax = saleItems.reduce((s, it) => {
    const price = Number(it.price || 0) * Number(it.quantity || 0);
    const tax = Number(it.taxSlab || 0);
    if ((it.priceType || 'Exclusive') === 'Inclusive' && tax) {
      const taxable = price / (1 + tax/100);
      return s + (taxable * (tax/100));
    }
    return s + (price * (tax/100));
  }, 0);

  const grandTotal = subtotal + totalTax;

  const handleSavePOS = async () => {
    if (saleItems.length === 0) return toast.error('Add items');
    setLoading(true);
    try {
      const itemsForBackend = saleItems.map(({ id, ...rest }) => ({ ...rest, item: rest.itemId }));
      const payload = { billingType: 'POS', items: itemsForBackend, paidAmount: Number(paidAmount || 0) };
      const res = await billingAPI.createInvoice(payload);
      toast.success('POS Invoice saved');
      // open thermal print if ID available
      const id = res?._id || res?.invoiceId || res?.id;
      if (id) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        window.open(`${baseUrl}/api/billing/public/pdf/${id}?format=thermal`, '_blank');
      }
      // reset
      setSaleItems([]); setPaidAmount(0);
    } catch (err) {
      console.error(err); toast.error('Failed to save POS invoice');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">POS Quick Billing</h2>
          <div className="text-sm text-gray-500">Simple mode for quick sales</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="space-y-2">
            {saleItems.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <select className="w-full border rounded px-2 py-1" value={line.itemId} onChange={(e) => updateLine(idx, 'itemId', e.target.value)}>
                    <option value="">Select item</option>
                    {items.map(it => <option key={it._id} value={it._id}>{it.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><input className="w-full border rounded px-2 py-1" type="number" value={line.quantity} onChange={(e)=> updateLine(idx,'quantity', parseInt(e.target.value||0))} /></div>
                <div className="col-span-2"><input className="w-full border rounded px-2 py-1" type="number" value={line.price} onChange={(e)=> updateLine(idx,'price', parseFloat(e.target.value||0))} /></div>
                <div className="col-span-2"><input className="w-full border rounded px-2 py-1" type="number" value={line.taxSlab} onChange={(e)=> updateLine(idx,'taxSlab', parseFloat(e.target.value||0))} /></div>
                <div className="col-span-1 text-right"><button className="text-red-600" onClick={()=> removeLine(idx)}>Remove</button></div>
              </div>
            ))}

            <div>
              <Button size="sm" onClick={addEmpty}>Add Item</Button>
            </div>

            <div className="mt-4 border-t pt-4 space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(totalTax)}</span></div>
              <div className="flex justify-between font-bold"><span>Grand Total</span><span>{formatCurrency(grandTotal)}</span></div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <InputField label="Paid Amount (₹)" type="number" value={paidAmount} onChange={(e)=> setPaidAmount(parseFloat(e.target.value||0))} />
                <div className="flex items-end">
                  <Button onClick={handleSavePOS} variant="primary" disabled={loading}>Save & Print</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PosQuickBilling;

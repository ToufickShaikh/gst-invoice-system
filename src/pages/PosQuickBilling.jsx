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
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    (async () => {
      const res = await itemsAPI.getAll();
      setItems(res || []);
    })();
  }, []);

  const addEmpty = () => setSaleItems(prev => ([...prev, { id: Date.now(), itemId: '', quantity: 1, price: 0, taxSlab: 0 }]));

  const updateLine = (i, field, val) => {
    const copy = [...saleItems];
    copy[i] = { ...copy[i], [field]: val };
    // if selecting an item, populate defaults
    if (field === 'itemId') {
      const sel = items.find(x => x._id === val);
      if (sel) {
        copy[i].price = sel.rate ?? sel.price ?? 0;
        copy[i].taxSlab = sel.taxSlab ?? 0;
        // priceType intentionally not stored via POS UI; backend/items remain canonical
      }
    }
    setSaleItems(copy);
  };

  const removeLine = (i) => setSaleItems(prev => prev.filter((_, idx) => idx !== i));

  // Compute totals with proportional discount and correct Inclusive handling
  const totalBase = saleItems.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0) || 0;

  const totals = saleItems.reduce((acc, it) => {
    const lineBase = Number(it.price || 0) * Number(it.quantity || 0);
    const tax = Number(it.taxSlab || 0) || 0;
    const propDiscount = totalBase > 0 ? (lineBase / totalBase) * Number(discount || 0) : 0;
    const priceType = String(it.priceType ?? it.item?.priceType ?? 'Exclusive');

    if (priceType === 'Inclusive' && tax) {
      // Backwards compatibility: if item document still marks Inclusive, handle it
      const discountedInclusive = Math.max(0, lineBase - propDiscount);
      const taxable = discountedInclusive / (1 + tax / 100);
      const taxAmt = Math.max(0, discountedInclusive - taxable);
      const lineTotal = discountedInclusive;
      acc.subtotal += taxable;
      acc.tax += taxAmt;
      acc.grand += lineTotal;
    } else {
      const taxable = Math.max(0, lineBase - propDiscount);
      const taxAmt = taxable * (tax / 100);
      const lineTotal = taxable + taxAmt;
      acc.subtotal += taxable;
      acc.tax += taxAmt;
      acc.grand += lineTotal;
    }
    return acc;
  }, { subtotal: 0, tax: 0, grand: 0 });

  const subtotal = totals.subtotal;
  const totalTax = totals.tax;
  const grandTotal = totals.grand;
  const change = Math.max(0, Number(paidAmount || 0) - grandTotal);

  const handleSavePOS = async () => {
    if (saleItems.length === 0) return toast.error('Add items');
    // POS must be fully paid (no credit allowed)
    if (Number(paidAmount || 0) < Number(grandTotal || 0)) return toast.error('POS requires full payment (no credit allowed)');
    setLoading(true);
    try {
      const itemsForBackend = saleItems.map(({ id, ...rest }) => ({ ...rest, item: rest.itemId }));
      const payload = {
        billingType: 'POS',
        items: itemsForBackend,
  customerName: customerName || undefined,
        paidAmount: Number(paidAmount || 0),
        discount: Number(discount || 0)
      };
      const res = await billingAPI.createInvoice(payload);
      toast.success('POS Invoice saved');
      // open thermal print if ID available
      const id = res?._id || res?.invoiceId || res?.id;
      if (id) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        window.open(`${baseUrl}/api/billing/public/pdf/${id}?format=thermal`, '_blank');
      }
      // reset
  setSaleItems([]); setPaidAmount(0); setDiscount(0); setCustomerName('');
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InputField label="Name (optional)" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
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
              <div className="flex justify-between"><span>Discount</span><span>- {formatCurrency(discount)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(totalTax)}</span></div>
              <div className="flex justify-between font-bold"><span>Grand Total</span><span>{formatCurrency(grandTotal)}</span></div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <InputField label="Paid Amount (₹)" type="number" value={paidAmount} onChange={(e)=> setPaidAmount(parseFloat(e.target.value||0))} />
                <div className="flex items-end">
                  <Button onClick={handleSavePOS} variant="primary" disabled={loading}>Save & Print</Button>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <div>
                  <label className="text-xs">Discount (₹)</label>
                  <input className="ml-2 border rounded px-2 py-1 w-28" type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value||0))} />
                </div>
                <div>
                  <div>Change: <span className="font-medium">{formatCurrency(change)}</span></div>
                  {Number(paidAmount||0) < Number(grandTotal||0) && <div className="text-red-600 text-xs">Paid amount less than total — POS requires full payment</div>}
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

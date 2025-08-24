import React, { useMemo, useState } from 'react';

export default function ItemPickerModal({ open, onClose, items = [], onPick }) {
  const [q, setQ] = useState('');
  // priceType filter removed - all items stored as Exclusive
  const [inStockOnly, setInStockOnly] = useState(false);
  const [taxSlab, setTaxSlab] = useState('ALL');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
    const type = 'Exclusive';
      const stock = Number(it.quantityInStock ?? it.stock ?? 0);
      const tax = String(it.taxSlab ?? it.taxRate ?? '');
      if (priceType !== 'ALL' && type !== priceType) return false;
      if (inStockOnly && stock <= 0) return false;
      if (taxSlab !== 'ALL' && tax !== taxSlab) return false;
      if (!query) return true;
      const fields = [
        it.name,
        it.hsnCode,
        it.description,
        String(it.sellingPrice ?? it.rate ?? ''),
        String(it.taxSlab ?? it.taxRate ?? ''),
        it.category,
      ].map((x) => (x ?? '').toString().toLowerCase());
      return fields.some((f) => f.includes(query));
    });
  }, [items, q, priceType, inStockOnly, taxSlab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto max-w-4xl bg-white rounded-xl shadow-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Choose Item</h3>
          <button className="px-2 py-1 text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, HSN, description, rate, tax…"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            {/* Price type filter removed - items are canonical Exclusive */}
            <select className="border rounded-lg px-2 py-2 text-sm" value={taxSlab} onChange={(e) => setTaxSlab(e.target.value)}>
              <option value="ALL">All Tax</option>
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
              In stock only
            </label>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 text-xs font-medium px-3 py-2">
              <div className="col-span-5">Item</div>
              <div className="col-span-2">HSN</div>
              <div className="col-span-1 text-right">Rate</div>
              <div className="col-span-1 text-right">Tax</div>
              {/* Type column removed (canonical Exclusive) */}
              <div className="col-span-1 text-right">Stock</div>
              <div className="col-span-1" />
            </div>
            <div className="max-h-[360px] overflow-auto divide-y">
              {filtered.map((it, idx) => (
                <div key={it._id || it.id || idx} className="grid grid-cols-12 items-center px-3 py-2 text-sm">
                  <div className="col-span-5">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{it.description}</div>
                  </div>
                  <div className="col-span-2">{it.hsnCode}</div>
                  <div className="col-span-1 text-right">₹{Number(it.sellingPrice ?? it.rate ?? 0).toFixed(2)}</div>
                  <div className="col-span-1 text-right">{Number(it.taxSlab ?? it.taxRate ?? 0)}%</div>
                  {/* Price type removed; rates are canonical Exclusive */}
                  <div className="col-span-1 text-right">{Number(it.quantityInStock ?? it.stock ?? 0)}</div>
                  <div className="col-span-1 text-right">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs"
                      onClick={() => onPick?.(it)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-500">No items match your filters.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

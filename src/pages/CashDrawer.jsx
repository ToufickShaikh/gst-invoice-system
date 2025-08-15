import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { cashDrawerAPI } from '../api/cashDrawer';
import { formatCurrency } from '../utils/dateHelpers';

const DENOMS = [500, 100, 50, 20, 10, 5, 2, 1];
const keyOf = (v) => `d${v}`;

const CashDrawer = () => {
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState('add'); // 'add' | 'remove'
  const [denoms, setDenoms] = useState({ d500:0,d100:0,d50:0,d20:0,d10:0,d5:0,d2:0,d1:0 });
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try { const s = await cashDrawerAPI.getStatus(); setStatus(s); } catch {}
  };
  useEffect(() => { refresh(); }, []);

  const amount = useMemo(() => DENOMS.reduce((sum, v) => sum + v * (Number(denoms[keyOf(v)]) || 0), 0), [denoms]);
  const nextTotal = useMemo(() => {
    const current = Number(status?.totalCash || 0);
    return mode === 'add' ? current + amount : Math.max(0, current - amount);
  }, [status, amount, mode]);

  const changeCount = (v, delta) => {
    const k = keyOf(v);
    setDenoms(prev => ({ ...prev, [k]: Math.max(0, (Number(prev[k]) || 0) + delta) }));
  };
  const setCount = (v, val) => {
    const k = keyOf(v);
    setDenoms(prev => ({ ...prev, [k]: Math.max(0, Number(val) || 0) }));
  };
  const clearAll = () => setDenoms({ d500:0,d100:0,d50:0,d20:0,d10:0,d5:0,d2:0,d1:0 });

  const submit = async () => {
    if (amount <= 0) return; // nothing to do
    if (mode === 'remove' && amount > Number(status?.totalCash || 0)) {
      alert('Cannot remove more cash than available');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        type: mode === 'add' ? 'adjust-add' : 'adjust-remove',
        denominations: denoms,
        note: reason,
        reason,
      };
      await cashDrawerAPI.adjust(payload);
      clearAll();
      setNote('');
      setReason('');
      await refresh();
    } catch (e) {
      // ignore for now
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Drawer</h1>
            <p className="text-gray-600">Track cash by denomination. Bank options removed.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>Refresh</button>
          </div>
        </div>

        {/* Current status */}
        <div className="p-4 bg-white rounded shadow">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-lg font-semibold">Current Cash: {formatCurrency(status?.totalCash || 0)}</div>
            <div className="text-sm text-gray-600">Last updated {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : ''}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            {DENOMS.map((val) => (
              <div key={val} className="flex items-center justify-between border rounded p-2">
                <div>₹{val}</div>
                <div>x {status?.denominations?.[keyOf(val)] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Adjust section */}
        <div className="p-4 bg-white rounded shadow space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`px-3 py-2 rounded border ${mode==='add' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >Add Cash</button>
            <button
              type="button"
              onClick={() => setMode('remove')}
              className={`px-3 py-2 rounded border ${mode==='remove' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >Remove Cash</button>
            <button type="button" onClick={clearAll} className="ml-auto px-3 py-2 rounded border bg-gray-50">Clear</button>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Denominations ({mode === 'add' ? 'to add' : 'to remove'})</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DENOMS.map((val) => {
                const k = keyOf(val);
                return (
                  <div key={val} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">₹{val}</div>
                      <div className="text-xs text-gray-500">now: {status?.denominations?.[k] || 0}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => changeCount(val, -1)} className="px-2 py-1 border rounded">-</button>
                      <input
                        type="number" min={0}
                        value={denoms[k]}
                        onChange={(e)=> setCount(val, e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                      <button type="button" onClick={() => changeCount(val, +1)} className="px-2 py-1 border rounded">+</button>
                      <button type="button" onClick={() => changeCount(val, +5)} className="px-2 py-1 border rounded text-xs">+5</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-sm text-gray-600">This will {mode==='add' ? 'add' : 'remove'}</div>
              <div className={`text-2xl font-bold ${mode==='add' ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(amount)}</div>
              <div className="mt-1 text-sm">New total: <span className="font-semibold">{formatCurrency(nextTotal)}</span></div>
              {mode==='remove' && amount > Number(status?.totalCash || 0) && (
                <div className="mt-1 text-xs text-red-600">Cannot remove more than available.</div>
              )}
            </div>
            <div className="lg:col-span-2 space-y-2">
              <div>
                <label className="block text-sm mb-1">Reason (required)</label>
                <input type="text" value={reason} onChange={(e)=> setReason(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g., Opening float, petty cash, shortage adjustment" />
              </div>
              <div>
                <label className="block text-sm mb-1">Note (optional)</label>
                <input type="text" value={note} onChange={(e)=> setNote(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={submit} disabled={loading || amount<=0 || !reason.trim()} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
              {loading ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Recent transactions */}
        {status?.transactions?.length ? (
          <div className="p-4 bg-white rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent activity</h3>
              <span className="text-xs text-gray-500">Showing last 10</span>
            </div>
            <div className="table-mobile-wrapper">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Dir</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Reason</th>
                    <th className="text-left px-3 py-2">By</th>
                    <th className="text-right px-3 py-2">Before → After</th>
                  </tr>
                </thead>
                <tbody>
                  {[...status.transactions].slice(-10).reverse().map((t, idx) => (
                    <tr key={idx} className="border-t align-top">
                      <td className="px-3 py-2">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</td>
                      <td className="px-3 py-2">{t.type}</td>
                      <td className="px-3 py-2">{t.direction}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(t.amount || 0)}</td>
                      <td className="px-3 py-2 max-w-xs whitespace-pre-wrap">{t.reason || t.note || ''}</td>
                      <td className="px-3 py-2">{t.performedBy?.name || t.performedBy?.email || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(t.beforeTotal || 0)} → {formatCurrency(t.afterTotal || 0)}
                        <div className="text-xs text-gray-500 mt-1">
                          {t.beforeDenoms ? DENOMS.map(v=>`${v}:${t.beforeDenoms[`d${v}`]||0}`).join(' ') : ''}
                          <br />
                          {t.afterDenoms ? DENOMS.map(v=>`${v}:${t.afterDenoms[`d${v}`]||0}`).join(' ') : ''}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default CashDrawer;

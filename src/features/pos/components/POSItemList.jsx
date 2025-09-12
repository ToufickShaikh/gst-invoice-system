import React from 'react';
import { formatCurrency } from '../../../utils/dateHelpers';

const POSItemList = ({ saleItems, items, updateLine, removeLine, addEmpty }) => {
  return (
    <div className="card-enhanced responsive-padding">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-slate-900">Sale Items</h2>
        <button onClick={addEmpty} className="btn-enhanced btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Item
        </button>
      </div>

      <div className="space-y-6">
        {saleItems.length === 0 ? (
          <div className="empty-state-modern">
            <svg className="mx-auto h-16 w-16 text-slate-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">No items added yet</h3>
            <p className="text-slate-600 mb-6">Click "Add Item" to start building your sale</p>
          </div>
        ) : (
          saleItems.map((line, idx) => (
            <div key={line.id} className="mobile-card">
              <div className="form-grid-modern">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Item</label>
                  <select 
                    className="select-modern" 
                    value={line.itemId} 
                    onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                  >
                    <option value="">Select item</option>
                    {items.map(it => (
                      <option key={it._id} value={it._id}>
                        {it.name} - {formatCurrency(it.rate || it.price || 0)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
                  <input 
                    className="input-enhanced" 
                    type="number" 
                    min="1"
                    value={line.quantity} 
                    onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value || 1))} 
                  />
                </div>
              </div>
              
              <div className="form-grid-modern mt-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Price</label>
                  <input 
                    className="input-enhanced" 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={line.price} 
                    onChange={(e) => updateLine(idx, 'price', parseFloat(e.target.value || 0))} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tax %</label>
                  <select
                    className="select-modern"
                    value={line.taxSlab}
                    onChange={(e) => updateLine(idx, 'taxSlab', parseFloat(e.target.value))}
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <span className="block text-sm font-semibold text-slate-700 mb-2">Line Total</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {formatCurrency((line.price || 0) * (line.quantity || 1))}
                    </span>
                  </div>
                  
                  <button 
                    className="btn-enhanced btn-danger" 
                    onClick={() => removeLine(idx)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default POSItemList;
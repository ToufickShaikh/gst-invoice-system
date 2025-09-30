import React from 'react';
import { formatCurrency } from '../../../utils/dateHelpers';

const POSBillingSummary = ({ 
  subtotal, 
  totalTax, 
  grandTotal, 
  discount, 
  setDiscount, 
  paidAmount, 
  setPaidAmount, 
  change, 
  exportInfo, 
  setExportInfo, 
  onSave, 
  loading, 
  saleItems 
}) => {
  return (
    <div className="card-glass responsive-padding sticky top-6">
      <h2 className="text-xl font-bold text-slate-900 mb-8">Billing Summary</h2>
      
      {/* Totals */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal:</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-slate-600">
          <span>Discount:</span>
          <span className="font-semibold text-red-600">-{formatCurrency(discount)}</span>
        </div>
        
        <div className="flex justify-between text-slate-600">
          <span>Tax:</span>
          <span className="font-semibold">{formatCurrency(totalTax)}</span>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between">
            <span className="text-lg font-bold text-slate-900">Grand Total:</span>
            <span className="text-2xl font-bold text-emerald-600">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Discount Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Discount (₹)</label>
        <input
          type="number"
          min="0"
          value={discount}
          onChange={(e) => setDiscount(parseFloat(e.target.value || 0))}
          className="input-enhanced"
          placeholder="Enter discount amount"
        />
      </div>

      {/* Payment */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Paid Amount (₹)</label>
        <input
          type="number"
          min="0"
          value={paidAmount}
          onChange={(e) => setPaidAmount(parseFloat(e.target.value || 0))}
          className="input-enhanced"
          placeholder="Enter paid amount"
        />
        
        {change > 0 && (
          <div className="mt-3 success-state-modern">
            <div className="flex justify-between">
              <span>Change:</span>
              <span className="font-bold">{formatCurrency(change)}</span>
            </div>
          </div>
        )}
        
        {Number(paidAmount || 0) < Number(grandTotal || 0) && grandTotal > 0 && (
          <div className="mt-3 error-state-modern">
            <p className="text-sm">POS requires full payment - no credit allowed</p>
          </div>
        )}
      </div>

      {/* Export Toggle */}
      <div className="mb-8">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={exportInfo.isExport}
            onChange={(e) => setExportInfo(prev => ({ 
              ...prev, 
              isExport: e.target.checked,
              exportType: e.target.checked ? prev.exportType : '',
              withTax: e.target.checked ? prev.withTax : false
            }))}
            className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mr-3"
          />
          <span className="text-sm font-semibold text-slate-700">Export Invoice</span>
        </label>
      </div>

      {/* Action Button */}
      <button
        onClick={onSave}
        disabled={loading || saleItems.length === 0 || Number(paidAmount || 0) < Number(grandTotal || 0)}
        className="w-full btn-enhanced btn-success text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Save & Print
          </div>
        )}
      </button>
    </div>
  );
};

export default POSBillingSummary;
import React, { useState, useEffect } from 'react';
import InputField from './InputField';
import Button from './Button';
import { formatCurrency } from '../utils/dateHelpers';

const BillItemRow = ({
  billItem,
  index,
  items,
  onItemChange,
  onRemoveItem,
}) => {
  const [searchValue, setSearchValue] = useState(billItem.searchValue || '');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSearchValue(billItem.searchValue || '');
  }, [billItem.searchValue]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onItemChange(index, 'searchValue', value);
    setShowDropdown(true);
  };

  const handleItemSelect = (item) => {
    if (!item || !item._id) {
      console.warn('Invalid item selected:', item);
      return;
    }
    
    onItemChange(index, 'item', item);
    onItemChange(index, 'itemId', item._id);
    onItemChange(index, 'customRate', item.rate || 0);
    onItemChange(index, 'searchValue', `${item.name || 'Unknown'} - ${formatCurrency(item.rate || 0)} ${item.units || 'per piece'} - ${item.taxSlab || 0}% GST`);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onItemChange(index, 'item', null);
    onItemChange(index, 'itemId', '');
    onItemChange(index, 'customRate', '');
    onItemChange(index, 'searchValue', '');
    setShowDropdown(false);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    item.hsnCode.toLowerCase().includes(searchValue.toLowerCase()) ||
    item.units.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search items by name, HSN code, or units..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
              {billItem.itemId && (
                <button
                  onClick={clearSelection}
                  className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {showDropdown && searchValue && !billItem.itemId && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <div
                        key={item._id}
                        onClick={() => handleItemSelect(item)}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(item.rate)} • {item.units || 'per piece'} • {item.taxSlab}% GST • HSN: {item.hsnCode}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      No items found matching "{searchValue}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end sm:justify-start">
            <Button
              onClick={() => onRemoveItem(index)}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Remove</span>
            </Button>
          </div>
        </div>
      </div>

      {billItem.item && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={billItem.quantity}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onItemChange(index, 'quantity', parseInt(value) || 1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="1"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate (₹)
              <span className="text-xs text-gray-500 ml-1">
                (Original: {formatCurrency(billItem.item.rate)})
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={billItem.customRate}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                onItemChange(index, 'customRate', value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder={billItem.item.rate}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Discount (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={billItem.itemDiscount || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                onItemChange(index, 'itemDiscount', parseFloat(value) || 0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <div>Subtotal: {formatCurrency((Number(billItem.customRate) || Number(billItem.item.rate) || 0) * (Number(billItem.quantity) || 0))}</div>
              {billItem.itemDiscount > 0 && (
                <div className="text-green-600">Discount: -{formatCurrency(billItem.itemDiscount)}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillItemRow;

import React, { useState, useEffect, useRef } from 'react';
import InputField from './InputField';
import Button from './Button';

const CustomerSelect = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onClearSelection,
  billingType,
  onAddCustomerClick,
  isEditMode,
  editingInvoiceCustomer,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selectedCustomer) {
      const customer = customers.find(c => c._id === selectedCustomer);
      if (customer) {
        const displayName = billingType === 'B2B' ? customer.firmName : customer.name;
        setCustomerSearch(`${displayName} - ${customer.contact}`);
      }
    } else {
      setCustomerSearch('');
    }
  }, [selectedCustomer, customers, billingType]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e) => {
    setCustomerSearch(e.target.value);
    setShowDropdown(true);
    if (!e.target.value.trim()) {
      onClearSelection();
    }
  };

  const handleSelect = (customer) => {
    onSelectCustomer(customer._id);
    const displayName = billingType === 'B2B' ? customer.firmName : customer.name;
    setCustomerSearch(`${displayName} - ${customer.contact}`);
    setShowDropdown(false);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchTerm = customerSearch.toLowerCase();
    const name = billingType === 'B2B' ? customer.firmName : customer.name;
    const contact = customer.contact || '';
    const email = customer.email || '';

    return (
      name?.toLowerCase().includes(searchTerm) ||
      contact.includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {isEditMode ? 'Customer (Read-only)' : 'Select Customer'} <span className="text-red-500">*</span>
      </label>
      {isEditMode ? (
        <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
          {editingInvoiceCustomer ? 
            `${editingInvoiceCustomer.firmName || editingInvoiceCustomer.name} ${editingInvoiceCustomer.contact ? `• ${editingInvoiceCustomer.contact}` : ''} ${editingInvoiceCustomer.customerType === 'B2B' && editingInvoiceCustomer.gstNo ? `• GST: ${editingInvoiceCustomer.gstNo}` : ''}`
            : 'Loading customer information...'
          }
        </div>
      ) : (
        <div className="flex gap-2" ref={dropdownRef}>
          <div className="flex-1 relative">
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                placeholder={`Search customers by ${billingType === 'B2B' ? 'firm name' : 'name'}, contact, or email...`}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedCustomer && (
                <button
                  onClick={onClearSelection}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {!selectedCustomer && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>

            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const displayName = billingType === 'B2B' ? customer.firmName : customer.name;
                    const isSelected = selectedCustomer === customer._id;

                    return (
                      <div
                        key={customer._id}
                        onClick={() => handleSelect(customer)}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${isSelected ? 'bg-blue-50 text-blue-700' : ''}
                        `}
                      >
                        <div className="font-medium">{displayName}</div>
                        <div className="text-sm text-gray-500">
                          {customer.contact}
                          {customer.email && ` • ${customer.email}`}
                          {billingType === 'B2B' && customer.gstNo && ` • GST: ${customer.gstNo}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-gray-500">
                      {customerSearch.trim() ? 'No customers found' : 'Start typing to search customers'}
                    </div>
                  )}

                  <div
                    onClick={onAddCustomerClick}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-t border-gray-200 text-blue-600 font-medium"
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add New Customer
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={onAddCustomerClick}
              variant="primary"
              size="sm"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3v18" />
                </svg>
              }
            >
              Add Customer
            </Button>
          </div>
        )}

      {selectedCustomer && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Customer Selected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSelect;

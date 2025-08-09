import React, { useState } from 'react';
import { formatCurrency } from '../utils/dateHelpers';
import Button from './Button';

const InvoiceActionBar = ({ 
  selectedCount = 0,
  totalInvoices = 0,
  onExport,
  onBulkAction,
  onCreateNew,
  onImport,
  onSettings,
  viewMode = 'table', // table, grid, list
  onViewModeChange
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const exportOptions = [
    { id: 'excel', label: 'Export to Excel', icon: '📊' },
    { id: 'pdf', label: 'Export to PDF', icon: '📄' },
    { id: 'csv', label: 'Export to CSV', icon: '📋' },
    { id: 'print', label: 'Print List', icon: '🖨️' }
  ];

  const bulkActions = [
    { id: 'delete', label: 'Delete Selected', icon: '🗑️', variant: 'danger' },
    { id: 'reprint', label: 'Bulk Reprint', icon: '📄', variant: 'secondary' },
    { id: 'send-reminder', label: 'Send Reminders', icon: '📱', variant: 'secondary' },
    { id: 'mark-paid', label: 'Mark as Paid', icon: '✅', variant: 'success' },
    { id: 'duplicate', label: 'Duplicate', icon: '📋', variant: 'secondary' }
  ];

  const viewModes = [
    { id: 'table', label: 'Table View', icon: '📋' },
    { id: 'grid', label: 'Grid View', icon: '⊞' },
    { id: 'list', label: 'List View', icon: '📄' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Section - Main Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={onCreateNew}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            New Invoice
          </Button>

          {/* Import Button */}
          <Button
            variant="outline"
            onClick={onImport}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
          >
            Import
          </Button>

          {/* Export Menu */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              rightIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              }
            >
              Export
            </Button>
            
            {showExportMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                <div className="py-1">
                  {exportOptions.map(option => (
                    <button
                      key={option.id}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => {
                        onExport(option.id);
                        setShowExportMenu(false);
                      }}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions (shown when items are selected) */}
          {selectedCount > 0 && (
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                rightIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                }
              >
                Bulk Actions ({selectedCount})
              </Button>
              
              {showBulkMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                  <div className="py-1">
                    {bulkActions.map(action => (
                      <button
                        key={action.id}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          action.variant === 'danger' ? 'text-red-700 hover:bg-red-50' : 'text-gray-700'
                        }`}
                        onClick={() => {
                          onBulkAction(action.id);
                          setShowBulkMenu(false);
                        }}
                      >
                        <span>{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section - View Controls */}
        <div className="flex items-center gap-3">
          {/* Invoice Count */}
          <div className="text-sm text-gray-500">
            {totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {viewModes.map(mode => (
              <button
                key={mode.id}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === mode.id 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => onViewModeChange(mode.id)}
                title={mode.label}
              >
                <span className="sr-only">{mode.label}</span>
                {mode.icon}
              </button>
            ))}
          </div>

          {/* Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            Settings
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Selection Summary Bar */}
      {selectedCount > 0 && (
        <div className="mt-4 pt-4 border-t bg-blue-50 -mx-4 px-4 py-3 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-700">
              <span className="font-medium">{selectedCount}</span> of{' '}
              <span className="font-medium">{totalInvoices}</span> invoices selected
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction('clear-selection')}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Click Outside Handler */}
      {(showExportMenu || showBulkMenu) && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => {
            setShowExportMenu(false);
            setShowBulkMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default InvoiceActionBar;

import React, { useState } from 'react';
import Layout from '../components/Layout';
import InvoiceManagement from '../components/InvoiceManagement';
import InvoiceAnalytics from '../components/InvoiceAnalytics';
import InvoiceSettings from '../components/InvoiceSettings';
import EnhancedQuoteManagement from '../components/EnhancedQuoteManagement';
import EnhancedItemManagement from '../components/EnhancedItemManagement';

const Invoices = () => {
  const [view, setView] = useState('management');
  const [showSettings, setShowSettings] = useState(false);

  const renderContent = () => {
    switch (view) {
      case 'analytics':
        return <InvoiceAnalytics />;
      case 'quotes':
        return <EnhancedQuoteManagement />;
      case 'items':
        return <EnhancedItemManagement />;
      case 'management':
      default:
        return <InvoiceManagement />;
    }
  };

  const tabs = [
    { id: 'management', label: 'Invoices', icon: '📄', shortLabel: 'Invoices' },
    { id: 'quotes', label: 'Quotes', icon: '💬', shortLabel: 'Quotes' },
    { id: 'items', label: 'Items', icon: '📦', shortLabel: 'Items' },
    { id: 'analytics', label: 'Analytics', icon: '📊', shortLabel: 'Stats' }
  ];

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Business Center
              </h1>
              <p className="text-gray-600 mt-1">
                Complete invoice, quote, and item management
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="btn-enhanced btn-secondary touch-target flex items-center justify-center sm:justify-start"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
              <div className="grid grid-cols-2 gap-1 sm:flex sm:gap-0 sm:space-x-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={`relative flex items-center justify-center px-4 py-3 rounded-lg transition-all duration-200 font-medium touch-target ${
                      view === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg mr-2">{tab.icon}</span>
                    <span className="text-sm sm:text-base">
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </span>
                    {view === tab.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg opacity-10"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area with Animation */}
        <div className="fade-in">
          {renderContent()}
        </div>

        {/* Settings Modal */}
        <InvoiceSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </Layout>
  );
};

export default Invoices;

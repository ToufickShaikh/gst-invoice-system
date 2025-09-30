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
      <div className="responsive-padding">
        {/* Modern Header Section */}
        <div className="page-header">
          <div className="flex flex-col space-y-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="slide-in">
              <h1 className="page-title">
                Business Center
              </h1>
              <p className="page-subtitle">
                Complete invoice, quote, and item management
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="btn-enhanced btn-secondary touch-target flex items-center justify-center sm:justify-start scale-in"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>

          {/* Modern Tab Navigation */}
          <div className="mt-8 fade-in">
            <div className="nav-tabs-modern">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`nav-tab-modern ${
                    view === tab.id ? 'nav-tab-active' : 'nav-tab-inactive'
                  }`}
                >
                  <span className="text-lg mr-2">{tab.icon}</span>
                  <span className="responsive-text">
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </span>
                </button>
              ))}
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
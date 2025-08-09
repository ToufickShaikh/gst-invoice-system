import React, { useState } from 'react';
import Layout from '../components/Layout';
import InvoiceManagement from '../components/InvoiceManagement';
import InvoiceAnalytics from '../components/InvoiceAnalytics';
import InvoiceSettings from '../components/InvoiceSettings';

const Invoices = () => {
  const [view, setView] = useState('management'); // 'management', 'analytics', 'settings'
  const [showSettings, setShowSettings] = useState(false);

  const renderContent = () => {
    switch (view) {
      case 'analytics':
        return <InvoiceAnalytics />;
      case 'management':
      default:
        return <InvoiceManagement />;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice Center</h1>
              <p className="text-gray-600">Comprehensive invoice management and analytics</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Settings
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
            <button
              onClick={() => setView('management')}
              className={`px-4 py-2 rounded-md transition-colors ${
                view === 'management'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Invoice Management
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-2 rounded-md transition-colors ${
                view === 'analytics'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics & Reports
            </button>
          </div>
        </div>

        {/* Content */}
        {renderContent()}

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

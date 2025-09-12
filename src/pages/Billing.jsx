import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import EnhancedBillingForm from '../components/EnhancedBillingForm';

const Billing = () => {
  const navigate = useNavigate();
  const [billingMode, setBillingMode] = useState('advanced');

  return (
    <Layout>
      <div className="responsive-padding">
        {/* Modern Header */}
        <div className="page-header">
          <div className="flex flex-col space-y-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="slide-in">
              <h1 className="page-title">
                Create Invoice
              </h1>
              <p className="page-subtitle">
                Professional invoice creation with GST compliance
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 scale-in">
              <button
                onClick={() => navigate('/pos')}
                className="btn-enhanced bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                title="Quick POS billing for retail sales"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                POS Mode
              </button>
              
              <button
                onClick={() => navigate('/invoices')}
                className="btn-enhanced btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View All Invoices
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mt-8 fade-in">
            <div className="nav-tabs-modern">
              <button
                onClick={() => setBillingMode('advanced')}
                className={`nav-tab-modern ${
                  billingMode === 'advanced' ? 'nav-tab-active' : 'nav-tab-inactive'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Advanced Mode
              </button>
            </div>
            <p className="text-slate-600 mt-4 responsive-text">
              {billingMode === 'advanced' 
                ? 'Full-featured invoice creation with all GST options, export settings, and advanced controls'
                : 'Simplified billing for quick invoice creation'
              }
            </p>
          </div>
        </div>

        {/* Billing Form */}
        <div className="fade-in">
          <EnhancedBillingForm />
        </div>
      </div>
    </Layout>
  );
};

export default Billing;
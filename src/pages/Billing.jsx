import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import EnhancedBillingForm from '../components/EnhancedBillingForm';

const Billing = () => {
  // Force enhanced version - clear browser cache if you see old version
  console.log('🚀 Loading Enhanced Billing v2.0 - Advanced Features Enabled');
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div>
          <button
            onClick={() => navigate('/pos')}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            title="Open POS quick billing"
          >POS</button>
        </div>
      </div>
      <EnhancedBillingForm />
    </Layout>
  );
};

export default Billing;

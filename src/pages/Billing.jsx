import React from 'react';
import Layout from '../components/Layout';
import EnhancedBillingForm from '../components/EnhancedBillingForm';

const Billing = () => {
  // Force enhanced version - clear browser cache if you see old version
  console.log('🚀 Loading Enhanced Billing v2.0 - Advanced Features Enabled');
  
  return (
    <Layout>
      <EnhancedBillingForm />
    </Layout>
  );
};

export default Billing;

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import { billingAPI } from '../api/billing';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'customer', label: 'Customer' },
    { key: 'quoteDate', label: 'Date' },
    { key: 'status', label: 'Status' },
  ];

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await billingAPI.getAllQuotes();
      setQuotes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const data = quotes.map((quote) => ({
    ...quote,
    customer: quote.customer.name,
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quotes</h1>
          <Button>Add Quote</Button>
        </div>
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table columns={columns} data={data} />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Quotes;

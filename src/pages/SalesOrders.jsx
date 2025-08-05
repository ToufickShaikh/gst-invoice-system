import React from 'react';
import { Link } from 'react-router-dom';

const SalesOrders = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold">Sales Orders</h1>
      <p>This is the sales orders page.</p>
      <Link to="/sales-orders/new">New Sales Order</Link>
    </div>
  );
};

export default SalesOrders;
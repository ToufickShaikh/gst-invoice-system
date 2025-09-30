import React from 'react';
import { formatCurrency } from '../../../utils/dateHelpers';

const InvoiceSummaryCards = ({ invoices, totalCount }) => {
  const getTotalAmount = () => invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const getPaidAmount = () => invoices.reduce((sum, invoice) => sum + (Number(invoice.paidAmount) || 0), 0);
  const getDiscountGiven = () => {
    return invoices.reduce((sum, invoice) => {
      if (invoice.discount != null && invoice.discount !== '') return sum + Number(invoice.discount || 0);
      if (Array.isArray(invoice.items) && invoice.items.length) {
        const lineDiscount = invoice.items.reduce((ls, it) => {
          if (it.discountAmount != null) return ls + Number(it.discountAmount || 0);
          const rate = Number(it.rate || 0); const qty = Number(it.quantity || 0); const pct = Number(it.discount || 0);
          return ls + ((rate * qty) * (pct || 0) / 100);
        }, 0);
        return sum + lineDiscount;
      }
      return sum;
    }, 0);
  };
  const getOverdueAmount = () => {
    return invoices
      .filter(invoice => invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + (invoice.total - (invoice.paidAmount || 0)), 0);
  };

  const cards = [
    { title: 'Total Invoices', value: totalCount, color: 'blue', icon: 'document' },
    { title: 'Total Amount', value: formatCurrency(getTotalAmount()), color: 'green', icon: 'currency' },
    { title: 'Paid Amount', value: formatCurrency(getPaidAmount()), color: 'yellow', icon: 'check' },
    { title: 'Discount Given', value: formatCurrency(getDiscountGiven()), color: 'purple', icon: 'tag' },
    { title: 'Overdue Amount', value: formatCurrency(getOverdueAmount()), color: 'red', icon: 'warning' }
  ];

  const getIcon = (type) => {
    const icons = {
      document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      currency: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
      check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
      warning: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    };
    return icons[type];
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div key={index} className={`bg-gradient-to-br from-${card.color}-50 to-${card.color}-100 rounded-xl p-4 border border-${card.color}-200`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium text-${card.color}-600 mb-1`}>{card.title}</h3>
              <p className={`text-2xl font-bold text-${card.color}-900`}>{card.value}</p>
            </div>
            <div className={`w-10 h-10 bg-${card.color}-500 rounded-lg flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIcon(card.icon)} />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvoiceSummaryCards;
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { invoicesAPI } from '../../../api/invoices';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const normalizeInvoice = (inv) => {
    const customerName = inv.customer?.firmName || inv.customer?.name || '';
    const customerPhone = inv.customer?.contact || inv.customer?.phone || '';
    const invoiceDate = inv.invoiceDate || inv.createdAt || inv.date || null;
    const dueDate = inv.dueDate || invoiceDate || null;
    const total = Number(inv.grandTotal ?? inv.totalAmount ?? inv.total ?? 0);
    const paid = Number(inv.paidAmount ?? 0);
    const balance = Number(inv.balance != null ? inv.balance : (total - paid));

    let status = 'pending';
    if (balance <= 0 && total > 0) status = 'paid';
    else if (paid > 0 && balance > 0) status = 'partial';
    const isOverdue = dueDate ? new Date(dueDate) < new Date() && balance > 0 : false;
    if (isOverdue) status = 'overdue';

    return {
      ...inv,
      customer: { ...(inv.customer || {}), name: customerName, phone: customerPhone },
      date: invoiceDate,
      dueDate,
      total,
      paidAmount: paid,
      balance,
      status,
    };
  };

  const fetchInvoices = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoicesAPI.list(params);
      const raw = response?.data || response || [];
      const normalized = Array.isArray(raw) ? raw.map(normalizeInvoice) : (raw.invoices || []).map(normalizeInvoice);
      setInvoices(normalized);
      setTotalCount(response?.totalCount ?? (Array.isArray(response) ? response.length : normalized.length));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices. Please try again.');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (invoiceId) => {
    try {
      setInvoices(prev => prev.filter(inv => inv._id !== invoiceId));
      const res = await invoicesAPI.remove(invoiceId);
      if (!res?.success) {
        await fetchInvoices();
      }
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      fetchInvoices(); // Rollback on error
      throw error;
    }
  };

  const markAsPaid = async (invoice) => {
    try {
      const full = await invoicesAPI.get(invoice._id);
      if (!full) throw new Error('Invoice not found');

      const itemsPayload = (full.items || []).map((li) => ({
        item: li.item?._id || (typeof li.item === 'string' ? li.item : undefined),
        name: li.name || li.item?.name || '',
        quantity: Number(li.quantity || 0),
        rate: li.rate ?? li.price ?? li.item?.price ?? 0,
        taxSlab: li.taxSlab ?? li.item?.taxSlab ?? 0,
        hsnCode: li.hsnCode || li.item?.hsnCode || '',
      }));

      const payload = {
        customer: full.customer?._id || full.customer,
        items: itemsPayload,
        discount: full.discount || 0,
        shippingCharges: full.shippingCharges || 0,
        paidAmount: Number(full.grandTotal ?? full.totalAmount ?? 0),
        paymentMethod: full.paymentMethod || 'Cash',
        billingType: full.billingType || '',
      };

      await invoicesAPI.update(invoice._id, payload);
      await fetchInvoices();
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  };

  return {
    invoices,
    loading,
    error,
    totalCount,
    fetchInvoices,
    deleteInvoice,
    markAsPaid,
    setInvoices
  };
};
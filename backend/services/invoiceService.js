// Clean, focused Invoice domain service (no Express/req/res code here)
// Responsibilities:
//  - Data validation & normalization
//  - Sequential invoice number generation
//  - Stock adjustments
//  - Portal link token handling
//  - Business calculations (delegates tax math to existing utils)

const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const { calculateTotals } = require('../utils/taxHelpers');
const pdfGenerator = require('../utils/pdfGenerator');
const { generateUpiQr } = require('../utils/upiHelper');
const company = require('../config/company');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { cacheManager } = require('../utils/cacheManager');

// ---------- Helpers ----------
const extractId = (v) => {
  if (!v) return null; if (typeof v === 'string') return v; if (v._id) return v._id.toString(); return null;
};

async function generateInvoiceNumber(customerType = 'B2C') {
  const prefix = customerType.toUpperCase();
  const last = await Invoice.findOne({ invoiceNumber: { $regex: `^${prefix}-` } }).sort({ invoiceNumber: -1 });
  if (!last) return `${prefix}-01`;
  const m = last.invoiceNumber.match(new RegExp(`^${prefix}-(\\d+)$`));
  const next = m ? String(parseInt(m[1], 10) + 1).padStart(2, '0') : Date.now().toString().slice(-2);
  return `${prefix}-${next}`;
}

function normalizeItems(raw = []) {
  return raw.map(r => ({
    item: extractId(r.item) || undefined,
    name: r.name || r.item?.name || '',
    hsnCode: r.hsnCode || r.item?.hsnCode || '',
    rate: r.rate ?? r.price ?? 0,
    taxSlab: r.taxSlab ?? r.taxRate ?? 0,
    quantity: Number(r.quantity || 0)
  }));
}

async function validateItems(items) {
  for (const it of items) {
    if (!it.quantity || it.quantity <= 0) throw new Error('Invalid item quantity');
    if (it.rate == null || it.rate < 0) throw new Error('Invalid item rate');
    if (it.item) {
      const exists = await Item.findById(it.item).select('_id');
      if (!exists) throw new Error(`Catalog item not found: ${it.item}`);
    }
  }
}

async function adjustStock(items, direction) {
  // direction: +1 to increase (revert), -1 to decrease (consume)
  for (const it of items) {
    if (!it.item) continue;
    await Item.findByIdAndUpdate(it.item, { $inc: { quantityInStock: direction * it.quantity } });
  }
}

// ---------- Core Operations ----------
async function listInvoices({ billingType, search, dateFrom, dateTo, status, sortBy = 'createdAt', sortDir = 'desc', page = 1, pageSize = 20 } = {}) {
  // Server-side listing with filters, search, sort and pagination.
  // Convert page/pageSize to ints
  page = Number(page) || 1;
  pageSize = Number(pageSize) || 20;
  const skip = (page - 1) * pageSize;

  const pipeline = [];

  // Join customer for searches and billingType
  pipeline.push({
    $lookup: {
      from: 'customers',
      localField: 'customer',
      foreignField: '_id',
      as: 'customer'
    }
  });
  pipeline.push({ $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } });

  const match = {};

  // Date filters
  if (dateFrom || dateTo) {
    match.invoiceDate = {};
    if (dateFrom) match.invoiceDate.$gte = new Date(dateFrom);
    if (dateTo) match.invoiceDate.$lte = new Date(dateTo);
  }

  // Billing type (customer.customerType)
  if (billingType) {
    match['customer.customerType'] = billingType.toUpperCase();
  }

  // Status filters using expressions
  if (status) {
    switch ((status || '').toLowerCase()) {
      case 'paid':
        match.$and = match.$and || [];
        match.$and.push({ $expr: { $lte: ['$balance', 0] } });
        match.$and.push({ $expr: { $gt: ['$grandTotal', 0] } });
        break;
      case 'partial':
        match.$and = match.$and || [];
        match.$and.push({ $expr: { $gt: ['$paidAmount', 0] } });
        match.$and.push({ $expr: { $gt: ['$balance', 0] } });
        break;
      case 'pending':
        match.$and = match.$and || [];
        match.$and.push({ $expr: { $eq: ['$paidAmount', 0] } });
        match.$and.push({ $expr: { $gt: ['$balance', 0] } });
        break;
      case 'overdue':
        match.$and = match.$and || [];
        match.$and.push({ $expr: { $lt: ['$dueDate', new Date()] } });
        match.$and.push({ $expr: { $gt: ['$balance', 0] } });
        break;
      case 'draft':
        match.status = 'draft';
        break;
      case 'cancelled':
        match.status = 'cancelled';
        break;
      default:
        break;
    }
  }

  // Search across invoiceNumber and customer.name/firmName
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = match.$or || [];
    match.$or.push({ invoiceNumber: { $regex: regex } });
    match.$or.push({ 'customer.firmName': { $regex: regex } });
    match.$or.push({ 'customer.name': { $regex: regex } });
  }

  if (Object.keys(match).length) pipeline.push({ $match: match });

  // Sorting
  const dir = sortDir === 'asc' ? 1 : -1;
  let sortField = 'createdAt';
  switch (sortBy) {
    case 'date': sortField = 'invoiceDate'; break;
    case 'amount': sortField = 'grandTotal'; break;
    case 'customer': sortField = 'customer.firmName'; break;
    case 'status': sortField = 'balance'; break; // approximate
    default: sortField = 'createdAt';
  }
  const sortObj = {};
  sortObj[sortField] = dir;
  pipeline.push({ $sort: sortObj });

  // Facet for pagination + total count
  pipeline.push({
    $facet: {
      data: [ { $skip: skip }, { $limit: pageSize } ],
      totalCount: [ { $count: 'count' } ]
    }
  });

  const out = await Invoice.aggregate(pipeline).allowDiskUse(true);
  const first = (out && out[0]) || { data: [], totalCount: [] };
  const data = first.data || [];
  const totalCount = (first.totalCount && first.totalCount[0] && first.totalCount[0].count) ? first.totalCount[0].count : 0;

  return { data, totalCount };
}

async function getInvoice(id) {
  return Invoice.findById(id).populate('customer').populate('items.item');
}

async function createInvoice(data) {
  const { customer, items, paidAmount = 0, discount = 0, shippingCharges = 0, paymentMethod = '', billingType = '', exportInfo, customerName } = data;
  if (!items || !items.length) throw new Error('At least one item required');

  const customerId = extractId(customer) || customer;
  let customerDoc = null;
  if (customerId) {
    customerDoc = await Customer.findById(customerId);
    if (!customerDoc) throw new Error('Customer not found');
  } else {
    customerDoc = { state: company.state || '', customerType: 'B2C', firmName: 'B2C-Guest' };
  }

  const normalized = normalizeItems(items);
  await validateItems(normalized);

  const { subTotal, taxAmount, totalAmount } = calculateTotals(normalized, customerDoc.state);
  const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
  const grandTotal = totalAmount - discount + shippingCharges;
  const invoiceNumber = await generateInvoiceNumber(customerDoc.customerType);
  const balance = grandTotal - paidAmount;

  const invoice = await Invoice.create({
    invoiceNumber,
    customer: customerId,
    items: normalized,
    guestName: customerName || undefined,
    subTotal,
    cgst: taxAmount.cgst,
    sgst: taxAmount.sgst,
    igst: taxAmount.igst,
    totalTax,
    grandTotal: grandTotal,
    totalAmount,
    discount,
    shippingCharges,
    paidAmount,
    balance,
    paymentMethod,
    billingType,
    exportInfo: exportInfo || undefined,
  });

  await adjustStock(normalized, -1);
  // invalidate caches
  try { await cacheManager.invalidatePattern('invoices'); await cacheManager.invalidatePattern('dashboard'); } catch(_){}
  return invoice;
}

async function updateInvoice(id, data) {
  const existing = await Invoice.findById(id);
  if (!existing) throw new Error('Invoice not found');

  // revert old stock
  await adjustStock(existing.items, +1);

  const { customer, items, paidAmount = 0, discount = 0, shippingCharges = 0, paymentMethod = '', billingType = '', exportInfo } = data;
  if (!customer) throw new Error('Customer required');
  if (!items || !items.length) throw new Error('At least one item required');
  const customerDoc = await Customer.findById(customer);
  if (!customerDoc) throw new Error('Customer not found');

  const normalized = normalizeItems(items);
  await validateItems(normalized);
  const { subTotal, taxAmount, totalAmount } = calculateTotals(normalized, customerDoc.state);
  const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
  const balance = totalAmount - paidAmount;

  Object.assign(existing, {
    customer,
    items: normalized,
    subTotal,
    cgst: taxAmount.cgst,
    sgst: taxAmount.sgst,
    igst: taxAmount.igst,
    totalTax,
    grandTotal: totalAmount,
    totalAmount,
    discount,
    shippingCharges,
    paidAmount,
    balance,
    paymentMethod,
    billingType,
    exportInfo: exportInfo ?? existing.exportInfo,
  });

  await existing.save();
  await adjustStock(normalized, -1);
  try { await cacheManager.invalidatePattern('invoices'); await cacheManager.invalidatePattern('dashboard'); } catch(_){}
  return existing.populate('customer').populate('items.item');
}

async function deleteInvoice(id) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new Error('Invoice not found');
  await adjustStock(invoice.items, +1);
  if (invoice.pdfPath) {
    const file = path.resolve(__dirname, '../invoices', path.basename(invoice.pdfPath));
    if (fs.existsSync(file)) { try { fs.unlinkSync(file); } catch (_) { /* ignore */ } }
  }
  await invoice.deleteOne();
  try { await cacheManager.invalidatePattern('invoices'); await cacheManager.invalidatePattern('dashboard'); } catch(_){}
  return { deletedId: id };
}

async function reprintInvoice(id, { format = 'a4' } = {}) {
  const invoice = await Invoice.findById(id).populate('customer').populate('items.item');
  if (!invoice) throw new Error('Invoice not found');
  let pdfPath;
  if (format === 'thermal') pdfPath = await pdfGenerator.generateThermalPDF(invoice);
  else pdfPath = await pdfGenerator.generateInvoicePDF(invoice, format);
  invoice.pdfPath = pdfPath; await invoice.save();
  try { await cacheManager.invalidatePattern('invoices'); } catch(_){}
  return { pdfPath, format };
}

async function createPortalLink(id, baseUrl) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new Error('Invoice not found');
  invoice.portalToken = crypto.randomBytes(16).toString('hex');
  invoice.portalTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await invoice.save();
  try { await cacheManager.invalidatePattern('invoices'); } catch(_){}
  const url = `${baseUrl.replace(/\/$/, '')}/portal/invoice/${invoice._id}/${invoice.portalToken}`;
  return { url, token: invoice.portalToken, expiresAt: invoice.portalTokenExpires, invoiceNumber: invoice.invoiceNumber };
}

async function getPublicInvoice(id, token) {
  const invoice = await Invoice.findById(id).populate('customer').populate('items.item');
  if (!invoice) throw new Error('Invoice not found');
    // If invoice has a portal token we prefer to validate it when provided.
    // But since authentication/JWT was removed and client calls the public endpoint
    // without a token, allow public access when token is not supplied while
    // still validating when a token is present (backwards compatible).
    if (invoice.portalToken) {
      if (token) {
        if (token !== invoice.portalToken) throw new Error('Invalid token');
        if (invoice.portalTokenExpires && invoice.portalTokenExpires < new Date()) throw new Error('Portal link expired');
      } else {
        // No token provided — allow public access but log a warning for observability
        console.warn(`[PORTAL] Invoice ${id} has a portal token but no token was provided; allowing public access (auth disabled).`);
      }
    }
  const total = Number(invoice.grandTotal || invoice.totalAmount || 0);
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance ?? (total - paid));
  let qrCodeImage = '';
  try {
    const upiId = company?.upi?.id;
    if (upiId) {
      const amt = balance > 0 ? balance.toFixed(2) : undefined;
      const { qrCodeImage: img } = await generateUpiQr(upiId, amt);
      qrCodeImage = img;
    }
  } catch (_) { /* silent */ }
  return { invoice, balance, company, pdfUrl: `/api/invoices/public/pdf/${invoice._id}`, qrCodeImage };
}

async function generatePublicPdf(id, token, { format = 'a4' } = {}) {
  const info = await getPublicInvoice(id, token); // validates (token optional)
  const inv = info.invoice;
  const fname = `public-${inv._id}-${Date.now()}.pdf`;
  let pdfPath;
  if (format === 'thermal') pdfPath = await pdfGenerator.generateThermalPDF(inv, fname);
  else pdfPath = await pdfGenerator.generateInvoicePDF(inv, fname);
  const fileName = path.basename(pdfPath);
  const fullPath = path.resolve(__dirname, '../invoices', fileName);
  return { fullPath, downloadName: `invoice-${inv.invoiceNumber}.pdf` };
}

module.exports = {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  reprintInvoice,
  createPortalLink,
  getPublicInvoice,
  generatePublicPdf,
  // new v2 additions
  generatePaymentQrForInvoice: async (id) => {
    const invoice = await Invoice.findById(id).populate('customer').populate('items.item');
    if (!invoice) throw new Error('Invoice not found');
    let grandTotal = invoice.grandTotal || 0;
    let paidAmount = invoice.paidAmount || 0;
    let balance = grandTotal - paidAmount;
    if (grandTotal <= 0) {
      if (!invoice.customer) throw new Error('Cannot recalculate: Customer data is missing.');
      if (!invoice.items || invoice.items.length === 0) throw new Error('Cannot recalculate: Item data is missing.');
      const populatedItemsForRecalc = invoice.items.map(i => ({ ...(i.item.toObject ? i.item.toObject() : i.item), quantity: i.quantity }));
      const { subTotal, taxAmount, totalAmount: newGrandTotal } = calculateTotals(populatedItemsForRecalc, invoice.customer.state);
      grandTotal = newGrandTotal; balance = newGrandTotal - paidAmount;
      invoice.subTotal = subTotal; invoice.cgst = taxAmount.cgst; invoice.sgst = taxAmount.sgst; invoice.igst = taxAmount.igst; invoice.totalTax = (taxAmount.cgst||0)+(taxAmount.sgst||0)+(taxAmount.igst||0); invoice.grandTotal = newGrandTotal; invoice.balance = balance; invoice.totalAmount = newGrandTotal;
      await invoice.save();
    }
    const upiId = company.upi?.id || process.env.UPI_ID || '';
    const amountForQr = balance > 0 ? balance.toFixed(2) : undefined;
    const { qrCodeImage } = await generateUpiQr(upiId, amountForQr);
    return { qrCodeImage, amount: amountForQr || null };
  },
  recordCustomerPayment: async (customerId, { amount, method = 'Cash', date = new Date(), notes = '' } = {}) => {
    amount = Number(amount);
    if (!customerId) throw new Error('Customer ID required');
    if (!amount || amount <= 0) throw new Error('Valid amount required');
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');
    const invoices = await Invoice.find({ customer: customerId }).sort({ invoiceDate: 1 }).select('_id invoiceNumber grandTotal paidAmount balance');
    let remaining = amount; const allocations = [];
    for (const inv of invoices) {
      const grandTotal = Number(inv.grandTotal || inv.totalAmount || 0);
      const paidAmount = Number(inv.paidAmount || 0);
      let balance = Number(inv.balance != null ? inv.balance : (grandTotal - paidAmount));
      if (balance <= 0) continue;
      if (remaining <= 0) break;
      const alloc = Math.min(balance, remaining);
      inv.paidAmount = paidAmount + alloc; inv.balance = Math.max(0, grandTotal - inv.paidAmount);
      await inv.save();
      allocations.push({ invoiceId: inv._id, invoiceNumber: inv.invoiceNumber, allocated: alloc, remainingBalance: inv.balance });
      remaining -= alloc;
    }
    try { await cacheManager.invalidatePattern('invoices'); await cacheManager.invalidatePattern('dashboard'); } catch(_){}
    return { success: true, customerId, totalPaid: amount, unallocated: remaining, allocations };
  }
};

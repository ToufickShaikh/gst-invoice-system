// Express-facing controller layer wrapping invoiceService.
// Each handler returns JSON; errors are normalized.

const service = require('../services/invoiceService');
const fs = require('fs');

function handleError(res, e, status = 400) {
  const msg = e && e.message ? e.message : 'Unknown error';
  const code = /not found/i.test(msg) ? 404 : status;
  res.status(code).json({ success: false, message: msg });
}

exports.list = async (req, res) => {
  try { const data = await service.listInvoices({ billingType: req.query.billingType }); res.json(data); }
  catch (e) { handleError(res, e, 500); }
};

exports.get = async (req, res) => {
  try { const inv = await service.getInvoice(req.params.id); if (!inv) return handleError(res, new Error('Invoice not found'), 404); res.json(inv); }
  catch (e) { handleError(res, e, 500); }
};

exports.create = async (req, res) => {
  try { const inv = await service.createInvoice(req.body); res.status(201).json(inv); }
  catch (e) { handleError(res, e, 400); }
};

exports.update = async (req, res) => {
  try { const inv = await service.updateInvoice(req.params.id, req.body); res.json(inv); }
  catch (e) { handleError(res, e, 400); }
};

exports.remove = async (req, res) => {
  try { const out = await service.deleteInvoice(req.params.id); res.json({ success: true, ...out }); }
  catch (e) { handleError(res, e, 400); }
};

exports.reprint = async (req, res) => {
  try { const out = await service.reprintInvoice(req.params.id, { format: req.query.format }); res.json({ success: true, ...out }); }
  catch (e) { handleError(res, e, 400); }
};

exports.portalLink = async (req, res) => {
  try {
    const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '') || ((req.protocol + '://' + req.get('host')));
    const out = await service.createPortalLink(req.params.id, base);
    res.json({ success: true, ...out });
  } catch (e) { handleError(res, e, 400); }
};

exports.publicInvoice = async (req, res) => {
  try { const out = await service.getPublicInvoice(req.params.id, req.query.token); res.json({ success: true, ...out }); }
  catch (e) { handleError(res, e, 400); }
};

exports.publicPdf = async (req, res) => {
  try {
    const { fullPath, downloadName } = await service.generatePublicPdf(req.params.id, req.query.token, { format: req.query.format });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.sendFile(fullPath, (err) => { if (err) console.error('Send PDF error', err); setTimeout(() => { try { fs.unlinkSync(fullPath); } catch (_) {} }, 30000); });
  } catch (e) { handleError(res, e, 400); }
};

exports.generatePaymentQr = async (req, res) => {
  try {
    const out = await service.generatePaymentQrForInvoice(req.params.id);
    res.json({ success: true, ...out });
  } catch (e) { handleError(res, e, 400); }
};

exports.recordCustomerPayment = async (req, res) => {
  try {
    const { customerId } = req.params;
    const out = await service.recordCustomerPayment(customerId, req.body);
    res.json(out);
  } catch (e) { handleError(res, e, 400); }
};

const CashDrawer = require('../models/CashDrawer');
const Invoice = require('../models/Invoice');

function computeTotalFromDenoms(denoms = {}) {
  return (
    (denoms.d500 || 0) * 500 +
  (denoms.d200 || 0) * 200 +
    (denoms.d100 || 0) * 100 +
    (denoms.d50 || 0) * 50 +
    (denoms.d20 || 0) * 20 +
    (denoms.d10 || 0) * 10 +
    (denoms.d5 || 0) * 5 +
    (denoms.d2 || 0) * 2 +
    (denoms.d1 || 0) * 1
  );
}

function cloneDenoms(d) {
  return {
  d500: Number(d?.d500||0), d200: Number(d?.d200||0), d100: Number(d?.d100||0), d50: Number(d?.d50||0), d20: Number(d?.d20||0),
  d10: Number(d?.d10||0), d5: Number(d?.d5||0), d2: Number(d?.d2||0), d1: Number(d?.d1||0),
  };
}

async function getDrawerDoc() {
  let doc = await CashDrawer.findOne();
  if (!doc) {
    doc = new CashDrawer();
    await doc.save();
  }
  return doc;
}

exports.getStatus = async (req, res) => {
  try {
    const drawer = await getDrawerDoc();
    return res.json(drawer);
  } catch (e) {
    console.error('Cash drawer status error:', e);
    res.status(500).json({ message: 'Failed to get cash drawer' });
  }
};

exports.adjustCash = async (req, res) => {
  try {
    const { type = 'adjust-add', denominations = {}, note = '', reason = '' } = req.body || {};
    if (!['adjust-add','adjust-remove'].includes(type)) {
      return res.status(400).json({ message: 'Invalid adjustment type' });
    }
    const drawer = await getDrawerDoc();

    const beforeTotal = Number(drawer.totalCash || 0);
    const beforeDenoms = cloneDenoms(drawer.denominations || {});

    // Compute delta from denominations
    const deltaAmount = computeTotalFromDenoms(denominations);

    // Update denominations
  const fields = ['d500','d200','d100','d50','d20','d10','d5','d2','d1'];
    fields.forEach(f => {
      const inc = Number(denominations[f]) || 0;
      drawer.denominations[f] = (drawer.denominations[f] || 0) + (type==='adjust-add' ? inc : -inc);
      if (drawer.denominations[f] < 0) drawer.denominations[f] = 0; // clamp
    });

    drawer.totalCash = computeTotalFromDenoms(drawer.denominations);

    const afterTotal = Number(drawer.totalCash || 0);
    const afterDenoms = cloneDenoms(drawer.denominations || {});

    drawer.transactions.push({
      type,
      direction: type==='adjust-add' ? 'credit' : 'debit',
      method: 'Cash',
      amount: deltaAmount,
      denominations,
      reason: reason || note || '',
      performedBy: req.user?._id,
      beforeTotal,
      afterTotal,
      beforeDenoms,
      afterDenoms,
    });

    await drawer.save();
    res.json(drawer);
  } catch (e) {
    console.error('Cash adjust error:', e);
    res.status(500).json({ message: 'Failed to adjust cash' });
  }
};

exports.recordSaleCash = async (req, res) => {
  try {
    const { invoiceId, amount, denominations = {}, reason = '' } = req.body || {};
    if (!invoiceId || !amount) return res.status(400).json({ message: 'invoiceId and amount required' });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const drawer = await getDrawerDoc();

    const beforeTotal = Number(drawer.totalCash || 0);
    const beforeDenoms = cloneDenoms(drawer.denominations || {});

    // Increment denominations by received cash
  const fields = ['d500','d200','d100','d50','d20','d10','d5','d2','d1'];
    fields.forEach(f => {
      drawer.denominations[f] = (drawer.denominations[f] || 0) + (Number(denominations[f]) || 0);
    });

    const deltaAmount = computeTotalFromDenoms(denominations) || Number(amount)||0;
    drawer.totalCash = computeTotalFromDenoms(drawer.denominations);

    const afterTotal = Number(drawer.totalCash || 0);
    const afterDenoms = cloneDenoms(drawer.denominations || {});

    drawer.transactions.push({
      type: 'sale',
      direction: 'credit',
      method: 'Cash',
      amount: deltaAmount,
      denominations,
      reason: reason || `Cash received for invoice ${invoice.invoiceNumber || invoice._id}`,
      performedBy: req.user?._id,
      beforeTotal,
      afterTotal,
      beforeDenoms,
      afterDenoms,
      invoiceId: invoice._id
    });

    // Update invoice paid and balance
    invoice.paidAmount = Number(invoice.paidAmount || 0) + Number(amount || 0);
    const grand = Number(invoice.grandTotal || invoice.totalAmount || 0);
    invoice.balance = Math.max(0, grand - invoice.paidAmount);
    invoice.paymentMethod = 'Cash';

    await drawer.save();
    await invoice.save();

    res.json({ drawer, invoice });
  } catch (e) {
    console.error('Cash sale record error:', e);
    res.status(500).json({ message: 'Failed to record sale cash' });
  }
};

const bcrypt = require('bcryptjs');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Item = require('../models/Item');

const createTenant = async (req, res) => {
  try {
    const { name, adminEmail, adminPassword, companyName } = req.body;
    
    const tenant = new Tenant({
      name,
      companyDetails: {
        legalName: companyName,
        invoiceSettings: {
          prefix: 'INV',
          startingNumber: 1
        }
      }
    });
    
    await tenant.save();
    
    // Create tenant admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = new User({
      username: adminEmail.split('@')[0],
      email: adminEmail,
      password: hashedPassword,
      role: 'tenant_admin',
      tenantId: tenant._id
    });
    
    await adminUser.save();
    res.json({ success: true, tenant, adminUser });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({}).lean();
    
    // Add usage stats
    for (let tenant of tenants) {
      tenant.stats = {
        invoices: await Invoice.countDocuments({ tenantId: tenant._id }),
        customers: await Customer.countDocuments({ tenantId: tenant._id }),
        items: await Item.countDocuments({ tenantId: tenant._id }),
        users: await User.countDocuments({ tenantId: tenant._id })
      };
    }
    
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;
    
    // Delete all tenant data
    await Promise.all([
      Invoice.deleteMany({ tenantId }),
      Customer.deleteMany({ tenantId }),
      Item.deleteMany({ tenantId }),
      User.deleteMany({ tenantId })
    ]);
    
    await Tenant.findByIdAndDelete(tenantId);
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = {
      totalTenants: await Tenant.countDocuments({}),
      totalUsers: await User.countDocuments({ role: { $ne: 'super_admin' } }),
      totalInvoices: await Invoice.countDocuments({}),
      activeTenants: await Tenant.countDocuments({ isActive: true })
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTenant,
  getAllTenants,
  deleteTenant,
  getDashboardStats
};
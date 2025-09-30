const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gst-invoice-system');
    
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const superAdmin = new User({
      username: 'superadmin',
      email: 'admin@yourdomain.com',
      password: hashedPassword,
      role: 'super_admin'
    });
    
    await superAdmin.save();
    console.log('Super admin created successfully');
    console.log('Email: admin@yourdomain.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();
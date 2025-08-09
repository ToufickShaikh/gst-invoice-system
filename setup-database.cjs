const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!');
    
    const db = client.db('gst_invoice_system');
    
    // Create collections
    console.log('Creating collections...');
    await db.createCollection('users');
    await db.createCollection('customers');
    await db.createCollection('items');
    await db.createCollection('invoices');
    await db.createCollection('purchases');
    await db.createCollection('suppliers');
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.collection('invoices').createIndex({ "invoiceNumber": 1 }, { unique: true });
    await db.collection('invoices').createIndex({ "customerId": 1, "createdAt": -1 });
    await db.collection('invoices').createIndex({ "status": 1, "dueDate": 1 });
    await db.collection('customers').createIndex({ "email": 1 }, { unique: true, sparse: true });
    await db.collection('customers').createIndex({ "phone": 1 });
    
    // Check if admin user already exists
    const existingAdmin = await db.collection('users').findOne({ email: 'admin@shaikhcarpets.com' });
    
    if (!existingAdmin) {
      // Create default admin user
      console.log('Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.collection('users').insertOne({
        name: 'Administrator',
        email: 'admin@shaikhcarpets.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date()
      });
      
      console.log('✅ Database setup completed successfully!');
      console.log('📋 Default admin credentials:');
      console.log('   Email: admin@shaikhcarpets.com');
      console.log('   Password: admin123');
      console.log('⚠️  Please change the default password after first login!');
    } else {
      console.log('✅ Database already set up. Admin user exists.');
    }
    
    // Add some sample data
    console.log('Adding sample data...');
    
    // Sample customer
    const sampleCustomer = await db.collection('customers').findOne({ email: 'customer@example.com' });
    if (!sampleCustomer) {
      await db.collection('customers').insertOne({
        name: 'Sample Customer',
        email: 'customer@example.com',
        phone: '+91-9876543210',
        address: 'Sample Address, City, State - 123456',
        gstin: '22AAAAA0000A1Z5',
        customerType: 'B2B',
        createdAt: new Date()
      });
    }
    
    // Sample item
    const sampleItem = await db.collection('items').findOne({ name: 'Sample Carpet' });
    if (!sampleItem) {
      await db.collection('items').insertOne({
        name: 'Sample Carpet',
        description: 'High Quality Carpet',
        unit: 'piece',
        sellingPrice: 5000,
        purchasePrice: 3000,
        gstRate: 18,
        hsnCode: '5701',
        stock: 10,
        createdAt: new Date()
      });
    }
    
    console.log('📦 Sample data added successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

console.log('🚀 Setting up Enhanced GST Invoice System Database...');
setupDatabase();

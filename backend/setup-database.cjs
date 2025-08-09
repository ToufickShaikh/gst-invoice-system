const { MongoClient } = require('mongodb');

async function setupDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!');
    
    const db = client.db('gst_invoice_system');
    
    // Create collections
    await db.createCollection('users');
    await db.createCollection('customers');
    await db.createCollection('items');
    await db.createCollection('invoices');
    await db.createCollection('purchases');
    await db.createCollection('suppliers');
    
    console.log('Collections created successfully!');
    
    // Create indexes for better performance
    await db.collection('invoices').createIndex({ "invoiceNumber": 1 }, { unique: true });
    await db.collection('invoices').createIndex({ "customerId": 1, "createdAt": -1 });
    await db.collection('invoices').createIndex({ "status": 1, "dueDate": 1 });
    await db.collection('customers').createIndex({ "email": 1 }, { unique: true });
    await db.collection('customers').createIndex({ "phone": 1 });
    
    console.log('Database indexes created successfully!');
    
    // Insert sample data
    const sampleCustomer = {
      name: 'Sample Customer',
      email: 'customer@example.com',
      phone: '+91-9876543210',
      address: 'Sample Address, City, State - 123456',
      gstin: '22AAAAA0000A1Z5',
      type: 'B2B',
      createdAt: new Date()
    };
    
    try {
      await db.collection('customers').insertOne(sampleCustomer);
      console.log('Sample customer created!');
    } catch (error) {
      console.log('Sample customer already exists or could not be created');
    }
    
    const sampleItem = {
      name: 'Sample Product',
      description: 'Sample product description',
      unit: 'pcs',
      sellingPrice: 1000,
      purchasePrice: 800,
      taxRate: 18,
      hsnCode: '1234',
      createdAt: new Date()
    };
    
    try {
      await db.collection('items').insertOne(sampleItem);
      console.log('Sample item created!');
    } catch (error) {
      console.log('Sample item already exists or could not be created');
    }
    
    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend: npm run dev (in root directory)');
    console.log('3. Access the application at http://localhost:5173');
    console.log('');
    console.log('👤 You can create user accounts through the application interface');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  } finally {
    await client.close();
  }
}

setupDatabase();

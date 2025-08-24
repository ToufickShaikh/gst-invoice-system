/**
 * Database Optimization and Indexing Strategy
 * Ensures optimal query performance for the GST Invoice System
 */

const mongoose = require('mongoose');

/**
 * Create optimized indexes for better query performance
 */
const createIndexes = async () => {
  try {
    console.log('🔧 Creating database indexes for optimal performance...');

    // Invoice Indexes
    const Invoice = mongoose.model('Invoice');
    await Promise.all([
      // Compound index for invoice queries
      Invoice.collection.createIndex({ 
        invoiceDate: -1, 
        customer: 1, 
        paymentStatus: 1 
      }),
      // Text search index
      Invoice.collection.createIndex({
        invoiceNumber: 'text',
        'customer.firmName': 'text',
        'customer.name': 'text'
      }),
      // Performance indexes
      Invoice.collection.createIndex({ createdAt: -1 }),
      Invoice.collection.createIndex({ grandTotal: -1 }),
      Invoice.collection.createIndex({ balance: 1 }),
      Invoice.collection.createIndex({ billingType: 1 }),
      // Partial index for unpaid invoices
      Invoice.collection.createIndex(
        { balance: 1, dueDate: 1 },
        { partialFilterExpression: { balance: { $gt: 0 } } }
      )
    ]);

    // Customer Indexes
    const Customer = mongoose.model('Customer');
    await Promise.all([
      Customer.collection.createIndex({ firmName: 1 }),
      Customer.collection.createIndex({ email: 1 }, { unique: true, sparse: true }),
      Customer.collection.createIndex({ contact: 1 }),
      Customer.collection.createIndex({ customerType: 1 }),
      Customer.collection.createIndex({ state: 1 }),
      // Text search
      Customer.collection.createIndex({
        firmName: 'text',
        name: 'text',
        email: 'text'
      })
    ]);

    // Item Indexes
    const Item = mongoose.model('Item');
    await Promise.all([
      Item.collection.createIndex({ name: 1 }),
      Item.collection.createIndex({ hsnCode: 1 }),
      Item.collection.createIndex({ category: 1 }),
      Item.collection.createIndex({ quantityInStock: 1 }),
      Item.collection.createIndex({ rate: 1 }),
      // Compound index for inventory management
      Item.collection.createIndex({ 
        category: 1, 
        quantityInStock: 1,
        active: 1 
      }),
      // Text search
      Item.collection.createIndex({
        name: 'text',
        description: 'text',
        hsnCode: 'text'
      })
    ]);

    console.log('✅ Database indexes created successfully');

    // Create additional optimizations
    await createViews();
    await setupQueryOptimizations();

  } catch (error) {
    console.error('❌ Index creation failed:', error);
  }
};

/**
 * Create database views for complex queries
 */
const createViews = async () => {
  try {
    const db = mongoose.connection.db;

    // Invoice Summary View
    await db.createCollection('invoiceSummaryView', {
      viewOn: 'invoices',
      pipeline: [
        {
          $lookup: {
            from: 'customers',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerInfo'
          }
        },
        {
          $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            invoiceNumber: 1,
            invoiceDate: 1,
            grandTotal: 1,
            paidAmount: 1,
            balance: 1,
            paymentStatus: 1,
            billingType: 1,
            customerName: '$customerInfo.firmName',
            customerEmail: '$customerInfo.email',
            customerType: '$customerInfo.customerType',
            isOverdue: {
              $and: [
                { $gt: ['$balance', 0] },
                { $lt: ['$dueDate', new Date()] }
              ]
            }
          }
        }
      ]
    });

    // Monthly Sales Summary View
    await db.createCollection('monthlySalesView', {
      viewOn: 'invoices',
      pipeline: [
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' }
            },
            totalRevenue: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$paidAmount' },
            invoiceCount: { $sum: 1 },
            avgInvoiceValue: { $avg: '$grandTotal' }
          }
        },
        {
          $sort: { '_id.year': -1, '_id.month': -1 }
        }
      ]
    });

    console.log('✅ Database views created successfully');
  } catch (error) {
    // Views might already exist, ignore errors
    console.log('ℹ️ Database views creation:', error.message);
  }
};

/**
 * Setup query optimizations and connection settings
 */
const setupQueryOptimizations = async () => {
  try {
    // Set read preference for better performance
    mongoose.connection.db.readPreference = 'primary';

    // Enable query profiling for slow queries (development only)
    if (process.env.NODE_ENV === 'development') {
      await mongoose.connection.db.admin().command({
        profile: 2,
        slowms: 100 // Log queries slower than 100ms
      });
    }

    console.log('✅ Query optimizations configured');
  } catch (error) {
    console.error('⚠️ Query optimization setup failed:', error);
  }
};

/**
 * Optimized aggregation pipelines for common queries
 */
const aggregationPipelines = {
  // Dashboard statistics
  dashboardStats: (dateRange) => {
    const matchStage = dateRange ? {
      $match: {
        invoiceDate: {
          $gte: new Date(dateRange.startDate),
          $lte: new Date(dateRange.endDate)
        }
      }
    } : { $match: {} };

    return [
      matchStage,
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          totalPending: { $sum: '$balance' },
          avgInvoiceValue: { $avg: '$grandTotal' }
        }
      },
      {
        $project: {
          _id: 0,
          totalInvoices: 1,
          totalRevenue: 1,
          totalPaid: 1,
          totalPending: 1,
          avgInvoiceValue: { $round: ['$avgInvoiceValue', 2] },
          collectionRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalPaid', '$totalRevenue'] }, 100] },
              2
            ]
          }
        }
      }
    ];
  },

  // Top customers by revenue
  topCustomers: (limit = 10) => [
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    {
      $unwind: '$customerInfo'
    },
    {
      $group: {
        _id: '$customer',
        customerName: { $first: '$customerInfo.firmName' },
        totalAmount: { $sum: '$grandTotal' },
        invoiceCount: { $sum: 1 },
        lastInvoiceDate: { $max: '$invoiceDate' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: limit
    }
  ],

  // Monthly revenue trend
  monthlyTrend: (months = 12) => [
    {
      $match: {
        invoiceDate: {
          $gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000)
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' }
        },
        revenue: { $sum: '$grandTotal' },
        invoiceCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: '$_id.month' }
          ]
        },
        revenue: 1,
        invoiceCount: 1
      }
    }
  ]
};

/**
 * Query optimization helpers
 */
const queryHelpers = {
  // Optimized pagination
  paginatedFind: (Model, query = {}, options = {}) => {
    const {
      page = 1,
      limit = 25,
      sort = { createdAt: -1 },
      populate = [],
      select = null,
      lean = true
    } = options;

    const skip = (page - 1) * limit;

    let queryBuilder = Model.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate.length > 0) {
      populate.forEach(pop => queryBuilder = queryBuilder.populate(pop));
    }

    if (select) {
      queryBuilder = queryBuilder.select(select);
    }

    if (lean) {
      queryBuilder = queryBuilder.lean();
    }

    return queryBuilder;
  },

  // Optimized search with text indexes
  textSearch: (Model, searchTerm, additionalFilters = {}) => {
    const query = {
      ...additionalFilters,
      $text: { $search: searchTerm }
    };

    return Model.find(query, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .lean();
  }
};

module.exports = {
  createIndexes,
  aggregationPipelines,
  queryHelpers,
  createViews,
  setupQueryOptimizations
};

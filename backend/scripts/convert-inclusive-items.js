// Script to convert existing items stored as Inclusive into canonical Exclusive rates
// Usage: NODE_ENV=production node backend/scripts/convert-inclusive-items.js

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const Item = require('../models/Item')
const normalizeRate = require('../utils/normalizeRate')

dotenv.config()

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gst-invoice'

async function run() {
  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    const items = await Item.find({ priceType: 'Inclusive' })
    console.log(`Found ${items.length} items with priceType Inclusive`)

    let updated = 0
    for (const it of items) {
      const oldRate = it.rate
      const tax = it.taxSlab || 0
      const canonical = normalizeRate({ rate: oldRate, taxSlab: tax, inputType: 'Inclusive' })
      it.rate = canonical
      it.priceType = 'Exclusive'
      await it.save()
      console.log(`Updated ${it._id} ${it.name}: ${oldRate} -> ${canonical}`)
      updated++
    }

    console.log(`Completed. Updated ${updated} items.`)
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

run()

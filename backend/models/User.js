const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['super_admin', 'tenant_admin', 'user'], 
        default: 'user' 
    },
    tenantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tenant',
        required: function() { return this.role !== 'super_admin'; }
    },
    isActive: { type: Boolean, default: true }
});

// Compound index for unique email per tenant
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
// Allow super admin to have unique email without tenant
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { role: 'super_admin' } });

const User = mongoose.model('User', userSchema);
module.exports = User;
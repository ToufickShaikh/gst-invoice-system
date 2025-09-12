const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

const bypassTenantForSuperAdmin = (req, res, next) => {
  if (req.user.role === 'super_admin') {
    req.bypassTenant = true;
  }
  next();
};

module.exports = { requireSuperAdmin, bypassTenantForSuperAdmin };
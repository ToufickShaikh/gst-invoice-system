// GST Verification and Filing Routes - Refactored
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');
const { generateGstReports } = require('../services/gstService');

// --- GST Data Middleware ---
// Fetches all GST reports at once and caches it on the request object.
// This ensures all subsequent routes for the same period use the exact same dataset.
const fetchGstData = async (req, res, next) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ 
            error: 'Missing date range', 
            message: 'Both from and to dates are required' 
        });
    }

    try {
        // Attach the generated reports to the request object
        req.gstReports = await generateGstReports({ from, to });
        next();
    } catch (error) {
        console.error('[GST Middleware] Error generating reports:', error);
        res.status(500).json({ 
            error: 'Failed to generate GST reports',
            message: error.message 
        });
    }
};

// --- GST Filing Routes ---
// All routes use the fetchGstData middleware to get the data.

router.get('/returns/gstr1', fetchGstData, (req, res) => {
    const { gstr1, period } = req.gstReports;
    res.json({ ...gstr1, period });
});

router.get('/returns/gstr3b', fetchGstData, (req, res) => {
    const { gstr3b, period } = req.gstReports;
    res.json({ ...gstr3b, period });
});

router.get('/returns/document-summary', fetchGstData, (req, res) => {
    const { docSummary, period } = req.gstReports;
    res.json({ ...docSummary, period });
});

router.get('/returns/hsn-summary', fetchGstData, (req, res) => {
    const { hsnSummary, period } = req.gstReports;
    res.json({ ...hsnSummary, period });
});


// --- Standalone GST Verification Routes ---

router.get('/verify/:gstin', async (req, res) => {
    try {
        const { gstin } = req.params;
        if (!gstin) {
            return res.status(400).json({ success: false, error: 'GSTIN is required' });
        }
        const result = await verifyAndAutoFillGST(gstin);
        if (!result.success) {
            return res.status(400).json({ verified: false, error: result.error });
        }
        res.json({
            verified: true,
            companyDetails: result.autoFillFields,
            taxType: result.taxInfo
        });
    } catch (error) {
        console.error('[GST API] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error during GST verification' });
    }
});

router.get('/validate/:gstin', (req, res) => {
    try {
        const { gstin } = req.params;
        const validation = validateGSTIN(gstin);
        if (validation.valid) {
            const taxInfo = determineTaxType(validation.stateCode);
            res.json({ ...validation, taxInfo });
        } else {
            res.status(400).json(validation);
        }
    } catch (error) {
        res.status(500).json({ valid: false, error: 'Validation service error' });
    }
});

router.get('/tax-type', (req, res) => {
    try {
        const { fromState, toState } = req.query;
        if (!fromState || !toState) {
            return res.status(400).json({ error: 'Both fromState and toState are required' });
        }
        const taxInfo = determineTaxType(fromState, toState);
        res.json(taxInfo);
    } catch (error) {
        res.status(500).json({ error: 'Tax type determination failed' });
    }
});

module.exports = router;
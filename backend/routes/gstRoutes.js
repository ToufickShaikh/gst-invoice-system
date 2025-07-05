// GST Verification Routes
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');

/**
 * @desc    Verify GSTIN and get auto-fill data
 * @route   POST /api/gst/verify
 * @access  Public
 */
const verifyGSTIN = async (req, res) => {
    try {
        const { gstin } = req.body;

        console.log('[GST API] Verification request for GSTIN:', gstin);

        if (!gstin) {
            return res.status(400).json({
                success: false,
                error: 'GSTIN is required'
            });
        }

        // Perform GST verification and auto-fill
        const result = await verifyAndAutoFillGST(gstin);

        if (!result.success) {
            return res.status(400).json(result);
        }

        console.log('[GST API] Verification successful for:', result.autoFillFields.firmName);
        res.json(result);

    } catch (error) {
        console.error('[GST API] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during GST verification'
        });
    }
};

/**
 * @desc    Quick GSTIN format validation
 * @route   POST /api/gst/validate
 * @access  Public
 */
const quickValidateGSTIN = async (req, res) => {
    try {
        const { gstin } = req.body;

        const validation = validateGSTIN(gstin);

        if (validation.valid) {
            const taxInfo = determineTaxType(validation.stateCode);
            res.json({
                valid: true,
                gstin: validation.gstin,
                stateCode: validation.stateCode,
                stateName: validation.stateName,
                taxInfo: taxInfo
            });
        } else {
            res.status(400).json(validation);
        }

    } catch (error) {
        console.error('[GST API] Validation error:', error);
        res.status(500).json({
            valid: false,
            error: 'Validation service error'
        });
    }
};

// Define routes
router.post('/verify', verifyGSTIN);
router.post('/validate', quickValidateGSTIN);

module.exports = router;

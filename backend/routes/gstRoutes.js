// GST Verification Routes
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');

/**
 * @desc    Verify GSTIN and get auto-fill data
 * @route   GET /api/gst/verify/:gstin
 * @access  Public
 */
const verifyGSTIN = async (req, res) => {
    try {
        const { gstin } = req.params;

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
            return res.status(400).json({
                verified: false,
                error: result.error
            });
        }

        // Format response to match frontend expectations
        const response = {
            verified: true,
            companyDetails: {
                gstin: result.gstin,
                legalName: result.autoFillFields.firmName,
                tradeName: result.autoFillFields.tradeName,
                principalPlaceOfBusiness: result.autoFillFields.firmAddress,
                state: result.autoFillFields.state, // Already formatted as "XX-StateName"
                stateCode: result.autoFillFields.stateCode,
                registrationDate: result.companyDetails?.registrationDate || new Date().toISOString().split('T')[0],
                status: 'Active'
            },
            taxType: result.taxInfo?.type || result.taxInfo
        };

        console.log('[GST API] Sending response to frontend:', JSON.stringify(response, null, 2));
        console.log('[GST API] Verification successful for:', response.companyDetails.legalName);
        res.json(response);

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
 * @route   GET /api/gst/validate/:gstin
 * @access  Public
 */
const quickValidateGSTIN = async (req, res) => {
    try {
        const { gstin } = req.params;

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

/**
 * @desc    Get tax type based on state codes
 * @route   GET /api/gst/tax-type
 * @access  Public
 */
const getTaxType = async (req, res) => {
    try {
        const { companyStateCode, customerStateCode } = req.query;

        if (!companyStateCode || !customerStateCode) {
            return res.status(400).json({
                error: 'Both companyStateCode and customerStateCode are required'
            });
        }

        const taxType = companyStateCode === customerStateCode ? 'CGST_SGST' : 'IGST';

        res.json({
            taxType,
            companyStateCode,
            customerStateCode,
            isInterState: taxType === 'IGST'
        });

    } catch (error) {
        console.error('[GST API] Tax type error:', error);
        res.status(500).json({
            error: 'Tax type determination error'
        });
    }
};

// Define routes
router.get('/verify/:gstin', verifyGSTIN);
router.get('/validate/:gstin', quickValidateGSTIN);
router.get('/tax-type', getTaxType);

module.exports = router;

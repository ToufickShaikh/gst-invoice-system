// GST Verification and Auto-fill Utility
const https = require('https');

// GST State Code Mapping (First 2 digits of GSTIN represent state)
const GST_STATE_CODES = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh'
};

// Company's state code (Tamil Nadu = 33)
const COMPANY_STATE_CODE = '33';

/**
 * Validate GSTIN format
 * Format: 2 digits (state) + 10 alphanumeric + 1 check digit + 1 alpha + 1 numeric
 */
function validateGSTIN(gstin) {
    if (!gstin || typeof gstin !== 'string') {
        return { valid: false, error: 'GSTIN is required' };
    }

    // Remove spaces and convert to uppercase
    gstin = gstin.replace(/\s/g, '').toUpperCase();

    // Check length
    if (gstin.length !== 15) {
        return { valid: false, error: 'GSTIN must be 15 characters long' };
    }

    // Check format using regex
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) {
        return { valid: false, error: 'Invalid GSTIN format' };
    }

    // Extract state code
    const stateCode = gstin.substring(0, 2);
    const stateName = GST_STATE_CODES[stateCode];

    if (!stateName) {
        return { valid: false, error: 'Invalid state code in GSTIN' };
    }

    return {
        valid: true,
        gstin: gstin,
        stateCode: stateCode,
        stateName: stateName
    };
}

/**
 * Determine tax type based on state codes
 * If customer state = company state: CGST + SGST
 * If customer state ≠ company state: IGST
 */
function determineTaxType(customerStateCode) {
    const isInterState = customerStateCode !== COMPANY_STATE_CODE;

    return {
        isInterState: isInterState,
        taxType: isInterState ? 'IGST' : 'CGST+SGST',
        customerStateCode: customerStateCode,
        companyStateCode: COMPANY_STATE_CODE,
        description: isInterState
            ? 'Inter-state transaction - IGST applicable'
            : 'Intra-state transaction - CGST + SGST applicable'
    };
}

/**
 * Verify GSTIN using GST API (mock implementation)
 * In production, you would integrate with actual GST API services
 */
async function verifyGSTINFromAPI(gstin) {
    // This is a mock implementation
    // In production, integrate with services like:
    // - Government GST API
    // - Third-party services like ClearTax, Razorpay, etc.

    return new Promise((resolve) => {
        // Simulate API delay
        setTimeout(() => {
            // Mock response based on GSTIN validation
            const validation = validateGSTIN(gstin);

            if (!validation.valid) {
                resolve({
                    success: false,
                    error: validation.error
                });
                return;
            }

            // Mock company data (in production, this comes from GST API)
            const mockData = {
                success: true,
                data: {
                    gstin: validation.gstin,
                    legalName: `${validation.gstin.substring(2, 7)} PRIVATE LIMITED`,
                    tradeName: `${validation.gstin.substring(2, 7)} ENTERPRISES`,
                    address: {
                        buildingName: 'Mock Building',
                        street: 'Mock Street',
                        location: 'Mock Location',
                        city: 'Mock City',
                        district: 'Mock District',
                        state: validation.stateName,
                        pincode: '600001'
                    },
                    businessType: 'Private Limited Company',
                    registrationDate: '2020-01-01',
                    status: 'Active'
                }
            };

            resolve(mockData);
        }, 1500); // Simulate API response time
    });
}

/**
 * Complete GST verification and auto-fill process
 */
async function verifyAndAutoFillGST(gstin) {
    try {
        console.log('[GST] Starting verification for GSTIN:', gstin);

        // Step 1: Validate GSTIN format
        const validation = validateGSTIN(gstin);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        // Step 2: Determine tax type
        const taxInfo = determineTaxType(validation.stateCode);

        // Step 3: Fetch data from GST API
        const apiResponse = await verifyGSTINFromAPI(gstin);
        if (!apiResponse.success) {
            return {
                success: false,
                error: apiResponse.error
            };
        }

        // Step 4: Prepare auto-fill data
        const autoFillData = {
            success: true,
            gstin: validation.gstin,
            companyDetails: apiResponse.data,
            taxInfo: taxInfo,
            autoFillFields: {
                firmName: apiResponse.data.legalName,
                tradeName: apiResponse.data.tradeName,
                firmAddress: `${apiResponse.data.address.buildingName}, ${apiResponse.data.address.street}, ${apiResponse.data.address.location}`,
                city: apiResponse.data.address.city,
                district: apiResponse.data.address.district,
                state: apiResponse.data.address.state,
                stateCode: validation.stateCode,
                pincode: apiResponse.data.address.pincode,
                businessType: apiResponse.data.businessType
            }
        };

        console.log('[GST] Verification successful:', autoFillData.autoFillFields.firmName);
        return autoFillData;

    } catch (error) {
        console.error('[GST] Verification failed:', error);
        return {
            success: false,
            error: 'GST verification service unavailable'
        };
    }
}

module.exports = {
    validateGSTIN,
    determineTaxType,
    verifyGSTINFromAPI,
    verifyAndAutoFillGST,
    GST_STATE_CODES
};

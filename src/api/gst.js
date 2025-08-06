import axiosInstance from './axiosInstance';

export const gstAPI = {
    // Validate GSTIN format
    validateGSTIN: async (gstin) => {
        const res = await axiosInstance.get(`/gst/validate/${gstin}`);
        return res.data;
    },

    // Verify GSTIN and get company details
    verifyGSTIN: async (gstin) => {
        const res = await axiosInstance.get(`/gst/verify/${gstin}`);
        return res.data;
    },

    // Get tax type based on state codes
    getTaxType: async (companyStateCode, customerStateCode) => {
        const res = await axiosInstance.get(`/gst/tax-type`, {
            params: { companyStateCode, customerStateCode }
        });
        return res.data;
    }
};

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import InputField from './InputField';
import Button from './Button';
import { customersAPI } from '../api/customers';
import { gstAPI } from '../api/gst';

const AddCustomerModal = ({
  isOpen,
  onClose,
  onCustomerAdded,
  customerType = 'B2C',
}) => {
  const [formData, setFormData] = useState({
    customerType,
    name: '',
    firmName: '',
    firmAddress: '',
    contact: '',
    email: '',
    gstNo: '',
    state: '33-Tamil Nadu',
  });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [gstinValidating, setGstinValidating] = useState(false);
  const [gstinValid, setGstinValid] = useState(null);
  const [gstinDetails, setGstinDetails] = useState(null);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, customerType }));
  }, [customerType]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'gstNo' && customerType === 'B2B') {
      if (value.length >= 15) {
        validateAndVerifyGSTIN(value);
      } else {
        setGstinValid(null);
        setGstinDetails(null);
      }
    }
  };

  const validateAndVerifyGSTIN = async (gstin) => {
    setGstinValidating(true);
    setGstinValid(null);
    setGstinDetails(null);

    try {
      const validationResult = await gstAPI.validateGSTIN(gstin);
      if (!validationResult.valid) {
        toast.error(validationResult.error || 'Invalid GSTIN format');
        setGstinValid(false);
        return;
      }

      setGstinValid(true);
      const verificationResult = await gstAPI.verifyGSTIN(gstin);

      if (verificationResult.verified && verificationResult.companyDetails) {
        const { legalName, principalPlaceOfBusiness, state } = verificationResult.companyDetails;
        setGstinDetails(verificationResult.companyDetails);
        setFormData((prev) => ({
          ...prev,
          firmName: legalName || prev.firmName,
          firmAddress: principalPlaceOfBusiness || prev.firmAddress,
          state: state || prev.state,
        }));
        toast.success('GSTIN verified successfully!');
      } else {
        toast.error(verificationResult.error || 'GSTIN verification failed');
      }
    } catch (error) {
      console.error('GSTIN validation error:', error);
      toast.error('Failed to validate GSTIN');
    } finally {
      setGstinValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (customerType === 'B2B') {
      if (!formData.gstNo.trim()) {
        toast.error('GST Number is required for B2B customers');
        return;
      }
      if (!formData.firmName.trim()) {
        toast.error('Firm name is required for B2B customers');
        return;
      }
    } else {
      if (!formData.name.trim()) {
        toast.error('Customer name is required');
        return;
      }
    }

    if (!formData.contact.trim()) {
      toast.error('Contact number is required');
      return;
    }

    setAddingCustomer(true);
    try {
      const response = await customersAPI.create(formData);
      const createdCustomer = response.data || response;
      onCustomerAdded(createdCustomer);
      toast.success('Customer added successfully!');
      onClose();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer. Please try again.');
    } finally {
      setAddingCustomer(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Add Customer"
      className="max-w-lg mx-auto p-6 rounded-lg shadow-lg bg-white"
    >
      <h2 className="text-xl font-semibold mb-4">
        {customerType === 'B2B' ? 'Add B2B Customer' : 'Add B2C Customer'}
      </h2>

      <div className="space-y-4">
        {customerType === 'B2B' && (
          <>
            <InputField
              label="GST Number"
              value={formData.gstNo}
              onChange={(e) => handleChange('gstNo', e.target.value)}
              placeholder="Enter GST number first"
              required
            />
            {gstinValidating && <p>Validating...</p>}
            {gstinDetails && (
              <div className="bg-green-100 p-2 rounded">
                <p>
                  <strong>Firm Name:</strong> {gstinDetails.legalName}
                </p>
                <p>
                  <strong>Address:</strong> {gstinDetails.principalPlaceOfBusiness}
                </p>
              </div>
            )}
            <InputField
              label="Firm Name"
              value={formData.firmName}
              onChange={(e) => handleChange('firmName', e.target.value)}
              placeholder="Enter firm name"
              required
            />
            <InputField
              label="Firm Address"
              value={formData.firmAddress}
              onChange={(e) => handleChange('firmAddress', e.target.value)}
              placeholder="Enter firm address"
              required
            />
          </>
        )}
        {customerType === 'B2C' && (
          <InputField
            label="Customer Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter customer name"
            required
          />
        )}
        <InputField
          label="Contact Number"
          value={formData.contact}
          onChange={(e) => handleChange('contact', e.target.value)}
          placeholder="Enter contact number"
          required
        />
        <InputField
          label="Email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter email address"
          type="email"
        />
        <InputField
          label="PAN Number"
          value={formData.panNo}
          onChange={(e) => handleChange('panNo', e.target.value)}
          placeholder="Enter PAN number (optional)"
        />
        <InputField
          label="Billing Address"
          value={formData.billingAddress}
          onChange={(e) => handleChange('billingAddress', e.target.value)}
          placeholder="Enter billing address"
        />
        <InputField
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any internal notes about the customer"
          isTextArea
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select state</option>
            <option value="01-Jammu and Kashmir">01 - Jammu and Kashmir</option>
            <option value="02-Himachal Pradesh">02 - Himachal Pradesh</option>
            <option value="03-Punjab">03 - Punjab</option>
            <option value="04-Chandigarh">04 - Chandigarh</option>
            <option value="05-Uttarakhand">05 - Uttarakhand</option>
            <option value="06-Haryana">06 - Haryana</option>
            <option value="07-Delhi">07 - Delhi</option>
            <option value="08-Rajasthan">08 - Rajasthan</option>
            <option value="09-Uttar Pradesh">09 - Uttar Pradesh</option>
            <option value="10-Bihar">10 - Bihar</option>
            <option value="11-Sikkim">11 - Sikkim</option>
            <option value="12-Arunachal Pradesh">12 - Arunachal Pradesh</option>
            <option value="13-Nagaland">13 - Nagaland</option>
            <option value="14-Manipur">14 - Manipur</option>
            <option value="15-Mizoram">15 - Mizoram</option>
            <option value="16-Tripura">16 - Tripura</option>
            <option value="17-Meghalaya">17 - Meghalaya</option>
            <option value="18-Assam">18 - Assam</option>
            <option value="19-West Bengal">19 - West Bengal</option>
            <option value="20-Jharkhand">20 - Jharkhand</option>
            <option value="21-Odisha">21 - Odisha</option>
            <option value="22-Chhattisgarh">22 - Chhattisgarh</option>
            <option value="23-Madhya Pradesh">23 - Madhya Pradesh</option>
            <option value="24-Gujarat">24 -. Gujarat</option>
            <option value="25-Daman and Diu">25 - Daman and Diu</option>
            <option value="26-Dadra and Nagar Haveli">26 - Dadra and Nagar Haveli</option>
            <option value="27-Maharashtra">27 - Maharashtra</option>
            <option value="28-Andhra Pradesh">28 - Andhra Pradesh</option>
            <option value="29-Karnataka">29 - Karnataka</option>
            <option value="30-Goa">30 - Goa</option>
            <option value="31-Lakshadweep">31 - Lakshadweep</option>
            <option value="32-Kerala">32 - Kerala</option>
            <option value="33-Tamil Nadu">33 - Tamil Nadu</option>
            <option value="34-Puducherry">34 - Puducherry</option>
            <option value="35-Andaman and Nicobar Islands">35 - Andaman and Nicobar Islands</option>
            <option value="36-Telangana">36 - Telangana</option>
            <option value="37-Ladakh">37 - Ladakh</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button onClick={onClose} variant="outline" size="sm">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="sm"
          loading={addingCustomer}
        >
          Add Customer
        </Button>
      </div>
    </Modal>
  );
};

export default AddCustomerModal;

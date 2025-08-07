import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import InputField from './InputField';
import Button from './Button';
import { suppliersAPI } from '../api/suppliers';

const AddSupplierModal = ({
  isOpen,
  onClose,
  onSupplierAdded,
  editingSupplier,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    panNo: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name || '',
        contactPerson: editingSupplier.contactPerson || '',
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        address: editingSupplier.address || '',
        gstin: editingSupplier.gstin || '',
        panNo: editingSupplier.panNo || '',
        notes: editingSupplier.notes || '',
      });
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        gstin: '',
        panNo: '',
        notes: '',
      });
    }
  }, [editingSupplier]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Supplier Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier._id, formData);
        toast.success('Supplier updated successfully!');
      } else {
        await suppliersAPI.create(formData);
        toast.success('Supplier added successfully!');
      }
      onSupplierAdded();
      onClose();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(error.response?.data?.message || 'Failed to save supplier. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentLabel={editingSupplier ? "Edit Supplier" : "Add Supplier"}
      className="max-w-lg mx-auto p-6 rounded-lg shadow-lg bg-white"
    >
      <h2 className="text-xl font-semibold mb-4">
        {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
      </h2>

      <div className="space-y-4">
        <InputField
          label="Supplier Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter supplier name"
          required
        />
        <InputField
          label="Contact Person"
          value={formData.contactPerson}
          onChange={(e) => handleChange('contactPerson', e.target.value)}
          placeholder="Enter contact person's name"
        />
        <InputField
          label="Email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter email address"
          type="email"
        />
        <InputField
          label="Phone"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="Enter phone number"
          type="tel"
        />
        <InputField
          label="Address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Enter full address"
          isTextArea
        />
        <InputField
          label="GSTIN"
          value={formData.gstin}
          onChange={(e) => handleChange('gstin', e.target.value)}
          placeholder="Enter GSTIN (optional)"
        />
        <InputField
          label="PAN No."
          value={formData.panNo}
          onChange={(e) => handleChange('panNo', e.target.value)}
          placeholder="Enter PAN number (optional)"
        />
        <InputField
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any internal notes about this supplier"
          isTextArea
        />
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button onClick={onClose} variant="outline" size="sm">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="sm"
          loading={isSubmitting}
        >
          {editingSupplier ? "Update Supplier" : "Add Supplier"}
        </Button>
      </div>
    </Modal>
  );
};

export default AddSupplierModal;

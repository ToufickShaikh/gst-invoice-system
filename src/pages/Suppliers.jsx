import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { suppliersAPI } from '../api/suppliers';
import AddSupplierModal from '../components/AddSupplierModal';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const columns = [
    { key: 'name', label: 'Supplier Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'panNo', label: 'PAN No.' },
  ];

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(Array.isArray(response) ? response : []);
    } catch (error) {
      setSuppliers([]);
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSupplierAdded = () => {
    fetchSuppliers(); // Re-fetch to ensure data is in sync
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async (supplier) => {
    if (window.confirm(`Are you sure you want to delete supplier ${supplier.name}?`)) {
      try {
        await suppliersAPI.delete(supplier._id);
        toast.success('Supplier deleted successfully!');
        fetchSuppliers();
      } catch (error) {
        toast.error('Failed to delete supplier.');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (supplier.email && supplier.email.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (supplier.phone && supplier.phone.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (supplier.address && supplier.address.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (supplier.gstin && supplier.gstin.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (supplier.panNo && supplier.panNo.toLowerCase().includes(lowerCaseSearchTerm))
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <div className="flex gap-3">
            <Button onClick={() => setIsModalOpen(true)}>
              Add Supplier
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <InputField
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={filteredSuppliers}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        <AddSupplierModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSupplierAdded={handleSupplierAdded}
          editingSupplier={editingSupplier}
        />
      </div>
    </Layout>
  );
};

export default Suppliers;

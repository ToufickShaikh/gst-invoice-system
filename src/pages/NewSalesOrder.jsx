import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';

const NewSalesOrder = () => {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    items: [],
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, itemsRes] = await Promise.all([
          customersAPI.getAll(),
          itemsAPI.getAll(),
        ]);
        setCustomers(customersRes.data || []);
        // Map quantityInStock to stock for consistency and filter out null items
        const itemsData = Array.isArray(itemsRes.data) 
          ? itemsRes.data 
          : (Array.isArray(itemsRes) ? itemsRes : []);
        
        const itemsWithStock = itemsData
          .filter(item => item != null) // Filter out null/undefined items
          .map(item => ({
            ...item,
            stock: item.quantityInStock ?? 0
          }));
        setItems(itemsWithStock);
      } catch (error) {
        console.error('Error fetching data:', error);
        setCustomers([]);
        setItems([]);
        toast.error('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: '', quantity: 1, rate: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if all items exist in inventory
      for (const orderItem of formData.items) {
        const found = items.find(i => i && i._id === orderItem.item);
        if (!found) {
          toast.error('Selected item does not exist in inventory');
          return;
        }
        const availableStock = found.stock ?? 0;
        if (orderItem.quantity > availableStock) {
          toast.error(`Not enough stock for ${found.name || 'item'}. Available: ${availableStock}`);
          return;
        }
      }
      await billingAPI.createSalesOrder(formData);
      // Reduce stock for each item sold using the new stock API
      for (const orderItem of formData.items) {
        try {
          await itemsAPI.updateStock(orderItem.item, -parseInt(orderItem.quantity));
        } catch (stockError) {
          console.warn('Failed to update stock for item:', orderItem.item, stockError);
        }
      }
      toast.success('Sales order created successfully');
    } catch (error) {
      toast.error('Failed to create sales order');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Sales Order</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <InputField
              label="Customer"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              required
              as="select"
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </InputField>
            <div>
              <h3 className="text-lg font-medium">Items</h3>
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-4 items-center mt-2">
                  <InputField
                    label="Item"
                    value={item.item}
                    onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                    required
                    as="select"
                  >
                    <option value="">Select an item</option>
                    {items.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </InputField>
                  <InputField
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', e.target.value)
                    }
                    required
                  />
                  <InputField
                    label="Rate"
                    type="number"
                    value={item.rate}
                    onChange={(e) =>
                      handleItemChange(index, 'rate', e.target.value)
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleRemoveItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={handleAddItem} className="mt-2">
                Add Item
              </Button>
              <p className="text-xs text-gray-500 mt-2">Only existing items can be selected. To add new items, go to the Items or Purchases page.</p>
            </div>
            <InputField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              as="textarea"
            />
          </div>
          <div className="flex justify-end mt-6">
            <Button type="submit" variant="primary">
              Create Sales Order
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewSalesOrder;

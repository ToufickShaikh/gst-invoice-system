// Controller for item CRUD operations
const Item = require('../models/Item.js');

// Get all items
const getItems = async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new item
const createItem = async (req, res) => {
    try {
        const item = new Item(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error creating item' });
    }
};

// Update an existing item by ID
const updateItem = async (req, res) => {
    try {
        const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error updating item' });
    }
};

// Delete an item by ID
const deleteItem = async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getItems,
    createItem,
    updateItem,
    deleteItem,
};
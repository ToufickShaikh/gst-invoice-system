const express = require('express');
const { getItems, createItem, updateItem, deleteItem, updateStock } = require('../controllers/itemController.js');
// Auth removed — routes are public
const router = express.Router();

router.route('/')
    .get(getItems)
    .post(createItem);

router.route('/:id')
    .get(getItems)
    .put(updateItem)
    .delete(deleteItem);

// Stock update route
router.route('/:id/stock')
    .patch(updateStock);

module.exports = router;
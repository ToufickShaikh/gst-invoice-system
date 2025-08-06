const express = require('express');
const { getItems, createItem, updateItem, deleteItem } = require('../controllers/itemController.js');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all item routes
router.use(protect);

router.route('/')
    .get(getItems)
    .post(createItem);

router.route('/:id')
    .get(getItems)
    .put(updateItem)
    .delete(deleteItem);

module.exports = router;
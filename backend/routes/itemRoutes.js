import express from 'express';
import { getItems, createItem, updateItem, deleteItem } from '../controllers/itemController.js';

const router = express.Router();

router.get('/', getItems);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;
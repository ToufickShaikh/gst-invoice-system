import express from 'express';
import { createInvoice } from '../controllers/billingController.js';

const router = express.Router();

router.post('/invoices', createInvoice);

export default router;
const express = require('express');
const router = express.Router();
// Auth removed — routes are public
const controller = require('../controllers/cashDrawerController');

router.get('/', controller.getStatus);
router.post('/adjust', controller.adjustCash);
router.post('/record-sale', controller.recordSaleCash);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/cashDrawerController');

router.use(protect);

router.get('/', controller.getStatus);
router.post('/adjust', controller.adjustCash);
router.post('/record-sale', controller.recordSaleCash);

module.exports = router;

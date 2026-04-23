'use strict';

const express = require('express');
const router = express.Router();
const { getReport, getDashboard } = require('../controllers/reportController');
const { resolveSchool } = require('../middleware/schoolContext');

router.use(resolveSchool);

router.get('/dashboard', getDashboard);
router.get('/', getReport);

module.exports = router;

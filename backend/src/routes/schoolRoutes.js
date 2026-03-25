'use strict';

const express = require('express');
const router = express.Router();
const {
  createSchool,
  getAllSchools,
  getSchool,
  updateSchool,
  deactivateSchool,
} = require('../controllers/schoolController');
const { requireAdminAuth } = require('../middleware/auth');

// Public read endpoints
router.get('/',                 getAllSchools);
router.get('/:schoolSlug',      getSchool);

// Admin-only write endpoints — require JWT auth
router.post('/',                requireAdminAuth, createSchool);
router.patch('/:schoolSlug',    requireAdminAuth, updateSchool);
router.delete('/:schoolSlug',   requireAdminAuth, deactivateSchool);

module.exports = router;

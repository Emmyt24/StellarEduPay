'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  registerStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getPaymentSummary,
  bulkImportStudents,
  getOverdueStudents,
} = require('../controllers/studentController');
const { validateRegisterStudent, validateStudentIdParam } = require('../middleware/validate');
const { resolveSchool } = require('../middleware/schoolContext');
const { requireAdminAuth } = require('../middleware/auth');
const { auditContext } = require('../middleware/auditContext');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(resolveSchool);

// Admin-only routes
router.post('/',          requireAdminAuth, auditContext, validateRegisterStudent, registerStudent);
router.post('/bulk',      requireAdminAuth, auditContext, upload.single('file'),   bulkImportStudents);
router.get('/',           requireAdminAuth, getAllStudents);

// Public routes
router.get('/summary',    getPaymentSummary);
router.get('/overdue',    getOverdueStudents);
router.get('/:studentId',    validateStudentIdParam, getStudent);
router.put('/:studentId',    requireAdminAuth, auditContext, validateStudentIdParam, updateStudent);
router.delete('/:studentId', requireAdminAuth, auditContext, validateStudentIdParam, deleteStudent);

module.exports = router;

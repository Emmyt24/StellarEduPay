'use strict';

/**
 * Validation Middleware — validate.js
 * ------------------------------------
 * Central module for all Express request validation.
 *
 * Architecture:
 *   - `validate(schema, source)` is a generic Joi-based factory that returns
 *     an Express middleware.  Any Joi schema can be plugged in.
 *   - Payment-specific schemas live in `./schemas/paymentSchemas.js`.
 *   - Manual validators (students, fees, params) are kept as-is for
 *     backward compatibility with their existing routes.
 *
 * Error format on validation failure (HTTP 400):
 *   {
 *     "errors": [
 *       { "field": "studentId", "message": "\"studentId\" must be a valid MongoDB ObjectId (24-char hex)" }
 *     ]
 *   }
 */

const Joi = require('joi');

const {
  createPaymentIntentSchema,
  submitTransactionSchema,
  verifyPaymentSchema,
} = require('./schemas/paymentSchemas');

// ── Generic Joi factory ───────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates `req[source]` against `schema`.
 *
 * @param {Joi.ObjectSchema} schema  - Joi schema to validate against.
 * @param {'body'|'query'|'params'} [source='body'] - Which request property to validate.
 * @returns {Function} Express middleware function.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,  // collect ALL errors, not just the first
      convert:    true,   // allow Joi to coerce types (e.g. string '24' -> number 24)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field:   detail.context?.key || detail.path.join('.') || 'unknown',
        message: detail.message,
      }));
      return res.status(400).json({ errors });
    }

    // Replace req[source] with the Joi-sanitised value (trimmed strings, coerced types, etc.)
    req[source] = value;
    return next();
  };
}

// ── Payment validators (Joi-based) ────────────────────────────────────────────

/** POST /api/payments/intent */
const validateCreatePaymentIntent = validate(createPaymentIntentSchema, 'body');

/** POST /api/payments/submit */
const validateSubmitTransaction = validate(submitTransactionSchema, 'body');

/** POST /api/payments/verify */
const validateVerifyPayment = validate(verifyPaymentSchema, 'body');

// ── Student validators (manual — kept for backward compatibility) ─────────────

// Alphanumeric student IDs used in URL params, 3–20 chars
const STUDENT_ID_RE = /^[A-Za-z0-9_-]{3,20}$/;

function validStudentId(id) {
  return typeof id === 'string' && STUDENT_ID_RE.test(id);
}

function validPositiveNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0;
}

/** Middleware: validate :studentId URL param */
function validateStudentIdParam(req, res, next) {
  if (!validStudentId(req.params.studentId)) {
    return res.status(400).json({ errors: [{ field: 'studentId', message: 'Invalid studentId format' }] });
  }
  return next();
}

/** Middleware: validate POST /api/students body */
function validateRegisterStudent(req, res, next) {
  const { studentId, name, class: className } = req.body;
  const errors = [];

  if (!validStudentId(studentId))                            errors.push('studentId must be 3–20 alphanumeric characters');
  if (!name || typeof name !== 'string' || !name.trim())    errors.push('name is required');
  if (studentId != null && !validStudentId(studentId)) errors.push('studentId must be 3–20 alphanumeric characters');
  if (!name || typeof name !== 'string' || !name.trim()) errors.push('name is required');
  if (!className || typeof className !== 'string' || !className.trim()) errors.push('class is required');
  if (req.body.feeAmount != null && !validPositiveNumber(req.body.feeAmount)) {
    errors.push('feeAmount must be a positive number');
  }

  if (errors.length) return res.status(400).json({ errors });
  return next();
}

/** Middleware: validate POST /api/fees body */
function validateFeeStructure(req, res, next) {
  const { className, feeAmount } = req.body;
  const errors = [];

  if (!className || typeof className !== 'string' || !className.trim()) errors.push('className is required');
  if (!validPositiveNumber(feeAmount)) errors.push('feeAmount must be a positive number');

  if (errors.length) return res.status(400).json({ errors });
  return next();
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Factory (for future custom validators)
  validate,

  // Payment validators (Joi)
  validateCreatePaymentIntent,
  validateSubmitTransaction,
  validateVerifyPayment,

  // Student / fee validators (manual, backward-compatible)
  validateStudentIdParam,
  validateRegisterStudent,
  validateFeeStructure,
};

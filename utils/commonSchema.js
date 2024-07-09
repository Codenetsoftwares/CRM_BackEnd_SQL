import { body } from 'express-validator';

export const validateAdminCreate = [
  body('firstname').notEmpty().withMessage('First Name is required'),
  body('lastname').notEmpty().withMessage('Last Name is required'),
  body('userName').notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('roles')
    .notEmpty()
    .withMessage('Roles are required')
    .isArray({ min: 1 })
    .withMessage('Roles must be provided as an array and must contain at least one role'),
];

export const validateIntroducerCreate = [
  body('firstname').notEmpty().withMessage('Firstname is required'),
  body('lastname').notEmpty().withMessage('Lastname is required'),
  body('userName').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const validateCreateUser = [
  body('firstname').notEmpty().withMessage('First name is required'),
  body('lastname').notEmpty().withMessage('Last name is required'),
  body('userName').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('contactNumber').optional().isNumeric().withMessage('Contact number must be numeric'),
]
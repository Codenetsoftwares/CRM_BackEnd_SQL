import { body, param, query, checkSchema } from 'express-validator';

export const validateAdminCreate = [
  body('firstName').notEmpty().withMessage('First Name is required'),
  body('lastName').notEmpty().withMessage('Last Name is required'),
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

export const validateDeleteBankRequest = [
  param('bankId').notEmpty().withMessage('bank_id is required').isString().withMessage('bank_id must be a string'),
];

export const validateDeleteSubAdmin = [
  param('bankId').notEmpty().withMessage('bankId is required').isString().withMessage('bankId must be a string'),
  param('subAdminId').notEmpty().withMessage('subAdminId is required').isString().withMessage('subAdminId must be a string'),
];

export const validateDeleteBankTransaction = [
  body('requestId').isString().notEmpty().withMessage('Request ID is required and should be a string'),
];

export const validates = [
  param('editId').notEmpty().withMessage('Edit_ID is required').isInt().withMessage('Edit_ID must be an integer'),
];

export const deleteWebsiteTransactionValidate = [
    body('requestId').trim().notEmpty().withMessage('Request ID is required').isUUID().withMessage('Invalid Request ID format'),
];

export const validateMoveToTrash = [
    param('editId').notEmpty().withMessage('edit_Id is required').isUUID(4).withMessage('edit_Id must be a valid UUID v4'),
];

export const validateDeleteTransaction = [
  body('requestId').notEmpty().withMessage('requestId is required').isUUID(4).withMessage('requestId must be a valid UUID v4'),
];

export const validateDeleteIntroducerTransaction = [
  body('requestId').notEmpty().withMessage('requestId is required').isUUID(4).withMessage('requestId must be a valid UUID v4'),
];

export const validateDeleteTransactionWithId = [
  param('editId').notEmpty().withMessage('Edit_ID is required').isUUID(4).withMessage('Edit_ID must be a valid UUID v4'),
];

export const validateDeleteIntroducerTransactionWithId = [
  param('IntroEditId').notEmpty().withMessage('IntroEditId is required').isUUID(4).withMessage('IntroEditID must be a valid UUID v4'),
];

export const validationDeleteBankRequest = [
  body('requestId').notEmpty().withMessage('Request ID is required').isUUID(4).withMessage('Request ID must be a valid UUID v4'),
];

export const validateDeleteBank = [
  param('bankId').notEmpty().withMessage('Bank ID is required').isUUID(4).withMessage('Bank ID must be a valid UUID v4'),
];

export const validateSaveWebsiteRequest = [
  body('requestId').notEmpty().withMessage('Request ID is required').isUUID(4).withMessage('Request ID must be a valid UUID v4'),
];

export const validateDeleteWebsite = [
  param('websiteId').notEmpty().withMessage('Website ID is required').isUUID(4).withMessage('Website ID must be a valid UUID v4'),
];

export const validateRejectBankDetail = [
  param('bankId').notEmpty().withMessage('Bank ID is required').isUUID(4).withMessage('Bank ID must be a valid UUID v4'),
];

export const validateRejectWebsiteDetail = [
  param('websiteId').notEmpty().withMessage('Website ID is required').isUUID(4).withMessage('Website ID must be a valid UUID v4'),
];

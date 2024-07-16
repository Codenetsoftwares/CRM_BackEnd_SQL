import { body, param } from 'express-validator';

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

export const validateIntroducerCreate = [
  body('firstName').notEmpty().withMessage('firstName is required'),
  body('lastName').notEmpty().withMessage('lastName is required'),
  body('userName').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const validateCreateUser = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('userName').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('contactNumber').optional().isNumeric().withMessage('Contact number must be numeric'),
]

export const validateResetPassword = [
  body('userName').notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')

];

export const validateLogin = [
  body('userName').notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')

];

export const updateUserProfileValidationSchema = [
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isString().withMessage('First name must be a string')
    .isLength({ max: 50 }).withMessage('First name must be at most 50 characters long'),

  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isString().withMessage('Last name must be a string')
    .isLength({ max: 50 }).withMessage('Last name must be at most 50 characters long'),

  body('introducerPercentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Introducer percentage must be a number between 0 and 100'),

  body('introducerPercentage1')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Introducer percentage 1 must be a number between 0 and 100'),

  body('introducerPercentage2')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Introducer percentage 2 must be a number between 0 and 100')
];

export const updateIntroducerValidationSchema = [
  param('introId')
    .notEmpty().withMessage('Introducer ID is required')
    .isUUID().withMessage('Introducer ID must be a valid UUID'),

  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isString().withMessage('First name must be a string')
    .isLength({ max: 50 }).withMessage('First name must be at most 50 characters long'),

  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isString().withMessage('Last name must be a string')
    .isLength({ max: 50 }).withMessage('Last name must be at most 50 characters long'),
];

export const validateEditSubAdminRoles = [
  param('adminId')
    .notEmpty().withMessage('SubAdmin ID is required')
    .isUUID().withMessage('Introducer ID must be a valid UUID'),
  body('roles')
    .notEmpty().withMessage('Roles are required')
    .isArray({ min: 1 }).withMessage('Roles must be provided as an array and must contain at least one role')
];

export const createIntroducerDepositTransactionValidator = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),

  body('transactionType')
    .notEmpty().withMessage('Transaction type is required')
    .isIn(['Deposit']).withMessage('Transaction type must be "Deposit"'),

  body('remarks')
    .optional().isString().withMessage('Remarks must be a string'),

  body('introducerUserName')
    .notEmpty().withMessage('Introducer user name is required')
    .isString().withMessage('Introducer user name must be a string'),
];

export const createIntroducerWithdrawalTransactionValidator = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),

  body('transactionType')
    .notEmpty().withMessage('Transaction type is required')
    .isIn(['Withdraw']).withMessage('Transaction type must be "Withdraw"'),

  body('remarks')
    .optional().isString().withMessage('Remarks must be a string'),

  body('introducerUserName')
    .notEmpty().withMessage('Introducer user name is required')
    .isString().withMessage('Introducer user name must be a string'),
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
  param('editId').notEmpty().withMessage('editId is required').isInt().withMessage('editId must be an integer'),
];

export const deleteWebsiteTransactionValidate = [
  body('requestId').trim().notEmpty().withMessage('Request ID is required').isUUID().withMessage('Invalid Request ID format'),
];

export const validateMoveToTrash = [
  param('editId').notEmpty().withMessage('editId is required').isUUID(4).withMessage('editId must be a valid UUID v4'),
];

export const validateDeleteTransaction = [
  body('requestId').notEmpty().withMessage('requestId is required').isUUID(4).withMessage('requestId must be a valid UUID v4'),
];

export const validateDeleteIntroducerTransaction = [
  body('requestId').notEmpty().withMessage('requestId is required').isUUID(4).withMessage('requestId must be a valid UUID v4'),
];

export const validateDeleteTransactionWithId = [
  param('editId').notEmpty().withMessage('editId is required').isUUID(4).withMessage('editId must be a valid UUID v4'),
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

export const validatePasswordReset = [
  body('userName')
    .notEmpty().withMessage('Username is required')
    .isString().withMessage('Username must be a string'),

  body('oldPassword')
    .notEmpty().withMessage('Old password is required')
    .isString().withMessage('Old password must be a string'),

  body('password')
    .notEmpty().withMessage('New password is required')
    .isString().withMessage('New password must be a string')
];

export const validateUserId = [
  param('userId').notEmpty().withMessage('User ID is required').isUUID(4).withMessage('User ID is not valid'),
];

export const validateSubAdminId = [
  param('subAdminId').notEmpty().withMessage('SubAdmin ID is required').isUUID(4).withMessage('SubAdmin ID is not valid'),
];

export const validateApproval = [
  param('websiteId').notEmpty().withMessage('Website ID must be provided'),
  body('isApproved').isBoolean().withMessage('isApproved must be a boolean'),
  body('subAdmins').isArray().withMessage('subAdmins must be an array'),
];

export const update = [
  param('adminId')
    .notEmpty().withMessage('Admin Id is required'),

  body('firstName')
    .if(body('firstName').exists()) // Check if firstName exists in the request body
    .notEmpty().withMessage('First name is required')
    .isString().withMessage('First name must be a string'),

  body('lastName')
    .if(body('lastName').exists()) // Check if lastName exists in the request body
    .notEmpty().withMessage('Last name is required')
    .isString().withMessage('Last name must be a string')
];

export const updateUserProfileValidators = [
  param('userId')
    .notEmpty().withMessage('User Id is required')
    .isUUID(4).withMessage('User Id is not valid'),

  body('firstName')
    .optional({ nullable: true })
    .isString().withMessage('First name must be a string'),

  body('lastName')
    .optional({ nullable: true })
    .isString().withMessage('Last name must be a string'),

  body('introducersUserName')
    .optional({ nullable: true })
    .isString().withMessage('Introducer user name must be a string'),

  body('introducerPercentage')
    .notEmpty().withMessage('introducerPercentage is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Introducer percentage must be a number between 0 and 100'),

  body('introducersUserName1')
    .optional({ nullable: true })
    .isString().withMessage('Introducer user name must be a string'),

  body('introducerPercentage1')
    .notEmpty().withMessage('introducerPercentage1 is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Introducer percentage must be a number between 0 and 100'),

  body('introducersUserName2')
    .optional({ nullable: true })
    .isString().withMessage('Introducer user name must be a string'),

  body('introducerPercentage2')
    .notEmpty().withMessage('introducerPercentage2 is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Introducer percentage must be a number between 0 and 100'),
];

export const validateWebsite = [
  body('websiteName')
    .trim()
    .notEmpty().withMessage('Website name is required')
    .isString().withMessage('Website name must be a string'),
];
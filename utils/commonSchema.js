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
  body('password').notEmpty().withMessage('Password is required'),
];

export const validateCreateUser = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('userName').notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('contactNumber').optional().isNumeric().withMessage('Contact number must be numeric'),
];

export const validateResetPassword = [
  body('userName').notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

export const validateLogin = [
  body('userName')
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .withMessage('Username must be a string'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .isString()
    .withMessage('Password must be a string'),
];

export const updateUserProfileValidationSchema = [
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isString()
    .withMessage('First name must be a string')
    .isLength({ max: 50 })
    .withMessage('First name must be at most 50 characters long'),

  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isString()
    .withMessage('Last name must be a string')
    .isLength({ max: 50 })
    .withMessage('Last name must be at most 50 characters long'),

  body('introducerPercentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Introducer percentage must be a number between 0 and 100'),

  body('introducerPercentage1')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Introducer percentage 1 must be a number between 0 and 100'),

  body('introducerPercentage2')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Introducer percentage 2 must be a number between 0 and 100'),
];

export const updateIntroducerValidationSchema = [
  param('introId')
    .notEmpty()
    .withMessage('Introducer ID is required')
    .isUUID()
    .withMessage('Introducer ID must be a valid UUID'),

  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isString()
    .withMessage('First name must be a string')
    .isLength({ max: 50 })
    .withMessage('First name must be at most 50 characters long'),

  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isString()
    .withMessage('Last name must be a string')
    .isLength({ max: 50 })
    .withMessage('Last name must be at most 50 characters long'),
];

export const validateEditSubAdminRoles = [
  param('adminId')
    .notEmpty()
    .withMessage('SubAdmin ID is required')
    .isUUID()
    .withMessage('Introducer ID must be a valid UUID'),
  body('roles')
    .notEmpty()
    .withMessage('Roles are required')
    .isArray({ min: 1 })
    .withMessage('Roles must be provided as an array and must contain at least one role'),
];

export const createIntroducerDepositTransactionValidator = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),

  body('transactionType')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['Deposit'])
    .withMessage('Transaction type must be "Deposit"'),

  body('remarks').optional().isString().withMessage('Remarks must be a string'),

  body('introducerUserName')
    .notEmpty()
    .withMessage('Introducer user name is required')
    .isString()
    .withMessage('Introducer user name must be a string'),
];

export const createIntroducerWithdrawalTransactionValidator = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),

  body('transactionType')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['Withdraw'])
    .withMessage('Transaction type must be "Withdraw"'),

  body('remarks').optional().isString().withMessage('Remarks must be a string'),

  body('introducerUserName')
    .notEmpty()
    .withMessage('Introducer user name is required')
    .isString()
    .withMessage('Introducer user name must be a string'),
];

export const validateDeleteBankRequest = [
  param('bankId').notEmpty().withMessage('bankId is required').isString().withMessage('bankId must be a string'),
];

export const validateDeleteSubAdmin = [
  param('bankId').notEmpty().withMessage('bankId is required').isString().withMessage('bankId must be a string'),
  param('subAdminId')
    .notEmpty()
    .withMessage('subAdminId is required')
    .isString()
    .withMessage('subAdminId must be a string'),
];

export const validateDeleteBankTransaction = [
  body('requestId').isString().notEmpty().withMessage('Request ID is required and should be a string'),
];

export const validates = [
  param('editId').notEmpty().withMessage('editId is required').isString().withMessage('editId must be a string'),
];

export const deleteWebsiteTransactionValidate = [
  body('requestId')
    .trim()
    .notEmpty()
    .withMessage('Request ID is required')
    .isUUID()
    .withMessage('Invalid Request ID format'),
];

export const validateMoveToTrash = [
  param('editId').notEmpty().withMessage('editId is required').isUUID(4).withMessage('editId must be a valid UUID v4'),
];

export const validateDeleteTransaction = [
  body('requestId')
    .notEmpty()
    .withMessage('requestId is required')
    .isUUID(4)
    .withMessage('requestId must be a valid UUID v4'),
];

export const validateDeleteIntroducerTransaction = [
  body('requestId')
    .notEmpty()
    .withMessage('requestId is required')
    .isUUID(4)
    .withMessage('requestId must be a valid UUID v4'),
];

export const validateDeleteTransactionWithId = [
  param('editId').notEmpty().withMessage('editId is required').isUUID(4).withMessage('editId must be a valid UUID v4'),
];

export const validateDeleteIntroducerTransactionWithId = [
  param('IntroEditId')
    .notEmpty()
    .withMessage('IntroEditId is required')
    .isUUID(4)
    .withMessage('IntroEditID must be a valid UUID v4'),
];

export const validationDeleteBankRequest = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isUUID(4)
    .withMessage('Request ID must be a valid UUID v4'),
];

export const validateDeleteBank = [
  param('bankId')
    .notEmpty()
    .withMessage('Bank ID is required')
    .isUUID(4)
    .withMessage('Bank ID must be a valid UUID v4'),
];

export const validateSaveWebsiteRequest = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isUUID(4)
    .withMessage('Request ID must be a valid UUID v4'),
];

export const validateDeleteWebsite = [
  param('websiteId')
    .notEmpty()
    .withMessage('Website ID is required')
    .isUUID(4)
    .withMessage('Website ID must be a valid UUID v4'),
];

export const validateRejectBankDetail = [
  param('bankId')
    .notEmpty()
    .withMessage('Bank ID is required')
    .isUUID(4)
    .withMessage('Bank ID must be a valid UUID v4'),
];

export const validateRejectWebsiteDetail = [
  param('websiteId')
    .notEmpty()
    .withMessage('Website ID is required')
    .isUUID(4)
    .withMessage('Website ID must be a valid UUID v4'),
];

export const validateBankId = [
  param('bank_id').notEmpty().withMessage('Bank Id is required').isString().withMessage('Bank Id must be a string'),
];

export const validateWebsiteId = [
  param('websiteId')
    .notEmpty()
    .withMessage('Website Id is required')
    .isString()
    .withMessage('Website Id must be a string'),
];

export const validateTransactionId = [
  param('Transaction_Id')
    .exists()
    .withMessage('Transaction ID is required')
    .isString()
    .withMessage('Website Id must be a string'),
];

export const validateIntroTransactionId = [
  param('introTransactionId')
    .exists()
    .withMessage('Introducer Transaction ID is required')
    .isString()
    .withMessage('Introducer Transaction ID must be a string'),
];

export const validateIntroEditID = [
  param('IntroEditID')
    .exists()
    .withMessage('Intro Edit ID is required')
    .isString()
    .withMessage('Intro Edit ID must be a string'),
];

export const validateDeleteRequest = [
  param('editId')
    .notEmpty()
    .withMessage('editId parameter cannot be empty')
    .isString()
    .withMessage('Edit ID must be a string'),
];

export const validateIdParam = [
  param('_id').notEmpty().withMessage('_id parameter cannot be empty').isString().withMessage('_id must be a string'),
];

export const validateBankUpdate = [
  body('accountHolderName').notEmpty().withMessage('Account Holder Name is required').isString().withMessage('Account Holder Name must be a string'),
  body('bankName').notEmpty().withMessage('Bank Name is required').isString().withMessage('Bank Name Name must be a string'),
  body('accountNumber').isNumeric().withMessage('Account Number must be a number'),
  body('ifscCode').notEmpty().withMessage('IFSC Code is required').isString().withMessage('IFSC Code must be a string'),
  body('upiId').optional().isString().withMessage('UPI ID must be a string'),
  body('upiAppName').optional().isString().withMessage('UPI App Name must be a string'),
  body('upiNumber').optional().isString().withMessage('UPI Number must be a string'),
];


export const approveBankDetailEditRequestValidator = [
  body('isApproved').isBoolean().withMessage('isApproved field must be a boolean value'),
];

export const validateUpdateWebsite = [
  param('website_id')
    .notEmpty()
    .withMessage('Website ID is required')
    .isUUID()
    .withMessage('Website ID must be a valid UUID'),
  body('websiteName')
    .optional()
    .isString()
    .withMessage('Website Name must be a string')
    .notEmpty()
    .withMessage('Website Name cannot be empty'),
];

export const approveWebValidate = [
  param('requestId')
    .notEmpty()
    .withMessage('requestId is required')
    .isUUID()
    .withMessage('requestId must be a valid UUID'),
  body('isApproved').isBoolean().withMessage('isApproved field must be a boolean value'),
];

export const validateAddBankName = [
  body('bankName').trim().notEmpty().withMessage('Please provide a bank name to add'),
  body('accountHolderName').optional().trim().isString().withMessage('Account Holder Name must be a string'),
  body('accountNumber').optional().trim().isString().withMessage('Account Number must be a string'),
  body('ifscCode').optional().trim().isString().withMessage('IFSC Code must be a string'),
  body('upiId').optional().trim().isString().withMessage('UPI ID must be a string'),
  body('upiAppName').optional().trim().isString().withMessage('UPI App Name must be a string'),
  body('upiNumber').optional().trim().isString().withMessage('UPI Number must be a string'),
];

export const validateApproveBank = [
  param('bankId').isString().withMessage('bankId  must be a string').notEmpty().withMessage('bankId  is required'),
  body('isApproved').isBoolean().withMessage('isApproved must be a boolean value'),
  body('subAdmins').notEmpty().withMessage('subAdmins  is required'),
];

export const addBankBalanceValidate = [
  param('bank_id').notEmpty().withMessage('bank_id is required').isString().withMessage('bank_id must be a string'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('transactionType').equals('Manual-Bank-Deposit').withMessage('Invalid transaction type'),
  body('remarks').notEmpty().withMessage('Remark is required'),
];

export const withdrawBankBalanceValidate = [
  param('bank_id').notEmpty().withMessage('bank_id is required').isString().withMessage('bank_id must be a string'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('transactionType').equals('Manual-Bank-Withdraw').withMessage('Invalid transaction type'),
  body('remarks').notEmpty().withMessage('Remark is required'),
];

export const updateBankStatusValidate = [
  param('bank_id').notEmpty().withMessage('bank_id is required').isString().withMessage('bank_id must be a string'),
  body('isActive').isBoolean().withMessage('isActive field must be a boolean value'),
];

export const viewSubAdminBanksValidate = [
  param('subAdminId')
    .notEmpty()
    .withMessage('subAdminId is required')
    .isString()
    .withMessage('subAdminId must be a string'),
];

export const updateBankPermissionsValidator = [
  param('bankId').notEmpty().withMessage('subAdminId is required').isString().withMessage('bankId must be a string'),
  body('subAdmins').isArray().withMessage('subAdmins must be an array'),
  body('subAdmins.*.subAdminId').isString().withMessage('subAdminId must be a string'),
  body('subAdmins.*.isDeposit').isBoolean().withMessage('isDeposit must be a boolean'),
  body('subAdmins.*.isWithdraw').isBoolean().withMessage('isWithdraw must be a boolean'),
  body('subAdmins.*.isEdit').isBoolean().withMessage('isEdit must be a boolean'),
  body('subAdmins.*.isRenew').isBoolean().withMessage('isRenew must be a boolean'),
  body('subAdmins.*.isDelete').isBoolean().withMessage('isDelete must be a boolean'),
];

export const validatePasswordReset = [
  body('userName').notEmpty().withMessage('Username is required').isString().withMessage('Username must be a string'),

  body('oldPassword')
    .notEmpty()
    .withMessage('Old password is required')
    .isString()
    .withMessage('Old password must be a string'),

  body('password')
    .notEmpty()
    .withMessage('New password is required')
    .isString()
    .withMessage('New password must be a string'),
];

export const validateUserId = [
  param('userId').notEmpty().withMessage('User ID is required').isUUID(4).withMessage('User ID is not valid'),
];

export const validateSubAdminId = [
  param('subAdminId')
    .notEmpty()
    .withMessage('SubAdmin ID is required')
    .isUUID(4)
    .withMessage('SubAdmin ID is not valid'),
];

export const validateApproval = [
  param('websiteId').notEmpty().withMessage('Website ID must be provided'),
  body('isApproved').isBoolean().withMessage('isApproved must be a boolean'),
  body('subAdmins').isArray().withMessage('subAdmins must be an array'),
];

export const update = [
  param('adminId').notEmpty().withMessage('Admin Id is required'),

  body('firstName')
  .optional()
  .notEmpty()
  .withMessage('First name must not be empty')
  .isString()
  .withMessage('First name must be a string'),

body('lastName')
  .optional()
  .notEmpty()
  .withMessage('Last name must not be empty')
  .isString()
  .withMessage('Last name must be a string'),
];

export const updateUserProfileValidators = [
  param('userId')
    .notEmpty()
    .withMessage('User Id is required')
    .isUUID(4)
    .withMessage('User Id is not valid'),

  body('firstName')
    .optional()
    .notEmpty()
    .withMessage('First name must not be empty')
    .isString()
    .withMessage('First name must be a string'),

  body('lastName')
    .optional()
    .notEmpty()
    .withMessage('Last name must not be empty')
    .isString()
    .withMessage('Last name must be a string'),

  body('introducersUserName')
    .optional()
    .notEmpty()
    .withMessage('Introducer user name must not be empty')
    .isString()
    .withMessage('Introducer user name must be a string'),

  body('introducerPercentage')
    .notEmpty()
    .withMessage('Introducer percentage is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Introducer percentage must be a number between 0 and 100'),

  body('introducersUserName1')
    .optional()
    .notEmpty()
    .withMessage('Introducer user name 1 must not be empty')
    .isString()
    .withMessage('Introducer user name 1 must be a string'),

  body('introducerPercentage1')
    .notEmpty()
    .withMessage('Introducer percentage 1 is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Introducer percentage 1 must be a number between 0 and 100'),

  body('introducersUserName2')
    .optional()
    .notEmpty()
    .withMessage('Introducer user name 2 must not be empty')
    .isString()
    .withMessage('Introducer user name 2 must be a string'),

  body('introducerPercentage2')
    .notEmpty()
    .withMessage('Introducer percentage 2 is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Introducer percentage 2 must be a number between 0 and 100'),
];

export const validateWebsite = [
  body('websiteName')
    .trim()
    .notEmpty()
    .withMessage('Website name is required')
    .isString()
    .withMessage('Website name must be a string'),
];

export const validateDeleteSubAdminFromWebsite = [
  param('websiteId').isString().withMessage('websiteId must be a string'),
  param('subAdminId').isString().withMessage('subAdminId must be a string'),
];

export const validateAddWebsiteBalance = [
  // Validate amount field
  body('amount').notEmpty().withMessage('Amount is required').isNumeric().withMessage('Amount must be a number'),

  // Validate transactionType field
  body('transactionType')
    .notEmpty()
    .withMessage('Transaction type is required')
    .equals('Manual-Website-Deposit')
    .withMessage('Invalid transaction type'),

  // Validate remarks field
  body('remarks').notEmpty().withMessage('Remarks is required'),
];

export const validateWithdrawalWebsiteBalance = [
  // Validate amount field
  body('amount').notEmpty().withMessage('Amount is required').isNumeric().withMessage('Amount must be a number'),

  // Validate transactionType field
  body('transactionType')
    .notEmpty()
    .withMessage('Transaction type is required')
    .equals('Manual-Website-Withdraw')
    .withMessage('Invalid transaction type'),

  // Validate remarks field
  body('remarks').notEmpty().withMessage('Remarks is required'),
];

export const validateWebsiteActive = [
  // Validate isActive field
  param('websiteId')
    .notEmpty()
    .withMessage('Website ID is required')
    .isUUID(4)
    .withMessage('Website ID must be a valid UUID v4'),

  body('isActive')
    .notEmpty()
    .withMessage('isActive is required')
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
];

export const updateWebsitePermissionsValidator = [
  param('websiteId').isInt().withMessage('websiteId must be an integer'),
  body('subAdmins')
    .isArray()
    .withMessage('subAdmins must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('subAdmins must be an array');
      }
      return true;
    }),
  body('subAdmins.*.subAdminId')
    .isString()
    .withMessage('subAdminId must be a string')
    .not()
    .isEmpty()
    .withMessage('subAdminId is required'),
  body('subAdmins.*.isDeposit').optional().isBoolean().withMessage('isDeposit must be a boolean'),
  body('subAdmins.*.isWithdraw').optional().isBoolean().withMessage('isWithdraw must be a boolean'),
  body('subAdmins.*.isEdit').optional().isBoolean().withMessage('isEdit must be a boolean'),
  body('subAdmins.*.isRenew').optional().isBoolean().withMessage('isRenew must be a boolean'),
  body('subAdmins.*.isDelete').optional().isBoolean().withMessage('isDelete must be a boolean'),
];

export const validateBankDetails = [
  // Validate bank_details array is present and is an array
  body('bank_details').isArray().withMessage('Bank details must be an array'),

  // Validate each bank detail object in the array
  body('bank_details.*.account_holder_name').notEmpty().withMessage('Account holder name is required'),
  body('bank_details.*.bank_name').notEmpty().withMessage('Bank name is required'),
  body('bank_details.*.ifsc_code').notEmpty().withMessage('IFSC code is required'),
  body('bank_details.*.account_number').notEmpty().withMessage('Account number is required'),
];
export const validateWebsiteName = [body('website_name').isArray().withMessage('Bank details must be an array')];

export const validateAddUpiDetails = [
  body('upi_details').isArray().withMessage('UPI details must be an array'),
  body('upi_details.*.upi_id').notEmpty().withMessage('UPI ID is required'),
  body('upi_details.*.upi_app').notEmpty().withMessage('UPI App is required'),
  body('upi_details.*.upi_number').notEmpty().withMessage('UPI Number is required'),
];

export const validate = [
  body('userName').notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

export const validateCreateTransaction = [
  body('transactionID').trim().notEmpty().withMessage('Transaction ID is required'),
  body('amount').trim().notEmpty().isNumeric().withMessage('Amount is required and must be a number'),
  body('paymentMethod').trim().notEmpty().withMessage('Payment Method is required'),
];

export const validateIntroId = [
  param('introId')
    .notEmpty()
    .withMessage('Introducer ID is required')
    .isUUID()
    .withMessage('Introducer ID must be a valid UUID'),
];

export const validateIntroUserId = [
  param('user_id').notEmpty().withMessage('User ID is required').isUUID().withMessage('User ID must be a valid UUID'),
];

export const validateIntroducerUsername = [
  param('introducerUsername').notEmpty().withMessage('introducerUsername is required'),
];

export const validateAdminId = [
  param('adminId').notEmpty().withMessage('Admin Id is required').isUUID().withMessage('Admin ID must be a valid UUID'),
]

export const validatedBankId = [
  param('bankId')
    .notEmpty()
    .withMessage('Bank ID is required')
    .isUUID(4)
    .withMessage('Bank ID must be a valid UUID v4'),
];
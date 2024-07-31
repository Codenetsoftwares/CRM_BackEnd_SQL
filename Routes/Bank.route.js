import { Authorize } from '../middleware/Authorize.js';
import {
  addBankBalance,
  addBankName,
  deleteSubAdmin,
  getActiveBanks,
  getActiveVisibleBankAndWebsite,
  getBankDetails,
  getBankNames,
  getSingleBankDetails,
  handleApproveBank,
  manualUserBankSummary,
  rejectBankRequest,
  updateBankPermissions,
  updateBankStatus,
  viewBankEditRequests,
  viewBankRequests,
  viewSubAdminBanks,
  withdrawBankBalance,
} from '../services/Bank.services.js';
import { string } from '../constructor/string.js';
import {
  addBankBalanceValidate,
  updateBankPermissionsValidator,
  updateBankStatusValidate,
  validateAddBankName,
  validateApproveBank,
  validateBankId,
  validatedBankId,
  validateDeleteBankRequest,
  validateDeleteSubAdmin,
  viewSubAdminBanksValidate,
  withdrawBankBalanceValidate,
} from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

const BankRoutes = (app) => {
  // Testing Done
  app.post(
    '/api/add-bank-name',
    validateAddBankName,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.bankView]),
    addBankName,
  );
  // Testing Done
  app.post(
    '/api/approve-bank/:bankId',
    validateApproveBank,
    customErrorHandler,
    Authorize([string.superAdmin]),
    handleApproveBank,
  );
  // Testing Done
  app.delete(
    '/api/bank/reject/:bankId',
    validateDeleteBankRequest,
    customErrorHandler,
    Authorize([string.superAdmin]),
    rejectBankRequest,
  );

  // Testing Done
  app.get('/api/superAdmin/view-bank-requests', customErrorHandler, Authorize([string.superAdmin]), viewBankRequests);
  // Testing Done
  app.get(
    '/api/get-single-bank-name/:bankId',
    validateBankId,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.bankView]),
    getSingleBankDetails,
  );
  // Testing Done
  app.post(
    '/api/admin/add-bank-balance/:bank_id',
    addBankBalanceValidate,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.bankView]),
    addBankBalance,
  );
  // Testing Done
  app.post(
    '/api/admin/withdraw-bank-balance/:bank_id',
    withdrawBankBalanceValidate,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.bankView]),
    withdrawBankBalance,
  );

  // Testing Not Done
  app.delete(
    '/api/bank/delete-subAdmin/:bankId/:subAdminId',
    validateDeleteSubAdmin,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin, string.bankView]),
    deleteSubAdmin,
  );
  // Testing Done
  app.get(
    '/api/admin/bank-name',
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.bankView,
      string.websiteView,
      string.profileView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
    ]),
    getBankNames,
  );
  // Testing Done
  app.get('/api/super-admin/view-bank-edit-requests', Authorize([string.superAdmin]), viewBankEditRequests);
  // Testing Done
  app.post(
    '/api/admin/bank/isActive/:bank_id',
    updateBankStatusValidate,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin]),
    updateBankStatus,
  );
  // Testing Done
  app.get(
    '/api/admin/bank/view-subAdmin/:subAdminId',
    viewSubAdminBanksValidate,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin]),
    viewSubAdminBanks,
  );
  // Testing Done
  app.put(
    '/api/bank/edit-request/:bankId',
    updateBankPermissionsValidator,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin, string.bankView]),
    updateBankPermissions,
  );
  // Testing Done
  app.get(
    '/api/active-visible-bank',
    Authorize([string.superAdmin, string.requestAdmin]),
    getActiveVisibleBankAndWebsite,
  );
  // Testing Done
  app.get(
    '/api/get-activeBank-name',
    Authorize([
      string.superAdmin,
      string.bankView,
      string.transactionView,
      string.createTransaction,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
    ]),
    getActiveBanks,
  );

  // API To View Bank Name
  //  no need to refactor this
  app.get(
    '/api/get-bank-name',
    Authorize([
      string.superAdmin,
      string.bankView,
      string.transactionView,
      string.createTransaction,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
    ]),
    getBankDetails,
  );

  // no need to refactor this
  app.get(
    '/api/admin/manual-user-bank-account-summary/:bankId',
    validatedBankId,
    customErrorHandler,
    Authorize([string.superAdmin, string.bankView, string.transactionView]),
    manualUserBankSummary,
  );
};

export default BankRoutes;

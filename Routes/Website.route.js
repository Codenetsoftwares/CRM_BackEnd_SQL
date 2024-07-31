import { database } from '../services/database.service.js';
import { Authorize } from '../middleware/Authorize.js';
import {
  addWebsiteBalance,
  addWebsiteName,
  deleteEditWebsiteRequest,
  deleteSubAdminFromWebsite,
  deleteWebsiteRequest,
  getActiveWebsiteNames,
  getEditWebsiteRequests,
  getSingleWebsiteDetails,
  getWebsiteBalance,
  getWebsiteDetails,
  getWebsiteNames,
  handleApproveWebsite,
  manualUserWebsiteAccountSummary,
  rejectWebsiteRequest,
  updateWebsitePermissions,
  viewWebsiteRequests,
  websiteActive,
  websiteSubAdminView,
  withdrawWebsiteBalance,
} from '../services/WebSite.Service.js';
import { v4 as uuidv4 } from 'uuid';
import { string } from '../constructor/string.js';
import {
  updateWebsitePermissionsValidator,
  validateAddWebsiteBalance,
  validateApproval,
  validateDeleteSubAdminFromWebsite,
  validatePagination,
  validateWebsite,
  validateWebsiteActive,
  validateWebsiteId,
  validateWithdrawalWebsiteBalance,
} from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

const WebsiteRoutes = (app) => {
  // done
  app.post(
    '/api/add-website-name',
    validateWebsite,
    customErrorHandler,
    Authorize([string.superAdmin, string.websiteView, string.transactionView]),
    addWebsiteName,
  );

  // done
  app.post(
    '/api/approve-website/:websiteId',
    validateApproval,
    customErrorHandler,
    Authorize([string.superAdmin]),
    handleApproveWebsite,
  );

  // done
  // API To View Website-Requests
  app.get(
    '/api/superAdmin/view-website-requests',
    validatePagination,
    customErrorHandler,
    Authorize([string.superAdmin]),
    viewWebsiteRequests,
  );

  // done
  app.delete('/api/reject/:websiteId',
    validateWebsiteId,
    customErrorHandler,
    Authorize([string.superAdmin]),
    deleteWebsiteRequest
  ); // not understanding this ... two apis work same "rejectWebsiteRequest"

  app.delete(
    '/api/website/reject/:websiteId',
    validateWebsiteId,
    customErrorHandler,
    Authorize([string.superAdmin]),
    rejectWebsiteRequest,
  ); // not understanding this ... two apis work same "deleteWebsiteRequest"

  // done
  app.delete(
    '/api/reject-website-edit/:websiteId',
    validateWebsiteId,
    customErrorHandler,
    Authorize([string.superAdmin]),
    deleteEditWebsiteRequest,
  );

  // done
  app.get(
    '/api/get-activeWebsite-name',
    validatePagination,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.bankView,
      string.transactionView,
      string.createTransaction,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
    ]),
    getActiveWebsiteNames,
  );

  // done
  // SubAdmin Permission Remove From websiteSubAdmin
  app.delete(
    '/api/website/delete-subAdmin/:websiteId/:subAdminId',
    validateDeleteSubAdminFromWebsite,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin, string.bankView]),
    deleteSubAdminFromWebsite,
  );

  // done
  app.get(
    '/api/get-single-website-name/:websiteId',
    validateWebsiteId,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.bankView]),
    getSingleWebsiteDetails,
  );

  // done
  app.post(
    '/api/admin/add-website-balance/:websiteId',
    validateAddWebsiteBalance,
    customErrorHandler,
    Authorize([string.superAdmin, string.websiteView, string.transactionView]),
    addWebsiteBalance,
  );

  // done
  app.post(
    '/api/admin/withdraw-website-balance/:websiteId',
    validateWithdrawalWebsiteBalance,
    customErrorHandler,
    Authorize([string.superAdmin, string.websiteView, string.transactionView]),
    withdrawWebsiteBalance,
  );

  // done
  app.get(
    '/api/admin/website-name',
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
    ]),
    getWebsiteNames,
  );

  // done
  app.get(
    '/api/superAdmin/view-website-edit-requests',
    customErrorHandler,
    Authorize([string.superAdmin]),
    getEditWebsiteRequests,
  );

  // done
  app.post(
    '/api/admin/website/isActive/:websiteId',
    validateWebsiteActive,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin]),
    websiteActive,
  );

  // done
  app.get(
    '/api/admin/website/view-subAdmin/:subAdminId',
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin]),
    websiteSubAdminView,
  );

  // done
  app.put(
    '/api/website/edit-request/:websiteId',
    updateWebsitePermissionsValidator,
    Authorize([string.superAdmin, string.requestAdmin, string.bankView]),
    updateWebsitePermissions,
  );

  // no need to refactor this
  app.get(
    '/api/get-website-name',
    Authorize([
      string.superAdmin,
      string.bankView,
      string.transactionView,
      string.createTransaction,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
    ]),
    getWebsiteDetails,
  );

  // no need to refactor this
  app.post(
    '/api/admin/manual-user-website-account-summary/:websiteId',
    validateWebsiteId,
    customErrorHandler,
    Authorize(['superAdmin', 'Bank-View', 'Transaction-View', 'Website-View']),
    manualUserWebsiteAccountSummary
  );
}

export default WebsiteRoutes;

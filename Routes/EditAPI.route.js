import { Authorize } from '../middleware/Authorize.js';
import { approveBankDetailEditRequest, updateBank } from '../services/Bank.services.js';
import { approveWebsiteDetailEditRequest, updateWebsite } from '../services/WebSite.Service.js';
import {
  approveBankDetailEditRequestValidator,
  approveWebValidate,
  validateBankUpdate,
  validateUpdateWebsite,
} from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';
import { string } from '../constructor/string.js';

const EditAPIRoute = (app) => {
  //   API To Edit Bank Detail
  app.put(
    '/api/bank-edit/:bank_id',
    validateBankUpdate,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.bankView]),
    updateBank,
  );
  //   API For Bank Detail Edit Approval
  app.post(
    '/api/admin/approve-bank-detail-edit-request/:requestId',
    approveBankDetailEditRequestValidator,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin]),
    approveBankDetailEditRequest,
  );
  // API To Edit Website Detail
  app.put(
    '/api/website-edit/:website_id',
    validateUpdateWebsite,
    customErrorHandler,
    Authorize([string.superAdmin, string.transactionView, string.websiteView]),
    updateWebsite,
  );
  //   API For Website Detail Edit Approval
  app.post(
    '/api/admin/approve-website-detail-edit-request/:requestId',
    approveWebValidate,
    customErrorHandler,
    Authorize([string.superAdmin, string.requestAdmin]),
    approveWebsiteDetailEditRequest,
  );
};

export default EditAPIRoute;

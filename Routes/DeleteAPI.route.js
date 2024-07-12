import { string } from '../constructor/string.js';
import { Authorize } from '../middleware/Authorize.js';
import { approveBankTransactionRequest, deleteBank, deleteBankRequest, deleteIntroducerEditRequest, deleteIntroducerTransaction, deleteIntroducerTransactionWithId, deleteTransaction, deleteTransactionWithId, deleteTrashTransaction, deleteWebsite, deleteWebsiteTransaction, moveWebsiteTransactionToTrash, rejectBankDetail, rejectDeleteRequest, rejectWebsiteDetail, restoreBankData, restoreIntroducerData, restoreTransactionData, restoreWebsiteData, saveWebsiteRequest, viewDeleteRequests, viewTrash } from '../services/DeleteAPI.service.js';
import { deleteBankTransaction } from '../services/DeleteAPI.service.js'
import { deleteWebsiteTransactionValidate, validateBankId, validateDeleteBank, validateDeleteBankTransaction, validateDeleteIntroducerTransaction, validateDeleteIntroducerTransactionWithId, validateDeleteRequest, validateDeleteTransaction, validateDeleteTransactionWithId, validateDeleteWebsite, validateIdParam, validateIntroEditID, validateIntroTransactionId, validateMoveToTrash, validateRejectBankDetail, validateRejectWebsiteDetail, validates, validateSaveWebsiteRequest, validateTransactionId, validateWebsiteId, validationDeleteBankRequest } from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

const DeleteAPIRoute = (app) => {
  // API To Move The Bank Transaction Into Trash
  app.post(
    '/api/admin/save-bank-transaction-request', validateDeleteBankTransaction, customErrorHandler, Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]), deleteBankTransaction);

  // API To Approve Bank Transaction To Move Into Trash Request

  app.post('/api/delete-bank-transaction/:editId', validates, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), approveBankTransactionRequest);

  // API To Move The Website Transaction Into Trash
  app.post('/api/admin/save-website-transaction-request', deleteWebsiteTransactionValidate, customErrorHandler, Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]), deleteWebsiteTransaction);

  // API To Approve Website Transaction To Move Into Trash Request

  app.post('/api/delete-website-transaction/:editId', validateMoveToTrash, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), moveWebsiteTransactionToTrash);


  // API To Move The Transaction Into Trash

  app.post('/api/admin/save-transaction-request', validateDeleteTransaction, customErrorHandler, Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]), deleteTransaction);

  // API To Move The Introducer Transaction Into Trash
  app.post('/api/admin/save-introducer-transaction-request', validateDeleteIntroducerTransaction, customErrorHandler, Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]), deleteIntroducerTransaction);

  app.post('/api/delete-transaction/:editId', validateDeleteTransactionWithId, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), deleteTransactionWithId);

  app.post('/api/delete-introducer-transaction/:IntroEditId', validateDeleteIntroducerTransactionWithId, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), deleteIntroducerTransactionWithId);

  app.post('/api/admin/save-bank-request', validationDeleteBankRequest, customErrorHandler, Authorize([string.superAdmin, string.transactionView, string.bankView]), deleteBankRequest);

  // API For Bank Delete Request

  app.post('/api/delete-bank/:bankId', validateDeleteBank, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), deleteBank);

  // API TO Sent deleting Website Detail's approval
  app.post('/api/admin/save-website-request', validateSaveWebsiteRequest, customErrorHandler, Authorize([string.superAdmin, string.transactionView, string.websiteView]), saveWebsiteRequest);

  // API For Website Delete Request
  app.post('/api/delete-website/:websiteId', validateDeleteWebsite, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), deleteWebsite);

  // API For Rejecting Bank Detail

  app.delete('/api/reject/bank-detail/:bankId', validateRejectBankDetail, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), rejectBankDetail);

  // API For Rejecting Website Detail

  app.delete('/api/reject/website-detail/:websiteId', validateRejectWebsiteDetail, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), rejectWebsiteDetail);

//  API To View Trash Data
  app.get('/api/admin/view-trash', customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), viewTrash);
  // API To Re-Store The Bank Transaction Data
  app.post('/api/restore/bank/data/:bankId', validateBankId, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), restoreBankData);

  // API To Re-Store The Website Transaction Data
  app.post('/api/restore/website/data/:websiteId', validateWebsiteId, customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), restoreWebsiteData);

  // API To Re-Store The Transaction Data
  app.post('/api/restore/transaction/data/:Transaction_Id',validateTransactionId,customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), restoreTransactionData);
// API To Re-Store The Introducer Transaction
app.post('/api/restore/Introducer/data/:introTransactionId',validateIntroTransactionId,customErrorHandler,[Authorize([string.superAdmin, string.requestAdmin])],restoreIntroducerData);

app.delete('/api/reject/introducer-detail/:IntroEditID',validateIntroEditID,customErrorHandler,[Authorize([string.superAdmin, string.requestAdmin])],deleteIntroducerEditRequest);
app.get('/api/admin/view-Delete-Request',customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), viewDeleteRequests);
// API To Reject EditRequest Data
app.delete('/api/reject/DeleteRequest/:editId',validateDeleteRequest,customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), rejectDeleteRequest);
// API To Reject Trash Data
app.delete('/api/reject/trash/transactions/:_id',validateIdParam,customErrorHandler, Authorize([string.superAdmin, string.requestAdmin]), deleteTrashTransaction);






  // API To Approve Transaction To Move Into Trash Request



  // API To Approve Introducer Transaction To Move Into Trash Request

  // API TO Sent deleting Bank Detail's approval

  // API For Bank Delete Request

  // API To Reject Trash Data
  
};

export default DeleteAPIRoute;
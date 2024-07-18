import {
  createTransaction,
  depositView,
  viewEditIntroducerTransactionRequests,
  withdrawView,
} from '../services/Transaction.services.js';
import { Authorize } from '../middleware/Authorize.js';
import { string } from '../constructor/string.js';
import customErrorHandler from '../utils/customErrorHandler.js';
import { validateCreateTransaction } from '../utils/commonSchema.js';

const TransactionRoutes = (app) => {
  app.post(
    '/api/admin/create/transaction',
    validateCreateTransaction,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
      string.createTransaction,
    ]),
    createTransaction,
  );

  // API To View Deposit Transaction Details

  app.get('/api/deposit/view', Authorize([string.superAdmin]), depositView);

  // API To View Withdraw Transaction Details

  app.get('/api/withdraw/view', Authorize([string.superAdmin]), withdrawView);

  app.get(
    '/api/superAdmin/view-edit-introducer-transaction-requests',
    Authorize([string.superAdmin, string.requestAdmin]),
    viewEditIntroducerTransactionRequests,
  );
};

export default TransactionRoutes;

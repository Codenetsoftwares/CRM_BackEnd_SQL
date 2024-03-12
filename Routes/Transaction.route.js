import TransactionServices from '../services/Transaction.services.js';
import { Authorize } from '../middleware/Authorize.js';


const TransactionRoutes = (app) => {
  app.post(
    '/api/admin/create/transaction',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
      'Create-Transaction',
    ]),
    async (req, res) => {
      try {
        const subAdminName = req.user;
        await TransactionServices.createTransaction(req, res, subAdminName);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  // API To View Deposit Transaction Details

  app.get('/api/deposit/view', Authorize(['superAdmin']), async (req, res) => {
    try {
      await TransactionServices.depositView(req, res);
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  // API To View Withdraw Transaction Details

  app.get('/api/withdraw/view', Authorize(['superAdmin']), async (req, res) => {
    try {
      await TransactionServices.withdrawView(req, res);
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });
};

export default TransactionRoutes;

import TransactionServices from '../services/Transaction.services.js';
import { Authorize } from '../middleware/Authorize.js';
import { database } from '../services/database.service.js';

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

  app.get(
    '/api/superadmin/view-edit-introducer-transaction-requests',
    Authorize(['superAdmin', 'RequestAdmin']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const [introEdit] = await pool.execute(`SELECT * FROM IntroducerEditRequest`);
        res.status(200).send(introEdit);
      } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server error');
      }
    },
  );
};

export default TransactionRoutes;

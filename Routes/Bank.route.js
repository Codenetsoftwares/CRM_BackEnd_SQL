import { Authorize } from '../middleware/Authorize.js';
import BankServices, {
  addBankBalance,
  addBankName,
  approveBank,
  deleteSubAdmin,
  getActiveBanks,
  getActiveVisibleBankAndWebsite,
  getBankNames,
  getSingleBankDetails,
  updateBankPermissions,
  updateBankStatus,
  viewBankEditRequests,
  viewBankRequests,
  viewSubAdminBanks,
  withdrawBankBalance,
} from '../services/Bank.services.js';
import { deleteBankRequest } from '../services/Bank.services.js';
import AccountServices from '../services/Account.Services.js';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import { string } from '../constructor/string.js';
import {
  addBankBalanceValidate,
  updateBankPermissionsValidator,
  updateBankStatusValidate,
  validateAddBankName,
  validateApproveBank,
  validateBankId,
  validateDeleteBankRequest,
  validateDeleteSubAdmin,
  viewSubAdminBanksValidate,
  withdrawBankBalanceValidate,
} from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

const BankRoutes = (app) => {
  // Testing Done
  app.delete(
    '/api/bank/reject/:bankId',
    validateDeleteBankRequest,
    customErrorHandler,
    Authorize([string.superAdmin]),
    deleteBankRequest,
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
    approveBank,
  );
  // Testing Done
  app.get('/api/superAdmin/view-bank-requests', customErrorHandler, Authorize([string.superAdmin]), viewBankRequests);
  // Testing Done
  app.get(
    '/api/get-single-bank-name/:bank_id',
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
  app.get(
    '/api/super-admin/view-bank-edit-requests',
    Authorize([string.superAdmin]),
    viewBankEditRequests,
  );
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
      'superAdmin',
      'Bank-View',
      'Transaction-View',
      'Create-Transaction',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
    ]),
    async (req, res) => {
      try {
        // Fetch bank data
        const banksQuery = `SELECT * FROM Bank`;
        let [bankData] = await database.execute(banksQuery);

        const userRole = req.user[0]?.roles; // Accessing roles property
        if (userRole.includes('superAdmin')) {
          // For superAdmin, fetch balances for all banks
          const balancePromises = bankData.map(async (bank) => {
            bank.balance = await BankServices.getBankBalance(bank.bank_id);
            // Fetch BankSubAdmins for each bank
            const [subAdmins] = await database.execute(`SELECT * FROM BankSubAdmins WHERE bankId = (?)`, [
              bank.bank_id,
            ]);
            if (subAdmins && subAdmins.length > 0) {
              bank.subAdmins = subAdmins;
            } else {
              bank.subAdmins = [];
            }
            return bank;
          });

          // Await all promises to complete
          bankData = await Promise.all(balancePromises);
        } else {
          // For subAdmins, filter banks based on user permissions
          const userSubAdminId = req.user[0]?.userName; // Accessing userName property
          console.log('userSubAdminId', userSubAdminId);
          if (userSubAdminId) {
            const filteredBanksPromises = bankData.map(async (bank) => {
              const [subAdmins] = await database.execute(`SELECT * FROM BankSubAdmins WHERE bankId = (?)`, [
                bank.bank_id,
              ]);
              if (subAdmins && subAdmins.length > 0) {
                bank.subAdmins = subAdmins;
                const userSubAdmin = subAdmins.find((subAdmin) => subAdmin.subAdminId === userSubAdminId);
                if (userSubAdmin) {
                  // Update balance for the specific bank
                  bank.balance = await BankServices.getBankBalance(bank.bank_id);

                  // Set permissions for the specific bank
                  bank.isDeposit = userSubAdmin.isDeposit;
                  bank.isWithdraw = userSubAdmin.isWithdraw;
                  bank.isRenew = userSubAdmin.isRenew;
                  bank.isEdit = userSubAdmin.isEdit;
                  bank.isDelete = userSubAdmin.isDelete;
                } else {
                  // Exclude this bank from the result
                  return null;
                }
              } else {
                bank.subAdmins = [];
                return null;
              }
              return bank; // Include this bank in the result
            });

            // Wait for all promises to complete
            const filteredBanks = await Promise.all(filteredBanksPromises);

            // Filter out null values (banks not authorized for the subAdmin)
            bankData = filteredBanks.filter((bank) => bank !== null);
          } else {
            console.error('SubAdminId not found in req.user');
            // Handle the case where subAdminId is not found in req.user
          }
        }

        // Sort bankData by created_at
        bankData.sort((a, b) => b.created_at - a.created_at);

        return res.status(200).send(bankData);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
      }
    },
  );

  // no need to refactor this
  app.get(
    '/api/admin/manual-user-bank-account-summary/:bankId',
    Authorize(['superAdmin', 'Bank-View', 'Transaction-View']),
    async (req, res) => {
      try {
        let balances = 0;
        const bankId = req.params.bankId;

        // Fetch bank transactions from the database for the specified bankId
        const bankSummaryQuery = `SELECT * FROM BankTransaction WHERE bankId = ? ORDER BY createdAt DESC`;
        const [bankSummaryRows] = await database.execute(bankSummaryQuery, [bankId]);
        const bankSummary = bankSummaryRows;

        // Fetch account transactions from the database for the specified bankId
        const accountSummaryQuery = `SELECT * FROM Transaction WHERE bankId = ? ORDER BY createdAt DESC`;
        const [accountSummaryRows] = await database.execute(accountSummaryQuery, [bankId]);
        const accountSummary = accountSummaryRows;

        // Combine bank and account transactions
        const allTransactions = [...accountSummary, ...bankSummary];

        // Sort all transactions by createdAt in descending order
        allTransactions.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA;
        });

        // Calculate balances
        let allData = JSON.parse(JSON.stringify(allTransactions));
        allData
          .slice(0)
          .reverse()
          .map((data) => {
            if (data.transactionType === 'Manual-Bank-Deposit') {
              balances += parseFloat(data.depositAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Manual-Bank-Withdraw') {
              balances -= parseFloat(data.withdrawAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Deposit') {
              let totalAmount = 0;
              totalAmount += parseFloat(data.amount);
              balances += totalAmount;
              data.balance = balances;
            }
            if (data.transactionType === 'Withdraw') {
              const netAmount = balances - parseFloat(data.bankCharges) - parseFloat(data.amount);
              balances = netAmount;
              data.balance = balances;
            }
          });
        return res.status(200).send(allData);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message });
      }
    },
  );
};

export default BankRoutes;

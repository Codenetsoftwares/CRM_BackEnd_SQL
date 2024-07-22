import { database } from '../services/database.service.js';
import { Authorize } from '../middleware/Authorize.js';
import WebsiteServices, {
  addWebsiteBalance,
  addWebsiteName,
  deleteEditWebsiteRequest,
  deleteSubAdminFromWebsite,
  deleteWebsiteRequest,
  getActiveWebsiteNames,
  getEditWebsiteRequests,
  getSingleWebsiteDetails,
  getWebsiteBalance,
  getWebsiteNames,
  handleApproveWebsite,
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
    customErrorHandler,
    Authorize([string.superAdmin]),
    viewWebsiteRequests,
  );

  // done
  app.delete('/api/reject/:websiteId', customErrorHandler, Authorize([string.superAdmin]), deleteWebsiteRequest); // not understanding this ... two apis work same "rejectWebsiteRequest"

  app.delete(
    '/api/website/reject/:websiteId',
    customErrorHandler,
    Authorize([string.superAdmin]),
    rejectWebsiteRequest,
  ); // not understanding this ... two apis work same "deleteWebsiteRequest"

  // done
  app.delete(
    '/api/reject-website-edit/:websiteId',
    customErrorHandler,
    Authorize([string.superAdmin]),
    deleteEditWebsiteRequest,
  );

  // done
  app.get(
    '/api/get-activeWebsite-name',
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
  app.get('/api/superAdmin/view-website-edit-requests',customErrorHandler, Authorize([string.superAdmin]), getEditWebsiteRequests);

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
      'superAdmin',
      'Bank-View',
      'Transaction-View',
      'Create-Transaction',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
    ]),
    async (req, res) => {
      try {
        const websiteQuery = `SELECT * FROM Website`;
        let [websiteData] = await database.execute(websiteQuery);

        const userRole = req.user[0]?.roles;
        if (userRole.includes('superAdmin')) {
          const balancePromises = websiteData.map(async (website) => {
            website.balance = await getWebsiteBalance(website.websiteId);
            const [subAdmins] = await database.execute(`SELECT * FROM WebsiteSubAdmins WHERE websiteId = (?)`, [
              website.websiteId,
            ]);
            if (subAdmins && subAdmins.length > 0) {
              website.subAdmins = subAdmins;
            } else {
              website.subAdmins = [];
            }
            return website;
          });

          websiteData = await Promise.all(balancePromises);
        } else {
          const userSubAdminId = req.user[0]?.userName;
          console.log('userSubAdminId', userSubAdminId);
          if (userSubAdminId) {
            const filteredBanksPromises = websiteData.map(async (website) => {
              const [subAdmins] = await database.execute(`SELECT * FROM WebsiteSubAdmins WHERE websiteId = (?)`, [
                website.websiteId,
              ]);
              if (subAdmins && subAdmins.length > 0) {
                website.subAdmins = subAdmins;
                const userSubAdmin = subAdmins.find((subAdmin) => subAdmin.subAdminId === userSubAdminId);
                if (userSubAdmin) {
                  website.balance = await getWebsiteBalance(website.websiteId);
                  website.isDeposit = userSubAdmin.isDeposit;
                  website.isWithdraw = userSubAdmin.isWithdraw;
                  website.isRenew = userSubAdmin.isRenew;
                  website.isEdit = userSubAdmin.isEdit;
                  website.isDelete = userSubAdmin.isDelete;
                } else {
                  return null;
                }
              } else {
                website.subAdmins = [];
                return null;
              }
              return website;
            });

            const filteredBanks = await Promise.all(filteredBanksPromises);

            websiteData = filteredBanks.filter((website) => website !== null);
          } else {
            console.error('SubAdminId not found in req.user');
          }
        }

        websiteData.sort((a, b) => b.created_at - a.created_at);

        return res.status(200).send(websiteData);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
      }
    },
  );

  // no need to refactor this
  app.post(
    '/api/admin/manual-user-website-account-summary/:websiteId',
    Authorize(['superAdmin', 'Bank-View', 'Transaction-View', 'Website-View']),
    async (req, res) => {
      try {
        let balances = 0;
        const websiteId = req.params.websiteId;

        const websiteSummaryQuery = `SELECT * FROM WebsiteTransaction WHERE websiteId = ? ORDER BY createdAt DESC`;
        const [websiteSummaryRows] = await database.execute(websiteSummaryQuery, [websiteId]);
        const websiteSummary = websiteSummaryRows;

        const accountSummaryQuery = `SELECT * FROM Transaction WHERE websiteId = ? ORDER BY createdAt DESC`;
        const [accountSummaryRows] = await database.execute(accountSummaryQuery, [websiteId]);
        const accountSummary = accountSummaryRows;

        const allTransactions = [...accountSummary, ...websiteSummary];

        allTransactions.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA;
        });

        let allData = JSON.parse(JSON.stringify(allTransactions));
        allData
          .slice(0)
          .reverse()
          .map((data) => {
            if (data.transactionType === 'Manual-Website-Deposit') {
              balances += parseFloat(data.depositAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Manual-Website-Withdraw') {
              balances -= parseFloat(data.withdrawAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Deposit') {
              const netAmount = balances - parseFloat(data.bonus) - parseFloat(data.amount);
              balances = netAmount;
              data.balance = balances;
            }
            if (data.transactionType === 'Withdraw') {
              let totalamount = 0;
              totalamount += parseFloat(data.amount);
              balances += totalamount;
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

export default WebsiteRoutes;

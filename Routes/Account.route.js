import { database } from '../services/database.service.js';
import bcrypt from 'bcrypt';
import {
  accountSummary,
  createAdmin,
  editSubAdminRoles,
  getAllSubAdmins,
  getClientData,
  getIntroducerAccountSummary,
  getIntroducerById,
  getIntroducerUserSingleData,
  getSingleIntroducer,
  getSingleSubAdmin,
  getSingleUserProfile,
  getSubAdminsWithBankView,
  getSubAdminsWithWebsiteView,
  getUserById,
  getUserProfile,
  introducerLiveBalance,
  introducerProfile,
  subAdminPasswordResetCode,
  SuperAdminPasswordResetCode,
  updateSubAdminProfile,
  updateUserProfile,
  viewSubAdmins,
  viewSubAdminTransactions,
} from '../services/Account.Services.js';
import {
  createIntroducerUser,
  introducerPasswordResetCode,
  introducerUser,
  updateIntroducerProfile,
} from '../services/introducer.services.js';
import { Authorize } from '../middleware/Authorize.js';
import { createUser, userPasswordResetCode } from '../services/User.services.js';
import {
  createIntroducerDepositTransaction,
  createIntroducerWithdrawTransaction,
} from '../services/Transaction.services.js';
import {
  createIntroducerDepositTransactionValidator,
  createIntroducerWithdrawalTransactionValidator,
  validateAdminCreate,
  validateCreateUser,
  validateEditSubAdminRoles,
  validateSubAdminId,
  validateIntroducerCreate,
  validatePasswordReset,
  validateResetPassword,
  validateUserId,
  update,
  updateUserProfileValidators,
  updateIntroducerValidationSchema,
  validateIntroId,
  validateAdminId,
  paginationAndSearch,
  validateIntroIdWithPagination,
  validateIntroducerAccountSummary,
  validatePagination,
} from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';
import { string } from '../constructor/string.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';

const AccountRoute = (app) => {
  // done
  app.post(
    '/api/create/user-admin',
    validateAdminCreate,
    customErrorHandler,
    Authorize([string.superAdmin, string.createSubAdmin]),
    createAdmin,
  );

  // done
  app.post(
    '/api/admin/accounts/introducer/register',
    validateIntroducerCreate,
    customErrorHandler,
    Authorize([string.superAdmin, string.createIntroducer, string.createAdmin]),
    createIntroducerUser,
  );

  // done
  // API To Edit User Profile
  app.put(
    '/api/admin/user-profile-edit/:userId',
    updateUserProfileValidators,
    customErrorHandler,
    Authorize([string.superAdmin, string.userProfileView, string.profileView]),
    updateUserProfile,
  );

  // done
  // API To View User Profile
  app.get(
    '/api/user-profile/:page',
    Authorize([string.superAdmin, string.userProfileView, string.profileView]),
    getUserProfile,
  );

  // done
  app.get(
    '/api/admin/sub-admin-name/bank-view',
    paginationAndSearch,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
      string.websiteView,
      string.bankView,
      string.profileView,
      string.introducerProfileView,
    ]),
    getSubAdminsWithBankView,
  );

  // done
  app.get(
    '/api/admin/sub-admin-name',
    paginationAndSearch,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
      string.websiteView,
      string.bankView,
      string.profileView,
      string.introducerProfileView,
    ]),
    getAllSubAdmins,
  );

  // done
  app.get(
    '/api/admin/sub-admin-name/website-view',
    paginationAndSearch,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
      string.websiteView,
      string.bankView,
      string.profileView,
      string.introducerProfileView,
    ]),
    getSubAdminsWithWebsiteView,
  );

  // done
  app.put(
    '/api/admin/introducer-profile-edit/:introId',
    updateIntroducerValidationSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.profileView,
      string.introducerProfileView
    ]),
    updateIntroducerProfile,
  );

  // done
  app.get(
    '/api/introducer/client-data/:introId',
    validateIntroId,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.profileView,
      string.introducerProfileView
    ]),
    getClientData,
  );

  // done
  app.get(
    '/api/get-single-Introducer/:introId',
    validateIntroId,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    getSingleIntroducer,
  );

  // done
  app.get(
    '/api/superAdmin/user-id',
    paginationAndSearch,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
      string.createTransaction,
    ]),
    getUserById,
  );

  // done
  app.get(
    '/api/superAdmin/Introducer-id',
    paginationAndSearch,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
      string.createTransaction,
      string.websiteView,
      string.bankView,
      string.profileView,
      string.createUser,
      string.createAdmin,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
    ]),
    getIntroducerById,
  );

  // done
  app.post(
    '/api/admin/user/register',
    validateCreateUser,
    customErrorHandler,
    Authorize([string.superAdmin, string.createAdmin, string.createUser]),
    createUser,
  );

  // done
  app.post(
    '/api/admin/single-sub-admin/:adminId',
    validateAdminId,
    customErrorHandler,
    Authorize([string.superAdmin]),
    getSingleSubAdmin,
  );

  // done
  app.put(
    '/api/admin/edit-subAdmin-roles/:adminId',
    validateEditSubAdminRoles,
    customErrorHandler,
    Authorize([string.superAdmin]),
    editSubAdminRoles,
  );

  // done
  app.get(
    '/introducer-user-single-data/:introId',
    validateIntroIdWithPagination,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    getIntroducerUserSingleData,
  );

  // done
  app.post(
    '/api/admin/reset-password',
    validateResetPassword,
    customErrorHandler,
    Authorize([string.superAdmin]),
    subAdminPasswordResetCode,
  );

  // done
  app.post(
    '/api/admin/user/reset-password',
    validateResetPassword,
    customErrorHandler,
    Authorize([string.superAdmin, string.createAdmin, string.createUser, string.profileView, string.userProfileView]),
    userPasswordResetCode,
  );

  // done
  app.post(
    '/api/admin/introducer/reset-password',
    validateResetPassword,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.createAdmin,
      string.createUser,
      string.profileView,
      string.introducerProfileView,
    ]),
    introducerPasswordResetCode,
  );

  // 
  app.post(
    '/api/admin/create/introducer/deposit-transaction',
    createIntroducerDepositTransactionValidator,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    createIntroducerDepositTransaction,
  );

  // done
  app.post(
    '/api/admin/create/introducer/withdraw-transaction',
    createIntroducerWithdrawalTransactionValidator,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    createIntroducerWithdrawTransaction,
  );

  // done
  app.get(
    '/api/admin/introducer-account-summary/:id',
    validateIntroducerAccountSummary,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    getIntroducerAccountSummary,
  );

  // done
  app.post(
    '/api/super-admin/reset-password',
    validatePasswordReset,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.websiteView,
      string.bankView,
      string.profileView,
      string.introducerProfileView,
      string.userProfileView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
      string.createWithdrawTransaction,
      string.createTransaction,
      string.createSubAdmin,
      string.createUser,
      string.createIntroducer,
    ]),
    SuperAdminPasswordResetCode,
  );

  //
  app.get(
    '/api/single-user-profile/:userId',
    validateUserId,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.userProfileView]),
    getSingleUserProfile,
  );

  // done
  app.put(
    '/api/admin/subAdmin-profile-edit/:adminId',
    update,
    customErrorHandler,
    Authorize([string.superAdmin]),
    updateSubAdminProfile,
  );

  // done
  app.get(
    '/api/view-subAdmin-transaction/:subAdminId', // In the subAdmin ID field, we are expecting the username.
    validateSubAdminId,
    customErrorHandler,
    Authorize([string.superAdmin, string.reportMyTxn]),
    viewSubAdminTransactions,
  );

  // done
  // no need to refactor this
  app.get(
    '/api/admin/account-summary',
    validatePagination,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.transactionView,
      string.transactionEditRequest,
      string.transactionDeleteRequest,
      string.websiteView,
      string.bankView,
    ]),
    accountSummary,
  );

  // response issue
  app.get(
    '/api/admin/introducer-live-balance/:introId',
    validateIntroId,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    async (req, res) => {
      try {
        const data = await introducerLiveBalance(req.params.introId);
        return apiResponseSuccess({ LiveBalance: data }, true, statusCode.success, 'success', res);
      } catch (error) {
        return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
      }
    },
  );

  // not need to refactor this
  app.get(
    '/api/introducer-profile/:page',
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView, string.createIntroducer]),
    introducerProfile,
  );

  // no need to refactor this
  app.get('/api/admin/view-sub-admins/:page', Authorize([string.superAdmin]), viewSubAdmins);

  // app.post(
  //   '/api/admin/filter-data',
  //   Authorize([
  //     'superAdmin',
  //     'Dashboard-View',
  //     'Transaction-View',
  //     'Transaction-Edit-Request',
  //     'Transaction-Delete-Request',
  //     'Website-View',
  //     'Bank-View',
  //     'report-all-txn',
  //   ]),
  //   async (req, res) => {
  //     const pool = await connectToDB();
  //     try {
  //       const { page, itemsPerPage } = req.query;
  //       const {
  //         transactionType,
  //         introducerList,
  //         subAdminList,
  //         BankList,
  //         WebsiteList,
  //         minAmount,
  //         maxAmount,
  //       } = req.body;

  //       const filter = {};

  //       if (transactionType) {
  //         filter.transactionType = transactionType;
  //       }
  //       if (introducerList) {
  //         filter.introducerUserName = introducerList;
  //       }
  //       if (subAdminList) {
  //         filter.subAdminName = subAdminList;
  //       }
  //       if (BankList) {
  //         filter.bankName = BankList;
  //       }
  //       if (WebsiteList) {
  //         filter.websiteName = WebsiteList;
  //       }

  //       let filterConditions = '';
  //       const filterKeys = Object.keys(filter);
  //       const filterValues = [];

  //       if (filterKeys.length > 0) {
  //         filterConditions = filterKeys
  //           .map((key) => {
  //             filterValues.push(filter[key]);
  //             return `${key} = ?`;
  //           })
  //           .join(' AND ');
  //       }

  //       let transactions = [];
  //       let websiteTransactions = [];
  //       let bankTransactions = [];

  //       if (filterConditions) {
  //         [transactions] = await database.execute(
  //             `SELECT * FROM Transaction WHERE ${filterConditions} ORDER BY createdAt DESC;`,
  //             filterValues,
  //         );
  //           console.log("filterValues", filterValues);
  //         [websiteTransactions] = await database.execute(
  //             `SELECT * FROM WebsiteTransaction WHERE ${filterConditions} ORDER BY createdAt DESC;`,
  //             filterValues,
  //         );

  //         [bankTransactions] = await database.execute(
  //             `SELECT * FROM BankTransaction WHERE ${filterConditions} ORDER BY createdAt DESC;`,
  //             filterValues,
  //         );
  //     }

  //       const filteredTransactions = transactions.filter((transaction) => {
  //         if (minAmount && maxAmount) {
  //           return transaction.amount >= minAmount && transaction.amount <= maxAmount;
  //         } else {
  //           return true;
  //         }
  //       });

  //       const filteredWebsiteTransactions = websiteTransactions.filter((transaction) => {
  //         if (minAmount && maxAmount) {
  //           return (
  //             (transaction.withdrawAmount >= minAmount && transaction.withdrawAmount <= maxAmount) ||
  //             (transaction.depositAmount >= minAmount && transaction.depositAmount <= maxAmount)
  //           );
  //         } else {
  //           return true;
  //         }
  //       });

  //       const filteredBankTransactions = bankTransactions.filter((transaction) => {
  //         if (minAmount && maxAmount) {
  //           return (
  //             (transaction.withdrawAmount >= minAmount && transaction.withdrawAmount <= maxAmount) ||
  //             (transaction.depositAmount >= minAmount && transaction.depositAmount <= maxAmount)
  //           );
  //         } else {
  //           return true;
  //         }
  //       });

  //       const allTransactions = [...filteredTransactions, ...filteredWebsiteTransactions, ...filteredBankTransactions];
  //       console.log("allTransactions", allTransactions);
  //       allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  //       const allIntroDataLength = allTransactions.length;
  //       let pageNumber = Math.floor(allIntroDataLength / 10 + 1);
  //       const skip = (page - 1) * itemsPerPage;
  //       const limit = parseInt(itemsPerPage);
  //       const paginatedResults = allTransactions.slice(skip, skip + limit);
  //       console.log("paginatedResults", paginatedResults);
  //       if (paginatedResults.length !== 0) {
  //         console.log("paginatedResults", paginatedResults);
  //         return res.status(200).json({ paginatedResults, pageNumber, allIntroDataLength });
  //       } else {
  //         const itemsPerPage = 10; // Specify the number of items per page

  //         const totalItems = allTransactions.length;
  //         const totalPages = Math.ceil(totalItems / itemsPerPage);

  //         let page = parseInt(req.query.page) || 1; // Get the page number from the request, default to 1 if not provided
  //         page = Math.min(Math.max(1, page), totalPages); // Ensure page is within valid range

  //         const skip = (page - 1) * itemsPerPage;
  //         const limit = Math.min(itemsPerPage, totalItems - skip); // Ensure limit doesn't exceed the number of remaining items
  //         const paginatedResults = allTransactions.slice(skip, skip + limit);

  //         const pageNumber = page;
  //         const allIntroDataLength = totalItems;

  //         return res.status(200).json({ paginatedResults, pageNumber, totalPages, allIntroDataLength });
  //       }
  //     } catch (error) {
  //       console.error('Error:', error);
  //       res.status(500).json({ message: 'Internal server error' });
  //     }
  //   },
  // );

  // app.post('/api/admin/introducer/introducerCut/:id', Authorize(['superAdmin']), async (req, res) => {
  //   try {
  //     const id = req.params.id;
  //     const { startDate, endDate } = req.body;
  //     await introducerUser.introducerPercentageCut(id, startDate, endDate);
  //     res.status(200).send({
  //       code: 200,
  //       message: 'Introducer Percentage Transferred successfully!',
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     res.status(e.code).send({ message: e.message });
  //   }
  // });
};
export default AccountRoute;

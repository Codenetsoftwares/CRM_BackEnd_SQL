import { database } from '../services/database.service.js';
import bcrypt from 'bcrypt';
import AccountServices, {
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
  subAdminPasswordResetCode,
  SuperAdminPasswordResetCode,
  updateSubAdminProfile,
  updateUserProfile,
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
} from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';
import { string } from '../constructor/string.js';

const AccountRoute = (app) => {
  // done
  app.post(
    '/api/create/user-admin',
    validateAdminCreate,
    customErrorHandler,
    Authorize([string.superAdmin, string.createSubAdmin]),
    createAdmin,     // tested by anuwesh- 23/07/24
  );

  // done
  app.post(
    '/api/admin/accounts/introducer/register',
    validateIntroducerCreate,
    customErrorHandler,
    Authorize([string.superAdmin, string.createIntroducer, string.createAdmin]),
    createIntroducerUser,    // tested by anuwesh- 23/07/24
  );

  // done
  // API To Edit User Profile
  app.put(
    '/api/admin/user-profile-edit/:userId',
    updateUserProfileValidators,
    customErrorHandler,
    Authorize([string.superAdmin, string.userProfileView, string.profileView]),
    updateUserProfile,      // tested by anuwesh- 23/07/24
  );

  // API To View User Profile
  // modify this as before
  app.get(
    '/api/user-profile/:page',
    Authorize([string.superAdmin, string.userProfileView, string.profileView]),
    getUserProfile,         // tested by anuwesh- 23/07/24
  );

  // done
  app.get(
    '/api/admin/sub-admin-name/bank-view',
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
    getSubAdminsWithBankView,            // tested by anuwesh- 23/07/24
  );

  // done
  app.get(
    '/api/admin/sub-admin-name',
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
    getAllSubAdmins,               // tested by anuwesh- 23/07/24
  );

  // done
  app.get(
    '/api/admin/sub-admin-name/website-view',
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
    getSubAdminsWithWebsiteView,    // tested by anuwesh- 23/07/24
  );

  // done
  app.put(
    '/api/admin/introducer-profile-edit/:introId',
    updateIntroducerValidationSchema,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    updateIntroducerProfile,       // tested by anuwesh- 23/07/24
  );

  // done
  app.get(
    '/api/introducer/client-data/:introId',
    validateIntroId,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    getClientData,                    // tested by anuwesh- 23/07/24
  );

  // done
  app.get(
    '/api/get-single-Introducer/:introId',
    validateIntroId,
    customErrorHandler,
    Authorize([string.superAdmin, string.profileView, string.introducerProfileView]),
    getSingleIntroducer,             //tested by anuwesh -23/07/24    
  );

  // done
  app.get(
    '/api/superAdmin/user-id',
    Authorize([
      string.superAdmin,
      string.dashboardView,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
      string.createTransaction,
    ]),
    getUserById,              //tested by anuwesh -23/07/24( doubt cleared).
  );

  // done
  app.get(
    '/api/superAdmin/Introducer-id',
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
    getIntroducerById,          //tested by anuwesh -23/07/24
  );

  // done
  app.post(
    '/api/admin/user/register',
    validateCreateUser,
    customErrorHandler,
    Authorize([string.superAdmin, string.createAdmin, string.createUser]),
    createUser,                // tested by anuwesh- 24/07/24           
  );

  // done
  app.post(
    '/api/admin/single-sub-admin/:adminId',
    validateAdminId,
    customErrorHandler,
    Authorize([string.superAdmin]),
    getSingleSubAdmin,           // tested by anuwesh- 24/07/24
  );

  // done
  app.put(
    '/api/admin/edit-subAdmin-roles/:adminId',
    validateEditSubAdminRoles,
    customErrorHandler,
    Authorize([string.superAdmin]),
    editSubAdminRoles,         // tested by anuwesh- 24/07/24
  );

  // done
  app.get(
    '/introducer-user-single-data/:introId',
    validateIntroId,
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

  // done
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
    '/api/admin/introducer-account-summary/:id', // in id actually we are getting user name
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

  //done
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

  app.get(
    '/api/view-subAdmin-transaction/:subAdminId',
    validateSubAdminId,
    customErrorHandler,
    Authorize([string.superAdmin, string.reportMyTxn]),
    viewSubAdminTransactions,
  );

  // no need to refactor this
  app.get(
    '/api/admin/account-summary',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
      'Website-View',
      'Bank-View',
    ]),
    async (req, res) => {
      try {
        const [transactions] = await database.execute(`SELECT * FROM Transaction ORDER BY createdAt DESC`);

        const [websiteTransactions] = await database.execute(
          `SELECT * FROM WebsiteTransaction ORDER BY createdAt DESC`,
        );

        const [bankTransactions] = await database.execute(`SELECT * FROM BankTransaction ORDER BY createdAt DESC`);

        const allTransactions = [...transactions, ...websiteTransactions, ...bankTransactions];
        allTransactions.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          if (dateA < dateB) {
            return 1;
          } else if (dateA > dateB) {
            return -1;
          } else {
            // If the dates are equal, sort by time in descending order
            return b.createdAt - a.createdAt;
          }
        });
        res.status(200).send(allTransactions);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

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

  app.get(
    '/api/admin/introducer-live-balance/:introId',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const [introLiveData] = await database.execute(`SELECT * FROM IntroducerUser WHERE introId = (?)`, [
          req.params.introId,
        ]);
        if (introLiveData.length === 0) {
          throw { code: 404, message: 'Introducer not found' };
        }
        const id = introLiveData[0].introId;
        console.log('id', id);
        const data = await AccountServices.introducerLiveBalance(id);
        console.log('data', data);
        res.send({ LiveBalance: data });
      } catch (e) {
        console.error(e);
        const statusCode = e.code || 500; // Default to 500 if code is not provided
        res.status(statusCode).send({ message: e.message });
      }
    },
  );

  // not need to refactor this
  app.get(
    '/api/introducer-profile/:page',
    Authorize(['superAdmin', 'Introducer-Profile-View', 'Profile-View', 'Create-Introducer']),
    async (req, res) => {
      const page = req.params.page;
      const userName = req.query.search;
      try {
        let [introducerUser] = await database.execute(`SELECT * FROM IntroducerUser`);

        // let introducerUser = await queryExecutor(query);

        let introData = introducerUser;

        // Filter introducer user data based on the search query
        if (userName) {
          introData = introData.filter((user) => user[0].userName.includes(userName));
          console.log('uuuu0', user.userName);
        }

        // Calculate balance for each introducer user
        for (let index = 0; index < introData.length; index++) {
          introData[index].balance = await AccountServices.getIntroBalance(introData[index].introId);
        }

        const allIntroDataLength = introData.length;
        let pageNumber = Math.floor(allIntroDataLength / 10) + 1;
        let SecondArray = [];
        const Limit = page * 10;

        for (let j = Limit - 10; j < Limit; j++) {
          if (introData[j] !== undefined) {
            SecondArray.push(introData[j]);
          }
        }

        if (SecondArray.length === 0) {
          return res.status(404).json({ message: 'No data' });
        }

        res.status(200).json({ SecondArray, pageNumber, allIntroDataLength });
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    },
  );

  // no need to refactor this
  app.get('/api/admin/view-sub-admins/:page', Authorize(['superAdmin']), async (req, res) => {
    const page = req.params.page;
    const searchQuery = req.query.search;
    try {
      let allIntroDataLength;
      if (searchQuery) {
        const [users] = await database.execute(`SELECT * FROM Admin WHERE userName LIKE '%${searchQuery}%';`);
        allIntroDataLength = users.length;
        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ users, pageNumber, allIntroDataLength });
      } else {
        const [introducerUser] = await database.execute(
          `SELECT * FROM Admin WHERE NOT JSON_CONTAINS(roles, '"superAdmin"');`,
        );
        const introData = introducerUser.slice((page - 1) * 10, page * 10);

        allIntroDataLength = introducerUser.length;

        if (introData.length === 0) {
          return res.status(404).json({ message: 'No data found for the selected criteria.' });
        }

        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ introData, pageNumber, allIntroDataLength });
      }
    } catch (e) {
      console.error('Error occurred:', e);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

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
};
export default AccountRoute;

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import AccountServices from '../services/Account.Services.js';
import { introducerUser } from '../services/introducer.services.js';
import { Authorize } from '../middleware/Authorize.js';
import UserServices from '../services/User.services.js';
import TransactionServices from '../services/Transaction.services.js';

var Pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Himanshu@10',
  database: 'CRM',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const query = async (sql, values) => {
  try {
    const [rows, fields] = await Pool.execute(sql, values);
    return rows;
  } catch (error) {
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const AccountRoute = (app) => {
  app.post('/admin/login', async (req, res) => {
    try {
      const { userName, password } = req.body;
      if (!userName) {
        throw { code: 400, message: 'User Name is required' };
      }

      if (!password) {
        throw { code: 400, message: 'Password is required' };
      }

      const admin = await query('SELECT * FROM Admin WHERE userName = ?', [userName]);

      if (admin.length === 0) {
        throw { code: 404, message: 'User not found' };
      }

      const user = admin[0];
      console.log('user', user);
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        throw { code: 401, message: 'Incorrect password' };
      }

      const accessToken = await AccountServices.generateAdminAccessToken(userName, password);

      if (!accessToken) {
        throw { code: 500, message: 'Failed to generate access token' };
      }

      res.status(200).send({
        token: accessToken,
        user: user,
      });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.post('/api/create/user-admin', async (req, res) => {
    try {
      await AccountServices.createAdmin(req.body);
      res.status(200).send({ code: 200, message: 'Admin registered successfully!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.post(
    '/api/admin/accounts/introducer/register',
    Authorize(['superAdmin', 'Create-Introducer', 'Create-Admin']),
    async (req, res) => {
      try {
        const user = req.user;
        await introducerUser.createintroducerUser(req.body, user);
        res.status(200).send({
          code: 200,
          message: 'Introducer User registered successfully!',
        });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  // API To View User Profile

  app.get(
    '/api/user-profile/:page',
    Authorize(['superAdmin', 'Profile-View', 'User-Profile-View']),
    async (req, res) => {
      const page = req.params.page;
      const searchQuery = req.query.search;
      try {
        let allIntroDataLength;

        if (searchQuery) {
          console.log('first');
          // Perform SQL query to search users based on the search query
          const users = await query(`SELECT * FROM User WHERE userName LIKE ?`, [`%${searchQuery}%`]);

          const SecondArray = users.map((user) => {
            return {
              // Map the fields you need to return
              userName: user.userName,
              // Add more fields as needed
            };
          });

          allIntroDataLength = SecondArray.length;
          const pageNumber = Math.ceil(allIntroDataLength / 10);
          res.status(200).json({ SecondArray, pageNumber, allIntroDataLength });
        } else {
          console.log('second');
          // Retrieve all users
          const introducerUser = await query(`SELECT * FROM User`);

          const introData = introducerUser.map((user) => {
            return {
              // Map the fields you need to return
              userName: user.userName,
              // Add more fields as needed
            };
          });

          console.log('introData', introData.length);

          const SecondArray = [];
          const Limit = page * 10;
          console.log('Limit', Limit);

          for (let j = Limit - 10; j < Limit; j++) {
            if (introData[j]) {
              SecondArray.push(introData[j]);
            }
            console.log('lenth', SecondArray.length);
          }

          allIntroDataLength = introData.length;

          if (SecondArray.length === 0) {
            return res.status(404).json({ message: 'No data found for the selected criteria.' });
          }

          const pageNumber = Math.ceil(allIntroDataLength / 10);
          res.status(200).json({ SecondArray, pageNumber, allIntroDataLength });
        }
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    },
  );

  // API To Edit User Profile

  app.put(
    '/api/admin/user-profile-edit/:id',
    Authorize(['superAdmin', 'User-Profile-View', 'Profile-View']),
    async (req, res) => {
      try {
        const id = await query(`SELECT * FROM User WHERE id = (?)`, [req.params.id]);
        // console.log("id", id);
        const updateResult = await AccountServices.updateUserProfile(id, req.body);
        console.log(updateResult);
        if (updateResult) {
          res.status(201).send('Profile updated');
        }
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/admin/sub-admin-name/bank-view',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
      'Website-View',
      'Bank-View',
      'Profile-View',
      'Introducer-Profile-View',
    ]),
    async (req, res) => {
      try {
        const result = await query(`SELECT userName FROM Admin WHERE FIND_IN_SET('Bank-View', roles) > 0;`);
        res.status(200).send(result);
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal server error' });
      }
    },
  );

  app.get(
    '/api/admin/sub-admin-name',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
      'Website-View',
      'Bank-View',
      'Profile-View',
      'Introducer-Profile-View',
    ]),
    async (req, res) => {
      try {
        const superAdmin = await query(`SELECT userName FROM Admin`);
        console.log('superAdmin', superAdmin);
        res.status(200).send(superAdmin);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/admin/sub-admin-name/website-view',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
      'Website-View',
      'Bank-View',
      'Profile-View',
      'Introducer-Profile-View',
    ]),
    async (req, res) => {
      try {
        const superAdmin = await query(`SELECT userName FROM Admin WHERE FIND_IN_SET('Website-View', roles) > 0;`);
        console.log('superAdmin', superAdmin);
        res.status(200).send(superAdmin);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

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
        const transactions = await query(`SELECT * FROM Transaction ORDER BY createdAt DESC`);

        const websiteTransactions = await query(`SELECT * FROM WebsiteTransaction ORDER BY createdAt DESC`);

        const bankTransactions = await query(`SELECT * FROM BankTransaction ORDER BY createdAt DESC`);

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

  app.post('/api/admin/introducer/introducerCut/:id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const id = req.params.id;
      const { startDate, endDate } = req.body;
      await introducerUser.introducerPercentageCut(id, startDate, endDate);
      res.status(200).send({
        code: 200,
        message: 'Introducer Percentage Transferred successfully!',
      });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get(
    '/api/admin/introducer-live-balance/:id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const id = await IntroducerUser.findById(req.params.id);
        console.log('id', id);
        const data = await introducerUser.introducerLiveBalance(id);
        console.log('data', data);
        res.send({ LiveBalance: data });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.put(
    '/api/admin/intoducer-profile-edit/:id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const id = await query(`SELECT * FROM IntroducerUser WHERE id = (?)`, [req.params.id]);
        const updateResult = await introducerUser.updateIntroducerProfile(id, req.body);
        console.log(updateResult);
        if (updateResult) {
          res.status(201).send('Profile updated');
        }
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/introducer-profile/:page',
    Authorize(['superAdmin', 'Introducer-Profile-View', 'Profile-View', 'Create-Introducer']),
    async (req, res) => {
      const page = req.params.page;
      const userName = req.query.search;
      try {
        let introducerUser = await query(`SELECT * FROM IntroducerUser`);
        // let introducerUser = await queryExecutor(query);

        let introData = introducerUser;

        // Filter introducer user data based on the search query
        if (userName) {
          introData = introData.filter((user) => user.userName.includes(userName));
        }

        // Calculate balance for each introducer user
        // for (let index = 0; index < introData.length; index++) {
        //   introData[index].balance = await AccountServices.getIntroBalance(
        //     introData[index]._id
        //   );
        // }

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

  app.get(
    '/api/introducer/client-data/:id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const id = req.params.id;
        const intoducer = await query(`SELECT * FROM IntroducerUser WHERE id = ${id};`);
        const introducerId = intoducer[0].userName;
        const introducerUserQuery = await query(`SELECT * FROM User WHERE introducersUserName = '${introducerId}';`);
        res.send(introducerUserQuery);
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    },
  );

  app.get(
    '/api/get-single-Introducer/:id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const id = req.params.id;
        // Assuming 'IntroducerUser' is a table in a relational database
        const result = await query(`SELECT * FROM IntroducerUser WHERE id = ${id};`);
        if (result.length === 0) {
          res.status(404).send({ message: 'Introducer not found' });
        } else {
          res.status(200).send(result[0]);
        }
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    },
  );

  app.get(
    '/api/superadmin/user-id',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
      'Create-Transaction',
    ]),
    async (req, res) => {
      try {
        const result = await query(`SELECT userName FROM User;`);
        res.status(200).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server error');
      }
    },
  );

  app.get(
    '/api/superadmin/Introducer-id',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
      'Create-Transaction',
      'Website-View',
      'Bank-View',
      'Profile-View',
      'Create-User',
      'Create-Admin',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
    ]),
    async (req, res) => {
      try {
        const result = await query(`SELECT userName FROM IntroducerUser;`);
        res.status(200).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server error');
      }
    },
  );

  app.post('/api/admin/user/register', Authorize(['superAdmin', 'Create-Admin', 'Create-User']), async (req, res) => {
    try {
      await UserServices.createUser(req.body);
      res.status(200).send({ code: 200, message: 'User registered successfully!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/admin/view-sub-admins/:page', Authorize(['superAdmin']), async (req, res) => {
    const page = req.params.page;
    const searchQuery = req.query.search;
    try {
      let allIntroDataLength;
      if (searchQuery) {
        console.log('first');
        const users = await query(`SELECT * FROM Admin WHERE userName LIKE '%${searchQuery}%';`);
        allIntroDataLength = users.length;
        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ users, pageNumber, allIntroDataLength });
      } else {
        console.log('second');
        const introducerUser = await query(`SELECT * FROM Admin WHERE roles NOT IN ('superAdmin');`);
        const introData = introducerUser.slice((page - 1) * 10, page * 10);
        console.log('introData', introData.length);

        allIntroDataLength = introducerUser.length;

        if (introData.length === 0) {
          return res.status(404).json({ message: 'No data found for the selected criteria.' });
        }

        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ introData, pageNumber, allIntroDataLength });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/single-sub-admin/:id', Authorize(['superAdmin']), async (req, res) => {
    try {
      if (!req.params.id) {
        throw { code: 400, message: "Sub Admin's Id not present" };
      }
      const subAdminId = req.params.id;
      const subAdmin = await query(`SELECT * FROM Admin WHERE id = ${subAdminId}`);
      if (!subAdmin) {
        throw { code: 500, message: 'Sub Admin not found with the given Id' };
      }
      res.status(200).send(subAdmin);
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.put('/api/admin/edit-subadmin-roles/:id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const subAdminId = req.params.id;
      const { roles } = req.body;
      if (!subAdminId) {
        throw { code: 400, message: 'Id not found' };
      }
      const result = await query(`UPDATE Admin SET roles = '${roles}' WHERE id = ${subAdminId};`);
      res.status(200).send(`Sub admin roles updated with ${roles}`);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get(
    '/introducer-user-single-data/:id',
    Authorize(['superAdmin', 'Introducer-Profile-View', 'Profile-View']),
    async (req, res) => {
      try {
        const id = req.params.id;
        const introducerUserResult = await query(`SELECT userName FROM IntroducerUser WHERE id = '${id}';`);
        const introducerUserName = introducerUserResult[0].userName;

        // Find users with introducersUserName matching introducerUser.userName
        const usersResult = await query(`
      SELECT *
      FROM User
      WHERE introducersUserName = '${introducerUserName}'
        OR introducersUserName1 = '${introducerUserName}'
        OR introducersUserName2 = '${introducerUserName}';
    `);

        if (usersResult.length === 0) {
          return res.status(404).send({ message: 'No matching users found' });
        }

        let filteredIntroducerUsers = [];

        usersResult.forEach((matchedUser) => {
          let filteredIntroducerUser = {
            _id: matchedUser._id,
            firstname: matchedUser.firstname,
            lastname: matchedUser.lastname,
            userName: matchedUser.userName,
            wallet: matchedUser.wallet,
            role: matchedUser.role,
            webSiteDetail: matchedUser.webSiteDetail,
            transactionDetail: matchedUser.transactionDetail,
          };

          let matchedIntroducersUserName = null;
          let matchedIntroducerPercentage = null;

          if (matchedUser.introducersUserName === introducerUserName) {
            matchedIntroducersUserName = matchedUser.introducersUserName;
            matchedIntroducerPercentage = matchedUser.introducerPercentage;
          } else if (matchedUser.introducersUserName1 === introducerUserName) {
            matchedIntroducersUserName = matchedUser.introducersUserName1;
            matchedIntroducerPercentage = matchedUser.introducerPercentage1;
          } else if (matchedUser.introducersUserName2 === introducerUserName) {
            matchedIntroducersUserName = matchedUser.introducersUserName2;
            matchedIntroducerPercentage = matchedUser.introducerPercentage2;
          }

          if (matchedIntroducersUserName) {
            filteredIntroducerUser.matchedIntroducersUserName = matchedIntroducersUserName;
            filteredIntroducerUser.introducerPercentage = matchedIntroducerPercentage;
            filteredIntroducerUsers.push(filteredIntroducerUser);
          }
        });

        return res.send(filteredIntroducerUsers);
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    },
  );

  app.post('/api/admin/reset-password', Authorize(['superAdmin']), async (req, res) => {
    try {
      const { userName, password } = req.body;
      await AccountServices.SubAdminPasswordResetCode(userName, password);
      res.status(200).send({ code: 200, message: 'Password reset successful!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.post(
    '/api/admin/user/reset-password',
    Authorize(['superAdmin', 'Create-User', 'Create-Admin', 'Profile-View', 'User-Profile-View']),
    async (req, res) => {
      try {
        const { userName, password } = req.body;
        await UserServices.userPasswordResetCode(userName, password);
        res.status(200).send({ code: 200, message: 'Password reset successful!' });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.post(
    '/api/admin/intorducer/reset-password',
    Authorize(['superAdmin', 'Create-Admin', 'Create-Introducer', 'Introducer-Profile-View', 'Profile-View']),
    async (req, res) => {
      try {
        const { userName, password } = req.body;
        await introducerUser.introducerPasswordResetCode(userName, password);
        res.status(200).send({ code: 200, message: 'Password reset successful!' });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.post(
    '/api/admin/filter-data',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
      'Website-View',
      'Bank-View',
      'report-all-txn',
    ]),
    async (req, res) => {
      try {
        const { page, itemsPerPage } = req.query;
        const {
          transactionType,
          introducerList,
          subAdminList,
          BankList,
          WebsiteList,
          sdate,
          edate,
          minAmount,
          maxAmount,
        } = req.body;

        let filterQuery = 'SELECT * FROM Transaction WHERE 1=1';

        if (transactionType) {
          filterQuery += ` AND transactionType = '${transactionType}'`;
        }
        if (introducerList) {
          filterQuery += ` AND introducerUserName IN (${introducerList.map((userName) => `'${userName}'`).join(',')})`;
        }
        if (subAdminList) {
          filterQuery += ` AND subAdminName IN (${subAdminList.map((subAdminName) => `'${subAdminName}'`).join(',')})`;
        }
        if (BankList) {
          filterQuery += ` AND bankName IN (${BankList.map((bankName) => `'${bankName}'`).join(',')})`;
        }
        if (WebsiteList) {
          filterQuery += ` AND websiteName IN (${WebsiteList.map((websiteName) => `'${websiteName}'`).join(',')})`;
        }
        if (sdate && edate) {
          filterQuery += ` AND createdAt >= '${sdate}' AND createdAt <= '${edate}'`;
        } else if (sdate) {
          filterQuery += ` AND createdAt >= '${sdate}'`;
        } else if (edate) {
          filterQuery += ` AND createdAt <= '${edate}'`;
        }

        const transactions = await query(filterQuery);

        const filteredTransactions = transactions.filter((transaction) => {
          if (minAmount && maxAmount) {
            return transaction.amount >= minAmount && transaction.amount <= maxAmount;
          } else {
            return true;
          }
        });

        const filteredWebsiteTransactions = await query(
          `SELECT * FROM WebsiteTransaction WHERE withdrawAmount >= ${minAmount} AND withdrawAmount <= ${maxAmount} OR depositAmount >= ${minAmount} AND depositAmount <= ${maxAmount}`,
        );

        const filteredBankTransactions = await query(
          `SELECT * FROM BankTransaction WHERE withdrawAmount >= ${minAmount} AND withdrawAmount <= ${maxAmount} OR depositAmount >= ${minAmount} AND depositAmount <= ${maxAmount}`,
        );

        const alltrans = [...filteredTransactions, ...filteredWebsiteTransactions, ...filteredBankTransactions];
        alltrans.sort((a, b) => b.createdAt - a.createdAt);

        const totalItems = alltrans.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const currentPage = parseInt(page) || 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

        const paginatedResults = alltrans.slice(startIndex, endIndex);

        return res.status(200).json({
          paginatedResults,
          pageNumber: currentPage,
          totalPages,
          allIntroDataLength: totalItems,
        });
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({
          message: e.message,
        });
      }
    },
  );

  app.post(
    '/api/admin/create/introducer/deposit-transaction',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const subAdminDetail = req.user;
        await TransactionServices.createIntroducerDepositTransaction(req, res, subAdminDetail);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.post(
    '/api/admin/create/introducer/withdraw-transaction',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const subAdminName = req.user;
        await TransactionServices.createIntroducerWithdrawTransaction(req, res, subAdminName);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/admin/introducer-account-summary/:id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      try {
        const id = req.params.id;
        // Query to retrieve introducer transactions for the specified user ID
        const introSummary = await query(
          `SELECT * FROM IntroducerTransaction WHERE introUserId = '${id}' ORDER BY createdAt DESC;`,
        );
        let balances = 0;
        // Calculate balances based on transaction type
        let accountData = JSON.parse(JSON.stringify(introSummary));
        accountData
          .slice(0)
          .reverse()
          .map((data) => {
            if (data.transactionType === 'Deposit') {
              balances += parseFloat(data.amount);
              data.balance = balances;
            } else {
              balances -= parseFloat(data.amount);
              data.balance = balances;
            }
          });
        res.status(200).send(accountData);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message || 'Internal server error' });
      }
    },
  );

  app.post(
    '/api/super-admin/reset-password',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Bank-View',
      'Website-View',
      'Profile-View',
      'User-Profile-View',
      'Introducer-Profile-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
      'Create-Transaction',
      'Create-SubAdmin',
      'Create-User',
      'Create-Introducer',
    ]),
    async (req, res) => {
      try {
        const { userName, oldPassword, password } = req.body;
        await AccountServices.SuperAdminPasswordResetCode(userName, oldPassword, password);
        res.status(200).send({ code: 200, message: 'Password reset successful!' });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/single-user-profile/:id',
    Authorize(['superAdmin', 'Profile-View', 'User-Profile-View']),
    async (req, res) => {
      try {
        const id = req.params.id;
        const userProfile = await query(`SELECT * FROM User WHERE id = '${id}';`);
        res.status(200).send(userProfile);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.put('/api/admin/subAdmin-profile-edit/:id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const id = await query(`SELECT * FROM Admin WHERE id = '${req.params.id}'`);
      const updateResult = await AccountServices.updateSubAdminProfile(id, req.body);
      console.log(updateResult);
      if (updateResult) {
        res.status(201).send('Profile updated');
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get(
    '/api/view-subadmin-transaction/:subadminId',
    Authorize(['superAdmin', 'report-my-txn']),
    async (req, res) => {
      try {
        const userId = req.params.subadminId;

        const transaction = await query(
          `SELECT * FROM Transaction WHERE subAdminId = '${userId}' ORDER BY createdAt DESC;`,
        );

        const bankTransaction = await query(
          `SELECT * FROM BankTransaction WHERE subAdminId = '${userId}' ORDER BY createdAt DESC;`,
        );

        const webisteTransaction = await query(
          `SELECT * FROM WebsiteTransaction WHERE subAdminId = '${userId}' ORDER BY createdAt DESC;`,
        );

        if (!transaction && !bankTransaction && !webisteTransaction) {
          return res.status(404).send({ message: 'No transaction found' });
        }
        const allTransactions = [...transaction, ...bankTransaction, ...webisteTransaction];
        allTransactions.sort((a, b) => b.createdAt - a.createdAt);
        res.status(200).send(allTransactions);
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal server error' });
      }
    },
  );
};

export default AccountRoute;

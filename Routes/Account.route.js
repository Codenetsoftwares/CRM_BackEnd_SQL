import connectToDB from '../db/db.js';
import bcrypt from 'bcrypt';
import AccountServices from '../services/Account.Services.js';
import { introducerUser } from '../services/introducer.services.js';
import { Authorize } from '../middleware/Authorize.js';
import UserServices from '../services/User.services.js';
import TransactionServices from '../services/Transaction.services.js';

const AccountRoute = (app) => {
  app.post('/admin/login', async (req, res) => {
    const pool = await connectToDB();
    try {
      const { userName, password } = req.body;
      if (!userName) {
        throw { code: 400, message: 'User Name is required' };
      }

      if (!password) {
        throw { code: 400, message: 'Password is required' };
      }

      const [admin] = await pool.execute('SELECT * FROM Admin WHERE userName = ?', [userName]);

      if (admin.length === 0) {
        throw { code: 404, message: 'User not found' };
      }

      const user = admin[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        throw { code: 401, message: 'Incorrect password' };
      }

      const accessToken = await AccountServices.generateAdminAccessToken(userName, password);

      if (!accessToken) {
        throw { code: 500, message: 'Failed to generate access token' };
      }
      res.status(200).send({ code: 200, message: 'Login Successfully', token: accessToken });
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
      res.status(e.code || 500).json({ message: e.message || 'Internal Server Error' });
    }
  });

  app.post(
    '/api/admin/accounts/introducer/register',
    Authorize(['superAdmin', 'Create-Introducer', 'Create-Admin']),
    async (req, res) => {
      try {
        const user = req.user;
        console.log('user', user);
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
      const pool = await connectToDB();
      const page = req.params.page;
      const searchQuery = req.query.search;
      try {
        let allIntroDataLength;
        if (searchQuery) {
          console.log('first');
          let SecondArray = [];
          const [users] = await pool.execute(`SELECT * FROM User WHERE userName LIKE ?`, [`%${searchQuery}%`]);

          // Loop through users and fetch UserTransactionDetail for each user
          for (const user of users) {
            const [userTransactionDetail] = await pool.execute(
              `SELECT * FROM UserTransactionDetail WHERE user_ID = ?`,
              [user.user_id],
            );
            user.UserTransactionDetail = userTransactionDetail;
            SecondArray.push(user);
          }

          allIntroDataLength = SecondArray.length;
          const pageNumber = Math.ceil(allIntroDataLength / 10);
          res.status(200).json({ SecondArray, pageNumber, allIntroDataLength });
        } else {
          console.log('second');
          let [introducerUser] = await pool.execute(`SELECT * FROM User`);
          let introData = JSON.parse(JSON.stringify(introducerUser));
          console.log('introData', introData.length);

          const SecondArray = [];
          const Limit = page * 10;
          console.log('Limit', Limit);

          for (let j = Limit - 10; j < Limit && j < introData.length; j++) {
            const user = introData[j];

            // Fetch UserTransactionDetail for each user
            const [userTransactionDetail] = await pool.execute(
              `SELECT * FROM UserTransactionDetail WHERE user_ID = ?`,
              [user.user_id],
            );
            user.UserTransactionDetail = userTransactionDetail;

            SecondArray.push(user);
            console.log('length', SecondArray.length);
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
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  // API To Edit User Profile

  app.put(
    '/api/admin/user-profile-edit/:user_id',
    Authorize(['superAdmin', 'User-Profile-View', 'Profile-View']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const [id] = await pool.execute(`SELECT * FROM User WHERE user_id = (?)`, [req.params.user_id]);

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
      const pool = await connectToDB();
      try {
        const [result] = await pool.execute(`SELECT userName FROM Admin WHERE roles LIKE '%Bank-View%'`);
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
      const pool = await connectToDB();
      try {
        const [superAdmin] = await pool.execute(`SELECT userName FROM Admin`);
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
      const pool = await connectToDB();
      try {
        const [superAdmin] = await pool.execute(`SELECT userName FROM Admin WHERE roles LIKE '%Website-View%'`);
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
      const pool = await connectToDB();
      try {
        const [transactions] = await pool.execute(`SELECT * FROM Transaction ORDER BY createdAt DESC`);

        const [websiteTransactions] = await pool.execute(`SELECT * FROM WebsiteTransaction ORDER BY createdAt DESC`);

        const [bankTransactions] = await pool.execute(`SELECT * FROM BankTransaction ORDER BY createdAt DESC`);

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
    '/api/admin/introducer-live-balance/:intro_id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const [introLivedata] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [
          req.params.intro_id,
        ]);
        if (introLivedata.length === 0) {
          throw { code: 404, message: 'Introducer not found' };
        }
        const id = introLivedata[0].intro_id;
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

  app.put(
    '/api/admin/intoducer-profile-edit/:intro_id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const [id] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [req.params.intro_id]);
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
      const pool = await connectToDB();
      const page = req.params.page;
      const userName = req.query.search;
      try {
        let [introducerUser] = await pool.execute(`SELECT * FROM IntroducerUser`);

        // let introducerUser = await queryExecutor(query);

        let introData = introducerUser;

        // Filter introducer user data based on the search query
        if (userName) {
          introData = introData.filter((user) => user[0].userName.includes(userName));
          console.log('uuuu0', user.userName);
        }

        // Calculate balance for each introducer user
        for (let index = 0; index < introData.length; index++) {
          introData[index].balance = await AccountServices.getIntroBalance(introData[index].intro_id);
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

  app.get(
    '/api/introducer/client-data/:id',
    Authorize(['superAdmin', 'Profile-View', 'Introducer-Profile-View']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const id = req.params.id;
        const [intoducer] = await pool.execute(`SELECT * FROM IntroducerUser WHERE id = ${id};`);
        const introducerId = intoducer[0].userName;
        const introducerUserQuery = await pool.execute(
          `SELECT * FROM User WHERE introducersUserName = '${introducerId}';`,
        );
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
      const pool = await connectToDB();
      try {
        const id = req.params.id;
        // Assuming 'IntroducerUser' is a table in a relational database
        const [result] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = ?`, [id]);
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
      const pool = await connectToDB();
      try {
        const [result] = await pool.execute(`SELECT userName FROM User;`);
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
      const pool = await connectToDB();
      try {
        const [result] = await pool.execute(`SELECT userName,intro_id FROM IntroducerUser;`);
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
    const pool = await connectToDB();
    try {
      let allIntroDataLength;
      if (searchQuery) {
        console.log('first');
        const [users] = await pool.execute(`SELECT * FROM Admin WHERE userName LIKE '%${searchQuery}%';`);
        allIntroDataLength = users.length;
        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ users, pageNumber, allIntroDataLength });
      } else {
        console.log('second');
        const [introducerUser] = await pool.execute(`SELECT * FROM Admin WHERE roles NOT IN ('superAdmin');`);
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

  app.post('/api/admin/single-sub-admin/:admin_id', Authorize(['superAdmin']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const id = req.params.admin_id;
      console.log('iddd', id);
      if (!id) {
        throw { code: 400, message: "Sub Admin's Id not present" };
      }
      const [subAdmin] = await pool.execute(`SELECT * FROM Admin WHERE admin_id = ?`, [id]);
      if (!subAdmin) {
        throw { code: 500, message: 'Sub Admin not found with the given Id' };
      }
      res.status(200).send(subAdmin);
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.put('/api/admin/edit-subadmin-roles/:admin_id', Authorize(['superAdmin']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const subAdminId = req.params.admin_id;
      const { roles } = req.body;
      if (!subAdminId) {
        throw { code: 400, message: 'Id not found' };
      }
      // Fetch existing roles from the database
      const [existingRolesRow] = await pool.execute('SELECT roles FROM Admin WHERE admin_id = ?', [subAdminId]);
      const existingRoles = existingRolesRow[0].roles;
      // Merge existing roles with new roles
      const updatedRoles = [...existingRoles, ...roles];
      // Update roles in the database
      const [result] = await pool.execute('UPDATE Admin SET roles = ? WHERE admin_id = ?', [updatedRoles, subAdminId]);
      res.status(200).send(`Subadmin roles updated with ${JSON.stringify(updatedRoles)}`);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get(
    '/introducer-user-single-data/:id',
    Authorize(['superAdmin', 'Introducer-Profile-View', 'Profile-View']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const id = req.params.id;
        const [introducerUserResult] = await pool.execute(`SELECT userName FROM IntroducerUser WHERE id = '${id}';`);
        const introducerUserName = introducerUserResult[0].userName;

        // Find users with introducersUserName matching introducerUser.userName
        const usersResult = await pool.execute(`
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
      const pool = await connectToDB();
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

        const filter = {};

        if (transactionType) {
          filter.transactionType = transactionType;
        }
        if (introducerList) {
          filter.introducerUserName = introducerList;
        }
        if (subAdminList) {
          filter.subAdminName = subAdminList;
        }
        if (BankList) {
          filter.bankName = BankList;
        }
        if (WebsiteList) {
          filter.websiteName = WebsiteList;
        }
        // if (sdate && edate) {
        //   const startDate = new Date(sdate).toISOString().slice(0, 19).replace('T', ' ');
        //   const endDate = new Date(edate).toISOString().slice(0, 19).replace('T', ' ');
        //   filter.createdAt = `${startDate} AND ${endDate}`;
        // } else if (sdate) {
        //   const startDate = new Date(sdate).toISOString().slice(0, 19).replace('T', ' ');
        //   filter.createdAt = `>= '${startDate}'`;
        // } else if (edate) {
        //   const endDate = new Date(edate).toISOString().slice(0, 19).replace('T', ' ');
        //   filter.createdAt = `<= '${endDate}'`;
        // }

        console.log('Filter:', filter);

        let filterConditions = '';
        const filterKeys = Object.keys(filter);
        if (filterKeys.length > 0) {
          filterConditions = filterKeys.map((key) => `${key} = '${filter[key]}'`).join(' AND ');
        }

        console.log('Filter Conditions:', filterConditions);

        let transactions = [];
        let websiteTransactions = [];
        let bankTransactions = [];

        if (filterConditions) {
          [transactions] = await pool.execute(
            `SELECT * FROM Transaction WHERE ${filterConditions} ORDER BY createdAt DESC;`,
          );
          [websiteTransactions] = await pool.execute(
            `SELECT * FROM WebsiteTransaction WHERE ${filterConditions} ORDER BY createdAt DESC;`,
          );
          [bankTransactions] = await pool.execute(
            `SELECT * FROM BankTransaction WHERE ${filterConditions} ORDER BY createdAt DESC;`,
          );
        }

        const filteredTransactions = transactions.filter((transaction) => {
          if (minAmount && maxAmount) {
            return transaction.amount >= minAmount && transaction.amount <= maxAmount;
          } else {
            return true;
          }
        });

        const filteredWebsiteTransactions = websiteTransactions.filter((transaction) => {
          if (minAmount && maxAmount) {
            return (
              (transaction.withdrawAmount >= minAmount && transaction.withdrawAmount <= maxAmount) ||
              (transaction.depositAmount >= minAmount && transaction.depositAmount <= maxAmount)
            );
          } else {
            return true;
          }
        });

        const filteredBankTransactions = bankTransactions.filter((transaction) => {
          if (minAmount && maxAmount) {
            return (
              (transaction.withdrawAmount >= minAmount && transaction.withdrawAmount <= maxAmount) ||
              (transaction.depositAmount >= minAmount && transaction.depositAmount <= maxAmount)
            );
          } else {
            return true;
          }
        });

        const allTransactions = [...filteredTransactions, ...filteredWebsiteTransactions, ...filteredBankTransactions];
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const totalItems = allTransactions.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        let pageNumber = parseInt(page) || 1;
        pageNumber = Math.min(Math.max(1, pageNumber), totalPages);
        const skip = (pageNumber - 1) * itemsPerPage;
        const limit = Math.min(itemsPerPage, totalItems - skip);
        const paginatedResults = allTransactions.slice(skip, skip + limit);

        res.status(200).json({ paginatedResults, pageNumber, totalPages, totalItems });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
      const pool = await connectToDB();
      try {
        const id = req.params.id;
        // Query to retrieve introducer transactions for the specified user ID
        const [introSummary] = await pool.execute(
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
    '/api/single-user-profile/:user_id',
    Authorize(['superAdmin', 'Profile-View', 'User-Profile-View']),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const id = req.params.user_id;
        const [userProfile] = await pool.execute(`SELECT * FROM User WHERE user_id = ?`, [id]);

        if (userProfile.length === 0) {
          return res.status(404).send({ message: 'User not found' });
        }

        // Fetch UserTransactionDetail for the user
        const [userTransactionDetail] = await pool.execute(`SELECT * FROM UserTransactionDetail WHERE user_ID = ?`, [
          id,
        ]);
        userProfile[0].UserTransactionDetail = userTransactionDetail;

        res.status(200).send(userProfile);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
      }
    },
  );

  app.put('/api/admin/subAdmin-profile-edit/:admin_id', Authorize(['superAdmin']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const adminId = req.params.admin_id;
      const [id] = await pool.execute(`SELECT * FROM Admin WHERE admin_id = ? `, [adminId]);
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
      const pool = await connectToDB();
      try {
        const userId = req.params.subadminId;

        const [transaction] = await pool.execute(
          `SELECT * FROM Transaction WHERE subAdminId = '${userId}' ORDER BY createdAt DESC;`,
        );

        const [bankTransaction] = await pool.execute(
          `SELECT * FROM BankTransaction WHERE subAdminId = '${userId}' ORDER BY createdAt DESC;`,
        );

        const [webisteTransaction] = await pool.execute(
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

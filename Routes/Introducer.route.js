import { introducerUser } from '../services/introducer.services.js';
import AccountServices from '../services/Account.Services.js';
import { AuthorizeRole } from '../middleware/auth.js';
import { database } from '../services/database.service.js';
import customErrorHandler from '../utils/customErrorHandler.js';

export const IntroducerRoutes = (app) => {

  app.get('/api/intoducer/profile', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const id = req.user[0].intro_id;
      const [IntroUser] = await database.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [id]);
      const introUserId = id;
      const TPDLT = await AccountServices.IntroducerBalance(introUserId);
      const response = {
        intro_id: IntroUser[0].intro_id,
        firstName: IntroUser[0].firstName,
        lastName: IntroUser[0].lastName,
        role: IntroUser[0].role,
        userName: IntroUser[0].userName,
        balance: Number(TPDLT),
      };
      const liveBalance = await AccountServices.introducerLiveBalance(introUserId);
      const currentDue = liveBalance - response.balance;
      response.currentDue = currentDue;
      res.status(201).send(response);
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message }); // Assuming 500 for internal server error
    }
  });

  app.put('/api/intoducer-profile-edit/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const userId = req.params.intro_id;
      const [introUser] = await database.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [userId]);
      const updateResult = await introducerUser.updateIntroducerProfile(introUser, req.body);
      console.log(updateResult);
      if (updateResult) {
        res.status(201).send('Profile updated');
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  // // Not in user
  // app.get('/api/introducer/user-data/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
  //   const pool = await connectToDB();
  //   try {
  //     const id = req.params.intro_id;
  //     const [introducerResult] = await database.execute(`SELECT * FROM IntroducerUser WHERE intro_id = ?`, [id]);
  //     if (introducerResult.length === 0) {
  //       throw {
  //         code: 404,
  //         message: `Introducer User not found with id: ${id}`,
  //       };
  //     }
  //     const introducer = introducerResult[0];
  //     const introducerId = introducer.introducerId;
  //     const [usersResult] = await database.execute(`SELECT * FROM User WHERE introducersUserId = ?`, [introducerId]);
  //     res.send(usersResult);
  //   } catch (e) {
  //     console.error(e);
  //     res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
  //   }
  // });

  app.get('/api/list-introducer-user/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const id = req.params.intro_id;
      const [introducerUser] = await database.execute(`SELECT userName FROM IntroducerUser WHERE intro_id = ?`, [id]);
      if (introducerUser.length === 0) {
        return res.status(404).send({ message: 'IntroducerUser not found' });
      }

      const introducerUserName = introducerUser[0].userName;
      const [users] = await database.execute(
        `SELECT * FROM User WHERE introducersUserName = ? OR introducersUserName1 = ? OR introducersUserName2 = ?`,
        [introducerUserName, introducerUserName, introducerUserName],
      );

      const usersWithTransactionDetails = [];
      for (const userData of users) {
        const [userTransactionDetail] = await database.execute(`SELECT * FROM UserTransactionDetail WHERE userName = ?`, [
          userData.userName,
        ]);
        userData.UserTransactionDetail = userTransactionDetail;
        usersWithTransactionDetails.push(userData);
      }
      res.send(usersWithTransactionDetails);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  // app.get('/api/introducer-user-single-data/:id', AuthorizeRole(['introducer']), async (req, res) => {
  //   const pool = await connectToDB();
  //   try {
  //     const id = req.params.id;
  //     const introducerId = req.user.introducerId;
  //     const query = `SELECT * FROM User WHERE _id = ? AND introducersUserId = ?`;
  //     const [introducerUser] = await database.execute(query, [id, introducerId]);
  //     res.send(introducerUser);
  //   } catch (e) {
  //     console.error(e);
  //     res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
  //   }
  // });

  app.get('/api/introducer-user-single-data/:user_id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const id = req.params.user_id;
      const user = req.user;
      const introUser = user[0].userName;
      const [introducerUser] = await database.execute(`SELECT * FROM User WHERE user_id = ?`, [id]);
      console.log('introoooooo0', introducerUser);

      // Check if introducerUser exists
      if (!introducerUser || introducerUser.length === 0) {
        return res.status(404).send({ message: 'User not found' });
      }

      const userRecord = introducerUser[0]; // Access the user object

      let filteredIntroducerUser = {
        user_id: userRecord.user_id,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        userName: userRecord.userName,
        wallet: userRecord.wallet,
        role: userRecord.role,
        transactionDetail: null, // Initialize to null
      };

      // Fetching and attaching transaction details for the user
      const [userTransactionDetail] = await database.execute(
        `SELECT * FROM UserTransactionDetail WHERE userName = ?`,
        [userRecord.userName], // Accessing userName from the user object
      );
      filteredIntroducerUser.transactionDetail = userTransactionDetail;

      console.log('filteredIntroducerUser', filteredIntroducerUser);
      let matchedIntroducersUserName = null;
      let matchedIntroducerPercentage = null;

      // Check if req.user.UserName exists in introducerUser's introducersUserName, introducersUserName1, or introducersUserName2 fields
      if (userRecord.introducersUserName === introUser) {
        matchedIntroducersUserName = userRecord.introducersUserName;
        matchedIntroducerPercentage = userRecord.introducerPercentage;
      } else if (userRecord.introducersUserName1 === introUser) {
        matchedIntroducersUserName = userRecord.introducersUserName1;
        matchedIntroducerPercentage = userRecord.introducerPercentage1;
      } else if (userRecord.introducersUserName2 === introUser) {
        matchedIntroducersUserName = userRecord.introducersUserName2;
        matchedIntroducerPercentage = userRecord.introducerPercentage2;
      }

      // If matched introducersUserName found, include it along with percentage in the response
      if (matchedIntroducersUserName) {
        filteredIntroducerUser.matchedIntroducersUserName = matchedIntroducersUserName;
        filteredIntroducerUser.introducerPercentage = matchedIntroducerPercentage;
        return res.send(filteredIntroducerUser);
      } else {
        return res.status(403).send({ message: 'Unauthorized' });
      }
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/introducer/introducer-live-balance/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const introId = req.params.intro_id;
      const [introData] = await database.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [introId]);
      const id = introData[0].intro_id;
      const data = await AccountServices.introducerLiveBalance(id);
      console.log('data', data);
      res.send({ LiveBalance: data });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/introducer-account-summary/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const introUserId = req.params.intro_id;
      const query = `
            SELECT *
            FROM IntroducerTransaction
            WHERE introUserId = ?
            ORDER BY createdAt ASC
          `;
      const [introSummary] = await database.execute(query, [introUserId]);
      res.status(200).send(introSummary);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.post('/api/introducer/reset-password', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const { userName, password } = req.body;
      await introducerUser.introducerPasswordResetCode(userName, password);
      res.status(200).send({ code: 200, message: 'Password reset successful!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get(
    '/api/introducer-user/accountsummary/:introducerUsername',
    AuthorizeRole(['introducer']),
    async (req, res) => {
      try {
        const introUserName = req.params.introducerUsername;
        const [users] = await database.execute(
          `SELECT * FROM User WHERE introducersUserName = ? OR introducersUserName1 = ? OR introducersUserName2 = ?`,
          [introUserName, introUserName, introUserName],
        );

        const transactions = [];
        for (const userData of users) {
          const [userTransactions] = await database.execute(`SELECT * FROM UserTransactionDetail WHERE userName = ?`, [
            userData.userName,
          ]);
          for (const transaction of userTransactions) {
            const formattedTransaction = {
              AccountNumber: transaction.accountNumber,
              BankName: transaction.bankName,
              WebsiteName: transaction.websiteName,
              Amount: transaction.amount,
              PaymentMethod: transaction.paymentMethod,
              TransactionID: transaction.transactionID,
              TransactionType: transaction.transactionType,
              Introducer: transaction.introducerUserName,
              SubAdminName: transaction.subAdminName,
              UserName: transaction.userName,
              Remarks: transaction.remarks,
              createdAt: transaction.createdAt,
            };
            transactions.push(formattedTransaction);
          }
        }
        res.send(transactions);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
      }
    },
  );
};
export default IntroducerRoutes;

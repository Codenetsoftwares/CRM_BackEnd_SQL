import AccountServices from '../services/Account.Services.js';
import WebsiteServices from '../services/WebSite.Service.js';
import BankServices from '../services/Bank.services.js';
import connectToDB from '../db/db.js';
import { v4 as uuidv4 } from 'uuid';

const TransactionServices = {
  createTransaction: async (req, res, subAdminName) => {
    const pool = await connectToDB();
    try {
      const {
        transactionID,
        transactionType,
        amount,
        paymentMethod,
        userName,
        subAdminId,
        accountNumber,
        websiteName,
        bankName,
        bankCharges,
        bonus,
        remarks,
      } = req.body;
      if (!transactionID) {
        throw { code: 400, message: 'Transaction ID is required' };
      }

      if (!amount || isNaN(amount)) {
        throw { code: 400, message: 'Amount is required and must be a number' };
      }

      if (!paymentMethod) {
        throw { code: 400, message: 'Payment Method is required' };
      }

      // Checking if transactionId is reusable or not
      const [existingTransaction] = await pool.execute(
        `SELECT * FROM Transaction WHERE transactionID = ? AND createdAt >= NOW() - INTERVAL 2 DAY;`,
        [transactionID],
      );

      if (existingTransaction.length > 0) {
        return res
          .status(400)
          .json({ status: false, message: 'Transaction ID is already in use. Please try again after 48 hours.' });
      }

      // Website
      const [dbWebsiteData] = await pool.execute('SELECT * FROM Website WHERE websiteName = ?', [websiteName]);

      if (!dbWebsiteData) {
        throw { code: 404, message: 'Website data not found' };
      }
      const websiteId = dbWebsiteData[0].website_id;

      const websiteBalance = await WebsiteServices.getWebsiteBalance(pool, websiteId);
      const totalBalance = parseFloat(bonus) + parseFloat(amount);
      if (websiteBalance < totalBalance) {
        throw { code: 400, message: 'Insufficient Website balance' };
      }

      // Bank
      const [dbBankData] = await pool.execute('SELECT * FROM Bank WHERE bankName = ?', [bankName]);

      if (!dbBankData) {
        throw { code: 404, message: 'Bank data not found' };
      }
      const bankId = dbBankData[0].bank_id;
      const bankBalance = await BankServices.getBankBalance(pool, bankId);
      const totalBankBalance = parseFloat(bankCharges) + parseFloat(amount);
      if (bankBalance < totalBankBalance) {
        throw { code: 400, message: 'Insufficient Bank balance' };
      }

      // User
      const [user] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Introducer
      const introducersUserName = user[0].introducersUserName;

      // Calculation of Deposit---- Amount will transfer from Website to Bank (Bonus)
      if (transactionType === 'Deposit') {
        const newTransaction = {
          bankId: dbBankData[0].bank_id,
          websiteId: dbWebsiteData[0].website_id,
          transactionID: transactionID,
          transactionType: transactionType,
          amount: amount,
          paymentMethod: paymentMethod,
          subAdminId: subAdminName[0].userName,
          subAdminName: subAdminName[0].firstname,
          userName: userName,
          accountNumber: accountNumber,
          bankName: bankName,
          websiteName: websiteName,
          bonus: bonus,
          remarks: remarks,
          introducerUserName: introducersUserName,
          createdAt: new Date(),
        };
        const Transaction_Id = uuidv4();
        const incertData = `INSERT INTO Transaction (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, 
          amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, 
          createdAt, Transaction_Id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertData, [
          newTransaction.bankId,
          newTransaction.websiteId,
          newTransaction.subAdminId,
          newTransaction.subAdminName,
          newTransaction.transactionID,
          newTransaction.transactionType,
          newTransaction.amount,
          newTransaction.paymentMethod,
          newTransaction.userName,
          newTransaction.introducerUserName,
          newTransaction.bonus,
          newTransaction.bankCharges || null,
          newTransaction.remarks,
          newTransaction.accountNumber || null,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
          Transaction_Id || null,
        ]);

        //  Incert Data into User
        const [user] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);

        if (!user) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const user_ID = user[0].user_id;
        const Id = Transaction_Id;
        const incertUserData = `INSERT INTO UserTransactionDetail (user_ID, Transaction_id ,bankId, websiteId, subAdminName, transactionID,
        transactionType, amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName,
        websiteName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertUserData, [
          user_ID,
          Id,
          newTransaction.bankId,
          newTransaction.websiteId,
          newTransaction.subAdminName,
          newTransaction.transactionID,
          newTransaction.transactionType,
          newTransaction.amount,
          newTransaction.paymentMethod,
          newTransaction.userName,
          newTransaction.introducerUserName,
          newTransaction.bonus,
          newTransaction.bankCharges || null,
          newTransaction.remarks,
          newTransaction.accountNumber || null,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
        ]);
      }
      // Calculation of Withdraw---- Amount will transfer from Bank to Website (Bank Charge)
      if (transactionType === 'Withdraw') {
        const newTransaction = {
          bankId: dbBankData[0].bank_id,
          websiteId: dbWebsiteData[0].website_id,
          transactionID: transactionID,
          transactionType: transactionType,
          amount: amount,
          paymentMethod: paymentMethod,
          subAdminId: subAdminName[0].userName,
          subAdminName: subAdminName[0].firstname,
          userName: userName,
          accountNumber: accountNumber,
          bankName: bankName,
          websiteName: websiteName,
          bankCharges: bankCharges,
          remarks: remarks,
          introducerUserName: introducersUserName,
          createdAt: new Date(),
          isSubmit: false,
        };
        const Transaction_Id = uuidv4();
        const incertData = `INSERT INTO Transaction (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, 
          amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, 
          createdAt, Transaction_Id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(incertData, [
          newTransaction.bankId,
          newTransaction.websiteId,
          newTransaction.subAdminId,
          newTransaction.subAdminName,
          newTransaction.transactionID,
          newTransaction.transactionType,
          newTransaction.amount,
          newTransaction.paymentMethod,
          newTransaction.userName,
          newTransaction.introducerUserName,
          newTransaction.bonus || null,
          newTransaction.bankCharges,
          newTransaction.remarks,
          newTransaction.accountNumber || null,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
          Transaction_Id || null,
        ]);

        //  Incert Data into User
        const [user] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);

        if (!user) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const user_ID = user[0].user_id;
        const Id = Transaction_Id;
        const incertUserData = `INSERT INTO UserTransactionDetail (user_ID, Transaction_id ,bankId, websiteId, subAdminName, transactionID,
        transactionType, amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName,
        websiteName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertUserData, [
          user_ID,
          Id,
          newTransaction.bankId,
          newTransaction.websiteId,
          newTransaction.subAdminName,
          newTransaction.transactionID,
          newTransaction.transactionType,
          newTransaction.amount,
          newTransaction.paymentMethod,
          newTransaction.userName,
          newTransaction.introducerUserName,
          newTransaction.bonus || null,
          newTransaction.bankCharges,
          newTransaction.remarks,
          newTransaction.accountNumber || null,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
        ]);
      }
      return res.status(200).json({ status: true, message: 'Transaction created successfully' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal server error' });
    }
  },

  withdrawView: async (req, res) => {
    const pool = await connectToDB();
    try {
      const [withdraws] = await pool.execute(
        'SELECT * FROM `Transaction` WHERE transactionType = ? ORDER BY createdAt DESC',
        ['Withdraw'],
      );
      let sum = 0;
      for (let i = 0; i < withdraws.length; i++) {
        sum = sum + parseFloat(withdraws[i].amount);
      }
      res.send({ totalWithdraws: sum, withdraws: withdraws });
    } catch (error) {
      return res.status(500).json({ status: false, message: error });
    }
  },

  depositView: async (req, res) => {
    const pool = await connectToDB();
    try {
      const [deposits] = await pool.execute(
        'SELECT * FROM `Transaction` WHERE transactionType = ? ORDER BY createdAt DESC',
        ['Deposit'],
      );
      let sum = 0;
      for (let i = 0; i < deposits.length; i++) {
        sum += parseFloat(deposits[i].amount);
      }

      res.json({ totalDeposits: sum, deposits: deposits });
    } catch (error) {
      return res.status(500).json({ status: false, message: error });
    }
  },

  createIntroducerDepositTransaction: async (req, res, subAdminDetail) => {
    const pool = await connectToDB();
    try {
      const { amount, transactionType, remarks, subAdminId, subAdminName, introducerUserName } = req.body;
      const name = subAdminDetail[0].firstname;
      const id = subAdminDetail[0].userName;
      const [introId] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [introducerUserName]);
      if (introId.length === 0) {
        throw new Error('Introducer user not found'); // or handle this case accordingly
      }
      const introTransactionId = uuidv4();
      if (transactionType === 'Deposit') {
        const NewIntroducerTransaction = {
          introTransactionId,
          introUserId: introId[0].intro_id,
          amount: amount,
          transactionType: transactionType,
          remarks: remarks,
          subAdminId: id,
          subAdminName: name,
          introducerUserName: introducerUserName,
          createdAt: new Date(),
        };
        const incertData = `INSERT INTO IntroducerTransaction (introTransactionId, introUserId, amount, transactionType, remarks, 
        subAdminId, subAdminName, introducerUserName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertData, [
          introTransactionId || null,
          NewIntroducerTransaction.introUserId || null,
          NewIntroducerTransaction.amount || null,
          NewIntroducerTransaction.transactionType || null,
          NewIntroducerTransaction.remarks || null,
          NewIntroducerTransaction.subAdminId || null,
          NewIntroducerTransaction.subAdminName || null,
          NewIntroducerTransaction.introducerUserName || null,
          NewIntroducerTransaction.createdAt || null,
        ]);
      }
      return res.status(200).json({ status: true, message: 'Transaction created successfully' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal server error' });
    }
  },

  createIntroducerWithdrawTransaction: async (req, res, subAdminDetail) => {
    const pool = await connectToDB();
    try {
      const { amount, transactionType, remarks, subAdminId, subAdminName, introducerUserName } = req.body;
      const name = subAdminDetail[0].firstname;
      const id = subAdminDetail[0].userName;
      const [introId] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [introducerUserName]);
      const introTransactionId = uuidv4();
      if (transactionType === 'Withdraw') {
        const NewIntroducerTransaction = {
          introTransactionId,
          introUserId: introId[0].intro_id,
          amount: amount,
          transactionType: transactionType,
          remarks: remarks,
          subAdminId: id,
          subAdminName: name,
          introducerUserName: introducerUserName,
          createdAt: new Date(),
        };
        const incertData = `INSERT INTO IntroducerTransaction (introTransactionId, introUserId, amount, transactionType, remarks, 
          subAdminId, subAdminName, introducerUserName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertData, [
          introTransactionId || null,
          NewIntroducerTransaction.introUserId || null,
          NewIntroducerTransaction.amount || null,
          NewIntroducerTransaction.transactionType || null,
          NewIntroducerTransaction.remarks || null,
          NewIntroducerTransaction.subAdminId || null,
          NewIntroducerTransaction.subAdminName || null,
          NewIntroducerTransaction.introducerUserName || null,
          NewIntroducerTransaction.createdAt || null,
        ]);
      }
      return res.status(200).json({ status: true, message: 'Transaction created successfully' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal server error' });
    }
  },
};

export default TransactionServices;

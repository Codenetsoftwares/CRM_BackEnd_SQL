import AccountServices from '../services/Account.Services.js';
import WebsiteServices from '../services/WebSite.Service.js';
import BankServices from '../services/Bank.services.js';
import connectToDB from '../db/db.js';

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
      const websiteId = dbWebsiteData[0].id;

      const websiteBalance = await WebsiteServices.getWebsiteBalance(websiteId);
      const totalBalance = bonus + amount;
      if (websiteBalance < totalBalance) {
        throw { code: 400, message: 'Insufficient Website balance' };
      }

      // Bank
      const [dbBankData] = await pool.execute('SELECT * FROM Bank WHERE bankName = ?', [bankName]);
      if (!dbWebsiteData) {
        throw { code: 404, message: 'Bank data not found' };
      }
      const bankId = dbBankData[0].id;
      const bankBalance = await BankServices.getBankBalance(bankId);
      const totalBankBalance = bankCharges + parseFloat(amount);
      if (bankBalance < totalBankBalance) {
        throw { code: 400, message: 'Insufficient Bank balance' };
      }

      // User
      const [user] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Introducer
      const introducersUserName = user.introducersUserName;

      // Calculation of Deposit---- Amount will transfer from Website to Bank (Bonus)
      if (transactionType === 'Deposit') {
        const newTransaction = {
          bankId: dbBankData[0].id,
          websiteId: dbWebsiteData[0].id,
          transactionID: transactionID,
          transactionType: transactionType,
          amount: amount,
          paymentMethod: paymentMethod,
          subAdminId: subAdminName.userName,
          subAdminName: subAdminName.firstname,
          userName: userName,
          accountNumber: accountNumber,
          bankName: bankName,
          websiteName: websiteName,
          bonus: bonus,
          remarks: remarks,
          introducerUserName: introducersUserName,
          createdAt: new Date(),
        };
        const incertData = `INSERT INTO Transaction (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, 
        amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, 
        createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
          newTransaction.bankCharges,
          newTransaction.remarks,
          newTransaction.accountNumber,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
        ]);

        //  Incert Data into User
        const [user] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);

        if (!user) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const UID = user[0].id;
        const Id = result.insertId;
        const incertUserData = `INSERT INTO UserTransactionDetail (UID, bankId, websiteId, subAdminName, transactionID,
        transactionType, amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName,
        websiteName, createdAt, Transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertUserData, [
          UID,
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
          newTransaction.bankCharges,
          newTransaction.remarks,
          newTransaction.accountNumber,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
          Id,
        ]);
      }
      // Calculation of Withdraw---- Amount will transfer from Bank to Website (Bank Charge)
      if (transactionType === 'Withdraw') {
        const newTransaction = {
          bankId: dbBankData[0].id,
          websiteId: dbWebsiteData[0].id,
          transactionID: transactionID,
          transactionType: transactionType,
          amount: amount,
          paymentMethod: paymentMethod,
          subAdminId: subAdminName.userName,
          subAdminName: subAdminName.firstname,
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
        const incertData = `INSERT INTO Transaction (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, 
          amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, 
          createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
          newTransaction.bonus,
          newTransaction.bankCharges,
          newTransaction.remarks,
          newTransaction.accountNumber,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
        ]);

        //  Incert Data into User
        const [user] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);

        if (!user) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const UID = user[0].id;
        const Id = result.insertId; // Get the ID of the inserted bank
        const incertUserData = `INSERT INTO UserTransactionDetail (UID, bankId, websiteId, subAdminName, transactionID,
          transactionType, amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName,
          websiteName, createdAt, Transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertUserData, [
          UID,
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
          newTransaction.bankCharges,
          newTransaction.remarks,
          newTransaction.accountNumber,
          newTransaction.bankName,
          newTransaction.websiteName,
          newTransaction.createdAt,
          Id,
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
      const [withdraws] = await pool.execute('SELECT * FROM `Transaction` WHERE transactionType = ? ORDER BY createdAt DESC', [
        'Withdraw',
      ]);
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
      const [deposits] = await pool.execute('SELECT * FROM `Transaction` WHERE transactionType = ? ORDER BY createdAt DESC', [
        'Deposit',
      ]);
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
      console.log('subAdminDetail', subAdminDetail);
      const name = subAdminDetail.firstname;
      const id = subAdminDetail.id;
      // const introId = await IntroducerUser.findOne({ userName: introducerUserName }).exec();
      const [introId] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [introducerUserName]);
      console.log('introId', introId);
      if (transactionType === 'Deposit') {
        const NewIntroducerTransaction = {
          introUserId: introId[0].id,
          amount: amount,
          transactionType: transactionType,
          remarks: remarks,
          subAdminId: id,
          subAdminName: name,
          introducerUserName: introducerUserName,
          createdAt: new Date(),
        };
        const incertData = `INSERT INTO IntroducerTransaction (introUserId, amount, transactionType, remarks, subAdminId, subAdminName, 
          introducerUserName) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertData, [
          NewIntroducerTransaction.introUserId,
          NewIntroducerTransaction.amount,
          NewIntroducerTransaction.transactionType,
          NewIntroducerTransaction.remarks,
          NewIntroducerTransaction.subAdminId,
          NewIntroducerTransaction.subAdminName,
          NewIntroducerTransaction.introducerUserName,
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
      const name = subAdminDetail.firstname;
      const id = subAdminDetail.id;
      const [introId] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [introducerUserName]);
      if (transactionType === 'Withdraw') {
        const NewIntroducerTransaction = {
          introUserId: introId[0].id,
          amount: amount,
          transactionType: transactionType,
          remarks: remarks,
          subAdminId: id,
          subAdminName: name,
          introducerUserName: introducerUserName,
          createdAt: new Date(),
        };
        const incertData = `INSERT INTO IntroducerTransaction (introUserId, amount, transactionType, remarks, subAdminId, subAdminName, 
          introducerUserName) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(incertData, [
          NewIntroducerTransaction.introUserId,
          NewIntroducerTransaction.amount,
          NewIntroducerTransaction.transactionType,
          NewIntroducerTransaction.remarks,
          NewIntroducerTransaction.subAdminId,
          NewIntroducerTransaction.subAdminName,
          NewIntroducerTransaction.introducerUserName,
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

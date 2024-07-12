import AccountServices from '../services/Account.Services.js';
import WebsiteServices from '../services/WebSite.Service.js';
import BankServices from '../services/Bank.services.js';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import IntroducerUser from '../models/introducerUser.model.js';
import CustomError from '../utils/extendError.js';
import IntroducerTransaction from '../models/introducerTransaction.model.js';
import { statusCode } from '../utils/statusCodes.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';

export const createIntroducerDepositTransaction = async (req, res) => {
  const { amount, transactionType, remarks, introducerUserName } = req.body;
  const subAdminDetail = req.user;

  try {
    // Find introducer user by userName
    const introducerUser = await IntroducerUser.findOne({ where: { userName: introducerUserName } });
    if (!introducerUser) {
      throw new CustomError('Introducer user not found', null, statusCode.badRequest);
    }

    // Generate transaction ID
    const introTransactionId = uuidv4();

    // Create introducer transaction
    let newTransaction;
    if (transactionType === 'Deposit') {
      newTransaction = await IntroducerTransaction.create({
        introTransactionId,
        introUserId: introducerUser.introId,
        amount: parseFloat(amount),
        transactionType,
        remarks,
        subAdminId: subAdminDetail.userName,
        subAdminName: subAdminDetail.firstName,
        introducerUserName,
        createdAt: new Date(),
      });
    }

    return apiResponseSuccess(newTransaction, true, statusCode.create, 'Transaction created successfully', res);

  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message, res
    );
  }
};



export const createIntroducerWithdrawTransaction = async (req, res) => {
  const { amount, transactionType, remarks, introducerUserName } = req.body;
  const subAdminDetail = req.user;

  try {
    // Find introducer user by userName
    const introducerUser = await IntroducerUser.findOne({ where: { userName: introducerUserName } });
    if (!introducerUser) {
      throw new CustomError('Introducer user not found', null, statusCode.badRequest);
    }

    // Generate transaction ID
    const introTransactionId = uuidv4();

    // Create introducer transaction
    let newTransaction;
    if (transactionType === 'Withdraw') {
      newTransaction = await IntroducerTransaction.create({
        introTransactionId,
        introUserId: introducerUser.introId,
        amount: parseFloat(amount),
        transactionType,
        remarks,
        subAdminId: subAdminDetail.userName,
        subAdminName: subAdminDetail.firstName,
        introducerUserName,
        createdAt: new Date(),
      });
    }

    return apiResponseSuccess(newTransaction, true, statusCode.create, 'Transaction created successfully', res);

  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message, res
    );
  }
};

const TransactionServices = {
  createTransaction: async (req, res, subAdminName) => {
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
      const [existingTransaction] = await database.execute(
        `SELECT * FROM Transaction WHERE transactionID = ? AND createdAt >= NOW() - INTERVAL 2 DAY;`,
        [transactionID],
      );

      if (existingTransaction.length > 0) {
        return res
          .status(400)
          .json({ status: false, message: 'Transaction ID is already in use. Please try again after 48 hours.' });
      }

      // Website
      const [dbWebsiteData] = await database.execute('SELECT * FROM Website WHERE websiteName = ?', [websiteName]);

      if (!dbWebsiteData) {
        throw { code: 404, message: 'Website data not found' };
      }
      const websiteId = dbWebsiteData[0].websiteId;

      const websiteBalance = await WebsiteServices.getWebsiteBalance(websiteId);
      const totalBalance = parseFloat(bonus) + parseFloat(amount);
      if (websiteBalance < totalBalance) {
        throw { code: 400, message: 'Insufficient Website balance' };
      }

      // Bank
      const [dbBankData] = await database.execute('SELECT * FROM Bank WHERE bankName = ?', [bankName]);

      if (!dbBankData) {
        throw { code: 404, message: 'Bank data not found' };
      }
      const bankId = dbBankData[0].bankId;
      const bankBalance = await BankServices.getBankBalance(bankId);
      const totalBankBalance = parseFloat(bankCharges) + parseFloat(amount);
      if (bankBalance < totalBankBalance) {
        throw { code: 400, message: 'Insufficient Bank balance' };
      }

      // User
      const [user] = await database.execute('SELECT * FROM User WHERE userName = ?', [userName]);
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Introducer
      const introducersUserName = user[0].introducersUserName;

      // Calculation of Deposit---- Amount will transfer from Website to Bank (Bonus)
      if (transactionType === 'Deposit') {
        const newTransaction = {
          bankId: dbBankData[0].bankId,
          websiteId: dbWebsiteData[0].websiteId,
          transactionID: transactionID,
          transactionType: transactionType,
          amount: Math.round(parseFloat(amount)),
          paymentMethod: paymentMethod,
          subAdminId: subAdminName[0].userName,
          subAdminName: subAdminName[0].firstName,
          userName: userName,
          accountNumber: accountNumber,
          bankName: bankName,
          websiteName: websiteName,
          bonus: bonus,
          remarks: remarks,
          introducerUserName: introducersUserName,
          createdAt: new Date().toISOString(),
        };
        const Transaction_Id = uuidv4();
        const incertData = `INSERT INTO Transaction (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, 
          amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, 
          createdAt, Transaction_Id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await database.execute(incertData, [
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
        const [user] = await database.execute('SELECT * FROM User WHERE userName = ?', [userName]);

        if (!user) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const userId = user[0].userId;
        const Id = Transaction_Id;
        const incertUserData = `INSERT INTO UserTransactionDetail (userId, transactionId ,bankId, websiteId, subAdminName, transactionID,
        transactionType, amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName,
        websiteName, createdAt, subAdminId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await database.execute(incertUserData, [
          userId,
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
          newTransaction.subAdminId,
        ]);
      }
      // Calculation of Withdraw---- Amount will transfer from Bank to Website (Bank Charge)
      if (transactionType === 'Withdraw') {
        const newTransaction = {
          bankId: dbBankData[0].bankId,
          websiteId: dbWebsiteData[0].websiteId,
          transactionID: transactionID,
          transactionType: transactionType,
          amount: Math.round(parseFloat(amount)),
          paymentMethod: paymentMethod,
          subAdminId: subAdminName[0].userName,
          subAdminName: subAdminName[0].firstName,
          userName: userName,
          accountNumber: accountNumber,
          bankName: bankName,
          websiteName: websiteName,
          bankCharges: bankCharges,
          remarks: remarks,
          introducerUserName: introducersUserName,
          createdAt: new Date().toISOString(),
          isSubmit: false,
        };
        const Transaction_Id = uuidv4();
        const incertData = `INSERT INTO Transaction (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, 
          amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, 
          createdAt, Transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await database.execute(incertData, [
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
        const [user] = await database.execute('SELECT * FROM User WHERE userName = ?', [userName]);

        if (!user) {
          return res.status(404).json({ status: false, message: 'User not found' });
        }
        const userId = user[0].userId;
        const Id = Transaction_Id;
        const incertUserData = `INSERT INTO UserTransactionDetail (user_ID, Transaction_id ,bankId, websiteId, subAdminName, transactionID,
        transactionType, amount, paymentMethod, userName, introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName,
        websiteName, createdAt, subAdminId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await database.execute(incertUserData, [
          userId,
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
          newTransaction.subAdminId,
        ]);
      }
      return res.status(200).json({ status: true, message: 'Transaction created successfully' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal server error' });
    }
  },

  withdrawView: async (req, res) => {
    try {
      const [withdraws] = await database.execute(
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
    try {
      const [deposits] = await database.execute(
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


};

export default TransactionServices;

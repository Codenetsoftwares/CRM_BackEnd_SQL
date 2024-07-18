import WebsiteServices, { getWebsiteBalance } from '../services/WebSite.Service.js';
import BankServices from '../services/Bank.services.js';
import { v4 as uuidv4 } from 'uuid';
import IntroducerUser from '../models/introducerUser.model.js';
import CustomError from '../utils/extendError.js';
import IntroducerTransaction from '../models/introducerTransaction.model.js';
import { statusCode } from '../utils/statusCodes.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import Transaction from '../models/transaction.model.js';
import Website from '../models/website.model.js';
import User from '../models/user.model.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';
import { Sequelize } from 'sequelize';

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
      error.errMessage ?? error.message,
      res,
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
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const createTransaction = async (req, res) => {
  try {
    const subAdminName = req.user;
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
      return apiResponseErr(null, false, statusCode.badRequest, 'Transaction ID is required', res);
    }

    if (!amount || isNaN(amount)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Amount is required and must be a number', res);
    }

    if (!paymentMethod) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Payment Method is required', res);
    }

    // Checking if transactionID is reusable or not
    const existingTransaction = await Transaction.findOne({
      where: {
        transactionID,
        createdAt: {
          [Sequelize.Op.gte]: Sequelize.literal('NOW() - INTERVAL 2 DAY'),
        },
      },
    });

    if (existingTransaction) {
      throw new CustomError('Transaction ID is already in use. Please try again after 48 hours.', null, 409);
    }

    // Website
    const dbWebsiteData = await Website.findOne({ where: { websiteName } });
    if (!dbWebsiteData) {
      throw new CustomError('Website data not found', null, statusCode.notFound);
    }
    const websiteId = dbWebsiteData.websiteId;

    const websiteBalance = await getWebsiteBalance(websiteId);
    const totalBalance = parseFloat(bonus) + parseFloat(amount);
    if (websiteBalance < totalBalance) {
      throw new CustomError('Insufficient Website balance', null, statusCode.badRequest);
    }

    // Bank
    const dbBankData = await Bank.findOne({ where: { bankName } });
    if (!dbBankData) {
      throw new CustomError('Bank data not found', null, statusCode.notFound);
    }
    const bankId = dbBankData.bankId;
    const bankBalance = await BankServices.getBankBalance(bankId);
    const totalBankBalance = parseFloat(bankCharges) + parseFloat(amount);
    if (bankBalance < totalBankBalance) {
      throw new CustomError('Insufficient Bank balance', null, statusCode.badRequest);
    }

    // User
    const user = await User.findOne({ where: { userName } });
    if (!user) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    // Introducer
    const introducersUserName = user.introducersUserName;

    const Transaction_Id = uuidv4();
    let newTransactionData = {
      bankId,
      websiteId,
      transactionID,
      transactionType,
      amount: Math.round(parseFloat(amount)),
      paymentMethod,
      subAdminId: subAdminName[0].userName,
      subAdminName: subAdminName[0].firstName,
      userName,
      accountNumber,
      bankName,
      websiteName,
      bonus,
      remarks,
      introducerUserName: introducersUserName,
      createdAt: new Date(),
      Transaction_Id,
    };

    if (transactionType === 'Deposit') {
      newTransactionData = {
        ...newTransactionData,
        bonus,
      };

      await Transaction.create(newTransactionData);

      await UserTransactionDetail.create({
        userId: user.userId,
        transactionId: Transaction_Id,
        bankId,
        websiteId,
        subAdminName: subAdminName[0].firstName,
        transactionID,
        transactionType,
        amount: Math.round(parseFloat(amount)),
        paymentMethod,
        userName,
        introducerUserName: introducersUserName,
        bonus,
        bankCharges: null,
        remarks,
        accountNumber,
        bankName,
        websiteName,
        createdAt: new Date(),
        subAdminId: subAdminName[0].userName,
      });
    } else if (transactionType === 'Withdraw') {
      newTransactionData = {
        ...newTransactionData,
        bankCharges,
      };

      await Transaction.create(newTransactionData);

      await UserTransactionDetail.create({
        userId: user.userId,
        transactionId: Transaction_Id,
        bankId,
        websiteId,
        subAdminName: subAdminName[0].firstName,
        transactionID,
        transactionType,
        amount: Math.round(parseFloat(amount)),
        paymentMethod,
        userName,
        introducerUserName: introducersUserName,
        bonus: null,
        bankCharges,
        remarks,
        accountNumber,
        bankName,
        websiteName,
        createdAt: new Date(),
        subAdminId: subAdminName[0].userName,
      });
    }

    return apiResponseSuccess(newTransactionData, true, statusCode.create, 'Transaction created successfully', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const depositView = async (req, res) => {
  try {
    // Fetch deposits using Sequelize
    const deposits = await Transaction.findAll({
      where: { transactionType: 'Deposit' },
      order: [['createdAt', 'DESC']],
    });

    // Calculate the total amount of deposits
    const sum = await Transaction.sum('amount', {
      where: { transactionType: 'Deposit' },
    });
    return apiResponseSuccess({ totalDeposits: sum, deposits: deposits }, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const withdrawView = async (req, res) => {
  try {
    // Fetch withdraws using Sequelize
    const withdraws = await Transaction.findAll({
      where: { transactionType: 'Withdraw' },
      order: [['createdAt', 'DESC']],
    });

    // Calculate the total amount of withdraws
    const sum = await Transaction.sum('amount', {
      where: { transactionType: 'Withdraw' },
    });

    return apiResponseSuccess({ totalDeposits: sum, deposits: deposits }, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const viewEditIntroducerTransactionRequests = async (req, res) => {
  try {
    const introEdit = await IntroducerEditRequest.findAll();
    return apiResponseSuccess(introEdit, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

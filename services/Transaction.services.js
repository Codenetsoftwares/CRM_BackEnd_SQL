import WebsiteServices, { getWebsiteBalance } from '../services/WebSite.Service.js';
import BankServices from '../services/Bank.services.js';
import { v4 as uuidv4 } from 'uuid';
import IntroducerUser from '../models/introducerUser.model.js';
import CustomError from '../utils/extendError.js';
import IntroducerTransaction from '../models/introducerTransaction.model.js';
import { statusCode } from '../utils/statusCodes.js';
import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import Transaction from '../models/transaction.model.js';
import Website from '../models/website.model.js';
import User from '../models/user.model.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';
import { Sequelize } from 'sequelize';
import Bank from '../models/bank.model.js';
import IntroducerEditRequest from '../models/introducerEditRequest.model.js';

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

    // Validate required fields
    if (!transactionID) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Transaction ID is required', res);
    }

    if (!amount || isNaN(amount)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Amount is required and must be a number', res);
    }

    if (!paymentMethod) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Payment Method is required', res);
    }

    // Check if transactionID is reusable or not
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

    // Retrieve website data
    const dbWebsiteData = await Website.findOne({ where: { websiteName } });
    if (!dbWebsiteData) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website data not found', res);
    }
    const websiteId = dbWebsiteData.websiteId;

    // Check website balance if needed
    const websiteBalance = await getWebsiteBalance(websiteId);
    const totalBalance = parseFloat(bonus) + parseFloat(amount);
    if (websiteBalance < totalBalance) {
      throw new CustomError('Insufficient Website balance', null, statusCode.badRequest);
    }

    // Retrieve bank data
    const dbBankData = await Bank.findOne({ where: { bankName } });
    if (!dbBankData) {
      throw new CustomError('Bank data not found', null, statusCode.notFound);
    }
    const bankId = dbBankData.bankId;

    // Check bank balance if needed
    const bankBalance = await BankServices.getBankBalance(bankId);
    const totalBankBalance = parseFloat(bankCharges) + parseFloat(amount);
    if (bankBalance < totalBankBalance) {
      throw new CustomError('Insufficient Bank balance', null, statusCode.badRequest);
    }

    // Retrieve user data
    const user = await User.findOne({ where: { userName } });
    if (!user) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    // Retrieve introducer's username
    const introducersUserName = user.introducersUserName;

    // Generate unique transaction ID
    const Transaction_Id = uuidv4();

    // Prepare transaction data
    let newTransactionData = {
      bankId,
      websiteId,
      transactionID,
      transactionType,
      amount: Math.round(parseFloat(amount)),
      paymentMethod,
      subAdminId: subAdminName.userName,
      subAdminName: subAdminName.firstName,
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

    // Handle deposit transaction
    if (transactionType === 'Deposit') {
      newTransactionData = {
        ...newTransactionData,
        bonus,
      };

      // Create transaction record in Transaction table
      await Transaction.create(newTransactionData);

      // Ensure userId exists and matches an existing User record's id
      if (!user.id) {
        throw new CustomError('User ID not found or invalid', null, statusCode.badRequest);
      }

      // Create transaction detail record in UserTransactionDetail table
      await UserTransactionDetail.create({
        userId: user.id,
        transactionId: Transaction_Id,
        bankId,
        websiteId,
        subAdminName: subAdminName.firstName,
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
        subAdminId: subAdminName.userName,
      });
    }
    // Handle withdraw transaction
    else if (transactionType === 'Withdraw') {
      newTransactionData = {
        ...newTransactionData,
        bankCharges,
      };

      // Create transaction record in Transaction table
      await Transaction.create(newTransactionData);

      // Ensure userId exists and matches an existing User record's id
      if (!user.id) {
        throw new CustomError('User ID not found or invalid', null, statusCode.badRequest);
      }

      // Create transaction detail record in UserTransactionDetail table
      await UserTransactionDetail.create({
        userId: user.id,
        transactionId: Transaction_Id,
        bankId,
        websiteId,
        subAdminName: subAdminName.firstName,
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
        subAdminId: subAdminName.userName,
      });
    }

    // Respond with success message and data
    return apiResponseSuccess(newTransactionData, true, statusCode.create, 'Transaction created successfully', res);
  } catch (error) {
    // Handle errors and respond with appropriate error message
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
    // Extract pagination parameters from the request query
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Fetch deposit transactions with pagination
    const { count, rows: deposits } = await Transaction.findAndCountAll({
      where: {
        transactionType: 'Deposit', // Filter by transactionType
      },
      order: [['createdAt', 'DESC']], // Order by createdAt descending
      limit,
      offset,
    });

    // Calculate total amount of deposits
    const totalDeposits = deposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      {
        deposits,
        totalDeposits,
      },
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        pageSize: limit,
        totalItems: count,
        totalPages,
      },
      res
    );
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.message,
      res
    );
  }
};


export const withdrawView = async (req, res) => {
  try {
    // Extract pagination parameters from the request query
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Fetch withdraw transactions with pagination
    const { count, rows: withdraws } = await Transaction.findAndCountAll({
      where: {
        transactionType: 'Withdraw', // Filter by transactionType
      },
      order: [['createdAt', 'DESC']], // Order by createdAt descending
      limit,
      offset,
    });

    // Calculate total amount of withdrawals
    const totalWithdraws = withdraws.reduce((sum, withdraw) => sum + parseFloat(withdraw.amount), 0);

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);


    return apiResponsePagination({
      withdraws,
      totalWithdraws,
    }, true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        limit,
        totalItems: count,
        totalPages,
      }, res
    );
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.message,
      res
    );
  }
};


export const viewEditIntroducerTransactionRequests = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Fetch total count of records
    const { count: totalCount } = await IntroducerEditRequest.findAndCountAll();

    // Fetch records with pagination
    const editRequests = await IntroducerEditRequest.findAll({
      order: [['createdAt', 'DESC']], // Order by createdAt descending
      limit, 
      offset, 
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    return apiResponsePagination(editRequests, true, statusCode.success, {
      page: parseInt(page),
      pageSize: limit,
      totalItems: totalCount,
      totalPages,
    }, 'Data retrieved successfully', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.message,
      res
    );
  }
};


import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import IntroducerUser from '../models/introducerUser.model.js';
import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import CustomError from '../utils/extendError.js';
import { IntroducerBalance, introducerLiveBalance } from './Account.Services.js';
import User from '../models/user.model.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';
import { Sequelize } from 'sequelize';
import { string } from '../constructor/string.js';
import IntroducerTransaction from '../models/introducerTransaction.model.js';

export const createIntroducerUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, password } = req.body;
    const user = req.user;

    const existingIntroducerUser = await IntroducerUser.findOne({ where: { userName } });

    if (existingIntroducerUser) {
      throw new CustomError(`User already exists: ${userName}`, null, 409);
    }

    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    const introId = uuidv4();

    const newIntroducerUser = await IntroducerUser.create({
      introId,
      firstName,
      lastName,
      userName,
      password: encryptedPassword,
      introducerId: user.userName,
      role: string.introducer,
    });

    if (newIntroducerUser) {
      return apiResponseSuccess(
        newIntroducerUser,
        true,
        statusCode.create,
        'Introducer User registered successfully!',
        res,
      );
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Failed to create new Introducer User', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const updateIntroducerProfile = async (req, res) => {
  try {
    const { introId } = req.params;
    const { firstName, lastName } = req.body;

    const existingUser = await IntroducerUser.findOne({ where: { introId } });

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, `Introducer User not found with id: ${introId}`, res);
    }

    existingUser.firstName = firstName || existingUser.firstName;
    existingUser.lastName = lastName || existingUser.lastName;

    await existingUser.save();

    return apiResponseSuccess(existingUser, true, statusCode.success, 'Profile updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const introducerPasswordResetCode = async (req, res) => {
  try {
    const { userName, password } = req.body;
    const existingUser = await IntroducerUser.findOne({ where: { userName } });
    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    const newPasswordIsDuplicate = await bcrypt.compare(password, existingUser.password);
    if (newPasswordIsDuplicate) {
      return apiResponseErr(
        null,
        false,
        statusCode.exist,
        'New Password cannot be the same as existing password',
        res,
      );
    }

    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);

    const resetIntroducer = await IntroducerUser.update({ password: encryptedPassword }, { where: { userName } });

    return apiResponseSuccess(resetIntroducer, true, statusCode.success, 'Password reset successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerProfile = async (req, res) => {
  try {
    const id = req.user.introId;
    const introUser = await IntroducerUser.findOne({ where: { introId: id } });
    if (!introUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Introducer user not found', res);
    }

    const TPDLT = await IntroducerBalance(id, res);
    const response = {
      introId: introUser.introId,
      firstName: introUser.firstName,
      lastName: introUser.lastName,
      role: introUser.role,
      userName: introUser.userName,
      balance: Number(TPDLT),
    };

    const liveBalance = await introducerLiveBalance(id, res);
    const currentDue = liveBalance - response.balance;
    response.currentDue = currentDue;

    return apiResponseSuccess(response, true, statusCode.success, 'success', res);
  } catch (error) {
    console.error(':err');
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const listIntroducerUsers = async (req, res) => {
  try {
    const introId = req.params.introId;
    const { page = 1, pageSize = 10 } = req.query; // Get pagination parameters from query

    // Convert pagination parameters to integers
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // Fetch the introducer user
    const introducerUser = await IntroducerUser.findOne({ where: { introId } });
    if (!introducerUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'IntroducerUser not found', res);
    }

    const introducerUserName = introducerUser.userName;

    // Fetch users associated with the introducer user with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where: {
        [Sequelize.Op.or]: [
          { introducersUserName: introducerUserName },
          { introducersUserName1: introducerUserName },
          { introducersUserName2: introducerUserName },
        ],
      },
      limit,
      offset,
    });

    // Fetch user transaction details and include them in the response
    const usersWithTransactionDetails = [];
    for (const userData of users) {
      const userTransactionDetail = await UserTransactionDetail.findAll({
        where: { userName: userData.userName },
      });
      // Attach transaction details to user data
      userData.UserTransactionDetail = userTransactionDetail;
      usersWithTransactionDetails.push(userData);
    }

    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      usersWithTransactionDetails,
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        limit,
        totalPages,
        totalItems: count,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerUserData = async (req, res) => {
  try {
    const id = req.params.user_id;
    const user = req.user;
    const introUser = user.userName;

    console.log('Intro User:', introUser);

    // Fetch the user by user_id
    const introducerUser = await User.findOne({ where: { userId: id } });

    if (!introducerUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    console.log('Fetched Introducer User:', introducerUser);

    console.log('Introducer User Fields:', {
      introducersUserName: introducerUser.introducersUserName,
      introducersUserName1: introducerUser.introducersUserName1,
      introducersUserName2: introducerUser.introducersUserName2,
    });

    let filteredIntroducerUser = {
      userId: introducerUser.userId,
      firstName: introducerUser.firstName,
      lastName: introducerUser.lastName,
      userName: introducerUser.userName,
      wallet: introducerUser.wallet,
      role: introducerUser.role,
      transactionDetail: null, // Initialize to null
    };

    // Fetching and attaching transaction details for the user
    const userTransactionDetail = await UserTransactionDetail.findAll({
      where: { userName: introducerUser.userName },
    });
    filteredIntroducerUser.transactionDetail = userTransactionDetail;

    let matchedIntroducersUserName = null;
    let matchedIntroducerPercentage = null;

    // Check if req.user.userName exists in introducerUser's introducersUserName, introducersUserName1, or introducersUserName2 fields
    if (introducerUser.introducersUserName === introUser) {
      matchedIntroducersUserName = introducerUser.introducersUserName;
      matchedIntroducerPercentage = introducerUser.introducerPercentage;
    } else if (introducerUser.introducersUserName1 === introUser) {
      matchedIntroducersUserName = introducerUser.introducersUserName1;
      matchedIntroducerPercentage = introducerUser.introducerPercentage1;
    } else if (introducerUser.introducersUserName2 === introUser) {
      matchedIntroducersUserName = introducerUser.introducersUserName2;
      matchedIntroducerPercentage = introducerUser.introducerPercentage2;
    }

    console.log('Matched Introducers UserName:', matchedIntroducersUserName);
    console.log('Matched Introducer Percentage:', matchedIntroducerPercentage);

    // If matched introducersUserName found, include it along with percentage in the response
    if (matchedIntroducersUserName) {
      filteredIntroducerUser.matchedIntroducersUserName = matchedIntroducersUserName;
      filteredIntroducerUser.introducerPercentage = matchedIntroducerPercentage;
      return apiResponseSuccess(filteredIntroducerUser, true, statusCode.success, 'success', res);
    } else {
      return apiResponseErr(null, true, statusCode.unauthorize, 'Unauthorized', res);
    }
  } catch (error) {
    console.error('Error in getIntroducerUserData:', error);
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerLiveBalance = async (req, res) => {
  try {
    const introId = req.params.introId;

    // Fetch the introducer user by introId
    const introducerUser = await IntroducerUser.findOne({ where: { introId } });

    if (!introducerUser) {
      return apiResponseSuccess(null, true, statusCode.badRequest, 'IntroducerUser not found', res);
    }

    const data = await introducerLiveBalance(introId);
    console.log('data', data);
    return apiResponseSuccess({ LiveBalance: data }, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const introducerAccountSummary = async (req, res) => {
  try {
    const introUserId = req.params.introId;
    const { page = 1, pageSize = 10 } = req.query; // Get pagination parameters from query

    // Convert pagination parameters to integers
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // Fetch records with pagination
    const { count, rows: introSummary } = await IntroducerTransaction.findAndCountAll({
      where: { introUserId },
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      introSummary,
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        limit,
        totalPages,
        totalItems: count,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerUserAccountSummary = async (req, res) => {
  try {
    const introUserName = req.params.introducerUsername;
    const { page = 1, pageSize = 10 } = req.query; // Get pagination parameters from query
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Fetch users associated with the introducer user
    const users = await User.findAll({
      where: {
        [Sequelize.Op.or]: [
          { introducersUserName: introUserName },
          { introducersUserName1: introUserName },
          { introducersUserName2: introUserName },
        ],
      },
    });

    if (!users.length) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No users found for the given introducer', res);
    }

    // Fetch and paginate user transactions
    const userNames = users.map((user) => user.userName);
    const { count, rows: transactions } = await UserTransactionDetail.findAndCountAll({
      where: { userName: { [Sequelize.Op.in]: userNames } },
      limit,
      offset,
    });

    const formattedTransactions = transactions.map((transaction) => ({
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
    }));

    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      formattedTransactions,
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        limit,
        totalItems: count,
        totalPages,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const introducerUser = {
  // introducerLiveBalance: async (id) => {
  //   const pool = await connectToDB();
  //   try {
  //     const [introUser] = await database.execute(`SELECT * FROM IntroducerUser WHERE id = ?`, [id]);
  //     if (introUser.length === 0) {
  //       throw {
  //         code: 404,
  //         message: `Introducer with ID ${id} not found`,
  //       };
  //     }
  //     const introducerUserName = introUser[0].userName;
  //     const [userIntroId] = await database.execute(`SELECT * FROM IntroducedUsers WHERE introducerUserName = ?`, [
  //       introducerUserName,
  //     ]);
  //     if (userIntroId.length === 0) {
  //       return 0;
  //     }
  //     let liveBalance = 0;
  //     for (const user of userIntroId) {
  //       const introducerPercent = user.introducerPercentage;
  //       const transDetails = user.transactionDetail;
  //       let totalDep = 0;
  //       let totalWith = 0;
  //       transDetails?.forEach((res) => {
  //         if (res.transactionType === 'Deposit') {
  //           totalDep += Number(res.amount);
  //         }
  //         if (res.transactionType === 'Withdraw') {
  //           totalWith += Number(res.amount);
  //         }
  //       });
  //       let diff = Math.abs(totalDep - totalWith);
  //       let amount = (introducerPercent / 100) * diff;
  //       liveBalance += amount;
  //     }
  //     return liveBalance;
  //   } catch (error) {
  //     console.error(error);
  //     throw error;
  //   }
  // },
  // introducerPercentageCut: async (id, startDate, endDate) => {
  //   const pool = await connectToDB();
  //   try {
  //     const [user] = await database.execute(`SELECT * FROM User WHERE userId = ?`, [id])
  //     const userName = user[0].userName;
  //     const userId = user.userId;
  //     const introducerUserId = user.introducersUserId;
  //     console.log("introducerUserId", introducerUserId);
  //     const introducerId = await IntroducerUser.findOne({
  //       id: introducerUserId,
  //     }).exec();
  //     console.log("introducerUser", introducerId);
  //     const introducerid = introducerId.introducerId;
  //     console.log("introducerid", introducerid);
  //     // This is Introducer's User's Percentage
  //     const introducerpercent = user.introducerPercentage;
  //     const transDetails = user.transactionDetail;
  //     const selectedStartDate = new Date(startDate);
  //     const selectedEndDate = new Date(endDate);
  //     const transactionsWithin7Days = transDetails.filter((transaction) => {
  //       const transDate = new Date(transaction.createdAt);
  //       return transDate >= selectedStartDate && transDate <= selectedEndDate;
  //     });
  //     let totalDep = 0;
  //     let totalWith = 0;
  //     transactionsWithin7Days.map((res) => {
  //       if (res.transactionType === "Deposit") {
  //         totalDep += Number(res.amount);
  //       }
  //       if (res.transactionType === "Withdraw") {
  //         totalWith += Number(res.amount);
  //       }
  //     });
  //     if (totalDep <= totalWith) {
  //       throw { message: "Can't send amount to Introducer" };
  //     }
  //     const date = new Date();
  //     let amount = 0;
  //     const transactionType = "Credit";
  //     if (totalDep > totalWith) {
  //       let diff = totalDep - totalWith;
  //       amount = (introducerpercent / 100) * diff;
  //       introducerId.wallet += amount;
  //     }
  //     introducerId.creditTransaction.push({
  //       date,
  //       transactionType,
  //       amount,
  //       userId,
  //       userName,
  //     });
  //     introducerId.save();
  //   } catch (error) {
  //     console.error(error);
  //   }
  // },
};

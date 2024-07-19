import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../services/database.service.js';
import Admin from '../models/admin.model.js';
import User from '../models/user.model.js';
import IntroducerUser from '../models/introducerUser.model.js';
import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import CustomError from '../utils/extendError.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';
import { Op, Sequelize, where } from 'sequelize';
import IntroducerTransaction from '../models/introducerTransaction.model.js';
import BankTransaction from '../models/bankTransaction.model.js';
import WebsiteTransaction from '../models/websiteTransaction.model.js';
import Transaction from '../models/transaction.model.js';

export const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, userName, password, roles } = req.body;

    const existingAdmin = await Admin.findOne({ where: { userName } });

    if (existingAdmin) {
      throw new CustomError(`Admin already exists with user name: ${userName}`, null, 409);
    }

    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    const adminId = uuidv4();

    const rolesArray = Array.isArray(roles) ? roles : [roles];

    const newAdmin = await Admin.create({
      adminId,
      firstName,
      lastName,
      userName,
      password: encryptedPassword,
      roles: rolesArray,
    });

    if (newAdmin) {
      return apiResponseSuccess(newAdmin, true, statusCode.create, 'Admin create successfully', res);
    } else {
      throw new CustomError('Failed to create new admin', null, statusCode.badRequest);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const generateAdminAccessToken = async (userName, password, persist, res) => {
  if (!userName) {
    throw new CustomError('Invalid value for: User Name', null, statusCode.badRequest);
  }
  if (!password) {
    throw new CustomError('Invalid value for: Password', null, statusCode.badRequest);
  }

  try {
    const admin = await Admin.findOne({ where: { userName } });

    if (!admin) {
      throw new CustomError('Invalid User Name ', null, statusCode.badRequest);
    }

    const passwordValid = await bcrypt.compare(password, admin.password);

    if (!passwordValid) {
      throw new CustomError('Invalid Password', null, statusCode.badRequest);
    }

    const accessTokenPayload = {
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
    };

    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET_KEY, {
      expiresIn: persist ? '1y' : '8h',
    });

    return {
      accessToken,
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
    };
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const updateUserProfile = async (req, res) => {
  const { userId } = req.params;
  const {
    firstName,
    lastName,
    introducersUserName,
    introducerPercentage,
    introducersUserName1,
    introducerPercentage1,
    introducersUserName2,
    introducerPercentage2,
  } = req.body;

  try {
    const existingUser = await User.findOne({ where: { userId } });

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, `User not found with id: ${userId}`, res);
    }

    const validatePercentage = (percentage) => {
      return typeof percentage === 'number' && !isNaN(percentage) && percentage >= 0 && percentage <= 100;
    };

    if (
      !validatePercentage(introducerPercentage) ||
      !validatePercentage(introducerPercentage1) ||
      !validatePercentage(introducerPercentage2)
    ) {
      return apiResponseErr(
        null,
        false,
        statusCode.badRequest,
        'Introducer percentages must be valid numbers between 0 and 100.',
        res,
      );
    }

    existingUser.firstName = firstName || existingUser.firstName;
    existingUser.lastName = lastName || existingUser.lastName;
    existingUser.introducersUserName = introducersUserName || existingUser.introducersUserName;
    existingUser.introducerPercentage = introducerPercentage || existingUser.introducerPercentage;
    existingUser.introducersUserName1 = introducersUserName1 || existingUser.introducersUserName1;
    existingUser.introducerPercentage1 = introducerPercentage1 || existingUser.introducerPercentage1;
    existingUser.introducersUserName2 = introducersUserName2 || existingUser.introducersUserName2;
    existingUser.introducerPercentage2 = introducerPercentage2 || existingUser.introducerPercentage2;

    await existingUser.save();
    return apiResponseSuccess(existingUser, true, statusCode.success, 'Profile updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getUserProfile = async (req, res) => {
  const page = parseInt(req.params.page);
  const searchQuery = req.query.search;

  try {
    let users;
    let allIntroDataLength;

    if (searchQuery) {
      users = await User.findAll({
        where: {
          userName: {
            [Op.like]: `%${searchQuery}%`,
          },
        },
      });
    } else {
      users = await User.findAll();
    }

    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const paginatedUsers = users.slice(offset, offset + pageSize);

    const SecondArray = [];
    for (const user of paginatedUsers) {
      const userWithTransaction = await User.findOne({
        where: { userName: user.userName },
        include: { model: UserTransactionDetail, as: 'transactionDetails' },
      });
      SecondArray.push(userWithTransaction);
    }

    allIntroDataLength = users.length;
    const pageNumber = Math.ceil(allIntroDataLength / pageSize);

    if (SecondArray.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No data found for the selected criteria.', res);
    }

    return apiResponseSuccess(
      { SecondArray, pageNumber, allIntroDataLength },
      true,
      statusCode.success,
      'Profile retrieved successfully',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getSubAdminsWithBankView = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * pageSize;

    const subAdmins = await Admin.findAndCountAll({
      where: {
        roles: {
          [Op.like]: ['%Bank-View%'], // Adjust this based on how roles are stored
        },
        userName: {
          [Op.like]: `%${search}%`, 
        },
      },
      attributes: ['userName'],
      limit,
      offset,
    });
    const totalItems = subAdmins.count;
    const totalPages = Math.ceil(totalItems / limit);
    return apiResponsePagination(
      subAdmins.rows,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page), limit, totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getAllSubAdmins = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const subAdmins = await Admin.findAndCountAll({
      userName: {
        [Op.like]: `%${search}%`, 
      },
      attributes: ['userName'],
      offset,
      limit,
    });
    const totalItems = subAdmins.count;
    const totalPages = Math.ceil(totalItems / limit);
    return apiResponsePagination(
      subAdmins.rows,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page), limit, totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getSubAdminsWithWebsiteView = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const subAdmins = await Admin.findAndCountAll({
      where: {
        roles: {
          [Op.like]: ['%Website-View%'],
        },
        userName: {
          [Op.like]: `%${search}%`, 
        },
      },
      attributes: ['userName'],
      offset,
      limit,
    });
    const totalItems = subAdmins.count;
    const totalPages = Math.ceil(totalItems / limit);
    return apiResponsePagination(
      subAdmins.rows,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page), limit, totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getClientData = async (req, res) => {
  const { introId } = req.params;
  try {
    const introducer = await IntroducerUser.findOne({ where: { introId } });

    if (!introducer) {
      return apiResponseErr(null, false, statusCode.badRequest, `Introducer User not found with id: ${introId}`, res);
    }

    const introducerId = introducer.userName;
    const introducerUsers = await User.findAll({ where: { introducersUserName: introducerId } });

    return apiResponseSuccess(introducerUsers, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getSingleIntroducer = async (req, res) => {
  const { introId } = req.params;

  try {
    const introducer = await IntroducerUser.findOne({ where: { introId } });

    if (!introducer) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Introducer not found', res);
    }

    return apiResponseSuccess(introducer, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const { count: totalItems, rows: users } = await User.findAndCountAll({
      userName: {
        [Op.like]: `%${search}%`, 
      },
      attributes: ['userName'],
      offset,
      limit,
    });

    if (!users || users.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No users found', res);
    }

    const userNames = users.map((user) => user.userName);
    const totalPages = Math.ceil(totalItems / limit);

    const responseData = {
      data: userNames,
      success: true,
      successCode: statusCode.success,
      message: 'success',
      pagination: {
        page: parseInt(page),
        limit,
        totalPages,
        totalItems,
      },
    };

    return res.status(statusCode.success).json(responseData);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerById = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const { count: totalItems, rows: introducers } = await IntroducerUser.findAndCountAll({
      userName: {
        [Op.like]: `%${search}%`,
      },
      attributes: ['userName', 'introId'],
      offset,
      limit,
    });

    if (!introducers || introducers.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No introducers found', res);
    }

    return apiResponsePagination(
      introducers,
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getSingleSubAdmin = async (req, res) => {
  try {
    const id = req.params.adminId;
    console.log('iddd', id);

    if (!id) {
      return apiResponseErr(null, false, statusCode.badRequest, "Sub Admin's Id not present", res);
    }

    const subAdmin = await Admin.findOne({ where: { adminId: id } });

    if (!subAdmin) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Sub Admin not found with the given Id', res);
    }
    return apiResponseSuccess(subAdmin, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const editSubAdminRoles = async (req, res) => {
  try {
    const subAdminId = req.params.adminId;
    const { roles } = req.body;

    if (!subAdminId) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Id not found', res);
    }

    const [updatedRows] = await Admin.update({ roles: JSON.stringify(roles) }, { where: { adminId: subAdminId } });

    if (updatedRows === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'SubAdmin not found with the given Id', res);
    }
    return apiResponseSuccess(
      updatedRows,
      true,
      statusCode.success,
      `SubAdmin roles updated with ${JSON.stringify(roles)}`,
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerUserSingleData = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    const id = req.params.introId;

    // Find the introducer user by introId
    const introducerUserResult = await IntroducerUser.findOne({
      where: { introId: id },
      attributes: ['userName'],
    });

    if (!introducerUserResult) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Introducer user not found', res);
    }

    const introducerUserName = introducerUserResult.userName;

    // Find users with introducersUserName matching introducerUser.userName and apply search
    const usersResult = await User.findAndCountAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { introducersUserName: introducerUserName },
              { introducersUserName1: introducerUserName },
              { introducersUserName2: introducerUserName },
            ],
          },
          {
            userName: {
              [Op.like]: `%${search}%`,
            },
          },
        ],
      },
      limit,
      offset,
    });

    if (usersResult.rows.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No matching users found', res);
    }

    let filteredIntroducerUsers = [];

    for (const matchedUser of usersResult.rows) {
      let filteredIntroducerUser = {
        userId: matchedUser.userId,
        firstName: matchedUser.firstName,
        lastName: matchedUser.lastName,
        userName: matchedUser.userName,
        wallet: matchedUser.wallet,
        role: matchedUser.role,
        webSiteDetail: matchedUser.webSiteDetail,
        transactionDetail: [], // Initialize as an empty array
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

        // Fetch transaction details for the current user
        const userTransactionDetails = await UserTransactionDetail.findAll({
          where: { userName: matchedUser.userName },
        });

        // Attach transaction details to the current user
        filteredIntroducerUser.transactionDetail = userTransactionDetails;
        filteredIntroducerUsers.push(filteredIntroducerUser);
      }
    }

    const totalItems = usersResult.count;
    const totalPages = Math.ceil(totalItems / limit);

    return apiResponsePagination(
      filteredIntroducerUsers,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page), limit, totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const subAdminPasswordResetCode = async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Check if the user exists
    const existingUser = await Admin.findOne({ where: { userName } });
    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    // Compare new password with the existing password
    const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
    if (passwordIsDuplicate) {
      return apiResponseErr(
        null,
        false,
        statusCode.badRequest,
        'New Password cannot be the same as existing password',
        res,
      );
    }

    // Hash the new password
    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);

    // Update the password in the database
    const resetData = await Admin.update({ password: encryptedPassword }, { where: { userName } });
    return apiResponseSuccess(resetData, true, statusCode.success, 'Password reset successful!', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerAccountSummary = async (req, res) => {
  try {
    const id = req.params.id;
    // Query to retrieve introducer transactions for the specified user ID
    const introSummary = await IntroducerTransaction.findAll({
      where: { introUserId: id },
      order: [['createdAt', 'DESC']],
    });

    let balances = 0;
    // Calculate balances based on transaction type
    let accountData = introSummary.map((data) => data.toJSON());
    accountData.reverse().forEach((data) => {
      if (data.transactionType === 'Deposit') {
        balances += parseFloat(data.amount);
        data.balance = balances;
      } else {
        balances -= parseFloat(data.amount);
        data.balance = balances;
      }
    });
    return apiResponseSuccess(accountData, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const SuperAdminPasswordResetCode = async (req, res) => {
  try {
    const { userName, oldPassword, password } = req.body;
    // Check if the user exists
    const existingUser = await Admin.findOne({ where: { userName } });
    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    // Check if the old password is correct
    const oldPasswordMatches = await bcrypt.compare(oldPassword, existingUser.password);
    if (!oldPasswordMatches) {
      return apiResponseErr(null, false, statusCode.unauthorize, 'Old password is incorrect', res);
    }

    // Compare new password with the old password
    if (oldPassword === password) {
      return apiResponseErr(
        null,
        false,
        statusCode.badRequest,
        'New password cannot be the same as the old password',
        res,
      );
    }

    // Compare new password with the existing password
    const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
    if (passwordIsDuplicate) {
      throw new CustomError('New Password cannot be the same as existing password', null, 400);
    }

    // Hash the new password
    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);

    // Update the password in the database
    await Admin.update({ password: encryptedPassword }, { where: { userName } });

    return apiResponseSuccess(null, true, statusCode.success, 'Password reset successful!', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getSingleUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Find user profile by userId
    const userProfile = await User.findOne({ where: { userId } });
    if (!userProfile) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    const userName = userProfile.userName;

    // Fetch UserTransactionDetail for the user with pagination and search
    const userTransactionDetailResult = await UserTransactionDetail.findAndCountAll({
      where: {
        userName,
        userName: {
          [Op.like]: `%${search}%`,
        },
      },
      limit,
      offset,
    });

    const userTransactionDetail = userTransactionDetailResult.rows;
    const totalItems = userTransactionDetailResult.count;
    const totalPages = Math.ceil(totalItems / limit);

    const userProfileWithTransactionDetail = {
      ...userProfile.dataValues,
      UserTransactionDetail: userTransactionDetail,
    };

    return apiResponsePagination(
      userProfileWithTransactionDetail,
      true,
      statusCode.success,
      'User profile fetched successfully',
      { page: parseInt(page), limit, totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const updateSubAdminProfile = async (req, res) => {
  try {
    // Check if the user exists
    const adminId = req.params.adminId;
    const { firstName, lastName } = req.body;
    const existingUser = await Admin.findOne({ where: { adminId } });
    if (!existingUser) {
      throw new CustomError(`Existing User not found with id: ${adminId}`, null, statusCode.badRequest);
    }

    // Update fields if provided in req.body
    if (firstName) {
      existingUser.firstName = firstName;
    }
    if (lastName) {
      existingUser.lastName = lastName;
    }
    // Save the updated user
    const updateAdmin = await existingUser.save();
    return apiResponseSuccess(updateAdmin, true, statusCode.success, 'Updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const viewSubAdminTransactions = async (req, res) => {
  try {
    const userId = req.params.subAdminId;

    const transactions = await Transaction.findAll({
      where: { subAdminId: userId },
      order: [['createdAt', 'DESC']],
    });

    const bankTransactions = await BankTransaction.findAll({
      where: { subAdminId: userId },
      order: [['createdAt', 'DESC']],
    });

    const websiteTransactions = await WebsiteTransaction.findAll({
      where: { subAdminId: userId },
      order: [['createdAt', 'DESC']],
    });

    if (transactions.length === 0 && bankTransactions.length === 0 && websiteTransactions.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No transactions found', res);
    }

    const allTransactions = [...transactions, ...bankTransactions, ...websiteTransactions];
    allTransactions.sort((a, b) => b.createdAt - a.createdAt);

    return apiResponseSuccess(allTransactions, true, statusCode.success, 'Updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

const AccountServices = {
  IntroducerBalance: async (introUserId, res) => {
    try {
      // Find all transactions for the introducer user
      const transactions = await IntroducerTransaction.findAll({
        where: {
          introUserId: introUserId,
        },
      });

      // Calculate balance based on transaction type
      let balance = 0;
      transactions.forEach((transaction) => {
        if (transaction.transactionType === 'Deposit') {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      });

      return balance;
    } catch (error) {
      console.error(error);
      return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
    }
  },

  getIntroBalance: async (introUserId, res) => {
    console.log('introUserId', introUserId);
    try {
      // Find all transactions for the introducer
      const introTransactions = await IntroducerTransaction.findAll({
        where: {
          introUserId: introUserId,
        },
      });

      let balance = 0;

      // Calculate balance based on transaction type
      introTransactions.forEach((transaction) => {
        if (transaction.transactionType === 'Deposit') {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      });

      // Calculate live balance using another service or function
      const liveBalance = await introducerLiveBalance(introUserId);
      const currentDue = liveBalance - balance;

      return {
        balance: balance,
        currentDue: currentDue,
      };
    } catch (error) {
      console.error(error);
      return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
    }
  },

  introducerLiveBalance: async (id, res) => {
    try {
      // Find the introducer user by id
      const introId = await IntroducerUser.findOne({
        where: {
          introId: id,
        },
      });

      if (!introId) {
        return apiResponseErr(null, false, statusCode.badRequest, `Introducer with ID ${id} not found`, res);
      }

      const IntroducerId = introId.userName;

      // Find all users where IntroducerId matches any introducersUserName
      const userIntroIds = await User.findAll({
        where: {
          [Sequelize.Op.or]: [
            { introducersUserName: IntroducerId },
            { introducersUserName1: IntroducerId },
            { introducersUserName2: IntroducerId },
          ],
        },
      });

      if (!userIntroIds.length) {
        return 0;
      }

      let liveBalance = 0;

      for (const user of userIntroIds) {
        let matchedIntroducersUserName, matchedIntroducerPercentage;

        if (user.introducersUserName === IntroducerId) {
          matchedIntroducersUserName = user.introducersUserName;
          matchedIntroducerPercentage = user.introducerPercentage;
        } else if (user.introducersUserName1 === IntroducerId) {
          matchedIntroducersUserName = user.introducersUserName1;
          matchedIntroducerPercentage = user.introducerPercentage1;
        } else if (user.introducersUserName2 === IntroducerId) {
          matchedIntroducersUserName = user.introducersUserName2;
          matchedIntroducerPercentage = user.introducerPercentage2;
        }

        // Find transaction details for the current user
        const transDetails = await UserTransactionDetail.findAll({
          where: {
            userName: user.userName,
          },
        });

        if (!transDetails.length) {
          continue;
        }

        let totalDep = 0;
        let totalWith = 0;

        transDetails.forEach((res) => {
          if (res.transactionType === 'Deposit') {
            totalDep += Number(res.amount);
          }
          if (res.transactionType === 'Withdraw') {
            totalWith += Number(res.amount);
          }
        });

        let diff = totalDep - totalWith;
        let amount = (matchedIntroducerPercentage / 100) * diff;
        liveBalance += amount;
      }

      return Math.round(liveBalance);
    } catch (error) {
      return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
    }
  },
};

export default AccountServices;

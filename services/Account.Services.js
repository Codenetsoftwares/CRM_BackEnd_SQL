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
      return apiResponseErr(null, false, statusCode.exist, `Admin already exists with user name: ${userName}`, res);
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
      return apiResponseErr(null, false, statusCode.badRequest, 'Failed to create new admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const updateUserProfile = async (req, res) => {
  try {
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
      contactNumber,
      Bank_Details,
      Upi_Details,
      Websites_Details,
    } = req.body;

    const existingUser = await User.findOne({ where: { userId } });

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, `User not found with id: ${userId}`, res);
    }

    // Convert percentages to float and validate
    const newIntroducerPercentage =
      introducerPercentage !== undefined ? parseFloat(introducerPercentage) : existingUser.introducerPercentage;
    const newIntroducerPercentage1 =
      introducerPercentage1 !== undefined ? parseFloat(introducerPercentage1) : existingUser.introducerPercentage1;
    const newIntroducerPercentage2 =
      introducerPercentage2 !== undefined ? parseFloat(introducerPercentage2) : existingUser.introducerPercentage2;

    if (isNaN(newIntroducerPercentage) || isNaN(newIntroducerPercentage1) || isNaN(newIntroducerPercentage2)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Introducer percentages must be valid numbers.', res);
    }

    const totalIntroducerPercentage = newIntroducerPercentage + newIntroducerPercentage1 + newIntroducerPercentage2;

    if (totalIntroducerPercentage < 0 || totalIntroducerPercentage > 100) {
      return apiResponseErr(
        null,
        false,
        statusCode.badRequest,
        'The sum of introducer percentages must be between 0 and 100.',
        res,
      );
    }

    // Construct updated data
    const updatedUserData = {
      introducersUserName1: introducersUserName1 || existingUser.introducersUserName1,
      introducerPercentage1: newIntroducerPercentage1,
      introducersUserName2: introducersUserName2 || existingUser.introducersUserName2,
      introducerPercentage2: newIntroducerPercentage2,
      firstName: firstName || existingUser.firstName,
      lastName: lastName || existingUser.lastName,
      contactNumber: contactNumber || existingUser.contactNumber,
      Bank_Details: Bank_Details || existingUser.Bank_Details,
      Upi_Details: Upi_Details || existingUser.Upi_Details,
      introducerPercentage: newIntroducerPercentage,
      introducersUserName: introducersUserName || existingUser.introducersUserName,
      Websites_Details: Websites_Details || existingUser.Websites_Details,
    };

    // Log updated data for debugging
    console.log('Updated User Data:', updatedUserData);

    // Update user
    const response = await existingUser.update(updatedUserData);

    return apiResponseSuccess(response, true, statusCode.success, 'Profile updated successfully', res);
  } catch (error) {
    console.error('Error updating user profile:', error); // Log error for debugging
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};


export const getUserProfile = async (req, res) => {
  const page = parseInt(req.params.page, 10);
  const searchQuery = req.query.search;
  const { pageSize = 10 } = req.query;

  try {
    let users;

    // Fetch users based on search query
    if (searchQuery) {
      users = await User.findAll({
        where: {
          userName: {
            [Op.like]: `%${searchQuery}%`,
          },
        },
        order: [['createdAt', 'DESC']],
      });
    } else {
      users = await User.findAll({
        order: [['createdAt', 'DESC']],
      });
    }

    // Pagination logic
    const offset = (page - 1) * pageSize;
    const paginatedUsers = users.slice(offset, offset + parseInt(pageSize, 10));

    // Fetch additional details for paginated users
    const detailedUsers = [];
    for (const user of paginatedUsers) {
      const userWithDetails = await User.findOne({
        where: { userName: user.userName },
        include: { model: UserTransactionDetail, as: 'transactionDetails' },
        attributes: [
          'id',
          'userId',
          'firstName',
          'lastName',
          'contactNumber',
          'userName',
          'introducersUserName',
          'introducerPercentage',
          'introducersUserName1',
          'introducerPercentage1',
          'introducersUserName2',
          'introducerPercentage2',
          'wallet',
          'profilePicture',
          'role',
          'Websites_Details',
          'Bank_Details',
          'Upi_Details',
          'createdAt',
          'updatedAt',
        ],
      });
      detailedUsers.push(userWithDetails);
    }

    const totalItems = users.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    if (detailedUsers.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No data found for the selected criteria.', {}, res);
    }

    return apiResponsePagination(
      detailedUsers,
      true,
      statusCode.success,
      'Profile retrieved successfully',
      {
        page: parseInt(page, 10),
        limit: parseInt(pageSize, 10),
        totalItems,
        totalPages,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
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
          [Op.like]: ['%Bank-View%'],
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const getSingleIntroducer = async (req, res) => {
  const { introId } = req.params;

  try {
    const introducer = await IntroducerUser.findOne({ where: { introId } });

    if (!introducer) {
      return apiResponseErr(null, false, statusCode.badRequest, `Introducer not found with id: ${introId}`, res);
    }

    return apiResponseSuccess(introducer, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const { count: totalItems, rows: users } = await User.findAndCountAll({
      where: {
        userName: {
          [Op.like]: `%${search}%`,
        },
      },
      attributes: ['userName'],
      offset,
      limit,
    });

    if (!users || users.length === 0) {
      return apiResponseSuccess(null, true, statusCode.success, 'No users found', res);
    }

    const userNames = users.map((user) => user.userName);
    const totalPages = Math.ceil(totalItems / limit);

    return apiResponsePagination(
      userNames,
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page),
        limit,
        totalPages,
        totalItems,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerById = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const { count: totalItems, rows: introducers } = await IntroducerUser.findAndCountAll({
      where: {
        userName: {
          [Op.like]: `%${search}%`,
        },
      },
      attributes: ['userName', 'introId'],
      offset,
      limit,
    });

    if (!introducers || introducers.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No introducers found', {}, res);
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const getSingleSubAdmin = async (req, res) => {
  try {
    const id = req.params.adminId;

    const subAdmin = await Admin.findOne({ where: { adminId: id } });

    if (!subAdmin) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Sub Admin not found with the given Id', res);
    }

    return apiResponseSuccess(subAdmin, true, statusCode.success, 'success', res);
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const editSubAdminRoles = async (req, res) => {
  try {
    const subAdminId = req.params.adminId;
    const { roles } = req.body;

    const [updatedRows] = await Admin.update({ roles }, { where: { adminId: subAdminId } });

    if (updatedRows === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'SubAdmin not found with the given Id', res);
    }

    return apiResponseSuccess(
      roles,
      true,
      statusCode.success,
      'SubAdmin roles updated successfully',
      res
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
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
      return apiResponseErr(null, true, statusCode.badRequest, 'Introducer user not found', res);
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
      return apiResponsePagination([], true, statusCode.success, 'No matching users found', {}, res);
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
        transactionDetail: [],
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
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
        statusCode.exist,
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const getIntroducerAccountSummary = async (req, res) => {
  try {
    const id = req.params.id;
    const { page = 1, pageSize = 10 } = req.query;

    const limit = parseInt(pageSize);

    const offset = (page - 1) * limit;

    const { count, rows } = await IntroducerTransaction.findAndCountAll({
      where: { introUserId: id },
      order: [['createdAt', 'DESC']],
      limit,
      offset: offset,
    });

    let balances = 0;
    let accountData = rows.map((data) => data.toJSON());
    accountData.reverse().forEach((data) => {
      if (data.transactionType === 'Deposit') {
        balances += parseFloat(data.amount);
        data.balance = balances;
      } else {
        balances -= parseFloat(data.amount);
        data.balance = balances;
      }
    });

    const totalPages = Math.ceil(count / pageSize);

    return apiResponsePagination(
      accountData, true, statusCode.success, 'success', {
      page: parseInt(page),
      limit,
      totalPages,
      totalItems: count,
    },
      res
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};


export const SuperAdminPasswordResetCode = async (req, res) => {
  try {
    const { userName, oldPassword, password } = req.body;
    const existingUser = await Admin.findOne({ where: { userName } });
    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    const oldPasswordMatches = await bcrypt.compare(oldPassword, existingUser.password);
    if (!oldPasswordMatches) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Old password is incorrect', res);
    }

    if (oldPassword === password) {
      return apiResponseErr(
        null,
        false,
        statusCode.badRequest,
        'New password cannot be the same as the old password',
        res,
      );
    }

    const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
    if (passwordIsDuplicate) {
      return apiResponseErr(
        null,
        false,
        statusCode.exist,
        'New Password cannot be the same as existing password',
        res,
      );
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
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const userProfile = await User.findOne({ where: { userId } });
    if (!userProfile) {
      return apiResponseErr(null, false, statusCode.badRequest, `User not found with id: ${userId}`, res);
    }

    const userName = userProfile.userName;

    const userTransactionDetailResult = await UserTransactionDetail.findAndCountAll({
      where: {
        userName
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const updateSubAdminProfile = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const { firstName, lastName } = req.body;
    const existingUser = await Admin.findOne({ where: { adminId } });
    if (!existingUser) {
      return apiResponseSuccess(null, false, statusCode.badRequest, `User not found with id: ${adminId}`, res);
    }

    if (firstName) {
      existingUser.firstName = firstName;
    }
    if (lastName) {
      existingUser.lastName = lastName;
    }
    const updateAdmin = await existingUser.save();
    return apiResponseSuccess(updateAdmin, true, statusCode.success, 'Updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

// Helper function to check if a column exists in the schema
const columnExists = async (model, column) => {
  const describe = await model.describe();
  return describe.hasOwnProperty(column);
};

// Function to build where conditions based on provided filters
const buildWhereCondition = async (model, filterObj) => {
  const conditions = {};
  for (const [key, value] of Object.entries(filterObj)) {
    if (value && await columnExists(model, key)) {
      conditions[key] = value;
    }
  }
  return conditions;
};

// Function to apply additional filters, including amount range
const applyFilters = (results, filters) => {
  const { minAmount, maxAmount } = filters;

  return results.filter(item => {
    const amountFields = ['withdrawAmount', 'depositAmount', 'amount'];
    let withinAmountRange = true;

    // Check amount range for each relevant field
    for (const field of amountFields) {
      if (item[field] !== null && item[field] !== undefined) {
        if (minAmount !== undefined && item[field] < minAmount) {
          withinAmountRange = false;
          break;
        }
        if (maxAmount !== undefined && item[field] > maxAmount) {
          withinAmountRange = false;
          break;
        }
      }
    }

    const otherFiltersValid = Object.entries(filters).every(([key, value]) =>
      key === 'minAmount' || key === 'maxAmount' || !value || item[key] === value
    );

    return withinAmountRange && otherFiltersValid;
  });
};


// View Sub-Admin Transactions with pagination and amount range filter
export const viewSubAdminTransactions = async (req, res) => {
  try {
    const userId = req.params.subAdminId;
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;
    const { filters } = req.body;

    // Build filtering conditions for each model
    const transactionFilters = await buildWhereCondition(Transaction, filters);
    const bankTransactionFilters = await buildWhereCondition(BankTransaction, filters);
    const websiteTransactionFilters = await buildWhereCondition(WebsiteTransaction, filters);

    // Fetch transactions based on filtering conditions
    const transactions = await Transaction.findAll({
      where: { ...transactionFilters, subAdminId: userId },
      order: [['createdAt', 'DESC']],
    });

    const bankTransactions = await BankTransaction.findAll({
      where: { ...bankTransactionFilters, subAdminId: userId },
      order: [['createdAt', 'DESC']],
    });

    const websiteTransactions = await WebsiteTransaction.findAll({
      where: { ...websiteTransactionFilters, subAdminId: userId },
      order: [['createdAt', 'DESC']],
    });

    if (transactions.length === 0 && bankTransactions.length === 0 && websiteTransactions.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No transactions found', {}, res);
    }

    // Combine results
    const allTransactions = [
      ...transactions.map(tx => ({ ...tx.dataValues, type: 'Transaction' })),
      ...bankTransactions.map(bt => ({ ...bt.dataValues, type: 'BankTransaction' })),
      ...websiteTransactions.map(wt => ({ ...wt.dataValues, type: 'WebsiteTransaction' }))
    ];

    // Apply additional filters, including amount range
    const filteredResults = applyFilters(allTransactions, filters);

    // Sort and paginate results
    const sortedResults = filteredResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paginatedTransactions = sortedResults.slice(offset, offset + limit);
    const totalItems = filteredResults.length;
    const totalPages = Math.ceil(totalItems / limit);

    return apiResponsePagination(
      paginatedTransactions,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page, 10), limit, totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

// Models for Transaction, BankTransaction, and WebsiteTransaction are unchanged



export const accountSummary = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const { filters } = req.body;
    const limit = parseInt(pageSize, 10);
    const offset = (page - 1) * limit;

    // Fetch data for each model with their respective conditions
    const [transactions, websiteTransactions, bankTransactions] = await Promise.all([
      Transaction.findAll({ where: await buildWhereCondition(Transaction, filters), order: [['createdAt', 'DESC']] }),
      WebsiteTransaction.findAll({ where: await buildWhereCondition(WebsiteTransaction, filters), order: [['createdAt', 'DESC']] }),
      BankTransaction.findAll({ where: await buildWhereCondition(BankTransaction, filters), order: [['createdAt', 'DESC']] })
    ]);

    // Combine results
    const combinedResults = [
      ...transactions.map(tx => ({ ...tx.dataValues, type: 'Transaction' })),
      ...websiteTransactions.map(wt => ({ ...wt.dataValues, type: 'WebsiteTransaction' })),
      ...bankTransactions.map(bt => ({ ...bt.dataValues, type: 'BankTransaction' }))
    ];

    // Apply additional filters if provided
    const filteredResults = applyFilters(combinedResults, filters);

    // Sort and paginate results
    const paginatedResults = filteredResults.slice(offset, offset + limit);
    const totalItems = filteredResults.length;
    const totalPages = Math.ceil(totalItems / limit);

    return apiResponsePagination(
      paginatedResults,
      true,
      statusCode.success,
      'success',
      {
        page: parseInt(page, 10),
        limit,
        totalPages,
        totalItems,
      },
      res
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const introducerLiveBalance = async (introUserId) => {
  try {
    // Find the introducer user by id
    const intro = await IntroducerUser.findOne({
      where: {
        introId: introUserId,
      },
    });

    if (!intro) {
      return apiResponseErr(null, false, statusCode.exist, `Introducer with ID ${introUserId} not found`, res);
    }

    const IntroducerId = intro.userName;

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
    throw new Error(error.message);
  }
};

export const introducerProfile = async (req, res) => {
  const { page = 1 } = req.params;
  const { pageSize = 10 } = req.query;

  const userName = req.query.search;

  try {
    // Fetch all introducer users
    const introducerUsers = await IntroducerUser.findAll({ order: [['createdAt', 'DESC']], });

    // Filter introducer user data based on the search query
    let introData = introducerUsers;
    if (userName) {
      introData = introData.filter((user) => user.userName.includes(userName));
    }

    // Calculate balance for each introducer user
    for (let index = 0; index < introData.length; index++) {
      introData[index].dataValues.balance = await getIntroBalance(introData[index].introId);
    }

    const totalItems = introData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const SecondArray = introData.slice(startIndex, endIndex);

    if (SecondArray.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No data', {}, res);
    }

    return apiResponsePagination(
      SecondArray,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page), limit: parseInt(pageSize), totalPages, totalItems },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const getIntroBalance = async (introUserId) => {
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
    throw new Error(error.message); // Adjust error handling
  }
};

export const IntroducerBalance = async (introUserId, res) => {
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
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const viewSubAdmins = async (req, res) => {
  try {
    const { page = 1 } = req.params;
    const searchQuery = req.query.search;
    const { pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    let whereCondition = {
      roles: {
        [Op.not]: '["superAdmin"]',
      },
    };

    if (searchQuery) {
      whereCondition = {
        ...whereCondition,
        userName: {
          [Op.like]: `%${searchQuery}%`,
        },
      };
    }

    const { count, rows } = await Admin.findAndCountAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    if (rows.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No data found for the selected criteria.', {}, res);
    }

    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      rows,
      true,
      statusCode.success,
      'success',
      { page: parseInt(page), limit, totalPages, totalItems: count },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

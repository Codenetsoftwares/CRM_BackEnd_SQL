import { validationResult } from 'express-validator';
import sequelize from '../db.js';
import EditWebsiteRequest from '../models/editWebsiteRequest.model.js';
import Website from '../models/website.model.js';
import WebsiteRequest from '../models/websiteRequest.model.js';
import WebsiteSubAdmins from '../models/websiteSubAdmins.model.js';
import WebsiteTransaction from '../models/websiteTransaction.model.js';
import { database } from '../services/database.service.js';
import CustomError from '../utils/extendError.js';
import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import { v4 as uuidv4 } from 'uuid';

export const addWebsiteName = async (req, res) => {
  try {
    const userData = req.user;
    let websiteName = req.body.websiteName;

    // Remove spaces from the websiteName
    websiteName = websiteName.replace(/\s+/g, '');

    if (!websiteName) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Please provide a website name to add', res);
    }

    // Check if the website name already exists in WebsiteRequest or Website table (ignoring case)
    const [existingWebsiteRequests, existingWebsites] = await Promise.all([
      WebsiteRequest.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('websiteName')), websiteName.toLowerCase())
      }),
      Website.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('websiteName')), websiteName.toLowerCase())
      }),
    ]);

    if (existingWebsiteRequests.length > 0 || existingWebsites.length > 0) {
      throw new CustomError('Website name already exists', null, 409);
    }

    const websiteId = uuidv4();
    const newWebsiteRequest = await WebsiteRequest.create({
      websiteId,
      websiteName,
      subAdminId: userData && userData.userName ? userData.userName : null,
      subAdminName: userData && userData.firstName ? userData.firstName : null,
    });
    return apiResponseSuccess(newWebsiteRequest, true, statusCode.create, 'Website name sent for approval!', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.message, res
    )
  }
};

export const approveWebsiteAndAssignSubAdmin = async (approvedWebsiteRequest, subAdmins, res) => {
  try {
    const insertedWebsite = await Website.create({
      websiteId: approvedWebsiteRequest[0].websiteId,
      websiteName: approvedWebsiteRequest[0].websiteName,
      subAdminName: approvedWebsiteRequest[0].subAdminName,
      isActive: true,
    });

    const subAdminPromises = subAdmins.map(async (subAdmin) => {
      const { subAdminId, isWithdraw, isDeposit, isEdit, isRenew, isDelete } = subAdmin;
      await WebsiteSubAdmins.create({
        websiteId: approvedWebsiteRequest[0].websiteId,
        subAdminId,
        isDeposit,
        isWithdraw,
        isEdit,
        isRenew,
        isDelete,
      });
    });

    await Promise.all(subAdminPromises);

    return subAdmins.length;
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.message, res
    )
  }
};

// Separate controller function
export const handleApproveWebsite = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponseErr(null, false, statusCode.badRequest, errors.array(), res);
  }

  try {
    const { isApproved, subAdmins } = req.body;
    const { websiteId } = req.params;

    const approvedWebsiteRequest = await WebsiteRequest.findAll({
      where: { websiteId },
    });

    if (!approvedWebsiteRequest || approvedWebsiteRequest.length === 0) {
      throw new CustomError('Website not found in the approval requests!', null, 409);
    }

    if (isApproved) {
      const rowsInserted = await approveWebsiteAndAssignSubAdmin(approvedWebsiteRequest, subAdmins);

      if (rowsInserted > 0) {
        await WebsiteRequest.destroy({
          where: { websiteId },
        });
      } else {
        throw new CustomError('Failed to insert rows into Website table.', null, statusCode.badRequest);
      }
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website approval was not granted.', res);
    }

    return apiResponseSuccess(null, true, statusCode.success, 'Website approved successfully & SubAdmin Assigned', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.message, res
    )
  }
};

export const viewWebsiteRequests = async (req, res) => {
  try {
    const { page = 1, size = 10, search = '' } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const whereCondition = search
      ? {
        websiteName: {
          [Op.like]: `%${search}%`
        }
      }
      : {};

    const { count, rows: websiteRequests } = await WebsiteRequest.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      websiteRequests,
      true,
      statusCode.success,
      'Website requests fetched successfully',
      {
        page: parseInt(page),
        limit: limit,
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

export const deleteWebsiteRequest = async (req, res) => {
  try {
    const id = req.params.websiteId;
    // Delete the website request
    const result = await WebsiteRequest.destroy({
      where: {
        websiteId: id,
      },
    });

    // Check if any rows were affected
    if (result === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Data not found', res);
    }
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

export const rejectWebsiteRequest = async (req, res) => {
  try {
    const id = req.params.websiteId;

    // Delete the website request
    const result = await WebsiteRequest.destroy({
      where: {
        websiteId: id,
      },
    });

    // Check if any rows were affected
    if (result === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Data not found', res);
    }
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

export const deleteEditWebsiteRequest = async (req, res) => {
  try {
    const id = req.params.websiteId;

    // Delete the edit website request
    const result = await EditWebsiteRequest.destroy({
      where: {
        websiteId: id,
      },
    });

    // Check if any rows were affected
    if (result === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Data not found', res);
    }
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

export const getActiveWebsiteNames = async (req, res) => {
  try {
    const activeWebsites = await Website.findAll({
      attributes: ['websiteName', 'isActive'],
      where: {
        isActive: true,
      },
    });

    return apiResponseSuccess(activeWebsites, true, statusCode.success, 'Active websites fetched successfully', res);
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

export const deleteSubAdminFromWebsite = async (req, res) => {
  try {
    const { websiteId, subAdminId } = req.params;

    // Check if the website exists
    const website = await WebsiteSubAdmins.findOne({ where: { websiteId } });
    if (!website) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website not found!', res);
    }

    // Delete the sub-admin with the specified subAdminId
    const result = await WebsiteSubAdmins.destroy({
      where: {
        websiteId,
        subAdminId,
      },
    });

    if (result) {
      return apiResponseSuccess(null, true, statusCode.success, 'SubAdmin Permission removed successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'SubAdmin not found!', res);
    }
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

export const getSingleWebsiteDetails = async (req, res) => {
  try {
    const id = req.params.websiteId;

    // Fetch website data
    const dbWebsiteData = await Website.findOne({ where: { websiteId: id } });
    if (!dbWebsiteData) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website not found', res);
    }

    // Fetch website balance
    const websiteBalance = await WebsiteServices.getWebsiteBalance(dbWebsiteData.websiteId);

    // Prepare response
    const response = {
      websiteId: dbWebsiteData.websiteId,
      websiteName: dbWebsiteData.websiteName,
      subAdminId: dbWebsiteData.subAdminId,
      subAdminName: dbWebsiteData.subAdminName,
      balance: websiteBalance,
    };

    return apiResponseSuccess([response], true, statusCode.success, 'Website data retrieved successfully', res);
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

export const addWebsiteBalance = async (req, res) => {
  try {
    const id = req.params.websiteId;
    const userName = req.user;
    const { amount, transactionType, remarks } = req.body;

    if (transactionType !== 'Manual-Website-Deposit') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid transaction type', res);
    }

    if (!amount || typeof amount !== 'number') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid amount', res);
    }

    if (!remarks) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Remark is required', res);
    }

    // Fetch website data
    const website = await Website.findOne({ where: { websiteId: id } });
    if (!website) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website not found', res);
    }

    // Prepare the transaction data
    const websiteTransaction = {
      websiteId: website.websiteId,
      websiteTransactionId: uuidv4(),
      websiteName: website.websiteName,
      remarks: remarks,
      transactionType: transactionType,
      depositAmount: Math.round(parseFloat(amount)),
      subAdminId: userName.userName,
      subAdminName: userName.firstName,
      createdAt: new Date().toISOString(),
    };

    // Insert the transaction data into WebsiteTransaction table
    await WebsiteTransaction.create(websiteTransaction);

    return apiResponseSuccess(null, true, statusCode.success, 'Wallet Balance Added to Your Website', res);
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

export const withdrawWebsiteBalance = async (req, res) => {
  try {
    const id = req.params.websiteId;
    const userName = req.user;
    const { amount, transactionType, remarks } = req.body;

    if (!amount || typeof amount !== 'number') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid amount', res);
    }

    if (transactionType !== 'Manual-Website-Withdraw') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid transaction type', res);
    }

    if (!remarks) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Remark is required', res);
    }

    // Fetch website data
    const website = await Website.findOne({ where: { websiteId: id } });
    if (!website) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website not found', res);
    }

    // Fetch website balance
    const websiteBalance = await WebsiteServices.getWebsiteBalance(id);
    if (websiteBalance < Number(amount)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Insufficient Website Balance', res);
    }

    // Prepare the transaction data
    const websiteTransaction = {
      websiteId: website.websiteId,
      websiteTransactionId: uuidv4(),
      websiteName: website.websiteName,
      remarks: remarks,
      transactionType: transactionType,
      withdrawAmount: Math.round(parseFloat(amount)),
      subAdminId: userName.userName,
      subAdminName: userName.firstName,
      createdAt: new Date().toISOString(),
    };

    // Insert the transaction data into WebsiteTransaction table
    await WebsiteTransaction.create(websiteTransaction);

    return apiResponseSuccess(null, true, statusCode.success, 'Wallet Balance Deducted from your Website', res);
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

export const getWebsiteNames = async (req, res) => {
  try {
    const websites = await Website.findAll({
      attributes: ['websiteName'],
    });

    if (!websites) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No websites found', res);
    }

    return apiResponseSuccess(websites, true, statusCode.success, 'Websites retrieved successfully', res);
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

export const getEditWebsiteRequests = async (req, res) => {
  try {
    const editRequests = await EditWebsiteRequest.findAll();
    return editRequests;
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

export const websiteActive = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { isActive } = req.body;

    // Validate input
    if (typeof isActive !== 'boolean') {
      throw new CustomError('isActive field must be a boolean value', null, statusCode.badRequest);
    }

    // Update isActive field in the database
    const [updatedRowsCount] = await Website.update(
      { isActive },
      { where: { websiteId } }
    );

    // Check if any rows were updated
    if (updatedRowsCount === 0) {
      return apiResponseErr(null, false, statusCode.notFound, 'No websites found', res);
    }
    // Send success response
    return apiResponseSuccess(updatedRowsCount, true, statusCode.success, 'Website status updated successfully', res);
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

export const websiteSubAdminView = async (req, res) => {
  try {
    const subAdminId = req.params.subAdminId;

    // Use Sequelize to fetch website names associated with the sub-admin
    const websiteData = await Website.findAll({
      include: [{
        model: WebsiteSubAdmins,
        where: { subAdminId },
        attributes: ['websiteName'],
      }],
    });

    if (!websiteData) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website not found for this sub-admin', res);
    }

    return apiResponseSuccess(websiteData, true, statusCode.success, 'success', res);

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

export const updateWebsitePermissions = async (req, res) => {
  try {
    const { subAdmins } = req.body;
    const websiteId = req.params.websiteId;

    const promises = subAdmins.map(async (subAdminData) => {
      const [existingSubAdmin] = await WebsiteSubAdmins.findOne({
        where: {
          websiteId: websiteId,
          subAdminId: subAdminData.subAdminId,
        },
      });

      if (!existingSubAdmin) {
        await WebsiteSubAdmins.create({
          websiteId: websiteId,
          subAdminId: subAdminData.subAdminId,
          isDeposit: subAdminData.isDeposit || false,
          isWithdraw: subAdminData.isWithdraw || false,
          isEdit: subAdminData.isEdit || false,
          isRenew: subAdminData.isRenew || false,
          isDelete: subAdminData.isDelete || false,
        });
      } else {
        await existingSubAdmin.update({
          isDeposit: subAdminData.isDeposit || false,
          isWithdraw: subAdminData.isWithdraw || false,
          isEdit: subAdminData.isEdit || false,
          isRenew: subAdminData.isRenew || false,
          isDelete: subAdminData.isDelete || false,
        });
      }
    });

    await Promise.all(promises);

    return apiResponseSuccess(null, true, statusCode.success, 'Website Permission Updated successfully', res);

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

const WebsiteServices = {

  getBankRequests: async () => {
    try {
      const sql = 'SELECT * FROM BankRequest';
      const result = await database.execute(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error('Internal Server error');
    }
  },

  getWebsiteBalance: async (websiteId) => {
    try {
      const websiteTransactionsQuery = `SELECT * FROM WebsiteTransaction WHERE websiteId = ?`;
      const [websiteTransactions] = await database.execute(websiteTransactionsQuery, [websiteId]);

      const transactionsQuery = `SELECT * FROM Transaction WHERE websiteId = ?`;
      const [transactions] = await database.execute(transactionsQuery, [websiteId]);

      let balance = 0;

      for (const transaction of websiteTransactions) {
        if (transaction.depositAmount) {
          balance += parseFloat(transaction.depositAmount);
        }
        if (transaction.withdrawAmount) {
          balance -= parseFloat(transaction.withdrawAmount);
        }
      }

      for (const transaction of transactions) {
        if (transaction.transactionType === 'Deposit') {
          balance -= parseFloat(transaction.bonus) + parseFloat(transaction.amount);
        } else {
          balance += parseFloat(transaction.amount);
        }
      }

      return balance;
    } catch (e) {
      console.error(e);
      throw e; // Rethrow the error to handle it at the calling site
    }
  },

  updateWebsite: async (response, data) => {
    const existingRequest = response;
    console.log('existingRequest', existingRequest);
    if (!existingRequest) {
      throw { code: 404, message: `Website not found with id: ${existingRequest}` };
    }

    // Check if the website has already been edited
    const [editHistory] = await database.execute(`SELECT * FROM EditWebsiteRequest WHERE websiteId = ?`, [
      existingRequest,
    ]);
    if (editHistory.length > 0) {
      throw { code: 400, message: `Website with id ${existingRequest} has already been edited.` };
    }

    let changedFields = {};

    // Compare each field in the data object with the existingTransaction
    if (data.websiteName !== existingRequest.websiteName) {
      changedFields.websiteName = data.websiteName;
    }

    // Check if the new website name already exists (case-insensitive)
    const [duplicateWebsite] = await database.execute(`SELECT * FROM Website WHERE LOWER(websiteName) = LOWER(?)`, [
      data.websiteName,
    ]);
    if (duplicateWebsite.length > 0) {
      throw { code: 400, message: 'Website name already exists in Website' };
    }

    const [duplicateEditWebsite] = await database.execute(
      `SELECT * FROM EditWebsiteRequest WHERE LOWER(websiteName) = LOWER(?)`,
      [data.websiteName],
    );
    if (duplicateEditWebsite.length > 0) {
      throw { code: 400, message: 'Website name already exists in Edit Request' };
    }

    // Create updatedTransactionData using a ternary operator
    const updatedTransactionData = {
      id: existingRequest.websiteId,
      websiteName:
        data.websiteName.replace(/\s+/g, '') !== undefined
          ? data.websiteName
          : existingRequest.websiteName.replace(/\s+/g, ''),
    };

    console.log('update', updatedTransactionData);

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const editRequestQuery = `
    INSERT INTO EditWebsiteRequest (websiteId, websiteName, message, type, changedFields, isApproved) 
    VALUES (?, ?, ?, ?, ?, ?)`;

    await database.execute(editRequestQuery, [
      updatedTransactionData.id,
      updatedTransactionData.websiteName,
      "Website Detail's has been edited",
      'Edit',
      JSON.stringify(changedFields),
      false, // Assuming this corresponds to the 'isApproved' column
    ]);

    return true;
  },
};

export default WebsiteServices;

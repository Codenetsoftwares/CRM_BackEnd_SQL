import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import { v4 as uuidv4 } from 'uuid';
import Bank from '../models/bank.model.js';
import Transaction from '../models/transaction.model.js';
import bankTransaction from '../models/bankTransaction.model.js';
import BankRequest from '../models/bankRequest.model.js';
import BankSubAdmin from '../models/bankSubAdmins.model.js';
import { Op, QueryTypes, where } from 'sequelize';
import { database } from '../services/database.service.js';
import EditBankRequest from '../models/editBankRequest.model.js';
import BankSubAdmins from '../models/bankSubAdmins.model.js';
import sequelize from '../db.js';
import BankTransaction from '../models/bankTransaction.model.js';
import Website from '../models/website.model.js';

export const updateBank = async (req, res) => {
  try {
    const bankId = req.params.bank_id;
    const { accountHolderName, bankName, accountNumber, ifscCode, upiId, upiAppName, upiNumber } = req.body // send every thing in req.body 

    // Retrieve existing bank details from the database
    const existingBank = await Bank.findOne({ where: { bankId } });
    // Check if bank details exist
    if (!existingBank) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank not found', res);
    }

    // Update logic
    let changedFields = {};
    // Compare each field in the data object with the existingBank
    if (accountHolderName !== existingBank.accountHolderName) {
      changedFields.accountHolderName = accountHolderName;
    }
    if (bankName !== existingBank.bankName) {
      changedFields.bankName = bankName;
    }
    if (accountNumber !== existingBank.accountNumber) {
      changedFields.accountNumber = accountNumber;
    }
    if (ifscCode !== existingBank.ifscCode) {
      changedFields.ifscCode = ifscCode;
    }
    if (upiId !== existingBank.upiId) {
      changedFields.upiId = upiId;
    }
    if (upiAppName !== existingBank.upiAppName) {
      changedFields.upiAppName = upiAppName;
    }
    if (upiNumber !== existingBank.upiNumber) {
      changedFields.upiNumber = upiNumber;
    }

    // Check for duplicate bank name
    const duplicateBank = await Bank.findOne({
      where: { bankName: bankName },
    });

    if (duplicateBank) {
      return apiResponseErr(null, false, statusCode.exist, 'Bank name already exists!', res);
    }

    // Update existingBank attributes
    existingBank.accountHolderName =
      accountHolderName !== undefined ? accountHolderName : existingBank.accountHolderName;
    existingBank.bankName =
      bankName !== undefined
        ? bankName.replace(/\s+/g, '')
        : existingBank.bankName.replace(/\s+/g, '');
    existingBank.accountNumber =
      accountNumber !== undefined ? accountNumber : existingBank.accountNumber;
    existingBank.ifscCode = ifscCode !== undefined ? ifscCode : existingBank.ifscCode;
    existingBank.upiId = upiId !== undefined ? upiId : existingBank.upiId;
    existingBank.upiAppName = upiAppName !== undefined ? upiAppName : existingBank.upiAppName;
    existingBank.upiNumber = upiNumber !== undefined ? upiNumber : existingBank.upiNumber;

    // Save updated bank details
    await existingBank.save();

    // Create edit request record
    const editRequest = await EditBankRequest.create({
      bankId: existingBank.bankId,
      accountHolderName: existingBank.accountHolderName,
      bankName: existingBank.bankName,
      accountNumber: existingBank.accountNumber,
      ifscCode: existingBank.ifscCode,
      upiId: existingBank.upiId,
      upiAppName: existingBank.upiAppName,
      upiNumber: existingBank.upiNumber,
      changedFields: JSON.stringify(changedFields),
      isApproved: false,
      type: 'Edit',
      message: "Bank Detail's has been edited",
    });

    // Send success response
    return apiResponseSuccess(
      editRequest,
      true,
      statusCode.success,
      "Bank detail's edit request sent to Super Admin for Approval",
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const approveBankDetailEditRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const editRequest = await EditBankRequest.findOne({ where: { bankId: requestId } });  // findByPk not working

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Edit request not found', res);
    }

    const { isApproved } = req.body;
    if (typeof isApproved !== 'boolean') {
      return apiResponseErr(null, false, statusCode.badRequest, 'isApproved field must be a boolean value', res);
    }

    if (!editRequest.isApproved) {
      if (isApproved) {
        const bankExists = await Bank.findOne({
          where: { bankName: editRequest.bankName, bankId: { [Op.ne]: editRequest.bankId } },  // id correction
        });

        if (bankExists) {
          return apiResponseErr(null, false, statusCode.exist, 'Bank with the same name already exists', res);
        }

        await Bank.update(
          {
            accountHolderName: editRequest.accountHolderName,
            bankName: editRequest.bankName.replace(/\s+/g, ''),
            accountNumber: editRequest.accountNumber,
            ifscCode: editRequest.ifscCode,
            upiId: editRequest.upiId,
            upiAppName: editRequest.upiAppName,
            upiNumber: editRequest.upiNumber,
          },
          { where: { bankId: editRequest.bankId } }, // id correction
        );

        editRequest.isApproved = true;
        await editRequest.save();
        await EditBankRequest.destroy({ where: { bankId: requestId } });// id correction

        return apiResponseSuccess(null, true, statusCode.success, 'Edit request approved and data updated', res);
      } else {
        return apiResponseSuccess(null, true, statusCode.success, 'Edit request rejected', res);
      }
    } else {
      return apiResponseSuccess(null, true, statusCode.success, 'Edit request is already approved', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteBankRequest = async (req, res) => {
  try {
    const id = req.params.bankId;

    // Use Sequelize to delete the record
    const result = await BankRequest.destroy({  // db correction
      where: {
        bankId: id,
      },
    });

    if (result === 1) {
      return apiResponseSuccess(result, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteSubAdmin = async (req, res) => {
  try {
    const { bankId, subAdminId } = req.params;

    // Check if the bank exists
    const bank = await BankSubAdmin.findOne({
      where: {
        bankId: bankId,
      },
    });

    if (!bank) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank not found!', res);
    }

    // Remove the subAdmin with the specified subAdminId
    const result = await BankSubAdmin.destroy({
      where: {
        bankId: bankId,
        subAdminId: subAdminId,
      },
    });

    if (result === 0) {
      return apiResponseSuccess([], true, statusCode.success, 'SubAdmin not found!', res);
    }
    return apiResponseSuccess(result, true, statusCode.success, 'SubAdmin Permission removed successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const addBankName = async (req, res) => {
  try {
    const userName = req.user;
    const {
      accountHolderName = '',
      bankName,
      accountNumber = '',
      ifscCode = '',
      upiId = '',
      upiAppName = '',
      upiNumber = '',
    } = req.body;

    const trimmedBankName = bankName.replace(/\s+/g, '');
    if (!trimmedBankName) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Please provide a bank name to add', res);
    }

    // Check if the bank name already exists in Bank or BankRequest tables
    const [existingBank, existingBankRequest] = await Promise.all([
      Bank.findOne({
        where: sequelize.where(
          sequelize.fn('REPLACE', sequelize.fn('LOWER', sequelize.col('bankName')), ' ', ''),
          trimmedBankName.toLowerCase(),
        ),
      }),
      BankRequest.findOne({
        where: sequelize.where(
          sequelize.fn('REPLACE', sequelize.fn('LOWER', sequelize.col('bankName')), ' ', ''),
          trimmedBankName.toLowerCase(),
        ),
      }),
    ]);

    if (existingBank || existingBankRequest) {
      return apiResponseErr(null, false, statusCode.exist, 'Bank name already exists!', res);
    }

    const bankId = uuidv4();
    // Insert new bank name
    const bank = await BankRequest.create({
      bankId,
      bankName: trimmedBankName,
      accountHolderName: accountHolderName || null,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      upiId: upiId || null,
      upiAppName: upiAppName || null,
      upiNumber: upiNumber || null,
      subAdminName: userName && userName.firstName ? userName.firstName : null,
      subAdminId: userName && userName.userName ? userName.userName : null,
    });

    return apiResponseSuccess(bank, true, statusCode.create, 'Bank name sent for approval!', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const approveBank = async (req, res) => {
  try {
    const { isApproved, subAdmins } = req.body;
    const bankId = req.params.bankId;

    // Find the bank request by bankId
    const approvedBankRequest = await BankRequest.findOne({ where: { bankId } });

    // Throw error if bank request not found
    if (!approvedBankRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank not found in the approval requests!', res);
    }

    // If approval is granted, insert bank details and assign subAdmins
    if (isApproved) {
      await sequelize.transaction(async (t) => {
        // Insert bank details into Bank table
        const newBank = await Bank.create(
          {
            bankId: approvedBankRequest.bankId,
            bankName: approvedBankRequest.bankName,
            accountHolderName: approvedBankRequest.accountHolderName,
            accountNumber: approvedBankRequest.accountNumber,
            ifscCode: approvedBankRequest.ifscCode,
            upiId: approvedBankRequest.upiId,
            upiAppName: approvedBankRequest.upiAppName,
            upiNumber: approvedBankRequest.upiNumber,
            subAdminName: approvedBankRequest.subAdminName,
            isActive: true,
          },
          { transaction: t },
        );

        // Check if subAdmins is an array before mapping
        if (Array.isArray(subAdmins)) {
          // Insert subAdmins into BankSubAdmins table
          await Promise.all(
            subAdmins.map(async (subAdmin) => {
              await BankSubAdmins.create(
                {
                  bankId: newBank.bankId,
                  subAdminId: subAdmin.subAdminId,
                  isDeposit: subAdmin.isDeposit,
                  isWithdraw: subAdmin.isWithdraw,
                  isEdit: subAdmin.isEdit,
                  isRenew: subAdmin.isRenew,
                  isDelete: subAdmin.isDelete,
                },
                { transaction: t },
              );
            }),
          );
        }

        // Delete bank request after successful insertion
        await BankRequest.destroy({ where: { bankId } }, { transaction: t });
      });

      // Send success response
      return apiResponseSuccess(null, true, statusCode.success, 'Bank approved successfully & SubAdmin Assigned', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank approval was not granted.', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const viewBankRequests = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Database query using Sequelize with pagination
    const { count, rows: bankRequests } = await BankRequest.findAndCountAll({
      limit,
      offset,
    });

    if (bankRequests.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No bank requests found',{}, res);
    }

    const totalPages = Math.ceil(count / limit);

    // Send response with pagination details
    return apiResponsePagination(
      { bankRequests },
      true,
      statusCode.success,
      'Bank requests retrieved successfully',
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

export const getSingleBankDetails = async (req, res) => {
  try {
    const id = req.params.bank_id;
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    console.log('id', id);

    const dbBankData = await Bank.findOne({ where: { bankId: id } });
    console.log('bankdata', dbBankData);

    if (!dbBankData) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank not found', res);
    }

    let balance = 0;

    const bankTransactionsResult = await BankTransaction.findAndCountAll({
      where: { bankId: dbBankData.bankId },
      limit,
      offset
    });

    const transactionsResult = await Transaction.findAndCountAll({
      where: { bankId: dbBankData.bankId },
      limit,
      offset
    });

    const bankTransactions = bankTransactionsResult.rows;
    const transactions = transactionsResult.rows;

    bankTransactions.forEach((transaction) => {
      if (transaction.depositAmount) {
        balance += parseFloat(transaction.depositAmount);
      }
      if (transaction.withdrawAmount) {
        balance -= parseFloat(transaction.withdrawAmount);
      }
    });

    transactions.forEach((transaction) => {
      if (transaction.transactionType === 'Deposit') {
        balance += parseFloat(transaction.amount);
      } else {
        balance -= parseFloat(transaction.bankCharges) + parseFloat(transaction.amount);
      }
    });

    const response = {
      bank_id: dbBankData.bankId,
      bankName: dbBankData.bankName,
      subAdminName: dbBankData.subAdminName,
      balance: balance,
      bankTransactions: bankTransactions,
      transactions: transactions,
      totalBankTransactions: bankTransactionsResult.count,
      totalTransactions: transactionsResult.count,
      currentPage: parseInt(page),
      pageSize: limit,
      totalPages: Math.ceil((bankTransactionsResult.count + transactionsResult.count) / limit)
    };

    return apiResponseSuccess(response, true, statusCode.success, 'Bank Details retrieved successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};


export const addBankBalance = async (req, res) => {
  try {
    const { bank_id } = req.params;
    const { amount, transactionType, remarks } = req.body;
    const { userName } = req.user; // Assuming `userName` is available in `req.user`

    // Validate input
    if (transactionType !== 'Manual-Bank-Deposit') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid transaction type', res);
    }
    if (!amount || typeof amount !== 'number') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid amount', res);
    }
    if (!remarks) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Remark is required', res);
    }

    // Fetch bank details
    const bank = await Bank.findOne({ where: { bankId: bank_id } });

    if (!bank) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank not found', res);
    }

    // Create bank transaction
    const bankTransaction = await BankTransaction.create({
      bankTransactionId: uuidv4(),
      bankId: bank.bankId,
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifscCode,
      transactionType: transactionType,
      upiId: bank.upiId,
      upiAppName: bank.upiAppName,
      upiNumber: bank.upiNumber,
      depositAmount: Math.round(parseFloat(amount)),
      subAdminId: userName,
      subAdminName: req.user.firstName, // Adjust according to your user structure
      remarks: remarks,
      createdAt: new Date().toISOString(),
    });
    return apiResponseSuccess(
      bankTransaction,
      true,
      statusCode.success,
      'Wallet Balance Added to Your Bank Account',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const withdrawBankBalance = async (req, res) => {
  try {
    const { bank_id } = req.params;
    const { amount, transactionType, remarks } = req.body;
    const { userName } = req.user; // Assuming `userName` is available in `req.user`

    // Validate input
    if (transactionType !== 'Manual-Bank-Withdraw') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid transaction type', res);
    }
    if (!amount || typeof amount !== 'number') {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid amount', res);
    }
    if (!remarks) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Remark is required', res);
    }

    // Fetch bank details
    const bank = await Bank.findOne({ where: { bankId: bank_id } });

    if (!bank) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank account not found', res);
    }

    // Calculate current bank balance
    const bankTransactions = await BankTransaction.findAll({ where: { bankId: bank.bankId } });
    let balance = 0;

    for (const transaction of bankTransactions) {
      if (transaction.depositAmount) {
        balance += parseFloat(transaction.depositAmount);
      }
      if (transaction.withdrawAmount) {
        balance -= parseFloat(transaction.withdrawAmount);
      }
    }

    // Check if withdrawal amount exceeds balance
    if (balance < Number(amount)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Insufficient Bank Balance', res);
    }

    // Create bank transaction for withdrawal
    const newBankTransaction = await BankTransaction.create({
      bankTransactionId: uuidv4(),
      bankId: bank.bankId,
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifscCode,
      transactionType: transactionType,
      upiId: bank.upiId,
      upiAppName: bank.upiAppName,
      upiNumber: bank.upiNumber,
      withdrawAmount: Math.round(parseFloat(amount)),
      subAdminId: userName,
      subAdminName: req.user.firstName, // Adjust according to your user structure
      remarks: remarks,
      createdAt: new Date().toISOString(),
    });

    return apiResponseSuccess(
      newBankTransaction,
      true,
      statusCode.success,
      'Wallet Balance Deducted from your Bank Account',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getBankNames = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const whereCondition = search ? { bankName: { [Op.like]: `%${search}%` } } : {};

    const { count, rows: banks } = await Bank.findAndCountAll({
      attributes: ['bankName', 'bankId'], // Selecting specific attributes
      where: whereCondition,
      limit,
      offset
    });

    if (!banks || banks.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No banks found',{}, res);
    }

    // Extracting required data to send in response
    const bankNames = banks.map((bank) => ({
      bankName: bank.bankName,
      bank_id: bank.bankId,
    }));

    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      bankNames,
      true,
      statusCode.success,
      'Bank names retrieved successfully',
      { page: parseInt(page), limit, totalPages, totalItems: count },
      res
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};


export const viewBankEditRequests = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const { count, rows: editRequests } = await EditBankRequest.findAndCountAll({
      limit,
      offset
    });

    if (!editRequests || editRequests.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No edit requests found', {},res);
    }

    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      editRequests,
      true,
      statusCode.success,
      'Edit requests retrieved successfully',
      { page: parseInt(page), limit, totalPages, totalItems: count, },
      res
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const updateBankStatus = async (req, res) => {
  try {
    const bankId = req.params.bank_id;
    const { isActive } = req.body;

    // Validate isActive field
    if (typeof isActive !== 'boolean') {
      return apiResponseErr(null, false, statusCode.badRequest, 'isActive field must be a boolean value', res);
    }

    // Find bank by bankId
    const bank = await Bank.findOne({ where: { bankId } });

    if (!bank) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank not found', res);
    }

    // Update isActive status
    await bank.update({ isActive });
    return apiResponseSuccess(null, true, statusCode.success, 'Bank status updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const viewSubAdminBanks = async (req, res) => {
  try {
    const { subAdminId } = req.params;

    // Using raw SQL query or Sequelize query to fetch bank names associated with the subAdminId
   const query = `
      SELECT Banks.bankName
      FROM Banks
      INNER JOIN BankSubAdmins ON Banks.bankId = BankSubAdmins.bankId
      WHERE BankSubAdmins.subAdminId = :subAdminId;
    `;

    // Execute the raw SQL query
    const bankData = await sequelize.query(query, {
      replacements: { subAdminId },
      type: QueryTypes.SELECT,
    });

    return apiResponseSuccess(bankData, true, statusCode.success, 'Success', res);
  } catch (error) {
    console.error('Error fetching sub-admin banks:', error); // Log the error for debugging
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const updateBankPermissions = async (req, res) => {
  try {
    const { subAdmins } = req.body;
    const bankId = req.params.bankId;

    // Update subAdmins for the bank
    for (const subAdminData of subAdmins) {
      // Check if the subAdmin already exists in the database for this bank
      const existingSubAdmin = await BankSubAdmins.findOne({
        where: { bankId, subAdminId: subAdminData.subAdminId },
      });

      if (!existingSubAdmin) {
        // If the subAdmin does not exist, insert a new record
        await BankSubAdmins.create({
          bankId,
          subAdminId: subAdminData.subAdminId,
          isDeposit: subAdminData.isDeposit,
          isWithdraw: subAdminData.isWithdraw,
          isEdit: subAdminData.isEdit,
          isRenew: subAdminData.isRenew,
          isDelete: subAdminData.isDelete,
        });
      } else {
        // If the subAdmin exists, update their permissions
        await existingSubAdmin.update({
          isDeposit: subAdminData.isDeposit,
          isWithdraw: subAdminData.isWithdraw,
          isEdit: subAdminData.isEdit,
          isRenew: subAdminData.isRenew,
          isDelete: subAdminData.isDelete,
        });
      }
    }

    return apiResponseSuccess(null, true, statusCode.success, 'Bank Permission Updated successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getActiveVisibleBankAndWebsite = async (req, res) => {
  try {
    // Retrieve active banks from the database
    const activeBanks = await Bank.findAll({
      attributes: ['bankName'],
      where: { isActive: true },
    });

    // Retrieve active websites from the database
    const activeWebsites = await Website.findAll({
      attributes: ['websiteName'],
      where: { isActive: true },
    });

    // Check if active banks and websites exist
    if (activeBanks.length === 0) {
      return apiResponseSuccess([], true, statusCode.success, 'No bank found', res);
    }
    if (activeWebsites.length === 0) {
      return apiResponseSuccess([], true, statusCode.success, 'No Website found', res);
    }

    return apiResponseSuccess(
      { bank: activeBanks, website: activeWebsites },
      true,
      statusCode.success,
      'Active banks and websites fetched successfully',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getActiveBanks = async (req, res) => {    
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;

    // Convert pagination parameters to integers
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // Define search condition
    const whereCondition = {
      isActive: true,
      bankName: {
        [Op.like]: `%${search}%`,
      },
    };

    // Fetch active banks with pagination and search
    const { count, rows: activeBanks } = await Bank.findAndCountAll({
      attributes: ['bankName', 'isActive'],
      where: whereCondition,
      limit,
      offset,
    });

    // Check if active banks exist
    if (activeBanks.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No active banks found',{}, res);
    }

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      activeBanks,
      true,
      statusCode.success,
      'Active banks fetched successfully',
      {
        page: parseInt(page, 10),
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

export const getBankDetails = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const limit = parseInt(pageSize);
    const offset = (page - 1) * limit;

    // Fetch total count of banks for pagination
    const { count: totalItems, rows: bankData } = await Bank.findAndCountAll({
      where: {
        bankName: {
          [Op.like]: `%${search}%`,
        },
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    if (bankData.length === 0) {
      return apiResponsePagination(
        [],
        true,
        statusCode.success,
        'No bank details found',
        {
        },
        res,
      );
    }

    const totalPages = Math.ceil(totalItems / limit);

    const userRole = req.user.roles; // Accessing roles property
    if (userRole.includes(string.superAdmin)) {
      // For superAdmin, fetch balances for all banks
      const balancePromises = bankData.map(async (bank) => {
        bank.dataValues.balance = await BankServices.getBankBalance(bank.id);
        const subAdmins = await BankSubAdmins.findAll({
          where: { bankId: bank.bankId },
        });
        bank.dataValues.subAdmins = subAdmins.length ? subAdmins : [];
        return bank;
      });

      // Await all promises to complete
      await Promise.all(balancePromises);
    } else {
      // For subAdmins, filter banks based on user permissions
      const userSubAdminId = req.user.userName; // Accessing userName property
      console.log('userSubAdminId', userSubAdminId);
      if (userSubAdminId) {
        const filteredBanksPromises = bankData.map(async (bank) => {
          const subAdmins = await BankSubAdmins.findAll({
            where: { bankId: bank.bankId },
          });
          bank.dataValues.subAdmins = subAdmins.length ? subAdmins : [];
          const userSubAdmin = subAdmins.find((subAdmin) => subAdmin.subAdminId === userSubAdminId);
          if (userSubAdmin) {
            bank.dataValues.balance = await BankServices.getBankBalance(bank.id);
            bank.dataValues.isDeposit = userSubAdmin.isDeposit;
            bank.dataValues.isWithdraw = userSubAdmin.isWithdraw;
            bank.dataValues.isRenew = userSubAdmin.isRenew;
            bank.dataValues.isEdit = userSubAdmin.isEdit;
            bank.dataValues.isDelete = userSubAdmin.isDelete;
            return bank;
          } else {
            return null;
          }
        });

        // Wait for all promises to complete
        const filteredBanks = await Promise.all(filteredBanksPromises);

        // Filter out null values (banks not authorized for the subAdmin)
        bankData = filteredBanks.filter((bank) => bank !== null);
      } else {
        console.error('SubAdminId not found in req.user');
        // Handle the case where subAdminId is not found in req.user
      }
    }
    return apiResponsePagination(
      bankData,
      true,
      statusCode.success,
      'Bank details fetched successfully',
      {
        page: parseInt(page),
        limit,
        totalPages,
        totalItems,
      },
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
}

const BankServices = {
  approveBankAndAssignSubadmin: async (approvedBankRequests, subAdmins) => {
    try {
      console.log('approvedBankRequests', approvedBankRequests);
      const insertBankDetails = `INSERT INTO Bank (bankId, bankName, accountHolderName, accountNumber, ifscCode, upiId, 
        upiAppName, upiNumber, subAdminName, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertSubadmin = `INSERT INTO BankSubAdmins (bankId, subAdminId, isDeposit, isWithdraw, isEdit, 
        isRenew, isDelete) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      await database.execute(insertBankDetails, [
        approvedBankRequests[0].bankId,
        approvedBankRequests[0].bankName,
        approvedBankRequests[0].accountHolderName,
        approvedBankRequests[0].accountNumber,
        approvedBankRequests[0].ifscCode,
        approvedBankRequests[0].upiId,
        approvedBankRequests[0].upiAppName,
        approvedBankRequests[0].upiNumber,
        approvedBankRequests[0].subAdminName,
        true,
      ]);
      // Execute insert queries for each subadmin concurrently
      await Promise.all(
        subAdmins.map(async (subAdmin) => {
          const { subAdminId, isWithdraw, isDeposit, isEdit, isRenew, isDelete } = subAdmin;
          // Insert subadmin details
          await database.execute(insertSubadmin, [
            approvedBankRequests[0].bankId,
            subAdminId,
            isDeposit,
            isWithdraw,
            isEdit,
            isRenew,
            isDelete,
          ]);
        }),
      );

      return subAdmins.length; // Return the number of subadmins processed for further verification
    } catch (error) {
      throw error; // Propagate error to the caller
    }
  },

  getBankRequests: async () => {
    try {
      const sql = 'SELECT * FROM BankRequest';
      const [result] = await database.execute(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error('Internal Server error');
    }
  },

  getBankBalance: async (bankId) => {
    // const pool = await connectToDB();
    try {
      // Find all bank transactions for the given bankId
      const bankTransactions = await BankTransaction.findAll({
        where: { bankId },
      });

      // Find all transactions associated with the given bankId
      const transactions = await Transaction.findAll({
        where: { bankId },
      });

      let balance = 0;

      // Calculate balance based on bank transactions
      for (const transaction of bankTransactions) {
        if (transaction.depositAmount) {
          balance += parseFloat(transaction.depositAmount);
        }
        if (transaction.withdrawAmount) {
          balance -= parseFloat(transaction.withdrawAmount);
        }
      }

      // Calculate balance based on regular transactions
      for (const transaction of transactions) {
        if (transaction.transactionType === 'Deposit') {
          balance += parseFloat(transaction.amount);
        } else {
          balance -= parseFloat(transaction.bankCharges) + parseFloat(transaction.amount);
        }
      }

      return balance;
    } catch (e) {
      console.error(e);
      throw e; // Rethrow the error to handle it at the calling site
    }
  },
};

export default BankServices;

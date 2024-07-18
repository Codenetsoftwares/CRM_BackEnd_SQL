import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import { v4 as uuidv4 } from 'uuid';
import Bank from '../models/bank.model.js';
import Transaction from '../models/transaction.model.js';
import bankTransaction from '../models/bankTransaction.model.js';
import BankRequest from '../models/bankRequest.model.js';
import BankSubAdmin from '../models/bankSubAdmins.model.js';
import { Op, QueryTypes } from 'sequelize';
import { database } from '../services/database.service.js';
import EditBankRequest from '../models/editBankRequest.model.js';
import BankSubAdmins from '../models/bankSubAdmins.model.js';
import sequelize from '../db.js';
import BankTransaction from '../models/bankTransaction.model.js';
import Website from '../models/website.model.js';

export const updateBank = async (req, res) => {
  try {
    const bankId = req.params.bank_id;
    // Retrieve existing bank details from the database
    const existingBank = await Bank.findByPk(bankId);

    // Check if bank details exist
    if (!existingBank) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank not found', res);
    }

    // Update logic
    let changedFields = {};
    // Compare each field in the data object with the existingBank
    if (req.body.accountHolderName !== existingBank.accountHolderName) {
      changedFields.accountHolderName = req.body.accountHolderName;
    }
    if (req.body.bankName !== existingBank.bankName) {
      changedFields.bankName = req.body.bankName;
    }
    if (req.body.accountNumber !== existingBank.accountNumber) {
      changedFields.accountNumber = req.body.accountNumber;
    }
    if (req.body.ifscCode !== existingBank.ifscCode) {
      changedFields.ifscCode = req.body.ifscCode;
    }
    if (req.body.upiId !== existingBank.upiId) {
      changedFields.upiId = req.body.upiId;
    }
    if (req.body.upiAppName !== existingBank.upiAppName) {
      changedFields.upiAppName = req.body.upiAppName;
    }
    if (req.body.upiNumber !== existingBank.upiNumber) {
      changedFields.upiNumber = req.body.upiNumber;
    }

    // Check for duplicate bank name
    const duplicateBank = await Bank.findOne({
      where: { bankName: req.body.bankName },
    });

    if (duplicateBank) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank name already exists!', res);
    }

    // Update existingBank attributes
    existingBank.accountHolderName =
      req.body.accountHolderName !== undefined ? req.body.accountHolderName : existingBank.accountHolderName;
    existingBank.bankName =
      req.body.bankName !== undefined
        ? req.body.bankName.replace(/\s+/g, '')
        : existingBank.bankName.replace(/\s+/g, '');
    existingBank.accountNumber =
      req.body.accountNumber !== undefined ? req.body.accountNumber : existingBank.accountNumber;
    existingBank.ifscCode = req.body.ifscCode !== undefined ? req.body.ifscCode : existingBank.ifscCode;
    existingBank.upiId = req.body.upiId !== undefined ? req.body.upiId : existingBank.upiId;
    existingBank.upiAppName = req.body.upiAppName !== undefined ? req.body.upiAppName : existingBank.upiAppName;
    existingBank.upiNumber = req.body.upiNumber !== undefined ? req.body.upiNumber : existingBank.upiNumber;

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

    const editRequest = await EditBankRequest.findByPk(requestId);

    if (!editRequest) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Edit request not found', res);
    }

    const { isApproved } = req.body;
    if (typeof isApproved !== 'boolean') {
      return apiResponseErr(null, false, statusCode.badRequest, 'isApproved field must be a boolean value', res);
    }

    if (!editRequest.isApproved) {
      if (isApproved) {
        const bankExists = await Bank.findOne({
          where: { bankName: editRequest.bankName, id: { [Op.ne]: editRequest.bankId } },
        });

        if (bankExists) {
          return apiResponseErr(null, false, statusCode.badRequest, 'Bank with the same name already exists', res);
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
          { where: { id: editRequest.bankId } },
        );

        editRequest.isApproved = true;
        await editRequest.save();
        await EditBankRequest.destroy({ where: { id: requestId } });

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
    const result = await Bank.destroy({
      where: {
        bankId: id,
      },
    });

    if (result === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Data not found', res);
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
      return apiResponseErr(null, false, statusCode.notFound, 'Bank not found!', res);
    }

    // Remove the subAdmin with the specified subAdminId
    const result = await BankSubAdmin.destroy({
      where: {
        bankId: bankId,
        subAdminId: subAdminId,
      },
    });

    if (result === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'SubAdmin not found!', res);
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
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank name already exists!', res);
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

    return apiResponseSuccess(bank, true, statusCode.success, 'Bank name sent for approval!', res);
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
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank not found in the approval requests!', res);
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
    // Database query using Sequelize
    const bankRequests = await BankRequest.findAll();

    // Send response
    return apiResponseSuccess(bankRequests, true, statusCode.success, 'Bank requests retrieved successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getSingleBankDetails = async (req, res) => {
  try {
    const id = req.params.bank_id;
    console.log('id', id);

    const dbBankData = await Bank.findOne({ where: { bankId: id } });
    console.log('bankdata', dbBankData);

    if (!dbBankData) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank not found', res);
      // return res.status(404).send({ message: 'Bank not found' });
    }

    let balance = 0;

    const bankTransactions = await BankTransaction.findAll({ where: { bankId: dbBankData.bankId } });
    const transactions = await Transaction.findAll({ where: { bankId: dbBankData.bankId } });

    // Uncomment if needed
    // const editTransactions = await EditRequest.findAll({ where: { bankId: dbBankData.bankId } });

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

    // Uncomment and adjust if needed
    // editTransactions.forEach(data => {
    //   switch (data.transactionType) {
    //     case 'Manual-Bank-Deposit':
    //       balance += parseFloat(data.depositAmount);
    //       break;
    //     case 'Manual-Bank-Withdraw':
    //       balance -= parseFloat(data.withdrawAmount);
    //       break;
    //     case 'Deposit':
    //       balance += parseFloat(data.amount);
    //       break;
    //     case 'Withdraw':
    //       balance -= parseFloat(data.bankCharges) + parseFloat(data.amount);
    //       break;
    //     default:
    //       break;
    //   }
    // });

    const response = {
      bank_id: dbBankData.bankId,
      bankName: dbBankData.bankName,
      subAdminName: dbBankData.subAdminName,
      balance: balance,
    };

    return apiResponseSuccess([response], true, statusCode.success, 'Bank Details retractive successfully', res);

    // res.status(200).send([response]);
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
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank not found', res);
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
      return apiResponseErr(null, false, statusCode.notFound, 'Bank account not found', res);
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
    const banks = await Bank.findAll({
      attributes: ['bankName', 'bankId'], // Selecting specific attributes
    });

    if (!banks || banks.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No banks found', res);
    }

    // Extracting required data to send in response
    const bankNames = banks.map((bank) => ({
      bankName: bank.bankName,
      bank_id: bank.bankId,
    }));

    return apiResponseSuccess(bankNames, true, statusCode.success, 'Bank names retrieved successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const viewBankEditRequests = async (req, res) => {
  try {
    const editRequests = await EditBankRequest.findAll();

    if (!editRequests || editRequests.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No edit requests found', res);
    }
    return apiResponseSuccess(editRequests, true, statusCode.success, res);
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
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank not found', res);
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
      WHERE BankSubAdmins.subAdminId = :subAdminId
    `;
    const [bankData] = await sequelize.query(query, {
      replacements: { subAdminId },
      type: QueryTypes.SELECT,
    });

    return apiResponseSuccess(bankData, true, statusCode.success,'Success', res);
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
      return apiResponseErr(null, false, statusCode.badRequest, 'No bank found', res);
    }
    if (activeWebsites.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No Website found', res);
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
    const activeBanks = await Bank.findAll({
      attributes: ['bankName', 'isActive'],
      where: { isActive: true },
    });

    if (!activeBanks.length) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No active banks found', res);
    }

    return apiResponseSuccess(activeBanks, true, statusCode.success, 'Active banks fetched successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

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
      const bankTransactionsQuery = `SELECT * FROM BankTransaction WHERE bankId = ?`;
      const [bankTransactions] = await database.execute(bankTransactionsQuery, [bankId]);

      const transactionsQuery = `SELECT * FROM Transaction WHERE bankId = ?`;
      const [transactions] = await database.execute(transactionsQuery, [bankId]);

      // const editTransactionQuery = `SELECT * FROM EditRequest WHERE bankId = ?`;
      // const [editTransaction] = await database.execute(editTransactionQuery, [bankId]);

      let balance = 0;

      for (const transaction of bankTransactions) {
        if (transaction.depositAmount) {
          balance += parseFloat(transaction.depositAmount);
        }
        if (transaction.withdrawAmount) {
          balance -= parseFloat(transaction.withdrawAmount);
        }
      }

      for (const transaction of transactions) {
        if (transaction.transactionType === 'Deposit') {
          balance += parseFloat(transaction.amount);
        } else {
          balance -= parseFloat(transaction.bankCharges) + parseFloat(transaction.amount);
        }
      }

      // for (const data of editTransaction) {
      //     switch (data.transactionType) {
      //         case 'Manual-Bank-Deposit':
      //             balance += parseFloat(data.depositAmount);
      //             break;
      //         case 'Manual-Bank-Withdraw':
      //             balance -= parseFloat(data.withdrawAmount);
      //             break;
      //         case 'Deposit':
      //             balance += parseFloat(data.amount);
      //             break;
      //         case 'Withdraw':
      //             balance -= parseFloat(data.bankCharges) + parseFloat(data.amount);
      //             break;
      //         default:
      //             break;
      //     }
      // }

      return balance;
    } catch (e) {
      console.error(e);
      throw e; // Rethrow the error to handle it at the calling site
    }
  },
};

export default BankServices;

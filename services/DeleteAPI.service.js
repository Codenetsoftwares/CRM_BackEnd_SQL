import { v4 as uuidv4 } from 'uuid';
import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import BankTransaction from '../models/bankTransaction.model.js';
import EditRequest from '../models/editRequest.model.js';
import WebsiteTransaction from '../models/websiteTransaction.model.js';
import Trash from '../models/trash.model.js';
import Transaction from '../models/transaction.model.js';
import IntroducerTransaction from '../models/introducerTransaction.model.js';
import IntroducerEditRequest from '../models/introducerEditRequest.model.js';
import EditBankRequest from '../models/editBankRequest.model.js';
import EditWebsiteRequest from '../models/editWebsiteRequest.model.js';
import Website from '../models/website.model.js';
import CustomError from '../utils/extendError.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';
import Bank from '../models/bank.model.js';
import { Op } from 'sequelize';

export const saveBankTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    const transaction = await BankTransaction.findOne({ where: { bankTransactionId: requestId } });

    if (!transaction) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank Transaction not found', res);
    }

    const deleteTransaction = async (transaction, user) => {
      const existingTransaction = await BankTransaction.findOne({
        where: { bankTransactionId: transaction.bankTransactionId },
      });

      if (!existingTransaction) {
        return apiResponseSuccess(
          [],
          true,
          statusCode.badRequest,
          `Transaction not found with id: ${transaction.bankTransactionId}`,
          res,
        );
      }

      const existingEditRequest = await EditRequest.findOne({
        where: { bankTransactionId: transaction.bankTransactionId, type: 'Delete' },
      });

      if (existingEditRequest) {
        return apiResponseErr(null, false, statusCode.exist, 'Request Already Sent For Approval', res);
      }

      const updatedTransactionData = {
        bankId: transaction.bankId,
        transactionType: transaction.transactionType,
        remarks: transaction.remarks,
        withdrawAmount: transaction.withdrawAmount,
        depositAmount: transaction.depositAmount,
        subAdminId: transaction.subAdminId,
        subAdminName: transaction.subAdminName,
        accountHolderName: transaction.accountHolderName,
        bankName: transaction.bankName,
        accountNumber: transaction.accountNumber,
        ifscCode: transaction.ifscCode,
        createdAt: transaction.createdAt,
        upiId: transaction.upiId,
        upiAppName: transaction.upiAppName,
        upiNumber: transaction.upiNumber,
        isSubmit: transaction.isSubmit,
      };

      // Replace undefined values with null in updatedTransactionData
      Object.keys(updatedTransactionData).forEach((key) => {
        if (updatedTransactionData[key] === undefined) {
          updatedTransactionData[key] = null;
        }
      });

      const name = user.firstName;
      const editId = uuidv4();
      const editMessage = `${existingTransaction.transactionType} is sent to Super Admin for moving to trash approval`;

      await EditRequest.create({
        bankId: updatedTransactionData.bankId,
        transactionType: updatedTransactionData.transactionType,
        requestedUserName: name,
        subAdminId: updatedTransactionData.subAdminId,
        subAdminName: updatedTransactionData.subAdminName,
        depositAmount: updatedTransactionData.depositAmount,
        withdrawAmount: updatedTransactionData.withdrawAmount,
        remarks: updatedTransactionData.remarks,
        bankName: updatedTransactionData.bankName,
        accountHolderName: updatedTransactionData.accountHolderName,
        accountNumber: updatedTransactionData.accountNumber,
        ifscCode: updatedTransactionData.ifscCode,
        upiId: updatedTransactionData.upiId,
        upiAppName: updatedTransactionData.upiAppName,
        upiNumber: updatedTransactionData.upiNumber,
        message: editMessage,
        type: 'Delete',
        nameType: 'Bank',
        editId,
        bankTransactionId: transaction.bankTransactionId,
      });

      return true;
    };

    const updateResult = await deleteTransaction(transaction, user);
    if (updateResult) {
      return apiResponseSuccess(
        updateResult,
        true,
        statusCode.success,
        'Bank Transaction Move to trash request sent to Super Admin',
        res,
      );
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteBankTransaction = async (req, res) => {
  try {
    const id = req.params.editId;
    const editRequest = await EditRequest.findOne({ where: { editId: id } }); //wrong id

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank Request not found', res);
    }

    const isApproved = true;

    if (isApproved) {
      const dataToRestore = {
        bankId: editRequest.bankId,
        transactionType: editRequest.transactionType,
        remarks: editRequest.remarks,
        withdrawAmount: editRequest.withdrawAmount,
        depositAmount: editRequest.depositAmount,
        subAdminId: editRequest.subAdminId,
        subAdminName: editRequest.subAdminName,
        accountHolderName: editRequest.accountHolderName,
        bankName: editRequest.bankName,
        accountNumber: editRequest.accountNumber,
        ifscCode: editRequest.ifscCode,
        createdAt: editRequest.createdAt,
        upiId: editRequest.upiId,
        upiAppName: editRequest.upiAppName,
        upiNumber: editRequest.upiNumber,
        isSubmit: editRequest.isSubmit,
        bankTransactionId: editRequest.bankTransactionId,
        requestedUserName: editRequest.requestedUserName,
        message: editRequest.message,
        type: editRequest.type,
        nameType: editRequest.nameType,
      };

      const restoreResult = await Trash.create(dataToRestore);

      // Delete the bank transaction from the original table
      await BankTransaction.destroy({ where: { bankTransactionId: editRequest.bankTransactionId } });

      // Delete the edit request from the original table
      await EditRequest.destroy({ where: { editId: id } });
      return apiResponseSuccess(restoreResult, true, statusCode.success, 'Bank Transaction Moved To Trash', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteWebsiteTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    const transaction = await WebsiteTransaction.findOne({ where: { websiteTransactionId: requestId } });

    if (!transaction) {
      return apiResponseSuccess([], true, statusCode.success, 'Website Transaction not found', res);
    }

    const existingTransaction = await WebsiteTransaction.findOne({
      where: { websiteTransactionId: transaction.websiteTransactionId },
    });

    if (!existingTransaction) {
      return apiResponseSuccess(
        [],
        true,
        statusCode.success,
        `Website Transaction not found with id: ${transaction.websiteTransactionId}`,
        res,
      );
    }

    const existingEditRequest = await EditRequest.findOne({
      where: { websiteTransactionId: transaction.websiteTransactionId, type: 'Delete' },
    });

    if (existingEditRequest) {
      return apiResponseErr(null, false, statusCode.exist, 'Request Already Sent For Approval', res);
    }

    const updatedTransactionData = {
      websiteId: transaction.websiteId,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      withdrawAmount: transaction.withdrawAmount,
      depositAmount: transaction.depositAmount,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      websiteName: transaction.websiteName,
      createdAt: transaction.createdAt,
    };

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const name = user.firstName;
    const editId = uuidv4();
    const editMessage = `${existingTransaction.transactionType} is sent to Super Admin for moving to trash approval`;

    const deleteWebsiteTransaction = await EditRequest.create({
      websiteId: updatedTransactionData.websiteId,
      transactionType: updatedTransactionData.transactionType,
      requestedUserName: name,
      subAdminId: updatedTransactionData.subAdminId,
      subAdminName: updatedTransactionData.subAdminName,
      depositAmount: updatedTransactionData.depositAmount,
      withdrawAmount: updatedTransactionData.withdrawAmount,
      remarks: updatedTransactionData.remarks,
      websiteName: updatedTransactionData.websiteName,
      createdAt: updatedTransactionData.createdAt,
      message: editMessage,
      type: 'Delete',
      nameType: 'Website',
      editId,
      websiteTransactionId: transaction.websiteTransactionId,
    });
    return apiResponseSuccess(
      deleteWebsiteTransaction,
      true,
      statusCode.create,
      'Website Transaction Move to trash request sent to Super Admin',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const moveWebsiteTransactionToTrash = async (req, res) => {
  try {
    const id = req.params.editId;
    const editRequest = await EditRequest.findOne({ where: { editId: id } });

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Edit Website Request not found', res);
    }

    const isApproved = true;

    if (isApproved) {
      const dataToRestore = {
        websiteId: editRequest.websiteId,
        transactionType: editRequest.transactionType,
        remarks: editRequest.remarks,
        withdrawAmount: editRequest.withdrawAmount,
        depositAmount: editRequest.depositAmount,
        subAdminId: editRequest.subAdminId,
        subAdminName: editRequest.subAdminName,
        websiteName: editRequest.websiteName,
        createdAt: editRequest.createdAt,
        websiteTransactionId: editRequest.websiteTransactionId,
        requestedUserName: editRequest.requestedUserName,
        message: editRequest.message,
        type: editRequest.type,
        nameType: editRequest.nameType,
      };

      // Assuming 'Trash' is the model where you store deleted website transactions
      const restoreResult = await Trash.create(dataToRestore);

      // Delete the website transaction from the original table
      await WebsiteTransaction.destroy({ where: { websiteTransactionId: editRequest.websiteTransactionId } });

      // Delete the edit request from the original table
      await EditRequest.destroy({ where: { editId: id } });
      return apiResponseSuccess(restoreResult, true, statusCode.success, 'Website Transaction Moved To Trash', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    // Fetch transaction using Sequelize
    const transaction = await Transaction.findOne({ where: { Transaction_Id: requestId } });
    if (!transaction) {
      return apiResponseSuccess([], true, statusCode.success, 'Transaction not found', res);
    }

    // Check for existing transaction and edit request
    const existingTransaction = await Transaction.findOne({ where: { Transaction_Id: transaction.Transaction_Id } });
    if (!existingTransaction) {
      return apiResponseSuccess(
        [],
        true,
        statusCode.success,
        `Transaction not found with id: ${transaction.Transaction_Id}`,
        res,
      );
    }

    const existingEditRequest = await EditRequest.findOne({
      where: { transactionID: transaction.transactionID, type: 'Delete' },
    });
    if (existingEditRequest) {
      return apiResponseErr(null, false, statusCode.exist, 'Request Already Sent For Approval', res);
    }

    // Prepare updated transaction data
    const updatedTransactionData = {
      bankId: transaction.bankId,
      websiteId: transaction.websiteId,
      transactionID: transaction.transactionID,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      amount: transaction.amount,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      introducerUserName: transaction.introducerUserName,
      userId: transaction.userId,
      userName: transaction.userName,
      paymentMethod: transaction.paymentMethod,
      websiteName: transaction.websiteName,
      bankName: transaction.bankName,
      bonus: transaction.bonus,
      bankCharges: transaction.bankCharges,
      createdAt: transaction.createdAt,
    };

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    // Create edit request
    const name = user.firstName;
    const editId = uuidv4();
    const editMessage = `${existingTransaction.transactionType} is sent to Super Admin for moving to trash approval`;

    const deleteTransaction = await EditRequest.create({
      ...updatedTransactionData,
      requestedUserName: name,
      message: editMessage,
      type: 'Delete',
      nameType: 'Transaction',
      editId,
      transactionId: transaction.Transaction_Id,
    });
    return apiResponseSuccess(
      deleteTransaction,
      true,
      statusCode.create,
      'Transaction Move to trash request sent to Super Admin',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteIntroducerTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    // Fetch introducer transaction using Sequelize
    const transaction = await IntroducerTransaction.findOne({ where: { introTransactionId: requestId } });
    if (!transaction) {
      return apiResponseSuccess([], true, statusCode.success, 'Introducer Transaction not found', res);
    }

    // Check for existing introducer transaction and edit request
    const existingTransaction = await IntroducerTransaction.findOne({
      where: { introTransactionId: transaction.introTransactionId },
    });
    if (!existingTransaction) {
      return apiResponseSuccess(
        [],
        true,
        statusCode.success,
        `Introducer Transaction not found with id: ${transaction.introTransactionId}`,
        res,
      );
    }

    const existingEditRequest = await IntroducerEditRequest.findOne({
      where: { introTransactionId: transaction.introTransactionId, type: 'Delete' },
    });
    if (existingEditRequest) {
      return apiResponseErr(null, false, statusCode.exist, 'Request Already Sent For Approval', res);
    }

    // Prepare updated transaction data
    const updatedTransactionData = {
      introUserId: transaction.introUserId,
      amount: transaction.amount,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      introducerUserName: transaction.introducerUserName,
      createdAt: transaction.createdAt,
    };

    // Create edit request
    const name = user.firstName;
    const IntroEditId = uuidv4();
    const editMessage = `${existingTransaction.transactionType} is sent to Super Admin for moving to trash approval`;

    const deleteIntroducerTransaction = await IntroducerEditRequest.create({
      introTransactionId: transaction.introTransactionId,
      amount: updatedTransactionData.amount,
      requestedUserName: name,
      transactionType: updatedTransactionData.transactionType,
      remarks: updatedTransactionData.remarks,
      subAdminId: updatedTransactionData.subAdminId,
      subAdminName: updatedTransactionData.subAdminName,
      introducerUserName: updatedTransactionData.introducerUserName,
      message: editMessage,
      type: 'Delete',
      nameType: 'Introducer',
      IntroEditId,
      introUserId: updatedTransactionData.introUserId,
    });
    return apiResponseSuccess(
      deleteIntroducerTransaction,
      true,
      statusCode.success,
      'Introducer Transaction Move to trash request sent to Super Admin',
      res,
    );
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteTransactionWithId = async (req, res) => {
  try {
    const id = req.params.editId;
    const editRequest = await EditRequest.findOne({ where: { editId: id } });

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Edit Website Request not found', res);
    }

    const isApproved = true;

    if (isApproved) {
      const dataToRestore = {
        bankId: editRequest.bankId,
        websiteId: editRequest.websiteId,
        transactionID: editRequest.transactionID,
        transactionType: editRequest.transactionType,
        remarks: editRequest.remarks,
        amount: editRequest.amount,
        subAdminId: editRequest.subAdminId,
        subAdminName: editRequest.subAdminName,
        introducerUserName: editRequest.introducerUserName,
        userId: editRequest.userId,
        userName: editRequest.userName,
        paymentMethod: editRequest.paymentMethod,
        websiteName: editRequest.websiteName,
        bankName: editRequest.bankName,
        bonus: editRequest.bonus,
        bankCharges: editRequest.bankCharges,
        createdAt: editRequest.createdAt,
        Transaction_Id: editRequest.Transaction_Id || null,
        message: editRequest.message,
        type: editRequest.type,
        nameType: editRequest.nameType,
      };

      // Assuming 'Trash' is the model representing the table where you store deleted transactions
      const restoreResult = await Trash.create(dataToRestore);

      // Delete the transaction from the original table
      await Transaction.destroy({ where: { Transaction_Id: editRequest.Transaction_Id } });

      // Delete the edit request from the original table
      await EditRequest.destroy({ where: { editId: id } });

      // Remove the transaction detail from the user
      await UserTransactionDetail.destroy({ where: { Transaction_Id: editRequest.Transaction_Id } });

      return apiResponseSuccess(restoreResult, true, statusCode.success, 'Transaction moved to Trash', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};

export const deleteIntroducerTransactionWithId = async (req, res) => {
  try {
    const id = req.params.introTransactionId;
    const editRequest = await IntroducerEditRequest.findOne({ where: { introTransactionId: id } });

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Edit Request not found', res);
    }

    const isApproved = true;

    if (isApproved) {
      const dataToRestore = {
        introTransactionId: editRequest.introTransactionId,
        amount: editRequest.amount,
        transactionType: editRequest.transactionType,
        remarks: editRequest.remarks,
        subAdminId: editRequest.subAdminId,
        subAdminName: editRequest.subAdminName,
        introducerUserName: editRequest.introducerUserName,
        createdAt: editRequest.createdAt,
        introUserId: editRequest.introUserId,
      };

      // Assuming 'Trash' is the model representing the table where you store deleted transactions
      const restoreResult = await Trash.create({
        introTransactionId: dataToRestore.introTransactionId,
        introUserId: dataToRestore.introUserId,
        transactionType: dataToRestore.transactionType,
        amount: dataToRestore.amount,
        subAdminId: dataToRestore.subAdminId,
        subAdminName: dataToRestore.subAdminName,
        remarks: dataToRestore.remarks,
        createdAt: dataToRestore.createdAt,
        nameType: 'Introducer',
        introducerUserName: dataToRestore.introducerUserName,
      });

      // Delete the transaction from the original table
      await IntroducerTransaction.destroy({ where: { introTransactionId: editRequest.introTransactionId } });

      // Delete the edit request from the original table
      await IntroducerEditRequest.destroy({ where: { introTransactionId: id } });
      return apiResponseSuccess(restoreResult, true, statusCode.success, 'Transaction moved to Trash', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteBankRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    // Find the bank transaction based on the request ID
    const transaction = await Bank.findOne({ where: { bankId: requestId } });

    if (!transaction) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank not found', res);
    }

    // Find the existing bank transaction
    const existingTransaction = await Bank.findOne({ where: { bankId: transaction.bankId } });

    if (!existingTransaction) {
      return apiResponseSuccess([], true, statusCode.success, `Bank not found with id: ${transaction.bankId}`, res);
    }

    // Check if a delete request already exists
    const existingEditRequest = await EditBankRequest.findOne({
      where: {
        bankId: transaction.bankId,
        type: 'Delete',
      },
    });

    if (existingEditRequest) {
      return apiResponseErr(null, false, statusCode.exist, 'Request Already Sent For Approval', res);
    }

    // Prepare data for the new edit request
    const updatedTransactionData = {
      bankId: transaction.bankId,
      accountHolderName: transaction.accountHolderName,
      bankName: transaction.bankName,
      accountNumber: transaction.accountNumber,
      ifscCode: transaction.ifscCode,
      upiId: transaction.upiId,
      upiAppName: transaction.upiAppName,
      upiNumber: transaction.upiNumber,
      subAdminName: transaction.subAdminName,
      createdAt: transaction.createdAt,
    };

    // Replace undefined values with null
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const editMessage = `${existingTransaction.bankName} is sent to Super Admin for deleting approval`;

    // Create the new edit request
    const restoreResult = await EditBankRequest.create({
      bankId: updatedTransactionData.bankId,
      accountHolderName: updatedTransactionData.accountHolderName,
      bankName: updatedTransactionData.bankName,
      accountNumber: updatedTransactionData.accountNumber,
      ifscCode: updatedTransactionData.ifscCode,
      upiId: updatedTransactionData.upiId,
      upiAppName: updatedTransactionData.upiAppName,
      upiNumber: updatedTransactionData.upiNumber,
      createdAt: updatedTransactionData.createdAt,
      message: editMessage,
      type: 'Delete',
      subAdminName: updatedTransactionData.subAdminName,
    });
    return apiResponseSuccess(restoreResult, true, statusCode.create, 'Bank delete request sent to Super Admin', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteBank = async (req, res) => {
  try {
    const bankId = req.params.bankId;

    // Find the edit request
    const editRequest = await EditBankRequest.findOne({ where: { bankId: bankId } });

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Bank Request not found', res);
    }

    const isApproved = true; // Replace with actual approval logic

    if (isApproved) {
      // Delete bank record
      await Bank.destroy({ where: { bankId: editRequest.bankId } });

      // Delete edit request record
      await EditBankRequest.destroy({ where: { bankId: bankId } });

      return apiResponseSuccess(null, true, statusCode.success, 'Bank deleted', res);
    } else {
      return apiResponseErr(null, true, statusCode.badRequest, 'Approval request rejected by super admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const saveWebsiteRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    // Find the website based on the request ID
    const website = await Website.findOne({ where: { websiteId: requestId } });

    if (!website) {
      return apiResponseSuccess([], true, statusCode.success, 'Website not found', res);
    }

    // Find existing website transaction
    const existingTransaction = await Website.findOne({ where: { websiteId: website.websiteId } });

    if (!existingTransaction) {
      return apiResponseSuccess([], true, statusCode.success, `Website not found with id: ${website.websiteId}`, res);
    }

    // Check if a delete request already exists
    const existingEditRequest = await EditWebsiteRequest.findOne({
      where: {
        websiteId: website.websiteId,
        type: 'Delete',
      },
    });

    if (existingEditRequest) {
      return apiResponseErr(null, false, statusCode.exist, 'Request Already Sent For Approval', res);
    }

    // Prepare data for the new edit request
    const updatedTransactionData = {
      websiteId: website.websiteId,
      websiteName: website.websiteName,
      subAdminName: website.subAdminName,
      createdAt: website.createdAt,
    };

    // Replace undefined values with null
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const editMessage = `${existingTransaction.websiteName} is sent to Super Admin for deleting approval`;

    // Create the new edit request
    const result = await EditWebsiteRequest.create({
      websiteId: updatedTransactionData.websiteId,
      subAdminName: updatedTransactionData.subAdminName,
      websiteName: updatedTransactionData.websiteName,
      createdAt: updatedTransactionData.createdAt,
      message: editMessage,
      type: 'Delete',
    });
    return apiResponseSuccess(result, true, statusCode.create, 'Website Delete request sent to Super Admin', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteWebsite = async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Find the edit request
    const editRequest = await EditWebsiteRequest.findOne({ where: { websiteId } });

    if (!editRequest) {
      return apiResponseSuccess([], true, statusCode.success, 'Website Request not found', res);
    }

    const isApproved = true; // Replace with actual approval logic

    if (isApproved) {
      // Delete website record
      await Website.destroy({ where: { websiteId: editRequest.websiteId } });

      // Delete edit request record
      await EditWebsiteRequest.destroy({ where: { websiteId } });
      return apiResponseSuccess(null, true, statusCode.success, 'Website deleted', res);
    } else {
      return apiResponseErr(null, true, statusCode.badRequest, 'Approval request rejected by super admin', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const rejectBankDetail = async (req, res) => {
  try {
    const { bankId } = req.params;

    // Delete the edit request
    const result = await EditBankRequest.destroy({ where: { bankId } });

    if (result === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const rejectWebsiteDetail = async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Delete the edit request
    const result = await EditWebsiteRequest.destroy({ where: { websiteId } });

    if (result === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const viewTrash = async (req, res) => {
  try {
    // Retrieve pagination and search parameters from query
    const { page = 1, pageSize = 10 } = req.query;

    // Convert pagination parameters to integers
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // Fetch records with pagination and search
    const { count, rows: resultArray } = await Trash.findAndCountAll({
      limit,
      offset,
    });

    // Check if results exist
    if (resultArray.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No records found', {}, res);
    }

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      resultArray,
      true,
      statusCode.success,
      'Data fetched successfully',
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

export const restoreBankData = async (req, res) => {
  try {
    const bankId = req.params.bankId;

    // Retrieve deleted data from the Trash table based on bankId
    const deletedData = await Trash.findOne({ where: { bankId } });

    if (!deletedData) {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found in Trash', res);
    }

    // Extract data to restore from the retrieved deleted data
    const dataToRestore = {
      bankId: deletedData.bankId,
      bankTransactionId: deletedData.bankTransactionId,
      accountHolderName: deletedData.accountHolderName,
      bankName: deletedData.bankName,
      accountNumber: deletedData.accountNumber,
      ifscCode: deletedData.ifscCode,
      transactionType: deletedData.transactionType,
      remarks: deletedData.remarks,
      upiId: deletedData.upiId,
      upiAppName: deletedData.upiAppName,
      upiNumber: deletedData.upiNumber,
      withdrawAmount: deletedData.withdrawAmount,
      depositAmount: deletedData.depositAmount,
      subAdminId: deletedData.subAdminId,
      subAdminName: deletedData.subAdminName,
      createdAt: deletedData.createdAt,
      isSubmit: deletedData.isSubmit,
    };

    // Insert restored data into the BankTransaction table
    const restoredData = await BankTransaction.create(dataToRestore);

    // Delete the restored data from the Trash table
    await Trash.destroy({ where: { bankId } });

    return apiResponseSuccess(restoredData, true, statusCode.success, 'Data restored successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const restoreWebsiteData = async (req, res) => {
  try {
    const websiteId = req.params.websiteId;

    // Retrieve deleted data from the Trash table based on websiteId
    const deletedData = await Trash.findOne({ where: { websiteId } });

    if (!deletedData) {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found in Trash', res);
    }

    // Extract data to restore from the retrieved deleted data
    const dataToRestore = {
      websiteId: deletedData.websiteId,
      websiteTransactionId: deletedData.websiteTransactionId,
      websiteName: deletedData.websiteName,
      remarks: deletedData.remarks,
      transactionType: deletedData.transactionType,
      withdrawAmount: deletedData.withdrawAmount,
      depositAmount: deletedData.depositAmount,
      subAdminId: deletedData.subAdminId,
      subAdminName: deletedData.subAdminName,
      createdAt: deletedData.createdAt,
    };

    // Insert restored data into the WebsiteTransaction table
    const restoredData = await WebsiteTransaction.create(dataToRestore);

    // Delete the restored data from the Trash table
    await Trash.destroy({ where: { websiteId } });

    return apiResponseSuccess(restoredData, true, statusCode.success, 'Data restored successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const restoreTransactionData = async (req, res) => {
  try {
    const transactionID = req.params.TransactionID;

    // Retrieve deleted data from the Trash table based on transactionID
    const deletedData = await Trash.findOne({ where: { TransactionID: transactionID } });

    if (!deletedData) {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found in Trash', res);
    }

    // Extract data to restore from the retrieved deleted data
    const dataToRestore = {
      bankId: deletedData.bankId,
      websiteId: deletedData.websiteId,
      transactionID: deletedData.transactionID,
      transactionType: deletedData.transactionType,
      remarks: deletedData.remarks,
      amount: deletedData.amount,
      subAdminId: deletedData.subAdminId,
      subAdminName: deletedData.subAdminName,
      introducersUserName2: deletedData.introducersUserName2,
      userId: deletedData.userId,
      userName: deletedData.userName,
      paymentMethod: deletedData.paymentMethod,
      websiteName: deletedData.websiteName,
      bankName: deletedData.bankName,
      bonus: deletedData.bonus,
      bankCharges: deletedData.bankCharges,
      createdAt: deletedData.createdAt,
      Transaction_Id: deletedData.Transaction_Id,
      accountNumber: deletedData.accountNumber,
    };

    // Start a transaction to ensure atomicity
    const restoredTransaction = await Transaction.sequelize.transaction(async (t) => {
      // Insert restored data into the Transaction table
      const restoredTransaction = await Transaction.create(dataToRestore, { transaction: t });

      // Update the user's transaction detail
      await UserTransactionDetail.create(dataToRestore, { transaction: t });

      // Delete the restored data from the Trash table
      await Trash.destroy({ where: { Transaction_Id: transactionID }, transaction: t });

      return restoredTransaction;
    });

    return apiResponseSuccess(restoredTransaction, true, statusCode.success, 'Data restored successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const restoreIntroducerData = async (req, res) => {
  try {
    const introTransactionId = req.params.introTransactionId;

    // Retrieve deleted data from the Trash table based on introTransactionId
    const deletedData = await Trash.findOne({ where: { introTransactionId } });

    if (!deletedData) {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found in Trash', res);
    }

    // Extract data to restore from the retrieved deleted data
    const dataToRestore = {
      introTransactionId: deletedData.introTransactionId,
      introUserId: deletedData.introUserId,
      amount: deletedData.amount,
      transactionType: deletedData.transactionType,
      remarks: deletedData.remarks,
      subAdminId: deletedData.subAdminId,
      subAdminName: deletedData.subAdminName,
      introducerUserName: deletedData.introducerUserName,
      createdAt: deletedData.createdAt,
    };

    // Start a transaction to ensure atomicity
    const restoredTransaction = await IntroducerTransaction.sequelize.transaction(async (t) => {
      // Insert restored data into the IntroducerTransaction table
      const restoredData = await IntroducerTransaction.create(dataToRestore, { transaction: t });

      // Delete the restored data from the Trash table
      await Trash.destroy({ where: { introTransactionId }, transaction: t });

      return restoredData;
    });

    return apiResponseSuccess(restoredTransaction, true, statusCode.success, 'Data restored successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteIntroducerEditRequest = async (req, res) => {
  try {
    const id = req.params.IntroEditID;

    // Delete the record from IntroducerEditRequest table
    const deletedRows = await IntroducerEditRequest.destroy({ where: { introTransactionId: id } }); //id correction

    if (deletedRows === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const viewDeleteRequests = async (req, res) => {
  try {
    // Retrieve pagination parameters from query
    const { page = 1, pageSize = 10 } = req.query;

    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // Fetch records with pagination
    const { count, rows: resultArray } = await EditRequest.findAndCountAll({
      limit,
      offset,
    });

    // Check if results exist
    if (resultArray.length === 0) {
      return apiResponsePagination([], true, statusCode.success, 'No records found', {}, res);
    }

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    return apiResponsePagination(
      resultArray,
      true,
      statusCode.success,
      'Data retrieved successfully',
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

export const rejectDeleteRequest = async (req, res) => {
  try {
    const id = req.params.editId;

    // Delete record from EditRequest table
    const deletedRows = await EditRequest.destroy({
      // id correction
      where: { bankId: id },
    });

    if (deletedRows === 1) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const deleteTrashTransaction = async (req, res) => {
  try {
    const id = req.params._id;

    // Delete record from Trash table
    const deletedRows = await Trash.destroy({
      where: { _id: id },
    });

    if (deletedRows > 0) {
      return apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseSuccess([], true, statusCode.success, 'Data not found', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }

};
export const moveTransactionDeleteRequest = async (req, res) => {
  const { requestId, type } = req.body;

  try {
    let transaction;
    let deletedData;
    let existingRequest

    switch (type) {
      case 'BankTransaction':
        transaction = await BankTransaction.findOne({ where: { bankTransactionId: requestId } });

        existingRequest = await EditRequest.findOne({
          where: {
            bankTransactionId: requestId,
          }
        });

        if (existingRequest) {
          return apiResponseErr(null, false, statusCode.exist, `A deletion request for ${type} is already pending.`, res);
        }

        if (transaction) {
          deletedData = transaction.dataValues;
          await EditRequest.create({
            bankId: deletedData.bankId,
            bankTransactionId: deletedData.bankTransactionId,
            accountHolderName: deletedData.accountHolderName,
            bankName: deletedData.bankName,
            accountNumber: deletedData.accountNumber,
            ifscCode: deletedData.ifscCode,
            transactionType: deletedData.transactionType,
            remarks: deletedData.remarks,
            upiId: deletedData.upiId,
            upiAppName: deletedData.upiAppName,
            upiNumber: deletedData.upiNumber,
            withdrawAmount: deletedData.withdrawAmount,
            depositAmount: deletedData.depositAmount,
            subAdminId: deletedData.subAdminId,
            subAdminName: deletedData.subAdminName,
            createdAt: deletedData.createdAt,
            isSubmit: deletedData.isSubmit,
          });
        }
        break;

      case 'WebsiteTransaction':
        transaction = await WebsiteTransaction.findOne({ where: { websiteTransactionId: requestId } });
        existingRequest = await EditRequest.findOne({
          where: {
            websiteTransactionId: requestId,
          }
        });

        if (existingRequest) {
          return apiResponseErr(null, false, statusCode.exist, `A deletion request for ${type} is already pending.`, res);
        }

        if (transaction) {
          deletedData = transaction.dataValues;
          await EditRequest.create({
            websiteId: deletedData.websiteId,
            websiteTransactionId: deletedData.websiteTransactionId,
            websiteName: deletedData.websiteName,
            remarks: deletedData.remarks,
            transactionType: deletedData.transactionType,
            withdrawAmount: deletedData.withdrawAmount,
            depositAmount: deletedData.depositAmount,
            subAdminId: deletedData.subAdminId,
            subAdminName: deletedData.subAdminName,
            createdAt: deletedData.createdAt,
          });
        }
        break;

      case 'Transaction':
        transaction = await Transaction.findOne({ where: { Transaction_Id: requestId } });
        existingRequest = await EditRequest.findOne({
          where: {
            Transaction_Id: requestId,
          }
        });

        if (existingRequest) {
          return apiResponseErr(null, false, statusCode.exist, `A deletion request for ${type} is already pending.`, res);
        }
        
        if (transaction) {
          deletedData = transaction.dataValues;
          await EditRequest.create({
            bankId: deletedData.bankId,
            websiteId: deletedData.websiteId,
            transactionID: deletedData.transactionID,
            transactionType: deletedData.transactionType,
            remarks: deletedData.remarks,
            amount: deletedData.amount,
            subAdminId: deletedData.subAdminId,
            subAdminName: deletedData.subAdminName,
            introducersUserName2: deletedData.introducersUserName2,
            userId: deletedData.userId,
            userName: deletedData.userName,
            paymentMethod: deletedData.paymentMethod,
            websiteName: deletedData.websiteName,
            bankName: deletedData.bankName,
            bonus: deletedData.bonus,
            bankCharges: deletedData.bankCharges,
            createdAt: deletedData.createdAt,
            Transaction_Id: deletedData.Transaction_Id,
            accountNumber: deletedData.accountNumber,
          });
        }
        break;

      default:
        return apiResponseErr(null, false, statusCode.badRequest, 'Invalid transaction type.', res);
    }

    if (!transaction) {
      return apiResponseErr(null, false, statusCode.notFound, `${type} with not found.`, res);
    }

    return apiResponseSuccess(transaction, true, statusCode.success, `The ${type} has been successfully requested for deletion.`, res);

  } catch (error) {
    return apiResponseErr(null, false, statusCode.internalServerError, error.message, res);
  }
};


import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import BankTransaction from '../models/bankTransaction.model.js';
import EditRequest from '../models/editBankRequest.model.js';
import WebsiteTransaction from '../models/websiteTransaction.model.js'
import Trash from '../models/trash.model.js'
import { Op, Transaction } from 'sequelize';
import IntroducerTransaction from '../models/introducerTransaction.model.js';
import IntroducerEditRequest from '../models/introducerEditRequest.model.js';
import EditBankRequest from '../models/editBankRequest.model.js';
import EditWebsiteRequest from '../models/websiteRequest.model.js'
import Website from '../models/website.model.js';
import CustomError from '../utils/extendError.js';


export const deleteBankTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    const transaction = await BankTransaction.findOne({ where: { bankTransactionId: requestId } });

    if (!transaction) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank Transaction not found', res);
    }

    const deleteTransaction = async (transaction, user) => {
      const existingTransaction = await BankTransaction.findOne({ where: { bankTransactionId: transaction.bankTransactionId } });

      if (!existingTransaction) {
        return apiResponseErr(null, false, statusCode.badRequest, `Transaction not found with id: ${transaction.bankTransactionId}`, res);
      }

      const existingEditRequest = await EditRequest.findOne({
        where: { bankTransactionId: transaction.bankTransactionId, type: 'Delete' }
      });

      if (existingEditRequest) {
        throw new CustomError(
          'Request Already Sent For Approval',
          null,
          409,
        );
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
      return apiResponseSuccess(updateResult, true, statusCode.success, 'Transaction status updated successfully', res);
    }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
    
  }
}

export const approveBankTransactionRequest = async (req, res) => {
  try {
    const id = req.params.editId;
    const editRequest = await EditRequest.findOne({ where: { editId: id } });

    if (!editRequest) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Bank Request not found', res);
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
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
    
  }
};

export const deleteWebsiteTransaction=async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    const transaction = await WebsiteTransaction.findOne({ where: { websiteTransactionId: requestId } });

    if (!transaction) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website Transaction not found', res);
    }

    const existingTransaction = await WebsiteTransaction.findOne({ where: { websiteTransactionId: transaction.websiteTransactionId } });

    if (!existingTransaction) {
      return apiResponseErr(null, false, statusCode.badRequest,  `Website Transaction not found with id: ${transaction.websiteTransactionId}`, res);
    }

    const existingEditRequest = await EditRequest.findOne({
      where: { websiteTransactionId: transaction.websiteTransactionId, type: 'Delete' }
    });

    if (existingEditRequest) {
      throw new CustomError('Request Already Sent For Approval', null, 409);
      
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

   const deleteWebsiteTransaction= await EditRequest.create({
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
    return apiResponseSuccess(deleteWebsiteTransaction, true, statusCode.create, 'Website Transaction Move to trash request sent to Super Admin', res);
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
}

export const moveWebsiteTransactionToTrash =async (req, res) => {
  try {
    const id = req.params.editId;
    const editRequest = await EditRequest.findOne({ where: { editId: id } });

    if (!editRequest) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Edit Website Request not found', res);
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
      await EditRequest.destroy({ where: { edit_Id: id } });
      return apiResponseSuccess(restoreResult, true, statusCode.success, 'Website Transaction Moved To Trash', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
      
    }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
  }
}

export const deleteTransaction =async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    // Fetch transaction using Sequelize
    const transaction = await Transaction.findOne({ where: { transactionId: requestId } });
    if (!transaction) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Transaction not found', res);
    }

    // Check for existing transaction and edit request
    const existingTransaction = await Transaction.findOne({ where: { transactionId: transaction.transactionId } });
    if (!existingTransaction) {
      return apiResponseErr(null, false, statusCode.notFound, `Transaction not found with id: ${transaction.transactionId}`, res);
    }

    const existingEditRequest = await EditRequest.findOne({
      where: { transactionId: transaction.transactionId, type: 'Delete' }
    });
    if (existingEditRequest) {
      throw new CustomError(
        'Request Already Sent For Approval',
        null,
        409,
      );
     
    }

    // Prepare updated transaction data
    const updatedTransactionData = {
      bankId: transaction.bankId,
      websiteId: transaction.websiteId,
      transactionId: transaction.transactionId,
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

   const deleteTransaction= await EditRequest.create({
      ...updatedTransactionData,
      requestedUserName: name,
      message: editMessage,
      type: 'Delete',
      nameType: 'Transaction',
      editId,
      transactionId: transaction.transactionId,
    });
    return apiResponseSuccess(deleteTransaction, true, statusCode.create, 'Transaction Move to trash request sent to Super Admin', res);
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
}

export const deleteIntroducerTransaction=async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.body;

    // Fetch introducer transaction using Sequelize
    const transaction = await IntroducerTransaction.findOne({ where: { introTransactionId: requestId } });
    if (!transaction) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Introducer Transaction not found', res);
    }

    // Check for existing introducer transaction and edit request
    const existingTransaction = await IntroducerTransaction.findOne({ where: { introTransactionId: transaction.introTransactionId } });
    if (!existingTransaction) {
      return apiResponseErr(null, false, statusCode.badRequest, `Introducer Transaction not found with id: ${transaction.introTransactionId}`, res);
    }

    const existingEditRequest = await IntroducerEditRequest.findOne({
      where: { introTransactionId: transaction.introTransactionId, type: 'Delete' }
    });
    if (existingEditRequest) {
      throw new CustomError(
        'Request Already Sent For Approval',
        null,
        409,
      );
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

   const deleteIntroducerTransaction=  await IntroducerEditRequest.create({
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
    return apiResponseSuccess(deleteIntroducerTransaction, true, statusCode.create, 'Introducer Transaction Move to trash request sent to Super Admin', res);
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
}

export const deleteTransactionWithId = async (req, res) => {
  try {
      const id = req.params.editId;
      const editRequest = await EditRequest.findOne({ where: { editId: id } });

      if (!editRequest) {
        return apiResponseErr(null, false, statusCode.badRequest, 'Edit Website Request not found', res);
      }

      const isApproved = true;

      if (isApproved) {
          const dataToRestore = {
              bankId: editRequest.bankId,
              websiteId: editRequest.websiteId,
              transactionId: editRequest.transactionId,
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
              transactionId: editRequest.transactionId,
              message: editRequest.message,
              type: editRequest.type,
              nameType: editRequest.nameType,
          };

          // Assuming 'Trash' is the model representing the table where you store deleted transactions
          const restoreResult = await Trash.create(dataToRestore);

          // Delete the transaction from the original table
          await Transaction.destroy({ where: { transactionId: editRequest.transactionId } });

          // Delete the edit request from the original table
          await EditRequest.destroy({ where: { editId: id } });

          // Remove the transaction detail from the user
          await UserTransactionDetail.destroy({ where: { transactionId: editRequest.transactionId } });
          return apiResponseSuccess(restoreResult, true, statusCode.success, 'Transaction moved to Trash', res);
      } else {
        return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
      }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
  }
};

export const deleteIntroducerTransactionWithId = async (req, res) => {
  try {
      const id = req.params.IntroEditId;
      const editRequest = await IntroducerEditRequest.findOne({ where: { IntroEditId: id } });

      if (!editRequest) {
        return apiResponseErr(null, false, statusCode.badRequest,  'Edit Request not found', res);
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
          await IntroducerEditRequest.destroy({ where: { IntroEditId: id } });
          return apiResponseSuccess(restoreResult, true, statusCode.success, 'Transaction moved to Trash', res);
      } else {
        return apiResponseErr(null, false, statusCode.badRequest, 'Approval request rejected by super admin', res);
      }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
  }
};

export const deleteBankRequest=async (req, res) => {
  try {
    const { requestId } = req.body;

    // Find the bank transaction based on the request ID
    const transaction = await Bank.findOne({ where: { bankId: requestId } });

    if (!transaction) {
      return apiResponseErr(null, false, statusCode.notFound,  'Bank not found', res);
    }

    // Find the existing bank transaction
    const existingTransaction = await Bank.findOne({ where: { bankId: transaction.bankId } });

    if (!existingTransaction) {
      return apiResponseErr(null, false, statusCode.badRequest,  `Bank not found with id: ${transaction.bankId}`, res);
    }

    // Check if a delete request already exists
    const existingEditRequest = await EditBankRequest.findOne({
      where: {
        bankId: transaction.bankId,
        type: 'Delete'
      }
    });

    if (existingEditRequest) {
      throw new CustomError(
        'Request Already Sent For Approval',
        null,
        409,
      );
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
    const restoreResult=await EditBankRequest.create({
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
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
}

export const deleteBank=async (req, res) => {
  try {
    const bankId = req.params.bankId;

    // Find the edit request
    const editRequest = await EditBankRequest.findOne({ where: { bankId: bankId } });

    if (!editRequest) {
      return apiResponseErr(null, false, statusCode.badRequest,  'Bank Request not found', res);
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
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
  }
}

export const saveWebsiteRequest=async (req, res) => {
  try {
    const { requestId } = req.body;

    // Find the website based on the request ID
    const website = await Website.findOne({ where: { websiteId: requestId } });

    if (!website) {
      return apiResponseErr(null, false, statusCode.badRequest,  'Website not found', res);
    }

    // Find existing website transaction
    const existingTransaction = await Website.findOne({ where: { websiteId: website.websiteId } });

    if (!existingTransaction) {
      return apiResponseErr(null, false, statusCode.badRequest, `Website not found with id: ${website.websiteId}`, res);
    }

    // Check if a delete request already exists
    const existingEditRequest = await EditWebsiteRequest.findOne({
      where: {
        websiteId: website.websiteId,
        type: 'Delete'
      }
    });

    if (existingEditRequest) {
      throw new CustomError(
        'Request Already Sent For Approval',
        null,
        409,
      );
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
   const result= await EditWebsiteRequest.create({
    websiteId: updatedTransactionData.websiteId,
      subAdminName: updatedTransactionData.subAdminName,
      websiteName: updatedTransactionData.websiteName,
      createdAt: updatedTransactionData.createdAt,
      message: editMessage,
      type: 'Delete',
    });
    return apiResponseSuccess(result, true, statusCode.create, 'Website Delete request sent to Super Admin', res);
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
}

export const deleteWebsite = async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Find the edit request
    const editRequest = await EditWebsiteRequest.findOne({ where: { websiteId } });

    if (!editRequest) {
      return apiResponseErr(null, false, statusCode.badRequest,  'Website Request not found', res);
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
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
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
      return apiResponseErr(null, false, statusCode.badRequest,  'Data not found', res);
    }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
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
      return apiResponseErr(null, false, statusCode.badRequest,  'Data not found', res);
    }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ,
      res,
    );
  }
};


const DeleteApiService = {
  // Functions For Moveing The Transaction Into Trash

  deleteBankTransaction: async (transaction, user) => {
    const [existingTransaction] = await database.execute(`SELECT * FROM BankTransaction WHERE BankTransaction_Id = ?`, [
      transaction.BankTransaction_Id,
    ]);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Transaction not found with id: ${transaction.BankTransaction_Id}` };
    }

    const [existingEditRequest] = await database.execute(
      `SELECT * FROM EditRequest WHERE BankTransaction_Id = ? AND type = 'Delete'`,
      [transaction.BankTransaction_Id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
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

    const name = user[0].firstname;
    const Edit_ID = uuidv4();
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO EditRequest (bankId, transactionType, requesteduserName, subAdminId, subAdminName, 
        depositAmount, withdrawAmount, remarks, bankName, accountHolderName, accountNumber, ifscCode, upiId, upiAppName, upiNumber, message, 
        type, Nametype, Edit_ID, BankTransaction_Id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await database.execute(createEditRequestQuery, [
      updatedTransactionData.bankId,
      updatedTransactionData.transactionType,
      name,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.depositAmount,
      updatedTransactionData.withdrawAmount,
      updatedTransactionData.remarks,
      updatedTransactionData.bankName,
      updatedTransactionData.accountHolderName,
      updatedTransactionData.accountNumber,
      updatedTransactionData.ifscCode,
      updatedTransactionData.upiId,
      updatedTransactionData.upiAppName,
      updatedTransactionData.upiNumber,
      editMessage,
      'Delete',
      'Bank',
      Edit_ID,
      transaction.BankTransaction_Id,
    ]);
    return true;
  },

  deleteWebsiteTransaction: async (transaction, user) => {
    const [existingTransaction] = await database.execute(
      `SELECT * FROM WebsiteTransaction WHERE WebsiteTransaction_Id = ?`,
      [transaction.WebsiteTransaction_Id],
    );

    if (!existingTransaction.length) {
      throw { code: 404, message: `Website Transaction not found with id: ${transaction.WebsiteTransaction_Id}` };
    }

    const [existingEditRequest] = await database.execute(
      `SELECT * FROM EditRequest WHERE WebsiteTransaction_Id = ? AND type = 'Delete'`,
      [transaction.WebsiteTransaction_Id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }
    console.log('transaction', transaction);
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

    const name = user[0].firstname;
    const Edit_ID = uuidv4();
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO EditRequest (websiteId, transactionType, requesteduserName, subAdminId, subAdminName, 
        depositAmount, withdrawAmount, remarks, websiteName, createdAt, message, type, Nametype, WebsiteTransaction_Id, Edit_ID) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await database.execute(createEditRequestQuery, [
      updatedTransactionData.websiteId,
      updatedTransactionData.transactionType,
      name,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.depositAmount,
      updatedTransactionData.withdrawAmount,
      updatedTransactionData.remarks,
      updatedTransactionData.websiteName,
      updatedTransactionData.createdAt,
      editMessage,
      'Delete',
      'Website',
      transaction.WebsiteTransaction_Id,
      Edit_ID,
    ]);
    return true;
  },

  deleteTransaction: async (transaction, user) => {
    console.log('transaction', transaction);
    const [existingTransaction] = await database.execute(`SELECT * FROM Transaction WHERE Transaction_Id = ?`, [
      transaction.Transaction_Id,
    ]);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Transaction not found with id: ${transaction.Transaction_Id}` };
    }

    const [existingEditRequest] = await database.execute(
      `SELECT * FROM EditRequest WHERE Transaction_Id = ? AND type = 'Delete'`,
      [transaction.id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }
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
      amount: transaction.amount,
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

    const name = user[0].firstname;
    const Edit_ID = uuidv4();
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO EditRequest (bankId, websiteId, Transaction_Id, transactionID, transactionType, amount, 
    paymentMethod, introducerUserName, userName, requesteduserName, subAdminId, subAdminName, bonus, bankCharges, remarks, bankName, 
    websiteName, createdAt, message, type, Nametype, Edit_ID) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await database.execute(createEditRequestQuery, [
      updatedTransactionData.bankId,
      updatedTransactionData.websiteId,
      transaction.Transaction_Id,
      updatedTransactionData.transactionID,
      updatedTransactionData.transactionType,
      updatedTransactionData.amount,
      updatedTransactionData.paymentMethod,
      updatedTransactionData.introducerUserName,
      updatedTransactionData.userName,
      name,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.bonus,
      updatedTransactionData.bankCharges,
      updatedTransactionData.remarks,
      updatedTransactionData.bankName,
      updatedTransactionData.websiteName,
      updatedTransactionData.createdAt,
      editMessage,
      'Delete',
      'Transaction',
      Edit_ID,
    ]);
    return true;
  },

  deleteIntroducerTransaction: async (transaction, user) => {
    console.log('user', user);
    console.log('transaction', transaction);

    const [existingTransaction] = await database.execute(
      `SELECT * FROM IntroducerTransaction WHERE introTransactionId = ?`,
      [transaction.introTransactionId],
    );

    if (!existingTransaction.length) {
      throw { code: 404, message: `Transaction not found with id: ${transaction}` };
    }
    const [existingEditRequest] = await database.execute(
      `SELECT * FROM IntroducerEditRequest WHERE introTransactionId = ? AND type = 'Delete'`,
      [transaction.introTransactionId],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }
    const IntroEditID = uuidv4();
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
    console.log('updatedTransactionData', updatedTransactionData);
    const name = user[0].firstname;
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO IntroducerEditRequest (introTransactionId, amount, requesteduserName, transactionType, remarks, subAdminId, subAdminName, 
        introducerUserName, message, type, Nametype, IntroEditID, introUserId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await database.execute(createEditRequestQuery, [
      transaction.introTransactionId,
      updatedTransactionData.amount,
      name,
      updatedTransactionData.transactionType,
      updatedTransactionData.remarks,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.introducerUserName,
      editMessage,
      'Delete',
      'Introducer',
      IntroEditID,
      updatedTransactionData.introUserId,
    ]);
    return true;
  },

  // Functions To Delete Bank Detail's

  deleteBank: async (id) => {
    console.log('iddd', id);
    const [existingTransaction] = await database.execute(`SELECT * FROM Bank WHERE bank_id = ?`, [id.bank_id]);
    console.log('existingTransaction', existingTransaction);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Bank not found with id: ${id}` };
    }

    const [existingEditRequest] = await database.execute(
      `SELECT * FROM EditBankRequest WHERE bank_id = ? AND type = 'Delete'`,
      [id.bank_id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }

    const updatedTransactionData = {
      bank_id: id.bank_id,
      accountHolderName: id.accountHolderName,
      bankName: id.bankName,
      accountNumber: id.accountNumber,
      ifscCode: id.ifscCode,
      upiId: id.upiId,
      upiAppName: id.upiAppName,
      upiNumber: id.upiNumber,
      subAdminName: id.subAdminName,
      createdAt: id.createdAt,
    };
    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });
    const editMessage = `${existingTransaction[0].bankName} is sent to Super Admin for deleting approval`;
    const createEditRequestQuery = `INSERT INTO EditBankRequest (bank_id, accountHolderName, bankName, accountNumber, ifscCode, upiId, 
    upiAppName, upiNumber, createdAt, message, type, subAdminName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await database.execute(createEditRequestQuery, [
      updatedTransactionData.bank_id,
      updatedTransactionData.accountHolderName,
      updatedTransactionData.bankName,
      updatedTransactionData.accountNumber,
      updatedTransactionData.ifscCode,
      updatedTransactionData.upiId,
      updatedTransactionData.upiAppName,
      updatedTransactionData.upiNumber,
      updatedTransactionData.createdAt,
      editMessage,
      'Delete',
      updatedTransactionData.subAdminName,
    ]);
    return true;
  },

  deleteWebsite: async (id) => {
    console.log('Transaction found', id);
    const [existingTransaction] = await database.execute(`SELECT * FROM Website WHERE website_id = ?`, [id.website_id]);
    console.log('Transaction found', existingTransaction);
    if (!existingTransaction.length) {
      throw { code: 404, message: `Website not found with id: ${id}` };
    }

    const [existingEditRequest] = await database.execute(
      `SELECT * FROM EditWebsiteRequest WHERE website_id = ? AND type = 'Delete'`,
      [id.website_id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }

    const updatedTransactionData = {
      website_id: id.website_id,
      websiteName: id.websiteName,
      subAdminName: id.subAdminName,
      createdAt: id.createdAt,
    };
    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });
    const editMessage = `${existingTransaction[0].websiteName} is sent to Super Admin for deleting approval`;
    const createEditRequestQuery = `INSERT INTO EditWebsiteRequest (website_id, subAdminName, websiteName, createdAt, message, type) 
    VALUES (?, ?, ?, ?, ?, ?)`;

    await database.execute(createEditRequestQuery, [
      updatedTransactionData.website_id,
      updatedTransactionData.subAdminName,
      updatedTransactionData.websiteName,
      updatedTransactionData.createdAt,
      editMessage,
      'Delete',
    ]);
    return true;
  },
};

export default DeleteApiService;

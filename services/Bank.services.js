import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import { v4 as uuidv4 } from 'uuid';
import Bank from '../models/bank.model.js';
import { Op } from 'sequelize';
import { database } from '../services/database.service.js';

export const deleteBankRequest=async (req, res) => {
  try {
    const id = req.params.bank_id;
    
    // Use Sequelize to delete the record
    const result = await Bank.destroy({
      where: {
        bank_id: id
      }
    });

    if (result === 1) {
      return apiResponseSuccess(newAdmin, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.notFound, 'Data not found', res);
     
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

export const deleteSubAdmin =async (req, res) => {
  try {
    const { bankId, subAdminId } = req.params;

    // Check if the bank exists
    const bank = await BankSubAdmin.findOne({
      where: {
        bankId: bankId
      }
    });

    if (!bank) {
      return apiResponseErr(null, false, statusCode.notFound, 'Bank not found!', res);
    }

    // Remove the subAdmin with the specified subAdminId
    const result = await BankSubAdmin.destroy({
      where: {
        bankId: bankId,
        subAdminId: subAdminId
      }
    });

    if (result === 0) {
      return apiResponseErr(null, false, statusCode.notFound, 'SubAdmin not found!', res);
    }
    return apiResponseSuccess(newAdmin, true, statusCode.success, 'SubAdmin Permission removed successfully', res);
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

const BankServices = {
  approveBankAndAssignSubadmin: async (approvedBankRequests, subAdmins) => {
    try {
      console.log('approvedBankRequests', approvedBankRequests);
      const insertBankDetails = `INSERT INTO Bank (bank_id, bankName, accountHolderName, accountNumber, ifscCode, upiId, 
        upiAppName, upiNumber, subAdminName, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertSubadmin = `INSERT INTO BankSubAdmins (bankId, subAdminId, isDeposit, isWithdraw, isEdit, 
        isRenew, isDelete) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      await database.execute(insertBankDetails, [
        approvedBankRequests[0].bank_id,
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
            approvedBankRequests[0].bank_id,
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

  updateBank: async (responese, data) => {
    const existingTransaction = responese;

    let changedFields = {};
    // Compare each field in the data object with the existingTransaction
    if (data.accountHolderName !== existingTransaction.accountHolderName) {
      changedFields.accountHolderName = data.accountHolderName;
    }
    if (data.bankName !== existingTransaction.bankName) {
      changedFields.bankName = data.bankName;
    }
    if (data.accountNumber !== existingTransaction.accountNumber) {
      changedFields.accountNumber = data.accountNumber;
    }
    if (data.ifscCode !== existingTransaction.ifscCode) {
      changedFields.ifscCode = data.ifscCode;
    }
    if (data.upiId !== existingTransaction.upiId) {
      changedFields.upiId = data.upiId;
    }
    if (data.upiAppName !== existingTransaction.upiAppName) {
      changedFields.upiAppName = data.upiAppName;
    }
    if (data.upiNumber !== existingTransaction.upiNumber) {
      changedFields.upiNumber = data.upiNumber;
    }

    const [duplicateBank] = await database.execute(`SELECT * FROM Bank WHERE (bankName) = (?)`, [data.bankName]);

    if (duplicateBank.length > 0) {
      throw { code: 400, message: 'Bank name already exists!' };
    }
    // Create updatedTransactionData using a ternary operator
    const updatedTransactionData = {
      id: existingTransaction.bank_id,
      accountHolderName:
        data.accountHolderName !== undefined ? data.accountHolderName : existingTransaction.accountHolderName,
      bankName:
        data.bankName !== undefined
          ? data.bankName.replace(/\s+/g, '')
          : existingTransaction.bankName.replace(/\s+/g, ''),
      accountNumber: data.accountNumber !== undefined ? data.accountNumber : existingTransaction.accountNumber,
      ifscCode: data.ifscCode !== undefined ? data.ifscCode : existingTransaction.ifscCode,
      upiId: data.upiId !== undefined ? data.upiId : existingTransaction.upiId,
      upiAppName: data.upiAppName !== undefined ? data.upiAppName : existingTransaction.upiAppName,
      upiNumber: data.upiNumber !== undefined ? data.upiNumber : existingTransaction.upiNumber,
    };
    console.log('update', updatedTransactionData);
    const editRequestQuery = `INSERT INTO EditBankRequest 
        (bank_id, accountHolderName, bankName, accountNumber, ifscCode, upiId, upiAppName, upiNumber, changedFields, isApproved, type, message) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, 'Edit', "Bank Detail's has been edited")`;
    await database.execute(editRequestQuery, [
      updatedTransactionData.id,
      updatedTransactionData.accountHolderName,
      updatedTransactionData.bankName,
      updatedTransactionData.accountNumber,
      updatedTransactionData.ifscCode,
      updatedTransactionData.upiId,
      updatedTransactionData.upiAppName,
      updatedTransactionData.upiNumber,
      JSON.stringify(changedFields),
    ]);
    return true;
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

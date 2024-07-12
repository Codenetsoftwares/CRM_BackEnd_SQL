import { apiResponseErr, apiResponsePagination, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import { v4 as uuidv4 } from 'uuid';
import Bank from '../models/bank.model.js';
import BankSubAdmin from '../models/bankSubAdmins.model.js'
import { Op } from 'sequelize';
import { database } from '../services/database.service.js';
import EditBankRequest from '../models/editBankRequest.model.js';



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
    existingBank.accountHolderName = req.body.accountHolderName !== undefined ? req.body.accountHolderName : existingBank.accountHolderName;
    existingBank.bankName = req.body.bankName !== undefined ? req.body.bankName.replace(/\s+/g, '') : existingBank.bankName.replace(/\s+/g, '');
    existingBank.accountNumber = req.body.accountNumber !== undefined ? req.body.accountNumber : existingBank.accountNumber;
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
      res
    );

  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage,
      res,
    );
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
          { where: { id: editRequest.bankId } }
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
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage,
      res,
    );
  }
};



export const deleteBankRequest = async (req, res) => {
  try {
    const id = req.params.bankId;

    // Use Sequelize to delete the record
    const result = await Bank.destroy({
      where: {
        bankId: id
      }
    });

    if (result === 1) {
      return apiResponseSuccess(newAdmin, true, statusCode.success, 'Data deleted successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Data not found', res);

    }
  } catch (error) {
    apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage,
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
      return apiResponseErr(null, false, statusCode.badRequest, 'SubAdmin not found!', res);
    }
    return apiResponseSuccess(newAdmin, true, statusCode.success, 'SubAdmin Permission removed successfully', res);
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

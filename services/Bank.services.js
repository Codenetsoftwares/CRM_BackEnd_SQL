import connectToDB from '../db/db.js';

const BankServices = {
  approveBankAndAssignSubadmin: async (approvedBankRequests, subAdmins) => {
    const pool = await connectToDB();
    try {
      console.log('approvedBankRequests', approvedBankRequests);
      const insertBankDetails = `INSERT INTO Bank (bank_id, bankName, accountHolderName, accountNumber, ifscCode, upiId, 
        upiAppName, upiNumber, subAdminName, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertSubadmin = `INSERT INTO BankSubAdmins (bankId, subAdminId, isDeposit, isWithdraw, isEdit, 
        isRenew, isDelete) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      await pool.query(insertBankDetails, [
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
          await pool.query(insertSubadmin, [
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

  deleteBankRequest: async (bankId) => {
    const pool = await connectToDB();
    const deleteBankRequestQuery = `DELETE FROM BankRequest WHERE bank_id = ?`;
    const [result] = await pool.execute(deleteBankRequestQuery, [bankId]);
    return result.affectedRows; // Return the number of rows deleted for further verification
  },

  getBankRequests: async () => {
    const pool = await connectToDB();
    try {
      const sql = 'SELECT * FROM BankRequest';
      const [result] = await pool.execute(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error('Internal Server error');
    }
  },

  updateBank: async (responese, data) => {
    const pool = await connectToDB();

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

    const [duplicateBank] = await pool.execute(`SELECT * FROM Bank WHERE (bankName) = (?)`, [data.bankName]);

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
        (bankTransactionId, accountHolderName, bankName, accountNumber, ifscCode, upiId, upiAppName, upiNumber, changedFields, isApproved, type, message) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, 'Edit', "Bank Detail's has been edited")`;
    await pool.execute(editRequestQuery, [
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

  getBankBalance: async (pool, bankId) => {
    try {
      const bankTransactionsQuery = `SELECT * FROM BankTransaction WHERE bankId = ?`;
      const [bankTransactions] = await pool.execute(bankTransactionsQuery, [bankId]);

      const transactionsQuery = `SELECT * FROM Transaction WHERE bankId = ?`;
      const [transactions] = await pool.execute(transactionsQuery, [bankId]);

      // const editTransactionQuery = `SELECT * FROM EditRequest WHERE bankId = ?`;
      // const [editTransaction] = await pool.execute(editTransactionQuery, [bankId]);

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

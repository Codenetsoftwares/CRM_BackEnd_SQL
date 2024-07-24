import { database } from '../services/database.service.js';
import { apiResponsePagination } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';

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

  deleteBankRequest: async (bankId) => {
    const deleteBankRequestQuery = `DELETE FROM BankRequest WHERE bank_id = ?`;
    const [result] = await database.execute(deleteBankRequestQuery, [bankId]);
    return result.affectedRows; // Return the number of rows deleted for further verification
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

  getBankName: async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;
  
      // Sanitize the search term to prevent SQL injection
      const searchTerm = `%${search.trim().replace(/[%_]/g, '\\$&')}%`;
  
      // Fetch total count of banks for pagination
      const [totalCountResult] = await database.execute(
        `SELECT COUNT(*) AS totalCount FROM Bank WHERE bankName LIKE ?`,
        [searchTerm]
      );
      const totalItems = totalCountResult[0].totalCount;
      const totalPages = Math.ceil(totalItems / limit);
  
      // Fetch paginated and filtered bank data
      const banksQuery = `
        SELECT * FROM Bank
        WHERE bankName LIKE ?
        LIMIT ${limit} OFFSET ${offset}
      `;
      let [bankData] = await database.execute(banksQuery, [searchTerm]);
  
      const userRole = req.user[0]?.roles; // Accessing roles property
      if (userRole.includes('superAdmin')) {
        // For superAdmin, fetch balances for all banks
        const balancePromises = bankData.map(async (bank) => {
          bank.balance = await BankServices.getBankBalance(bank.bank_id);
          // Fetch BankSubAdmins for each bank
          const [subAdmins] = await database.execute(`SELECT * FROM BankSubAdmins WHERE bankId = (?)`, [bank.bank_id]);
          if (subAdmins && subAdmins.length > 0) {
            bank.subAdmins = subAdmins;
          } else {
            bank.subAdmins = [];
          }
          return bank;
        });
  
        // Await all promises to complete
        bankData = await Promise.all(balancePromises);
      } else {
        // For subAdmins, filter banks based on user permissions
        const userSubAdminId = req.user[0]?.userName; // Accessing userName property
        console.log('userSubAdminId', userSubAdminId);
        if (userSubAdminId) {
          const filteredBanksPromises = bankData.map(async (bank) => {
            const [subAdmins] = await database.execute(`SELECT * FROM BankSubAdmins WHERE bankId = (?)`, [bank.bank_id]);
            if (subAdmins && subAdmins.length > 0) {
              bank.subAdmins = subAdmins;
              const userSubAdmin = subAdmins.find((subAdmin) => subAdmin.subAdminId === userSubAdminId);
              if (userSubAdmin) {
                // Update balance for the specific bank
                bank.balance = await BankServices.getBankBalance(bank.bank_id);
  
                // Set permissions for the specific bank
                bank.isDeposit = userSubAdmin.isDeposit;
                bank.isWithdraw = userSubAdmin.isWithdraw;
                bank.isRenew = userSubAdmin.isRenew;
                bank.isEdit = userSubAdmin.isEdit;
                bank.isDelete = userSubAdmin.isDelete;
              } else {
                // Exclude this bank from the result
                return null;
              }
            } else {
              bank.subAdmins = [];
              return null;
            }
            return bank; // Include this bank in the result
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
  
      // Sort bankData by created_at
      bankData.sort((a, b) => b.created_at - a.created_at);
  
      return apiResponsePagination(
        bankData,
        true,
        statusCode.success,
        'success',
        {
          page: parseInt(page),
          limit: limit,
          totalPages,
          totalItems
        },
        res
      );
    } catch (error) {
      return apiResponseErr(null, false, error.responseCode , error.message, res);
    }
  }
  

  };

  export default BankServices;

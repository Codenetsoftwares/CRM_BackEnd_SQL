import { Authorize } from '../middleware/Authorize.js';
import BankServices from '../services/Bank.services.js';
import AccountServices from '../services/Account.Services.js';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import { string } from '../constructor/string.js';

const BankRoutes = (app) => {
  app.post('/api/add-bank-name', Authorize(['superAdmin', 'Bank-View', 'Transaction-View']), async (req, res) => {
    try {
      const userName = req.user;
      console.log('userName', userName);
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
        throw { code: 400, message: 'Please provide a bank name to add' };
      }

      // Check if the bank name already exists in Bank or BankRequest tables
      const [existingBank, existingBankRequest] = await Promise.all([
        database.execute('SELECT * FROM Bank WHERE REPLACE(LOWER(bankName), " ", "") = ?', [trimmedBankName.toLowerCase()]),
        database.execute('SELECT * FROM BankRequest WHERE REPLACE(LOWER(bankName), " ", "") = ?', [
          trimmedBankName.toLowerCase(),
        ]),
      ]);

      if (existingBank[0].length > 0 || existingBankRequest[0].length > 0) {
        throw { code: 400, message: 'Bank name already exists!' };
      }

      const bank_id = uuidv4();
      // Insert new bank name
      const insertBankQuery = `INSERT INTO BankRequest (bank_id, bankName, accountHolderName, accountNumber, ifscCode, upiId, upiAppName, upiNumber, 
        subAdminName, subAdminId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await database.execute(insertBankQuery, [
        bank_id,
        trimmedBankName,
        accountHolderName || null,
        accountNumber || null,
        ifscCode || null,
        upiId || null,
        upiAppName || null,
        upiNumber || null,
        userName && userName[0].firstname ? userName[0].firstname : null,
        userName && userName[0].userName ? userName[0].userName : null,
      ]);
      res.status(200).send({ message: 'Bank name sent for approval!' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.post('/api/approve-bank/:bank_id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const { isApproved, subAdmins } = req.body;

      const bankId = req.params.bank_id;

      const approvedBankRequests = (await database.execute(`SELECT * FROM BankRequest WHERE (bank_id) = (?)`, [bankId]))[0];

      if (!approvedBankRequests || approvedBankRequests.length === 0) {
        throw { code: 404, message: 'Bank not found in the approval requests!' };
      }

      if (isApproved) {
        const rowsInserted = await BankServices.approveBankAndAssignSubadmin(approvedBankRequests, subAdmins);
        if (rowsInserted > 0) {
          await BankServices.deleteBankRequest(bankId);
        } else {
          throw { code: 500, message: 'Failed to insert rows into Bank table.' };
        }
      } else {
        throw { code: 400, message: 'Bank approval was not granted.' };
      }
      res.status(200).send({ message: 'Bank approved successfully & Subadmin Assigned' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/superadmin/view-bank-requests', Authorize(['superAdmin']), async (req, res) => {
    try {
      const resultArray = await BankServices.getBankRequests();
      res.status(200).send(resultArray);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server error');
    }
  });

  app.delete('/api/bank/reject/:bank_id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const id = req.params.bank_id;
      const result = await BankServices.deleteBankRequest(id);
      if (result === 1) {
        res.status(200).send({ message: 'Data deleted successfully' });
      } else {
        res.status(404).send({ message: 'Data not found' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  // API To View Bank Name

  app.get(
    '/api/get-bank-name',
    Authorize([
      string.superAdmin,
      string.bankView,
      string.transactionView,
      string.createTransaction,
      string.createDepositTransaction,
      string.createWithdrawTransaction,
    ]),
    BankServices.getBankName
  );

  app.get(
    '/api/get-single-bank-name/:bank_id',
    Authorize(['superAdmin', 'Transaction-View', 'Bank-View']),
    async (req, res) => {
      try {
        const id = req.params.bank_id;
        console.log('id', id);
        const [dbBankData] = await database.execute(`SELECT * FROM Bank WHERE bank_id = (?)`, [id]);
        console.log('bankdata', dbBankData);
        if (!dbBankData) {
          return res.status(404).send({ message: 'Bank not found' });
        }
        const [bankId] = dbBankData[0].bank_id;
        const bankBalance = await BankServices.getBankBalance(bankId);
        const response = {
          bank_id: dbBankData[0].bank_id,
          bankName: dbBankData[0].bankName,
          subAdminName: dbBankData[0].subAdminName,
          balance: bankBalance,
        };

        res.status(200).send([response]);
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal server error' });
      }
    },
  );

  app.post(
    '/api/admin/add-bank-balance/:bank_id',
    Authorize(['superAdmin', 'Bank-View', 'Transaction-View']),
    async (req, res) => {
      try {
        const id = req.params.bank_id;
        const userName = req.user;
        const { amount, transactionType, remarks } = req.body;
        if (transactionType !== 'Manual-Bank-Deposit') {
          return res.status(500).send({ message: 'Invalid transaction type' });
        }
        if (!amount || typeof amount !== 'number') {
          return res.status(400).send({ message: 'Invalid amount' });
        }
        if (!remarks) {
          throw { code: 400, message: 'Remark is required' };
        }

        const [bank] = await database.execute(`SELECT * FROM Bank WHERE bank_id = ?`, [id]);
        console.log('bank', bank);
        if (!bank) {
          return res.status(404).send({ message: 'Bank account not found' });
        }

        const bankTransaction = {
          bankId: bank[0].bank_id,
          accountHolderName: bank[0].accountHolderName,
          bankName: bank[0].bankName,
          accountNumber: bank[0].accountNumber,
          ifscCode: bank[0].ifscCode,
          transactionType: transactionType,
          upiId: bank[0].upiId,
          upiAppName: bank[0].upiAppName,
          upiNumber: bank[0].upiNumber,
          depositAmount: Math.round(parseFloat(amount)),
          subAdminId: userName[0].userName,
          subAdminName: userName[0].firstname,
          remarks: remarks,
          createdAt: new Date().toISOString(),
        };
        console.log('bankTransaction', bankTransaction);
        const BankTransaction_Id = uuidv4();
        const insertBankRequestQuery = `
          INSERT INTO BankTransaction 
          (bankId, BankTransaction_Id, accountHolderName, bankName, accountNumber, ifscCode, transactionType, remarks, upiId, upiAppName, upiNumber, 
          depositAmount, subAdminId, subAdminName, createdAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await database.execute(insertBankRequestQuery, [
          bankTransaction.bankId,
          BankTransaction_Id,
          bankTransaction.accountHolderName,
          bankTransaction.bankName,
          bankTransaction.accountNumber,
          bankTransaction.ifscCode,
          bankTransaction.transactionType,
          bankTransaction.remarks,
          bankTransaction.upiId,
          bankTransaction.upiAppName,
          bankTransaction.upiNumber,
          bankTransaction.depositAmount,
          bankTransaction.subAdminId,
          bankTransaction.subAdminName,
          bankTransaction.createdAt,
        ]);

        res.status(200).send({ message: 'Wallet Balance Added to Your Bank Account' });
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
      }
    },
  );

  app.post(
    '/api/admin/withdraw-bank-balance/:bank_id',
    Authorize(['superAdmin', 'Transaction-View', 'Bank-View']),
    async (req, res) => {
      try {
        const id = req.params.bank_id;
        const userName = req.user;
        const { amount, transactionType, remarks } = req.body;
        if (transactionType !== 'Manual-Bank-Withdraw') {
          return res.status(500).send({ message: 'Invalid transaction type' });
        }
        if (!amount || typeof amount !== 'number') {
          return res.status(400).send({ message: 'Invalid amount' });
        }
        if (!remarks) {
          throw { code: 400, message: 'Remark is required' };
        }

        const [bank] = await database.execute(`SELECT * FROM Bank WHERE bank_id = (?)`, [id]);
        if (!bank) {
          return res.status(404).send({ message: 'Bank account not found' });
        }
        // console.log('bank', BankServices.getBankBalance(id));
        if ((await BankServices.getBankBalance(id)) < Number(amount)) {
          return res.status(400).send({ message: 'Insufficient Bank Balance' });
        }
        const bankTransaction = {
          bankId: bank[0].bank_id,
          accountHolderName: bank[0].accountHolderName,
          bankName: bank[0].bankName,
          accountNumber: bank[0].accountNumber,
          ifscCode: bank[0].ifscCode,
          transactionType: transactionType,
          upiId: bank[0].upiId,
          upiAppName: bank[0].upiAppName,
          upiNumber: bank[0].upiNumber,
          withdrawAmount: Math.round(parseFloat(amount)),
          subAdminId: userName[0].userName,
          subAdminName: userName[0].firstname,
          remarks: remarks,
          createdAt: new Date().toISOString(),
        };
        const BankTransaction_Id = uuidv4();
        const insertBankRequestQuery = `
          INSERT INTO BankTransaction 
          (bankId, BankTransaction_Id, accountHolderName, bankName, accountNumber, ifscCode, transactionType, remarks, upiId, 
          upiAppName, upiNumber, withdrawAmount, subAdminId, subAdminName, createdAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await database.execute(insertBankRequestQuery, [
          bankTransaction.bankId,
          BankTransaction_Id,
          bankTransaction.accountHolderName,
          bankTransaction.bankName,
          bankTransaction.accountNumber,
          bankTransaction.ifscCode,
          bankTransaction.transactionType,
          bankTransaction.remarks,
          bankTransaction.upiId,
          bankTransaction.upiAppName,
          bankTransaction.upiNumber,
          bankTransaction.withdrawAmount,
          bankTransaction.subAdminId,
          bankTransaction.subAdminName,
          bankTransaction.createdAt,
        ]);
        res.status(200).send({ message: 'Wallet Balance Deducted from your Bank Account' });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/admin/bank-name',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Bank-View',
      'Website-View',
      'Profile-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
    ]),
    async (req, res) => {
      try {
        const [bankName] = await database.execute(`SELECT bankName, bank_id FROM Bank `);
        res.status(200).send(bankName);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/admin/manual-user-bank-account-summary/:bankId',
    Authorize(['superAdmin', 'Bank-View', 'Transaction-View']),
    async (req, res) => {
      try {
        let balances = 0;
        const bankId = req.params.bankId;

        // Fetch bank transactions from the database for the specified bankId
        const bankSummaryQuery = `SELECT * FROM BankTransaction WHERE bankId = ? ORDER BY createdAt DESC`;
        const [bankSummaryRows] = await database.execute(bankSummaryQuery, [bankId]);
        const bankSummary = bankSummaryRows;

        // Fetch account transactions from the database for the specified bankId
        const accountSummaryQuery = `SELECT * FROM Transaction WHERE bankId = ? ORDER BY createdAt DESC`;
        const [accountSummaryRows] = await database.execute(accountSummaryQuery, [bankId]);
        const accountSummary = accountSummaryRows;

        // Combine bank and account transactions
        const allTransactions = [...accountSummary, ...bankSummary];

        // Sort all transactions by createdAt in descending order
        allTransactions.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA;
        });

        // Calculate balances
        let allData = JSON.parse(JSON.stringify(allTransactions));
        allData
          .slice(0)
          .reverse()
          .map((data) => {
            if (data.transactionType === 'Manual-Bank-Deposit') {
              balances += parseFloat(data.depositAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Manual-Bank-Withdraw') {
              balances -= parseFloat(data.withdrawAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Deposit') {
              let totalAmount = 0;
              totalAmount += parseFloat(data.amount);
              balances += totalAmount;
              data.balance = balances;
            }
            if (data.transactionType === 'Withdraw') {
              const netAmount = balances - parseFloat(data.bankCharges) - parseFloat(data.amount);
              balances = netAmount;
              data.balance = balances;
            }
          });
        return res.status(200).send(allData);
      } catch (e) {
        console.error(e);
        res.status(e.code || 500).send({ message: e.message });
      }
    },
  );

  app.get('/api/superadmin/view-bank-edit-requests', Authorize(['superAdmin']), async (req, res) => {
    try {
      const editRequestsQuery = `SELECT * FROM EditBankRequest`;
      const [editRequestsRows] = await database.execute(editRequestsQuery);
      const resultArray = editRequestsRows;
      res.status(200).send(resultArray);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server error');
    }
  });

  app.post('/api/admin/bank/isactive/:bank_id', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const bankId = req.params.bank_id;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).send({ message: 'isActive field must be a boolean value' });
      }
      // Update bank's isActive status in the database
      const updateBankQuery = `UPDATE Bank SET isActive = ? WHERE bank_id = ?`;
      await database.execute(updateBankQuery, [isActive, bankId]);
      res.status(200).send({ message: 'Bank status updated successfully' });
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/bank/view-subadmin/:subadminId', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const subadminId = req.params.subadminId;
      const dbBankData = `SELECT Bank.bankName FROM Bank INNER JOIN BankSubAdmins ON Bank.bank_id = BankSubAdmins.bankId
        WHERE BankSubAdmins.subAdminId = ?`;
      const [bankData] = await database.execute(dbBankData, [subadminId]);
      res.status(200).send(bankData);
    } catch (e) {
      console.error(e);
      res.status(e.code || 400).send({ message: e.message || 'Internal server error' });
    }
  });

  app.put('/api/bank/edit-request/:bankId', Authorize(['superAdmin', 'RequstAdmin', 'Bank-View']), async (req, res) => {
    try {
      const { subAdmins } = req.body;
      const bankId = req.params.bankId;

      // Update subAdmins for the bank
      for (const subAdminData of subAdmins) {
        // Check if the subAdmin already exists in the database for this bank
        const [existingSubAdmin] = await database.execute(
          `SELECT * FROM BankSubAdmins WHERE bankId = ? AND subAdminId = ?`,
          [bankId, subAdminData.subAdminId],
        );

        if (existingSubAdmin.length === 0) {
          // If the subAdmin does not exist, insert a new record
          const insertSubAdminQuery = `
                    INSERT INTO BankSubAdmins (bankId, subAdminId, isDeposit, isWithdraw, isEdit, isRenew, isDelete)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
          await database.execute(insertSubAdminQuery, [
            bankId,
            subAdminData.subAdminId,
            subAdminData.isDeposit,
            subAdminData.isWithdraw,
            subAdminData.isEdit,
            subAdminData.isRenew,
            subAdminData.isDelete,
          ]);
        } else {
          // If the subAdmin exists, update their permissions
          const updateSubAdminQuery = `
                    UPDATE BankSubAdmins
                    SET isDeposit = ?, isWithdraw = ?, isEdit = ?, isRenew = ?, isDelete = ?
                    WHERE bankId = ? AND subAdminId = ?
                `;
          await database.execute(updateSubAdminQuery, [
            subAdminData.isDeposit,
            subAdminData.isWithdraw,
            subAdminData.isEdit,
            subAdminData.isRenew,
            subAdminData.isDelete,
            bankId,
            subAdminData.subAdminId,
          ]);
        }
      }

      res.status(200).send({ message: 'Bank Permission Updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(error.code || 500).send({ message: error.message || 'An error occurred' });
    }
  });

  app.delete(
    '/api/bank/delete-subadmin/:bankId/:subAdminId',
    Authorize(['superAdmin', 'RequstAdmin', 'Bank-View']),
    async (req, res) => {
      try {
        const { bankId, subAdminId } = req.params;
        // Check if the bank exists
        const bankExistQuery = `SELECT * FROM BankSubAdmins WHERE bankid = ?`;
        const [bank] = await database.execute(bankExistQuery, [bankId]);
        if (!bank) {
          throw { code: 404, message: 'Bank not found!' };
        }
        // Remove the subAdmin with the specified subAdminId
        const deleteSubAdminQuery = `DELETE FROM BankSubAdmins WHERE bankid = ? AND subadminid = ?`;
        await database.execute(deleteSubAdminQuery, [bankId, subAdminId]);
        res.status(200).send({ message: 'SubAdmin Permission removed successfully' });
      } catch (error) {
        console.error(error);
        res.status(error.code || 500).send({ message: error.message || 'An error occurred' });
      }
    },
  );

  app.get('/api/active-visible-bank', Authorize(['superAdmin', 'RequstAdmin']), async (req, res) => {
    try {
      // Retrieve active banks from the database
      const activeBanksQuery = `SELECT bankName FROM Bank WHERE isActive = true`;
      const [bankNames] = await database.execute(activeBanksQuery);
      // Retrieve active websites from the database
      const activeWebsitesQuery = `SELECT websiteName FROM Website WHERE isActive = true`;
      const [websiteNames] = await database.execute(activeWebsitesQuery);
      // Check if active banks and websites exist
      if (bankNames.length === 0) {
        return res.status(404).send({ message: 'No bank found' });
      }
      if (websiteNames.length === 0) {
        return res.status(404).send({ message: 'No Website found' });
      }
      return res.send({ bank: bankNames, website: websiteNames });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

  app.get(
    '/api/get-activeBank-name',
    Authorize([
      'superAdmin',
      'Bank-View',
      'Transaction-View',
      'Create-Transaction',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
    ]),
    async (req, res) => {
      try {
        const sqlQuery = `SELECT bankName, isActive FROM Bank WHERE isActive = true`;
        const [dbBankData] = await database.execute(sqlQuery);
        return res.status(200).send(dbBankData);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );
};

export default BankRoutes;

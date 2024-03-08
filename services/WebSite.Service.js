import mysql from 'mysql2/promise';

var Pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Himanshu@10',
  database: 'CRM',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const query = async (sql, values) => {
  try {
    const [rows, fields] = await Pool.execute(sql, values);
    return rows;
  } catch (error) {
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const WebsiteServices = {
  approveWebsiteAndAssignSubadmin: async (approvedWebsiteRequest, subAdminId, isDeposit, isWithdraw) => {
    try {
      const insertWebsiteDetails = `INSERT INTO Website(websiteName, subAdminName, isActive, website_id) 
            VALUES (?, ?, ?, ?)`;
      const insertSubadminQuery = `INSERT INTO WebsiteSubAdmins (websiteId, subAdminId, isDeposit, isWithdraw ) VALUES (?, ?, ?, ?)`;
      const promises = approvedWebsiteRequest.map(async (row) => {
        // Insert bank details
        const result = await query(insertWebsiteDetails, [row.websiteName, row.subAdminName, true, row.website_id]);

        // Insert entry into BankSubAdmins table with correct bankId
        await query(insertSubadminQuery, [row.website_id, subAdminId, isDeposit, isWithdraw]);
      });
      // Execute all promises concurrently
      await Promise.all(promises);
      return approvedWebsiteRequest.length; // Return the number of rows inserted for further verification
    } catch (error) {
      throw error; // Propagate error to the caller
    }
  },

  deleteWebsiteRequest: async (websiteId) => {
    const deleteWebsiteRequestQuery = `DELETE FROM WebsiteRequest WHERE website_id = ?`;
    const result = await query(deleteWebsiteRequestQuery, [websiteId]);
    return result.affectedRows; // Return the number of rows deleted for further verification
  },

  getBankRequests: async () => {
    try {
      const sql = 'SELECT * FROM BankRequest';
      const result = await query(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error('Internal Server error');
    }
  },

  getWebsiteBalance: async (websiteId) => {
    try {
      const websiteTransactionsQuery = `SELECT * FROM WebsiteTransaction WHERE websiteId = ?`;
      const websiteTransactions = await query(websiteTransactionsQuery, [websiteId]);

      const transactionsQuery = `SELECT * FROM Transaction WHERE websiteId = ?`;
      const transactions = await query(transactionsQuery, [websiteId]);

      // const editTransactionQuery = `SELECT * FROM editwebsiterequest WHERE websiteId = ?`;
      // const editTransaction = await query(editTransactionQuery, [websiteId]);

      let balance = 0;

      websiteTransactions.forEach((transaction) => {
        if (transaction.depositAmount) {
          balance += parseFloat(transaction.depositAmount);
        }
        if (transaction.withdrawAmount) {
          balance -= parseFloat(transaction.withdrawAmount);
        }
      });

      transactions.forEach((transaction) => {
        if (transaction.transactionType === 'Deposit') {
          balance = parseFloat(balance) - parseFloat(transactions.bonus) - parseFloat(transactions.amount);
        } else {
          balance += parseFloat(transactions.amount);
        }
      });
      return balance;
    } catch (error) {
      console.error('Error in getBankBalance:', error);
      throw error;
    }
  },

  updateWebsite: async (response, data) => {
    const existingRequest = response[0];

    if (!existingRequest) {
      throw { code: 404, message: `Website not found with id: ${existingRequest}` };
    }

    // Check if the website has already been edited
    const editHistory = await query(`SELECT * FROM EditWebsiteRequest WHERE websiteTransactionId = ?`, [
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
    const duplicateWebsite = await query(`SELECT * FROM Website WHERE LOWER(websiteName) = LOWER(?)`, [
      data.websiteName,
    ]);
    if (duplicateWebsite.length > 0) {
      throw { code: 400, message: 'Website name already exists in Website' };
    }

    const duplicateEditWebsite = await query(`SELECT * FROM EditWebsiteRequest WHERE LOWER(websiteName) = LOWER(?)`, [
      data.websiteName,
    ]);
    if (duplicateEditWebsite.length > 0) {
      throw { code: 400, message: 'Website name already exists in Edit Request' };
    }

    // Create updatedTransactionData using a ternary operator
    const updatedTransactionData = {
      id: existingRequest,
      websiteName: data.websiteName !== undefined ? data.websiteName : existingRequest.websiteName,
    };

    console.log('update', updatedTransactionData);

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const editRequestQuery = `
    INSERT INTO EditWebsiteRequest (websiteTransactionId, websiteName, message, type, changedFields, isApproved) 
    VALUES (?, ?, ?, ?, ?, ?)`;

    await query(editRequestQuery, [
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

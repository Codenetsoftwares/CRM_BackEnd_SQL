import connectToDB from '../db/db.js';

const WebsiteServices = {
  approveWebsiteAndAssignSubadmin: async (
    approvedWebsiteRequest,
    subAdminId,
    isDeposit,
    isWithdraw,
    isEdit,
    isRenew,
    isDelete,
  ) => {
    const pool = await connectToDB();
    try {
      const websiteDetails = approvedWebsiteRequest[0];
      const [existingWebsite] = await pool.execute(`SELECT * FROM Website WHERE website_id = ?`, [
        websiteDetails.website_id,
      ]);

      if (!existingWebsite || existingWebsite.length === 0) {
        const insertWebsiteDetails = `INSERT INTO Website(website_id, websiteName, subAdminName, isActive) 
        VALUES (?, ?, ?, ?)`;
        await pool.execute(insertWebsiteDetails, [
          websiteDetails.website_id,
          websiteDetails.websiteName,
          websiteDetails.subAdminName,
          true,
        ]);
      }

      const insertSubadmin = `INSERT INTO WebsiteSubAdmins (websiteId, subAdminId, isDeposit, isWithdraw, isEdit,
      isRenew, isDelete) VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const promises = approvedWebsiteRequest.map(async (row) => {
        await pool.execute(insertSubadmin, [
          websiteDetails.website_id,
          subAdminId,
          Boolean(isDeposit),
          Boolean(isWithdraw),
          Boolean(isEdit),
          Boolean(isRenew),
          Boolean(isDelete),
        ]);
      });

      // Execute all promises concurrently
      await Promise.all(promises);
      return approvedWebsiteRequest.length; // Return the number of rows inserted for further verification
    } catch (error) {
      throw error; // Propagate error to the caller
    }
  },

  deleteWebsiteRequest: async (websiteId) => {
    const pool = await connectToDB();
    const deleteWebsiteRequestQuery = `DELETE FROM WebsiteRequest WHERE website_id = ?`;
    const result = await pool.execute(deleteWebsiteRequestQuery, [websiteId]);
    return result.affectedRows; // Return the number of rows deleted for further verification
  },

  getBankRequests: async () => {
    const pool = await connectToDB();
    try {
      const sql = 'SELECT * FROM BankRequest';
      const result = await pool.execute(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error('Internal Server error');
    }
  },

  getWebsiteBalance: async (websiteId) => {
    try {
      const pool = await connectToDB();
      const websiteTransactionsQuery = `SELECT * FROM WebsiteTransaction WHERE websiteId = ?`;
      const [websiteTransactions] = await pool.execute(websiteTransactionsQuery, [websiteId]);

      const transactionsQuery = `SELECT * FROM Transaction WHERE websiteId = ?`;
      const [transactions] = await pool.execute(transactionsQuery, [websiteId]);

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
    const pool = await connectToDB();
    const existingRequest = response[0];

    if (!existingRequest) {
      throw { code: 404, message: `Website not found with id: ${existingRequest}` };
    }

    // Check if the website has already been edited
    const [editHistory] = await pool.execute(`SELECT * FROM EditWebsiteRequest WHERE websiteTransactionId = ?`, [
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
    const [duplicateWebsite] = await pool.execute(`SELECT * FROM Website WHERE LOWER(websiteName) = LOWER(?)`, [
      data.websiteName,
    ]);
    if (duplicateWebsite.length > 0) {
      throw { code: 400, message: 'Website name already exists in Website' };
    }

    const [duplicateEditWebsite] = await pool.execute(
      `SELECT * FROM EditWebsiteRequest WHERE LOWER(websiteName) = LOWER(?)`,
      [data.websiteName],
    );
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

    await pool.execute(editRequestQuery, [
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

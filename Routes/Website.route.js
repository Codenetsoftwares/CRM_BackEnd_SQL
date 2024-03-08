import mysql from 'mysql2/promise';
import { Authorize } from '../middleware/Authorize.js';
import WebsiteServices from '../services/WebSite.Service.js';
import { v4 as uuidv4 } from 'uuid';

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

const WebisteRoutes = (app) => {
  app.post('/api/add-website-name', Authorize(['superAdmin', 'Transaction-View', 'Website-View']), async (req, res) => {
    try {
      const userData = req.user;
      let websiteName = req.body.websiteName;

      // Remove spaces from the websiteName
      websiteName = websiteName.replace(/\s+/g, '');

      if (!websiteName) {
        throw { code: 400, message: 'Please provide a website name to add' };
      }

      // Check if the website name already exists in WebsiteRequest or Website table (ignoring case)
      const [existingWebsiteRequests, existingWebsites] = await Promise.all([
        query('SELECT * FROM WebsiteRequest WHERE LOWER(websiteName) = LOWER(?)', [websiteName]),
        query('SELECT * FROM Website WHERE LOWER(websiteName) = LOWER(?)', [websiteName]),
      ]);

      if (existingWebsiteRequests.length > 0 || existingWebsites.length > 0) {
        throw { code: 400, message: 'Website name already exists' };
      }

      const website_id = uuidv4();
      const insertWebsiteQuery = `INSERT INTO WebsiteRequest (websiteName, subAdminId, subAdminName, website_id) 
        VALUES (?, ?, ?, ?)`;
      const result = await query(insertWebsiteQuery, [
        websiteName,
        userData ? userData.userName : null,
        userData ? userData.firstname : null,
        website_id,
      ]);
      res.status(200).send({ message: 'Website name sent for approval!' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Error processing request' });
    }
  });

  app.post('/api/approve-website/:website_id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const { isApproved, subAdminId, isWithdraw, isDeposit } = req.body;
      const websiteId = req.params.website_id;
      const approvedWebsiteRequest = await query(`SELECT * FROM WebsiteRequest WHERE (website_id) = (?)`, [websiteId]);
      if (!approvedWebsiteRequest || approvedWebsiteRequest.length === 0) {
        throw { code: 404, message: 'Website not found in the approval requests!' };
      }
      if (isApproved) {
        const rowsInserted = await WebsiteServices.approveWebsiteAndAssignSubadmin(
          approvedWebsiteRequest,
          subAdminId,
          isDeposit,
          isWithdraw,
        );
        if (rowsInserted > 0) {
          await WebsiteServices.deleteWebsiteRequest(websiteId);
        } else {
          throw { code: 500, message: 'Failed to insert rows into Website table.' };
        }
      } else {
        throw { code: 400, message: 'Website approval was not granted.' };
      }
      res.status(200).send({ message: 'Website approved successfully & Subadmin Assigned' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  // API To View Website-Requests
  app.get('/api/superadmin/view-website-requests', Authorize(['superAdmin']), async (req, res) => {
    try {
      const resultArray = await query('SELECT * FROM WebsiteRequest');
      res.status(200).send(resultArray);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server error');
    }
  });

  app.delete('/api/reject/:website_id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const id = req.params.website_id;
      // Construct SQL DELETE query
      const deleteQuery = 'DELETE FROM WebsiteRequest WHERE website_id = ?';
      // Execute the query
      const result = await query(deleteQuery, [id]);
      // Check if any rows were affected
      if (result.affectedRows === 1) {
        res.status(200).send({ message: 'Data deleted successfully' });
      } else {
        res.status(404).send({ message: 'Data not found' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  app.delete('/api/website/reject/:website_id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const id = req.params.website_id;
      // Construct SQL DELETE query
      const deleteQuery = 'DELETE FROM WebsiteRequest WHERE website_id = ?';
      // Execute the query
      const result = await query(deleteQuery, [id]);
      // Check if any rows were affected
      if (result.affectedRows === 1) {
        res.status(200).send({ message: 'Data deleted successfully' });
      } else {
        res.status(404).send({ message: 'Data not found' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  app.delete('/api/reject-website-edit/:id', Authorize(['superAdmin']), async (req, res) => {
    try {
      const id = req.params.id;
      // Construct SQL DELETE query
      const deleteQuery = 'DELETE FROM EditWebsiteRequest WHERE id = ?';
      // Execute the query
      const result = await query(deleteQuery, [id]);
      // Check if any rows were affected
      if (result.affectedRows === 1) {
        res.status(200).send({ message: 'Data deleted successfully' });
      } else {
        res.status(404).send({ message: 'Data not found' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  app.get(
    '/api/get-activeWebsite-name',
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
        const sqlQuery = `SELECT websiteName, isActive FROM Website WHERE isActive = true`;
        const dbBankData = await query(sqlQuery);
        return res.status(200).send(dbBankData);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/get-website-name',
    Authorize([
      'superAdmin',
      'Bank-View',
      'Transaction-View',
      'Create-Transaction',
      'Create-Deposit-Transaction',
      'Create-Withdraw-Transaction',
    ]),
    async (req, res) => {
      console.log('req', req.user);
      const { page, itemsPerPage } = req.query;
      try {
        const WebsiteQuery = `SELECT * FROM Website`;
        const WebsiteData = await query(WebsiteQuery);
        console.log('WebsiteData', WebsiteData);
        for (let index = 0; index < WebsiteData.length; index++) {
          WebsiteData[index].balance = await WebsiteServices.getWebsiteBalance(WebsiteData[index].website_id);
          const user = req.user.userName;
          const subAdmins = query(`SELECT * FROM WebsiteSubAdmins WHERE subAdminId = (?)`, [user]);
          console.log('subAdmins', subAdmins);
          if (subAdmins) {
            WebsiteData[index].isDeposit = subAdmins.isDeposit;
            WebsiteData[index].isWithdraw = subAdmins.isWithdraw;
          }
        }
        WebsiteData.sort((a, b) => b.created_at - a.created_at);
        return res.status(200).send(WebsiteData);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.delete(
    '/api/website/delete-subadmin/:websiteId/:subAdminId',
    Authorize(['superAdmin', 'RequstAdmin', 'Bank-View']),
    async (req, res) => {
      try {
        const { websiteId, subAdminId } = req.params;
        const websiteQuery = `SELECT * FROM WebsiteSubAdmins WHERE websiteId = ?`;
        const [website] = await query(websiteQuery, [websiteId]);
        if (!website) {
          throw { code: 404, message: 'website not found!' };
        }
        // Remove the subAdmin with the specified subAdminId
        const deleteSubAdminQuery = `DELETE FROM WebsiteSubAdmins WHERE websiteId = ? AND subadminid = ?`;
        await query(deleteSubAdminQuery, [websiteId, subAdminId]);
        res.status(200).send({ message: 'SubAdmin removed successfully' });
      } catch (error) {
        res.status(error.code || 500).send({ message: error.message || 'An error occurred' });
      }
    },
  );

  app.get(
    '/api/get-single-webiste-name/:website_id',
    Authorize(['superAdmin', 'Transaction-View', 'Bank-View']),
    async (req, res) => {
      try {
        const id = req.params.website_id;
        const dbWebsiteData = await query(`SELECT * FROM Website WHERE website_id = (?)`, [id]);
        if (!dbWebsiteData) {
          return res.status(404).send({ message: 'Website not found' });
        }
        const websiteId = dbWebsiteData[0].website_id;
        const websiteBalance = await WebsiteServices.getWebsiteBalance(websiteId);
        const response = {
          website_id: dbWebsiteData[0].website_id,
          websiteName: dbWebsiteData[0].websiteName,
          subAdminId: dbWebsiteData[0].subAdminId,
          subAdminName: dbWebsiteData[0].subAdminName,
          balance: websiteBalance,
        };
        res.status(200).send(response);
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Internal server error' });
      }
    },
  );

  app.post(
    '/api/admin/add-website-balance/:website_id',
    Authorize(['superAdmin', 'Website-View', 'Transaction-View']),
    async (req, res) => {
      try {
        const id = req.params.website_id;
        const userName = req.user;
        const { amount, transactionType, remarks } = req.body;
        if (transactionType !== 'Manual-Website-Deposit') {
          return res.status(500).send({ message: 'Invalid transaction type' });
        }
        if (!amount || typeof amount !== 'number') {
          return res.status(400).send({ message: 'Invalid amount' });
        }
        if (!remarks) {
          throw { code: 400, message: 'Remark is required' };
        }
        const website = await query(`SELECT * FROM Website WHERE website_id = (?)`, [id]);
        if (!website) {
          return res.status(404).send({ message: 'Website  not found' });
        }
        const websiteTransaction = {
          websiteId: website[0].website_id,
          websiteName: website[0].websiteName,
          remarks: remarks,
          transactionType: transactionType,
          depositAmount: parseFloat(amount),
          subAdminId: userName.userName,
          subAdminName: userName.firstname,
          createdAt: new Date(),
        };
        const WebsiteTransaction_Id = uuidv4();
        const insertWebsiteRequestQuery = `
      INSERT INTO websiteTransaction 
      (websiteId, websiteName, remarks, transactionType, depositAmount, subAdminId, subAdminName, createdAt, WebsiteTransaction_Id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await query(insertWebsiteRequestQuery, [
          websiteTransaction.websiteId,
          websiteTransaction.websiteName,
          websiteTransaction.remarks,
          websiteTransaction.transactionType,
          websiteTransaction.depositAmount,
          websiteTransaction.subAdminId,
          websiteTransaction.subAdminName,
          websiteTransaction.createdAt,
          WebsiteTransaction_Id,
        ]);
        res.status(200).send({ message: 'Wallet Balance Added to Your Website' });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.post(
    '/api/admin/withdraw-website-balance/:website_id',
    Authorize(['superAdmin', 'Website-View', 'Transaction-View']),
    async (req, res) => {
      try {
        const id = req.params.website_id;
        console.log('id', id);
        const userName = req.user;
        const { amount, transactionType, remarks } = req.body;
        if (!amount || typeof amount !== 'number') {
          return res.status(400).send({ message: 'Invalid amount' });
        }
        if (transactionType !== 'Manual-Website-Withdraw') {
          return res.status(500).send({ message: 'Invalid transaction type' });
        }
        if (!remarks) {
          throw { code: 400, message: 'Remark is required' };
        }
        const website = await query(`SELECT * FROM Website WHERE website_id = (?)`, [id]);
        console.log('website........', website);
        if (!website) {
          return res.status(404).send({ message: 'Websitet not found' });
        }
        if ((await WebsiteServices.getWebsiteBalance(id)) < Number(amount)) {
          return res.status(400).send({ message: 'Insufficient Website Balance' });
        }
        const websiteTransaction = {
          websiteId: website[0].website_id,
          websiteName: website[0].websiteName,
          transactionType: transactionType,
          withdrawAmount: parseFloat(amount),
          subAdminId: userName.userName,
          subAdminName: userName.firstname,
          remarks: remarks,
          createdAt: new Date(),
        };
        const WebsiteTransaction_Id = uuidv4();
        const insertWebsiteRequestQuery = `
      INSERT INTO websiteTransaction 
      (websiteId, websiteName, remarks, transactionType, withdrawAmount, subAdminId, subAdminName, createdAt, WebsiteTransaction_Id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await query(insertWebsiteRequestQuery, [
          websiteTransaction.websiteId,
          websiteTransaction.websiteName,
          websiteTransaction.remarks,
          websiteTransaction.transactionType,
          websiteTransaction.withdrawAmount,
          websiteTransaction.subAdminId,
          websiteTransaction.subAdminName,
          websiteTransaction.createdAt,
          WebsiteTransaction_Id,
        ]);
        res.status(200).send({ message: 'Wallet Balance Deducted from your Website' });
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.get(
    '/api/admin/website-name',
    Authorize([
      'superAdmin',
      'Dashboard-View',
      'Transaction-View',
      'Transaction-Edit-Request',
      'Transaction-Delete-Request',
    ]),
    async (req, res) => {
      try {
        const websiteName = await query('SELECT websiteName FROM Website');
        res.status(200).send(websiteName);
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    },
  );

  app.post(
    '/api/admin/manual-user-website-account-summary/:websiteId',
    Authorize(['superAdmin', 'Bank-View', 'Transaction-View', 'Website-View']),
    async (req, res) => {
      try {
        let balances = 0;
        const websiteId = req.params.websiteId;

        const websiteSummaryQuery = `SELECT * FROM WebsiteTransaction WHERE websiteId = ? ORDER BY createdAt DESC`;
        const websiteSummaryRows = await query(websiteSummaryQuery, [websiteId]);
        const websiteSummary = websiteSummaryRows;

        const accountSummaryQuery = `SELECT * FROM Transaction WHERE websiteId = ? ORDER BY createdAt DESC`;
        const accountSummaryRows = await query(accountSummaryQuery, [websiteId]);
        const accountSummary = accountSummaryRows;

        const allTransactions = [...accountSummary, ...websiteSummary];

        allTransactions.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA;
        });

        let allData = JSON.parse(JSON.stringify(allTransactions));
        allData
          .slice(0)
          .reverse()
          .map((data) => {
            if (data.transactionType === 'Manual-Website-Deposit') {
              balances += parseFloat(data.depositAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Manual-Website-Withdraw') {
              balances -= parseFloat(data.withdrawAmount);
              data.balance = balances;
            }
            if (data.transactionType === 'Deposit') {
              const netAmount = balances - parseFloat(data.bonus) - parseFloat(data.amount);
              balances = netAmount;
              data.balance = balances;
            }
            if (data.transactionType === 'Withdraw') {
              let totalamount = 0;
              totalamount += parseFloat(data.amount);
              balances += totalamount;
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

  app.get('/api/superadmin/view-website-edit-requests', Authorize(['superAdmin']), async (req, res) => {
    try {
      const editRequestsQuery = `SELECT * FROM EditWebsiteRequest`;
      const editRequestsRows = await query(editRequestsQuery);
      const resultArray = editRequestsRows;
      res.status(200).send(resultArray);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server error');
    }
  });

  app.post('/api/admin/website/isactive/:website_id', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const websiteId = req.params.website_id;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).send({ message: 'isApproved field must be a boolean value' });
      }
      const updateWebsiteQuery = `UPDATE Website SET isActive = ? WHERE website_id = ?`;
      await query(updateWebsiteQuery, [isActive, websiteId]);
      res.status(200).send({ message: 'Website status updated successfully' });
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal server error' });
    }
  });

  app.get(
    '/api/admin/website/view-subadmin/:subadminId',
    Authorize(['superAdmin', 'RequestAdmin']),
    async (req, res) => {
      try {
        const subadminId = req.params.subadminId;
        const dbWebsiteData = `SELECT Website.websiteName FROM Website INNER JOIN WebsiteSubAdmins ON Website.website_id = 
        WebsiteSubAdmins.websiteId WHERE WebsiteSubAdmins.subAdminId = ?`;
        const websiteData = await query(dbWebsiteData, [subadminId]);
        res.status(200).send(websiteData);
      } catch (e) {
        console.error(e);
        res.status(e.code || 400).send({ message: e.message || 'Internal server error' });
      }
    },
  );

  app.put(
    '/api/website/edit-request/:websiteId',
    Authorize(['superAdmin', 'RequstAdmin', 'Bank-View']),
    async (req, res) => {
      try {
        const { subAdminId, isDeposit, isWithdraw, isDelete, isRenew, isEdit } = req.body;
        const websiteId = req.params.websiteId;

        // Check if the bank exists
        const subAdminWebsiteEdit = await query(`SELECT * FROM WebsiteSubAdmins WHERE websiteId = ?`, [websiteId]);
        if (!subAdminWebsiteEdit.length) {
          throw { code: 404, message: 'Website SubAdmins not found for Editing' };
        }

        // Update subAdmins for the bank
        for (const subAdminData of subAdminWebsiteEdit) {
          // Update the relevant fields
          subAdminData.isDeposit = isDeposit;
          subAdminData.isWithdraw = isWithdraw;
          subAdminData.isDelete = isDelete;
          subAdminData.isRenew = isRenew;
          subAdminData.isEdit = isEdit;

          // Update the record in the database
          const updateSubAdminQuery = `
                UPDATE BankSubAdmins
                SET isDeposit = ?, isWithdraw = ?, isEdit = ?, isRenew = ?, isDelete = ?
                WHERE websiteId = ? AND subAdminId = ?
            `;
          await query(updateSubAdminQuery, [
            isDeposit,
            isWithdraw,
            isEdit,
            isRenew,
            isDelete,
            websiteId,
            subAdminData.subAdminId,
          ]);
        }

        res.status(200).send({ message: 'Updated successfully' });
      } catch (error) {
        console.error(error);
        res.status(error.code || 500).send({ message: error.message || 'An error occurred' });
      }
    },
  );
};

export default WebisteRoutes;

import { validate } from 'uuid';
import { string } from '../constructor/string.js';
import { Authorize } from '../middleware/Authorize.js';
import DeleteApiService, { approveBankTransactionRequest, deleteBank, deleteBankRequest, deleteIntroducerTransaction, deleteIntroducerTransactionWithId, deleteTransaction, deleteTransactionWithId, deleteWebsite, deleteWebsiteTransaction, moveWebsiteTransactionToTrash, rejectBankDetail, rejectWebsiteDetail, saveWebsiteRequest } from '../services/DeleteAPI.service.js';
import { deleteBankTransaction } from '../services/DeleteAPI.service.js'
import { database } from '../services/database.service.js';
import { deleteWebsiteTransactionValidate, validateDeleteBank, validateDeleteBankTransaction, validateDeleteIntroducerTransaction, validateDeleteIntroducerTransactionWithId, validateDeleteTransaction, validateDeleteTransactionWithId, validateDeleteWebsite, validateMoveToTrash, validateRejectBankDetail, validateRejectWebsiteDetail, validateSaveWebsiteRequest, validationDeleteBankRequest } from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

const DeleteAPIRoute = (app) => {
  // API To Move The Bank Transaction Into Trash
  app.post(
    '/api/admin/save-bank-transaction-request',Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]),validateDeleteBankTransaction,customErrorHandler,deleteBankTransaction);

  // API To Approve Bank Transaction To Move Into Trash Request

  app.post('/api/delete-bank-transaction/:edit_Id', Authorize([string.superAdmin, string.requestAdmin ]),validate,customErrorHandler, approveBankTransactionRequest);

  // API To Move The Website Transaction Into Trash
  app.post('/api/admin/save-website-transaction-request',Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]),deleteWebsiteTransactionValidate,customErrorHandler,deleteWebsiteTransaction);

  // API To Approve Website Transaction To Move Into Trash Request

  app.post('/api/delete-website-transaction/:edit_Id', Authorize([string.superAdmin, string.requestAdmin]),validateMoveToTrash,customErrorHandler, moveWebsiteTransactionToTrash);
  

  // API To Move The Transaction Into Trash

  app.post('/api/admin/save-transaction-request',Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]),validateDeleteTransaction,customErrorHandler,deleteTransaction);

   // API To Move The Introducer Transaction Into Trash
   app.post('/api/admin/save-introducer-transaction-request',Authorize([string.superAdmin, string.transactionDeleteRequest, string.dashboardView]),validateDeleteIntroducerTransaction,customErrorHandler,deleteIntroducerTransaction);

   app.post('/api/delete-transaction/:edit_Id', Authorize([string.superAdmin, string.requestAdmin]),validateDeleteTransactionWithId,customErrorHandler,deleteTransactionWithId );

   app.post('/api/delete-introducer-transaction/:IntroEditId', Authorize([string.superAdmin, string.requestAdmin]),validateDeleteIntroducerTransactionWithId,customErrorHandler, deleteIntroducerTransactionWithId);

   app.post('/api/admin/save-bank-request',Authorize([string.superAdmin, string.transactionView, string.bankView]),validationDeleteBankRequest,customErrorHandler, deleteBankRequest);

   // API For Bank Delete Request

   app.post('/api/delete-bank/:bank_id', Authorize([string.superAdmin, string.requestAdmin]),validateDeleteBank,customErrorHandler,deleteBank );

   // API TO Sent deleting Website Detail's approval
   app.post('/api/admin/save-website-request', Authorize([string.superAdmin, string.transactionView, string.websiteView]),validateSaveWebsiteRequest,customErrorHandler,saveWebsiteRequest );

    // API For Website Delete Request
  app.post('/api/delete-website/:website_id', Authorize([string.superAdmin, string.requestAdmin]),validateDeleteWebsite,customErrorHandler, deleteWebsite);

  // API For Rejecting Bank Detail

  app.delete('/api/reject/bank-detail/:bank_id', Authorize([string.superAdmin, string.requestAdmin]),validateRejectBankDetail,customErrorHandler, rejectBankDetail);

  // API For Rejecting Website Detail

  app.delete('/api/reject/website-detail/:website_id', Authorize([string.superAdmin, string.requestAdmin]),validateRejectWebsiteDetail,customErrorHandler, rejectWebsiteDetail);









  // API To Approve Transaction To Move Into Trash Request

 

  // API To Approve Introducer Transaction To Move Into Trash Request

  // API TO Sent deleting Bank Detail's approval

  // API For Bank Delete Request

  

  

  

  // API For Rejecting Website Detail

  app.delete('/api/reject/website-detail/:website_id', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const id = req.params.website_id;
      const deleteQuery = 'DELETE FROM EditWebsiteRequest WHERE website_id = ?';
      const [result] = await database.execute(deleteQuery, [id]);
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

  //  API To View Trash Data
  app.get('/api/admin/view-trash', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const [resultArray] = await database.execute(`SELECT * FROM Trash`);
      res.status(200).send(resultArray);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server error');
    }
  });

  // API To Re-Store The Bank Transaction Data
  app.post('/api/restore/bank/data/:bankId', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const bankId = req.params.bankId;

      // Retrieve deleted data from the Trash table based on bankId
      const [deletedData] = await database.execute(`SELECT * FROM Trash WHERE bankId = ?`, [bankId]);

      if (!deletedData || deletedData.length === 0) {
        return res.status(404).send({ message: 'Data not found in Trash' });
      }

      // Extract data to restore from the retrieved deleted data
      const dataToRestore = {
        bankId: deletedData[0].bankId,
        transactionType: deletedData[0].transactionType,
        remarks: deletedData[0].remarks,
        withdrawAmount: deletedData[0].withdrawAmount,
        depositAmount: deletedData[0].depositAmount,
        subAdminId: deletedData[0].subAdminId,
        subAdminName: deletedData[0].subAdminName,
        accountHolderName: deletedData[0].accountHolderName,
        bankName: deletedData[0].bankName,
        accountNumber: deletedData[0].accountNumber,
        ifscCode: deletedData[0].ifscCode,
        createdAt: deletedData[0].createdAt,
        upiId: deletedData[0].upiId,
        upiAppName: deletedData[0].upiAppName,
        upiNumber: deletedData[0].upiNumber,
        isSubmit: deletedData[0].isSubmit,
        BankTransaction_Id: deletedData[0].BankTransaction_Id,
      };

      // Insert restored data into the BankTransaction table
      const [restoredData] = await database.execute(
        `INSERT INTO BankTransaction 
            (bankId, BankTransaction_Id, accountHolderName, bankName, accountNumber, ifscCode, transactionType, remarks, upiId,
            upiAppName, upiNumber, withdrawAmount, depositAmount, subAdminId, subAdminName, createdAt, isSubmit) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dataToRestore.bankId,
          dataToRestore.BankTransaction_Id,
          dataToRestore.accountHolderName,
          dataToRestore.bankName,
          dataToRestore.accountNumber,
          dataToRestore.ifscCode,
          dataToRestore.transactionType,
          dataToRestore.remarks,
          dataToRestore.upiId,
          dataToRestore.upiAppName,
          dataToRestore.upiNumber,
          dataToRestore.withdrawAmount,
          dataToRestore.depositAmount,
          dataToRestore.subAdminId,
          dataToRestore.subAdminName,
          dataToRestore.createdAt,
          dataToRestore.isSubmit,
        ],
      );

      // Delete the restored data from the Trash table
      await database.execute(`DELETE FROM Trash WHERE bankId = ?`, [bankId]);

      res.status(200).send({ message: 'Data restored successfully', data: restoredData });
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  // API To Re-Store The Website Transaction Data
  app.post('/api/restore/website/data/:websiteId', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const websiteId = req.params.websiteId;

      // Retrieve deleted data from the Trash table based on websiteId
      const [deletedData] = await database.execute(`SELECT * FROM Trash WHERE websiteId = ?`, [websiteId]);

      if (!deletedData || deletedData.length === 0) {
        return res.status(404).send({ message: 'Data not found in Trash' });
      }

      // Extract data to restore from the retrieved deleted data
      const dataToRestore = {
        websiteId: deletedData[0].websiteId,
        transactionType: deletedData[0].transactionType,
        remarks: deletedData[0].remarks,
        withdrawAmount: deletedData[0].withdrawAmount,
        depositAmount: deletedData[0].depositAmount,
        subAdminId: deletedData[0].subAdminId,
        subAdminName: deletedData[0].subAdminName,
        websiteName: deletedData[0].websiteName,
        createdAt: deletedData[0].createdAt,
        WebsiteTransaction_Id: deletedData[0].WebsiteTransaction_Id,
      };

      // Insert restored data into the WebsiteTransaction table
      const [restoredData] = await database.execute(
        `INSERT INTO WebsiteTransaction
          (websiteId, WebsiteTransaction_Id, websiteName, remarks, transactionType, withdrawAmount, depositAmount, subAdminId, 
          subAdminName, createdAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dataToRestore.websiteId,
          dataToRestore.WebsiteTransaction_Id,
          dataToRestore.websiteName,
          dataToRestore.remarks,
          dataToRestore.transactionType,
          dataToRestore.withdrawAmount,
          dataToRestore.depositAmount,
          dataToRestore.subAdminId,
          dataToRestore.subAdminName,
          dataToRestore.createdAt,
        ],
      );

      // Delete the restored data from the Trash table
      await database.execute(`DELETE FROM Trash WHERE websiteId = ?`, [websiteId]);

      res.status(200).send({ message: 'Data restored successfully', data: restoredData });
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  // API To Re-Store The Transaction Data
  app.post(
    '/api/restore/transaction/data/:Transaction_Id',
    Authorize(['superAdmin', 'RequestAdmin']),
    async (req, res) => {
      try {
        const transactionID = req.params.Transaction_Id;

        // Retrieve deleted data from the Trash table based on transactionID
        const [deletedData] = await database.execute(`SELECT * FROM Trash WHERE Transaction_Id = ?`, [transactionID]);
        console.log('deletedData', deletedData);
        if (!deletedData || deletedData.length === 0) {
          return res.status(404).send({ message: 'Data not found in Trash' });
        }

        // Extract data to restore from the retrieved deleted data
        const dataToRestore = {
          bankId: deletedData[0].bankId,
          websiteId: deletedData[0].websiteId,
          transactionID: deletedData[0].transactionID,
          transactionType: deletedData[0].transactionType,
          remarks: deletedData[0].remarks,
          amount: deletedData[0].amount,
          subAdminId: deletedData[0].subAdminId,
          subAdminName: deletedData[0].subAdminName,
          introducerUserName: deletedData[0].introducerUserName,
          userId: deletedData[0].userId,
          userName: deletedData[0].userName,
          paymentMethod: deletedData[0].paymentMethod,
          websiteName: deletedData[0].websiteName,
          bankName: deletedData[0].bankName,
          bonus: deletedData[0].bonus,
          bankCharges: deletedData[0].bankCharges,
          createdAt: deletedData[0].createdAt,
          Transaction_Id: deletedData[0].Transaction_Id,
          accountNumber: deletedData[0].accountNumber,
        };

        // Insert restored data into the Transaction table
        const [restoredData] = await database.execute(
          `INSERT INTO Transaction 
          (bankId, websiteId, subAdminId, subAdminName, transactionID, transactionType, amount, paymentMethod, userName, 
          introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, createdAt, Transaction_Id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dataToRestore.bankId,
            dataToRestore.websiteId,
            dataToRestore.subAdminId,
            dataToRestore.subAdminName,
            dataToRestore.transactionID,
            dataToRestore.transactionType,
            dataToRestore.amount,
            dataToRestore.paymentMethod,
            dataToRestore.userName,
            dataToRestore.introducerUserName,
            dataToRestore.bonus,
            dataToRestore.bankCharges,
            dataToRestore.remarks,
            dataToRestore.accountNumber,
            dataToRestore.bankName,
            dataToRestore.websiteName,
            dataToRestore.createdAt,
            dataToRestore.Transaction_Id,
          ],
        );

        // Update the user's transaction detail
        await database.execute(
          `INSERT INTO UserTransactionDetail 
          (user_ID, Transaction_id, bankId, websiteId, subAdminName, transactionID, transactionType, amount, paymentMethod, userName, 
          introducerUserName, bonus, bankCharges, remarks, accountNumber, bankName, websiteName, createdAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            null,
            dataToRestore.Transaction_Id,
            dataToRestore.bankId,
            dataToRestore.websiteId,
            dataToRestore.subAdminName,
            dataToRestore.transactionID,
            dataToRestore.transactionType,
            dataToRestore.amount,
            dataToRestore.paymentMethod,
            dataToRestore.userName,
            dataToRestore.introducerUserName,
            dataToRestore.bonus,
            dataToRestore.bankCharges,
            dataToRestore.remarks,
            dataToRestore.accountNumber,
            dataToRestore.bankName,
            dataToRestore.websiteName,
            dataToRestore.createdAt,
          ],
        );

        // Delete the restored data from the Trash table
        await database.execute(`DELETE FROM Trash WHERE Transaction_Id = ?`, [transactionID]);

        res.status(200).send({ message: 'Data restored successfully', data: restoredData });
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: e.message });
      }
    },
  );

  // API To Re-Store The Intoducer Transaction
  app.post(
    '/api/restore/Introducer/data/:introTransactionId',
    Authorize(['superAdmin', 'RequestAdmin']),
    async (req, res) => {
      try {
        const introUserId = req.params.introTransactionId;

        // Retrieve deleted data from the Trash table based on introUserId
        const [deletedData] = await database.execute(`SELECT * FROM Trash WHERE introTransactionId = ?`, [introUserId]);
        console.log('deletedData', deletedData);
        if (!deletedData || deletedData.length === 0) {
          return res.status(404).send({ message: 'Data not found in Trash' });
        }

        // Extract data to restore from the retrieved deleted data
        const dataToRestore = {
          introTransactionId: deletedData[0].introTransactionId,
          introUserId: deletedData[0].introUserId,
          amount: deletedData[0].amount,
          transactionType: deletedData[0].transactionType,
          remarks: deletedData[0].remarks,
          subAdminId: deletedData[0].subAdminId,
          subAdminName: deletedData[0].subAdminName,
          introducerUserName: deletedData[0].introducerUserName,
          createdAt: deletedData[0].createdAt,
        };
        console.log('dataToRestore', dataToRestore);
        // Insert restored data into the IntroducerTransaction table
        const [restoredData] = await database.execute(
          `INSERT INTO IntroducerTransaction 
          (introTransactionId, introUserId, amount, transactionType, remarks, subAdminId, subAdminName, introducerUserName, 
          createdAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dataToRestore.introTransactionId,
            dataToRestore.introUserId,
            dataToRestore.amount,
            dataToRestore.transactionType,
            dataToRestore.remarks,
            dataToRestore.subAdminId,
            dataToRestore.subAdminName,
            dataToRestore.introducerUserName,
            dataToRestore.createdAt,
          ].map((value) => (value === undefined ? null : value)), // Replace undefined with null
        );

        // Delete the restored data from the Trash table
        await database.execute(`DELETE FROM Trash WHERE introTransactionId = ?`, [introUserId]);

        res.status(200).send({ message: 'Data restored successfully', data: restoredData });
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: e.message });
      }
    },
  );

  app.delete(
    '/api/reject/introducer-detail/:IntroEditID',
    Authorize(['superAdmin', 'RequestAdmin']),
    async (req, res) => {
      try {
        const id = req.params.IntroEditID;
        const deleteQuery = 'DELETE FROM IntroducerEditRequest WHERE IntroEditID = ?';
        const [result] = await database.execute(deleteQuery, [id]);
        if (result.affectedRows === 1) {
          res.status(200).send({ message: 'Data deleted successfully' });
        } else {
          res.status(404).send({ message: 'Data not found' });
        }
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: e.message });
      }
    },
  );

  app.get('/api/admin/view-Delete-Request', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const [resultArray] = await database.execute(`SELECT * FROM EditRequest`);
      res.status(200).send(resultArray);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server error');
    }
  });

  // API To Reject EditRequest Data
  app.delete('/api/reject/DeleteRequest/:Edit_ID', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const id = req.params.Edit_ID;
      const deleteQuery = 'DELETE FROM EditRequest WHERE Edit_ID = ?';
      const [result] = await database.execute(deleteQuery, [id]);
      if (result.affectedRows === 1) {
        res.status(200).send({ message: 'Data deleted successfully' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });

  // API To Reject Trash Data
  app.delete('/api/reject/trash/transactions/:_id', Authorize(['superAdmin', 'RequestAdmin']), async (req, res) => {
    try {
      const id = req.params._id;
      const [result] = await database.execute(`DELETE FROM Trash WHERE _id = ?`, [id]);
      if (result.affectedRows > 0) {
        res.status(200).send({ message: 'Data deleted successfully' });
      } else {
        res.status(404).send({ message: 'Data not found' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message });
    }
  });
};

export default DeleteAPIRoute;

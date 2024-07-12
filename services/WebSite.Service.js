import { database } from '../services/database.service.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import EditWebsiteRequest from '../models/websiteRequest.model.js'
import Website from '../models/website.model.js';

export const updateWebsite = async (req, res) => {
  try {
    const id = req.params.website_id;

    // Retrieve existing website details from the database
    const editWebsite = await Website.findByPk(id);
    if (!editWebsite) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website not found for Editing', res);
    }

    // Check if the website has already been edited
    const editHistory = await EditWebsiteRequest.findAll({ where: { websiteId: id } });
    if (editHistory.length > 0) {
      return apiResponseErr(null, false, statusCode.badRequest, `Website with id ${id} has already been edited.`, res);
    }

    let changedFields = {};

    // Compare each field in the data object with the existingTransaction
    if (req.body.websiteName !== editWebsite.websiteName) {
      changedFields.websiteName = req.body.websiteName;
    }

    // Check if the new website name already exists (case-insensitive)
    const duplicateWebsite = await Website.findOne({
      where: {
        websiteName: req.body.websiteName,
      },
    });

    if (duplicateWebsite) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website name already exists in Website', res);
    }

    const duplicateEditWebsite = await EditWebsiteRequest.findOne({
      where: {
        websiteName: req.body.websiteName,
      },
    });

    if (duplicateEditWebsite) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Website name already exists in Edit Request', res);
    }

    // Create updatedTransactionData using a ternary operator
    const updatedTransactionData = {
      websiteId: editWebsite.id,
      websiteName:
        req.body.websiteName !== undefined
          ? req.body.websiteName.replace(/\s+/g, '')
          : editWebsite.websiteName.replace(/\s+/g, ''),
    };

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    // Insert edit request into the database
    await EditWebsiteRequest.create({
      websiteId: updatedTransactionData.websiteId,
      websiteName: updatedTransactionData.websiteName,
      message: "Website Detail's has been edited",
      type: 'Edit',
      changedFields: JSON.stringify(changedFields),
      isApproved: false, // Assuming this corresponds to the 'isApproved' column
    });

    // Send success response
    return apiResponseSuccess(null, true, statusCode.create, "Website Detail's Sent to Super Admin For Approval", res);
    
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

export const approveWebsiteDetailEditRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { isApproved } = req.body;

    if (typeof isApproved !== 'boolean') {
      return apiResponseErr(null, false, statusCode.badRequest, 'isApproved field must be a boolean value', res);
    }

    const editRequest = await EditWebsiteRequest.findByPk(requestId);

    if (!editRequest) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Edit request not found', res);
    }

    if (!editRequest.isApproved) {
      if (isApproved) {
        const websiteExists = await Website.findOne({
          where: {
            websiteName: editRequest.websiteName,
            id: { [Sequelize.Op.ne]: editRequest.websiteId },
          },
        });

        if (websiteExists) {
          return apiResponseErr(null, false, statusCode.badRequest, 'Website with the same name already exists', res);
        }

        await Website.update(
          {
            websiteName: editRequest.websiteName.replace(/\s+/g, ''),
          },
          { where: { id: editRequest.websiteId } }
        );

        editRequest.isApproved = true;
        await editRequest.save();
        await EditWebsiteRequest.destroy({ where: { id: requestId } });

        return apiResponseSuccess(null, true, statusCode.success, 'Edit request approved and data updated', res);
      } else {
        await EditWebsiteRequest.destroy({ where: { id: requestId } });
        return apiResponseSuccess(null, true, statusCode.success, 'Edit request rejected', res);
      }
    } else {
      return apiResponseSuccess(null, true, statusCode.badRequest, 'Edit request has already been processed', res);
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


const WebsiteServices = {
  approveWebsiteAndAssignSubadmin: async (approvedWebsiteRequest, subAdmins) => {
    try {
      const insertWebsiteDetails = `INSERT INTO Website (websiteId, websiteName, subAdminName, isActive) 
      VALUES (?, ?, ?, ?)`;
      const insertSubadmin = `INSERT INTO WebsiteSubAdmins (websiteId, subAdminId, isDeposit, isWithdraw, isEdit, 
      isRenew, isDelete) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      await database.execute(insertWebsiteDetails, [
        approvedWebsiteRequest[0].websiteId,
        approvedWebsiteRequest[0].websiteName,
        approvedWebsiteRequest[0].subAdminName,
        true,
      ]);
      await Promise.all(
        subAdmins.map(async (subAdmin) => {
          const { subAdminId, isWithdraw, isDeposit, isEdit, isRenew, isDelete } = subAdmin;
          // Insert subadmin details
          await database.execute(insertSubadmin, [
            approvedWebsiteRequest[0].websiteId,
            subAdminId,
            isDeposit,
            isWithdraw,
            isEdit,
            isRenew,
            isDelete,
          ]);
        }),
      );
      return subAdmins.length;
    } catch (error) {
      throw error; // Propagate error to the caller
    }
  },

  deleteWebsiteRequest: async (websiteId) => {
    const deleteWebsiteRequestQuery = `DELETE FROM WebsiteRequest WHERE websiteId = ?`;
    const result = await database.execute(deleteWebsiteRequestQuery, [websiteId]);
    return result.affectedRows; // Return the number of rows deleted for further verification
  },

  getBankRequests: async () => {
    try {
      const sql = 'SELECT * FROM BankRequest';
      const result = await database.execute(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error('Internal Server error');
    }
  },

  getWebsiteBalance: async (websiteId) => {
    try {
      const websiteTransactionsQuery = `SELECT * FROM WebsiteTransaction WHERE websiteId = ?`;
      const [websiteTransactions] = await database.execute(websiteTransactionsQuery, [websiteId]);

      const transactionsQuery = `SELECT * FROM Transaction WHERE websiteId = ?`;
      const [transactions] = await database.execute(transactionsQuery, [websiteId]);

      let balance = 0;

      for (const transaction of websiteTransactions) {
        if (transaction.depositAmount) {
          balance += parseFloat(transaction.depositAmount);
        }
        if (transaction.withdrawAmount) {
          balance -= parseFloat(transaction.withdrawAmount);
        }
      }

      for (const transaction of transactions) {
        if (transaction.transactionType === 'Deposit') {
          balance -= parseFloat(transaction.bonus) + parseFloat(transaction.amount);
        } else {
          balance += parseFloat(transaction.amount);
        }
      }

      return balance;
    } catch (e) {
      console.error(e);
      throw e; // Rethrow the error to handle it at the calling site
    }
  },


};

export default WebsiteServices;

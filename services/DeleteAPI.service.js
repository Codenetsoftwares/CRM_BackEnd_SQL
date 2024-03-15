import connectToDB from '../db/db.js';
import { v4 as uuidv4 } from 'uuid';

const DeleteApiService = {
  // Functions For Moveing The Transaction Into Trash

  deleteBankTransaction: async (transaction, user) => {
    const pool = await connectToDB();
    const [existingTransaction] = await pool.execute(`SELECT * FROM BankTransaction WHERE id = ?`, [transaction.id]);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Transaction not found with id: ${transaction.id}` };
    }

    const [existingEditRequest] = await pool.execute(
      `SELECT * FROM EditRequest WHERE transId = ? AND type = 'Delete'`,
      [transaction.id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }

    const updatedTransactionData = {
      bankId: transaction.bankId,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      withdrawAmount: transaction.withdrawAmount,
      depositAmount: transaction.depositAmount,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      accountHolderName: transaction.accountHolderName,
      bankName: transaction.bankName,
      accountNumber: transaction.accountNumber,
      ifscCode: transaction.ifscCode,
      createdAt: transaction.createdAt,
      upiId: transaction.upiId,
      upiAppName: transaction.upiAppName,
      upiNumber: transaction.upiNumber,
      isSubmit: transaction.isSubmit,
    };

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const name = user[0].firstname;
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO EditRequest (bankId, transactionType, requesteduserName, subAdminId, subAdminName, 
        depositAmount, withdrawAmount, remarks, bankName, accountHolderName, accountNumber, ifscCode, upiId, upiAppName, upiNumber, message, 
        type, Nametype, transId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await pool.execute(createEditRequestQuery, [
      updatedTransactionData.bankId,
      updatedTransactionData.transactionType,
      name,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.depositAmount,
      updatedTransactionData.withdrawAmount,
      updatedTransactionData.remarks,
      updatedTransactionData.bankName,
      updatedTransactionData.accountHolderName,
      updatedTransactionData.accountNumber,
      updatedTransactionData.ifscCode,
      updatedTransactionData.upiId,
      updatedTransactionData.upiAppName,
      updatedTransactionData.upiNumber,
      editMessage,
      'Delete',
      'Bank',
      transaction.id,
    ]);
    return true;
  },

  deleteWebsiteTransaction: async (transaction, user) => {
    const pool = await connectToDB();

    const [existingTransaction] = await pool.execute(`SELECT * FROM WebsiteTransaction WHERE WebsiteTransaction_Id = ?`, 
    [transaction.WebsiteTransaction_Id]);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Website Transaction not found with id: ${transaction.id}` };
    }

    const [existingEditRequest] = await pool.execute(
      `SELECT * FROM EditRequest WHERE WebsiteTransaction_Id = ? AND type = 'Delete'`,
      [transaction.WebsiteTransaction_Id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }
       console.log("transaction", transaction);
    const updatedTransactionData = {
      websiteId: transaction.websiteId,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      withdrawAmount: transaction.withdrawAmount,
      depositAmount: transaction.depositAmount,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      websiteName: transaction.websiteName,
      createdAt: transaction.createdAt,
    };

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const name = user[0].firstname;
    const Edit_ID = uuidv4()
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO EditRequest (websiteId, transactionType, requesteduserName, subAdminId, subAdminName, 
        depositAmount, withdrawAmount, remarks, websiteName, message, type, Nametype, WebsiteTransaction_Id, Edit_ID) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await pool.execute(createEditRequestQuery, [
      updatedTransactionData.websiteId,
      updatedTransactionData.transactionType,
      name,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.depositAmount,
      updatedTransactionData.withdrawAmount,
      updatedTransactionData.remarks,
      updatedTransactionData.websiteName,
      editMessage,
      'Delete',
      'Website',
      transaction.WebsiteTransaction_Id,
      Edit_ID
    ]);
    return true;
  },

  deleteTransaction: async (transaction, user) => {
    const pool = await connectToDB();
    const [existingTransaction] = await pool.execute(`SELECT * FROM Transaction WHERE id = ?`, [transaction.id]);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Transaction not found with id: ${transaction.id}` };
    }

    const [existingEditRequest] = await pool.execute(
      `SELECT * FROM EditRequest WHERE transId = ? AND type = 'Delete'`,
      [transaction.id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }
    const updatedTransactionData = {
      bankId: transaction.bankId,
      websiteId: transaction.websiteId,
      transactionID: transaction.transactionID,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      amount: transaction.amount,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      introducerUserName: transaction.introducerUserName,
      userId: transaction.userId,
      userName: transaction.userName,
      paymentMethod: transaction.paymentMethod,
      websiteName: transaction.websiteName,
      bankName: transaction.bankName,
      amount: transaction.amount,
      bonus: transaction.bonus,
      bankCharges: transaction.bankCharges,
      createdAt: transaction.createdAt,
    };

    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });

    const name = user[0].firstname;
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO EditRequest (bankId, websiteId, transactionID, transactionType, amount, paymentMethod, userId, userName,
        requesteduserName, subAdminId, subAdminName, bonus, bankCharges, remarks, bankName, websiteName, message, type, Nametype, transId, introducerUserName) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await pool.execute(createEditRequestQuery, [
      updatedTransactionData.bankId,
      updatedTransactionData.websiteId,
      updatedTransactionData.transactionID,
      updatedTransactionData.transactionType,
      updatedTransactionData.amount,
      updatedTransactionData.paymentMethod,
      updatedTransactionData.userId,
      updatedTransactionData.userName,
      name,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.bonus,
      updatedTransactionData.bankCharges,
      updatedTransactionData.remarks,
      updatedTransactionData.bankName,
      updatedTransactionData.websiteName,
      editMessage,
      'Delete',
      'Transaction',
      transaction.id,
      updatedTransactionData.introducerUserName,
    ]);
    return true;
  },

  deleteIntroducerTransaction: async (transaction, user) => {
    console.log('user', user);
    console.log('transaction', transaction);
    const pool = await connectToDB();
    const [existingTransaction] = await pool.execute(
      `SELECT * FROM IntroducerTransaction WHERE introTransactionId = ?`,
      [transaction.introTransactionId],
    );

    if (!existingTransaction.length) {
      throw { code: 404, message: `Transaction not found with id: ${transaction}` };
    }
    const [existingEditRequest] = await pool.execute(
      `SELECT * FROM IntroducerEditRequest WHERE introTransactionId = ? AND type = 'Delete'`,
      [transaction.introTransactionId],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }
    const IntroEditID = uuidv4();
    const updatedTransactionData = {
      introUserId: transaction.introUserId,
      amount: transaction.amount,
      transactionType: transaction.transactionType,
      remarks: transaction.remarks,
      subAdminId: transaction.subAdminId,
      subAdminName: transaction.subAdminName,
      introducerUserName: transaction.introducerUserName,
      createdAt: transaction.createdAt,
    };
    console.log('updatedTransactionData', updatedTransactionData);
    const name = user[0].firstname;
    const editMessage = `${existingTransaction[0].transactionType} is sent to Super Admin for moving to trash approval`;
    const createEditRequestQuery = `INSERT INTO IntroducerEditRequest (introTransactionId, amount, requesteduserName, transactionType, remarks, subAdminId, subAdminName, 
        introducerUserName, message, type, Nametype, IntroEditID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await pool.execute(createEditRequestQuery, [
      transaction.introTransactionId,
      updatedTransactionData.amount,
      name,
      updatedTransactionData.transactionType,
      updatedTransactionData.remarks,
      updatedTransactionData.subAdminId,
      updatedTransactionData.subAdminName,
      updatedTransactionData.introducerUserName,
      editMessage,
      'Delete',
      'Introducer',
      IntroEditID,
    ]);
    return true;
  },

  // Functions To Delete Bank Detail's

  deleteBank: async (id) => {
    const pool = await connectToDB();
    const [existingTransaction] = await pool.execute(`SELECT * FROM Bank WHERE bank_id = ?`, [id.bank_id]);
    console.log('existingTransaction', existingTransaction);

    if (!existingTransaction.length) {
      throw { code: 404, message: `Bank not found with id: ${id}` };
    }

    const [existingEditRequest] = await pool.execute(
      `SELECT * FROM EditBankRequest WHERE bankTransactionId = ? AND type = 'Delete'`,
      [id.id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }

    const updatedTransactionData = {
      id: id.id,
      accountHolderName: id.accountHolderName,
      bankName: id.bankName,
      accountNumber: id.accountNumber,
      ifscCode: id.ifscCode,
      upiId: id.upiId,
      upiAppName: id.upiAppName,
      upiNumber: id.upiNumber,
    };
    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });
    const editMessage = `${existingTransaction[0].bankName} is sent to Super Admin for deleting approval`;
    const createEditRequestQuery = `INSERT INTO EditBankRequest (bankTransactionId, accountHolderName, bankName, accountNumber, ifscCode, upiId, 
    upiAppName, upiNumber, message, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await pool.execute(createEditRequestQuery, [
      id.bank_id,
      updatedTransactionData.accountHolderName,
      updatedTransactionData.bankName,
      updatedTransactionData.accountNumber,
      updatedTransactionData.ifscCode,
      updatedTransactionData.upiId,
      updatedTransactionData.upiAppName,
      updatedTransactionData.upiNumber,
      editMessage,
      'Delete',
    ]);
    return true;
  },

  deleteWebsite: async (id) => {
    console.log('Transaction found', id);
    const pool = await connectToDB();
    const [existingTransaction] = await pool.execute(`SELECT * FROM Website WHERE website_id = ?`, [id.website_id]);
    console.log('Transaction found', existingTransaction);
    if (!existingTransaction.length) {
      throw { code: 404, message: `Website not found with id: ${id}` };
    }

    const [existingEditRequest] = await pool.execute(
      `SELECT * FROM EditWebsiteRequest WHERE websiteTransactionId = ? AND type = 'Delete'`,
      [id.id],
    );

    if (existingEditRequest.length) {
      throw { code: 409, message: 'Request Already Sent For Approval' };
    }

    const updatedTransactionData = {
      id: id.id,
      websiteName: id.websiteName,
    };
    // Replace undefined values with null in updatedTransactionData
    Object.keys(updatedTransactionData).forEach((key) => {
      if (updatedTransactionData[key] === undefined) {
        updatedTransactionData[key] = null;
      }
    });
    const editMessage = `${existingTransaction[0].websiteName} is sent to Super Admin for deleting approval`;
    const createEditRequestQuery = `INSERT INTO EditWebsiteRequest (websiteTransactionId, websiteName, message, type) 
    VALUES (?, ?, ?, ?)`;

    await pool.execute(createEditRequestQuery, [
      id.website_id,
      updatedTransactionData.websiteName,
      editMessage,
      'Delete',
    ]);
    return true;
  },
};

export default DeleteApiService;

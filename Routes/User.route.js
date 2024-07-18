import { string } from '../constructor/string.js';
import { AuthorizeRole } from '../middleware/auth.js';
import { Authorize } from '../middleware/Authorize.js';
import UserServices, {
  addBankDetails,
  addUpiDetails,
  addWebsiteDetails,
  getSuperAdminUserProfile,
  getUserProfileData,
  updateUserProfile,
  userPasswordResetCode,
} from '../services/User.services.js';
import { validate, validateAddUpiDetails, validateBankDetails, validateUserId, validateWebsiteName } from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

export const UserRoutes = (app) => {
  // DONE
  // API To Add Bank Name
  app.post('/api/user/add-bank-name', validateBankDetails, customErrorHandler, AuthorizeRole([string.user]), addBankDetails);

  // DONE
  // API To Add Website Name
  app.post('/api/user/add-website-name', validateWebsiteName, customErrorHandler, AuthorizeRole([string.user]), addWebsiteDetails);

  // Done
  // API To Add UPI Details
  app.post('/api/user/add-upi-name', validateAddUpiDetails, customErrorHandler, AuthorizeRole([string.user]), addUpiDetails);

  // DONE
  // API To Edit User Profiles
  app.put('/api/user-profile-edit/:userId', validateUserId, customErrorHandler, AuthorizeRole([string.user]), updateUserProfile);

  // DONE
  // API To View User Profiles
  app.get('/api/user-profile-data/:userId', validateUserId, customErrorHandler, AuthorizeRole([string.user]), getUserProfileData);

  // DONE
  app.post('/api/user/reset-password', validate, customErrorHandler, AuthorizeRole([string.user]), userPasswordResetCode);

  // DONE
  app.get('/api/super-admin/user-profile/:page',
    customErrorHandler,
    Authorize([string.superAdmin]),
    getSuperAdminUserProfile,
  );

  // app.post("/api/super-admin/login", async (req, res) => {
  //   try {
  //     const { userName, password, persist } = req.body;

  //     if (!userName) {
  //       throw { code: 400, message: "User Name is required" };
  //     }

  //     if (!password) {
  //       throw { code: 400, message: "Password is required" };
  //     }

  //     connection.connect();

  //     // Assuming you have a table named 'admins' with columns 'id', 'userName', 'password', etc.
  //     const selectQuery = `
  //       SELECT *
  //       FROM admins
  //       WHERE userName = ?`;

  //     const selectValues = [userName];

  //     connection.query(selectQuery, selectValues, async (selectError, selectResults) => {
  //       if (selectError) {
  //         console.error(selectError);
  //         res.status(500).send({ message: "Internal Server Error" });
  //       } else {
  //         const user = selectResults[0];

  //         if (!user) {
  //           throw { code: 404, message: "User not found" };
  //         }

  //         const passwordMatch = await bcrypt.compare(password, user.password);

  //         if (!passwordMatch) {
  //           throw { code: 401, message: "Incorrect password" };
  //         }

  //         const accessToken = await AccountServices.generateAdminAccessToken(userName, password, persist);

  //         if (!accessToken) {
  //           throw { code: 500, message: "Failed to generate access token" };
  //         }

  //         res.status(200).send({
  //           token: accessToken,
  //         });
  //       }
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     res.status(e.code).send({ message: e.message });
  //   } finally {
  //     connection.end();
  //   }
  // });

  // app.post('/api/admin/delete/user/:userName', Authorize(["superAdmin"]), async (req, res) => {
  //   try {
  //     const userName = req.params.userName;
  //     console.log("userName", userName);

  //     connection.connect();

  //     // you have a table named 'transactions' with a column 'userName'
  //     const deleteTransactionsQuery = `
  //       DELETE FROM transactions
  //       WHERE userName = ?`;

  //     const deleteTransactionsValues = [userName];

  //     connection.query(deleteTransactionsQuery, deleteTransactionsValues, async (deleteTransactionsError, deleteTransactionsResults) => {
  //       if (deleteTransactionsError) {
  //         console.error(deleteTransactionsError);
  //         res.status(500).send({ message: "Internal Server Error" });
  //       } else {
  //         // you have a table named 'users' with a column 'userName'
  //         const deleteUserQuery = `
  //           DELETE FROM users
  //           WHERE userName = ?`;

  //         const deleteUserValues = [userName];

  //         connection.query(deleteUserQuery, deleteUserValues, (deleteUserError, deleteUserResults) => {
  //           if (deleteUserError) {
  //             console.error(deleteUserError);
  //             res.status(500).send({ message: "Internal Server Error" });
  //           } else if (deleteUserResults.affectedRows === 0) {
  //             res.status(404).send({ message: 'User not found' });
  //           } else {
  //             res.status(200).send({ message: 'User and associated transactions deleted successfully' });
  //           }
  //         });
  //       }
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     res.status(500).send({ message: 'Internal Server Error' });
  //   } finally {
  //     connection.end();
  //   }
  // });

  // app.post('/api/admin/update/user/name/:userName', Authorize(["superAdmin"]), async (req, res) => {
  //   try {
  //     const userName = req.params.userName;
  //     const newUserName = req.body.newUserName;

  //     connection.connect();

  //     // you have a table named 'users' with columns 'userName'
  //     const updateUserQuery = `
  //       UPDATE users
  //       SET userName = ?
  //       WHERE userName = ?`;

  //     const updateUserValues = [newUserName, userName];

  //     connection.query(updateUserQuery, updateUserValues, async (updateUserError, updateUserResults) => {
  //       if (updateUserError) {
  //         console.error(updateUserError);
  //         res.status(500).send({ message: "Internal Server Error" });
  //       } else if (updateUserResults.affectedRows === 0) {
  //         res.status(404).send({ message: 'User not found' });
  //       } else {
  //         // you have a table named 'transactions' with a column 'userName'
  //         const updateTransactionsQuery = `
  //           UPDATE transactions
  //           SET userName = ?
  //           WHERE userName = ?`;

  //         const updateTransactionsValues = [newUserName, userName];

  //         connection.query(updateTransactionsQuery, updateTransactionsValues, (updateTransactionsError, updateTransactionsResults) => {
  //           if (updateTransactionsError) {
  //             console.error(updateTransactionsError);
  //             res.status(500).send({ message: "Internal Server Error" });
  //           } else {
  //             res.status(200).send({ message: 'User username and associated transactions updated successfully' });
  //           }
  //         });
  //       }
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     res.status(500).send({ message: 'Internal Server Error' });
  //   } finally {
  //     connection.end();
  //   }
  // });
  // };
};

export default UserRoutes;

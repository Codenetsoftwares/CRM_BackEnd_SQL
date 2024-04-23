import { AuthorizeRole } from '../middleware/auth.js';
import { Authorize } from '../middleware/Authorize.js';
import UserServices from '../services/User.services.js';
import { database } from '../services/database.service.js';

export const UserRoutes = (app) => {
  app.post('/api/accounts/user/login', async (req, res) => {
    const pool = await connectToDB();
    try {
      const { userName, password } = req.body;
      if (!userName) {
        throw { code: 400, message: 'User Name is required' };
      }

      if (!password) {
        throw { code: 400, message: 'Password is required' };
      }
      const accessToken = await UserServices.generateAccessToken(userName, password);

      if (!accessToken) {
        throw { code: 500, message: 'Failed to generate access token' };
      }
      const [user] = await pool.execute('SELECT * FROM User WHERE userName = ? LIMIT 1', [userName]);
      if (!user) {
        throw { code: 404, message: 'User not found' };
      }
      if (user && accessToken) {
        res.status(200).send({
          token: accessToken,
        });
      } else {
        // User not found or access token is invalid
        res.status(404).json({ error: 'User not found or access token is invalid' });
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  // API To Add Bank Name

  app.post('/api/user/add-bank-name', AuthorizeRole(['user']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const bankDetailsArray = req.body.bank_details;
      const user = req.user;
      const [existingUserData] = await pool.query('SELECT * FROM User WHERE user_id = ?', [user[0].user_id]);

      let bankDetails = existingUserData[0].Bank_Details || [];

      for (const bankDetail of bankDetailsArray) {
        if (bankDetails.some((existingBankDetail) => existingBankDetail.bank_name === bankDetail.bank_name)) {
          return res
            .status(400)
            .send({ message: `Bank details already exist for account number ${bankDetail.bank_name}` });
        }
        bankDetails.push({
          account_holder_name: bankDetail.account_holder_name,
          bank_name: bankDetail.bank_name,
          ifsc_code: bankDetail.ifsc_code,
          account_number: bankDetail.account_number,
        });
      }

      const [updateResult] = await pool.query('UPDATE User SET Bank_Details = ? WHERE user_id = ?', [
        JSON.stringify(bankDetails),
        user[0].user_id,
      ]);

      if (updateResult.affectedRows === 1) {
        return res.status(201).send({ message: 'User bank details added successfully' });
      } else {
        throw { code: 500, message: 'Failed to add user bank details' };
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // API To Add Website Name

  app.post('/api/user/add-website-name', AuthorizeRole(['user']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const websites = req.body.website_name;
      const user = req.user;

      const [existingUserData] = await pool.query('SELECT * FROM User WHERE user_id = ?', [user[0].user_id]);

      if (existingUserData.length === 0) {
        return res.status(404).send({ message: 'User not found' });
      }

      let websitesArray = existingUserData[0].Websites_Details || [];

      for (const website of websites) {
        if (websitesArray.includes(website)) {
          return res.status(400).send({ message: `Website details already exist for ${website}` });
        }
        websitesArray.push(website);
      }

      const [updateResult] = await pool.query('UPDATE User SET Websites_Details = ? WHERE user_id = ?', [
        JSON.stringify(websitesArray),
        user[0].user_id,
      ]);

      if (updateResult.affectedRows === 1) {
        return res.status(201).send({ message: 'User website details added successfully' });
      } else {
        throw { code: 500, message: 'Failed to add user website details' };
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // API To Add UPI Details

  app.post('/api/user/add-upi-name', AuthorizeRole(['user']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const upiDetailsArray = req.body.upi_details;
      const user = req.user;

      const [existingUserData] = await pool.query('SELECT * FROM User WHERE user_id = ?', [user[0].user_id]);

      let upiDetails = existingUserData[0].Upi_Details || [];

      for (const upiDetail of upiDetailsArray) {
        if (upiDetails.some((existingUpiDetail) => existingUpiDetail.upi_id === upiDetail.upi_id)) {
          return res.status(400).send({ message: `UPI details already exist for UPI ID ${upiDetail.upi_id}` });
        }
        upiDetails.push({
          upi_id: upiDetail.upi_id,
          upi_app: upiDetail.upi_app,
          upi_number: upiDetail.upi_number,
        });
      }

      const [updateResult] = await pool.query('UPDATE User SET Upi_Details = ? WHERE user_id = ?', [
        JSON.stringify(upiDetails),
        user[0].user_id,
      ]);

      if (updateResult.affectedRows === 1) {
        return res.status(201).send({ message: 'User UPI details added successfully' });
      } else {
        throw { code: 500, message: 'Failed to add user UPI details' };
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // API To Edit User Profiles

  app.put('/api/user-profile-edit/:user_id', AuthorizeRole(['user']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const userId = req.params.user_id;
      const [userDetails] = await pool.execute(`SELECT * FROM User WHERE user_id = (?)`, [userId]);
      const updateResult = await UserServices.updateUserProfile(userDetails, req.body);
      console.log(updateResult);
      if (updateResult) {
        res.status(201).send('Profile updated');
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  // API To View User Profiles

  app.get('/api/user-profile-data/:user_id', AuthorizeRole(['user']), async (req, res) => {
    try {
      const pool = await connectToDB();
      const userId = req.params.user_id;
      const [userDetails] = await pool.execute(`SELECT * FROM User WHERE user_id = ?`, [userId]);

      if (!userDetails || userDetails.length === 0) {
        return res.status(404).send({ message: 'User not found' });
      }
      const user = userDetails[0];
      const [userTransactionDetail] = await pool.execute(`SELECT * FROM UserTransactionDetail WHERE userName = ?`, [
        user.userName,
      ]);
      user.UserTransactionDetail = userTransactionDetail;

      res.status(200).send(user);
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal server error' });
    }
  });

  app.post('/api/user/reset-password', AuthorizeRole(['user']), async (req, res) => {
    try {
      const { userName, password } = req.body;
      await UserServices.userPasswordResetCode(userName, password);
      res.status(200).send({ code: 200, message: 'Password reset successful!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/super-admin/user-profile/:page', Authorize(['superAdmin']), async (req, res) => {
    const page = req.params.page;
    const searchQuery = req.query.search;
    const pool = await connectToDB();
    try {
      if (searchQuery) {
        console.log('first');
        const selectQuery = `
          SELECT *
          FROM User
          WHERE userName LIKE ?`;
        const values = [`%${searchQuery}%`];
        const results = await query(selectQuery, values);
        const allIntroDataLength = results.length;
        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ SecondArray: results, pageNumber, allIntroDataLength });
      } else {
        console.log('second');
        const selectAllQuery = `
          SELECT *
          FROM User`;
        const [results] = await pool.execute(selectAllQuery);
        const introData = results;
        const SecondArray = [];
        const Limit = page * 10;

        for (let j = Limit - 10; j < Limit; j++) {
          if (introData[j]) {
            SecondArray.push(introData[j]);
          }
        }
        const allIntroDataLength = introData.length;

        if (SecondArray.length === 0) {
          return res.status(404).json({ message: 'No data found for the selected criteria.' });
        }

        const pageNumber = Math.ceil(allIntroDataLength / 10);
        res.status(200).json({ SecondArray, pageNumber, allIntroDataLength });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });

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
};

export default UserRoutes;

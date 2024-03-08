import { AuthorizeRole } from '../middleware/auth.js';
import { Authorize } from '../middleware/Authorize.js';
import UserServices from '../services/User.services.js';
import mysql from 'mysql2/promise';

var connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Himanshu@10',
  database: 'CRM',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const query = async (sql, params) => {
  try {
    // Filter out undefined parameters and replace them with null
    const filteredParams = params.map((param) => (param !== undefined ? param : null));
    const [rows, fields] = await connection.execute(sql, filteredParams);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

export const UserRoutes = (app) => {
  app.post('/api/accounts/user/login', async (req, res) => {
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
      const [user] = await connection.execute('SELECT * FROM User WHERE userName = ? LIMIT 1', [userName]);
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

  // API To Create User

  app.post('/api/accounts/user/register', async (req, res) => {
    try {
      await UserServices.createUser(req.body);
      res.status(200).send({ code: 200, message: 'User registered successfully!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  // API To Add Bank Name

  app.post('/api/user/add-bank-name', AuthorizeRole(['user']), async (req, res) => {
    try {
      const userData = req.body;
      const user = req.user;
      const [existingData] = await connection.query('SELECT * FROM user_bank_details WHERE account_number = ?', [
        userData.account_number,
      ]);
      if (existingData.length > 0) {
        return res.status(400).send({ message: 'Bank details already exist for this account number' });
      }
      const [result] = await connection.query(
        'INSERT INTO user_bank_details (user_id, account_holder_name, bank_name, ifsc_code, account_number) VALUES (?, ?, ?, ?, ?)',
        [user.id, userData.account_holder_name, userData.bank_name, userData.ifsc_code, userData.account_number],
      );
      if (result.affectedRows === 1) {
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
    try {
      const userData = req.body;
      const user = req.user;
      const [existingData] = await connection.query(
        'SELECT * FROM user_websites_details WHERE user_id = ? AND website_name = ?',
        [user.id, userData.website_name],
      );
      if (existingData.length > 0) {
        return res.status(400).send({ message: 'Website details already exist for this user' });
      }
      const [result] = await connection.query(
        'INSERT INTO user_websites_details (user_id, website_name) VALUES (?, ?)',
        [user.id, userData.website_name],
      );
      if (result.affectedRows === 1) {
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
    try {
      const userData = req.body;
      const user = req.user;
      const [existingData] = await connection.query('SELECT * FROM user_upi_details WHERE user_id = ? AND upi_id = ?', [
        user.id,
        userData.upi_id,
      ]);
      if (existingData.length > 0) {
        return res.status(400).send({ message: 'UPI details already exist for this user' });
      }
      const [result] = await connection.query(
        'INSERT INTO user_upi_details (user_id, upi_id, upi_app, upi_number) VALUES (?, ?, ?, ?)',
        [user.id, userData.upi_id, userData.upi_app, userData.upi_number],
      );
      if (result.affectedRows === 1) {
        return res.status(201).send({ message: 'User UPI details added successfully' });
      } else {
        throw { code: 500, message: 'Failed to add user UPI details' };
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  // API To Edit User Profiles

  app.put('/api/user-profile-edit/:id', AuthorizeRole(['user']), async (req, res) => {
    try {
      const userId = req.params.id;
      const userDetails = await query(`SELECT * FROM User WHERE id = (?)`, [userId]);
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

  app.get('/api/user-profile-data/:id', AuthorizeRole(['user']), async (req, res) => {
    try {
      const userId = req.params.id;
      const userDetails = await query(`SELECT * FROM User WHERE id = (?)`, [userId]);
      if (!userDetails) {
        return res.status(404).send({ message: 'User not found' });
      }
      res.status(200).send(userDetails);
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: 'Internal server error' });
    }
  });

  app.post('/api/user/reset-password', AuthorizeRole(['user']), async (req, res) => {
    try {
      const { userName, oldPassword, password } = req.body;
      await UserServices.userPasswordResetCode(userName, oldPassword, password);
      res.status(200).send({ code: 200, message: 'Password reset successful!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/super-admin/user-profile/:page', Authorize(['superAdmin']), async (req, res) => {
    const page = req.params.page;
    const searchQuery = req.query.search;
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
        const results = await query(selectAllQuery);
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

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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

const AccountServices = {
  createAdmin: async (data) => {
    try {
      if (!data.firstname || !data.lastname || !data.userName || !data.password || !data.roles) {
        throw { code: 400, message: 'Invalid data provided' };
      }

      // Check if the username already exists in any of the relevant tables
      const existingAdmin = await query('SELECT * FROM Admin WHERE userName = ?', [data.userName]);
      const existingUser = await query('SELECT * FROM User WHERE userName = ?', [data.userName]);
      const existingIntroducerUser = await query('SELECT * FROM IntroducerUser WHERE userName = ?', [data.userName]);

      if (existingAdmin.length > 0 || existingUser.length > 0 || existingIntroducerUser.length > 0) {
        throw { code: 409, message: `Admin already exists with user name: ${data.userName}` };
      }

      // Generate salt and hash the password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(data.password, passwordSalt);
      const admin_id = uuidv4();

      // Convert roles data into an array if it's not already an array
      const rolesArray = Array.isArray(data.roles) ? data.roles : [data.roles];

      // Prepare roles data as an array of objects
      // const rolesObjects = rolesArray.map(role => ({ name: role }));

      // Insert new admin into the Admin table
      const result = await query(
        'INSERT INTO Admin (firstname, lastname, userName, password, roles, admin_id) VALUES (?, ?, ?, ?, ?, ?)',
        [data.firstname, data.lastname, data.userName, encryptedPassword, JSON.stringify(rolesArray), admin_id],
      );

      if (result.affectedRows === 1) {
        return { code: 201, message: 'Admin created successfully' };
      } else {
        throw { code: 500, message: 'Failed to create new admin' };
      }
    } catch (err) {
      console.error(err);
      throw { code: err.code || 500, message: err.message || 'Internal Server Error' };
    }
  },

  generateAdminAccessToken: async (userName, password, persist) => {
    if (!userName) {
      throw { code: 400, message: 'Invalid value for: User Name' };
    }
    if (!password) {
      throw { code: 400, message: 'Invalid value for: password' };
    }

    try {
      const rows = await query('SELECT * FROM Admin WHERE userName = ?', [userName]);
      const existingUser = rows[0];

      if (!existingUser) {
        throw { code: 401, message: 'Invalid User Name or password' };
      }

      const passwordValid = await bcrypt.compare(password, existingUser.password);
      if (!passwordValid) {
        throw { code: 401, message: 'Invalid User Name or password' };
      }

      const accessTokenResponse = {
        id: existingUser.admin_id,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        userName: existingUser.userName,
        role: existingUser.role,
      };

      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
        expiresIn: persist ? '1y' : '8h',
      });

      return {
        userName: existingUser.userName,
        accessToken: accessToken,
        role: existingUser.role,
      };
    } catch (err) {
      console.error(err);
      throw { code: err.code || 500, message: err.message || 'Internal Server Error' };
    }
  },

  IntroducerBalance: async (introUserId) => {
    try {
      // connection.connect();
      // Fetch Introducer Transactions
      const selectIntroTransactionsQuery = `SELECT * FROM IntroducerTransactions WHERE introUser_id = ?`;
      const selectIntroTransactionsValues = [introUserId];
      const introTransactions = await new Promise((resolve, reject) => {
        connection.query(selectIntroTransactionsQuery, selectIntroTransactionsValues, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
      // Calculate Balance
      let balance = 0;
      introTransactions.forEach((transaction) => {
        if (transaction.transactionType === 'Deposit') {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      });
      return balance;
    } catch (e) {
      console.error(e);
      throw { code: 500, message: 'Internal Server Error' };
    } finally {
      // connection.end();
    }
  },

  updateUserProfile: async (id, data) => {
    try {
      // Fetch existing user data from the database
      const [existingUser] = await query(`SELECT * FROM User WHERE id = ?`, [id[0].id]);
      console.log('existingUser', existingUser.id);

      // Check if the user exists
      if (!existingUser) {
        throw { code: 404, message: `Existing User not found with id: ${id}` };
      }

      // Validate introducerPercentage, introducerPercentage1, and introducerPercentage2
      const introducerPercentage =
        data.introducerPercentage !== undefined
          ? parseFloat(data.introducerPercentage)
          : existingUser.introducerPercentage;
      const introducerPercentage1 =
        data.introducerPercentage1 !== undefined
          ? parseFloat(data.introducerPercentage1)
          : existingUser.introducerPercentage1;
      const introducerPercentage2 =
        data.introducerPercentage2 !== undefined
          ? parseFloat(data.introducerPercentage2)
          : existingUser.introducerPercentage2;

      if (isNaN(introducerPercentage) || isNaN(introducerPercentage1) || isNaN(introducerPercentage2)) {
        throw { code: 400, message: 'Introducer percentages must be valid numbers.' };
      }

      const totalIntroducerPercentage = introducerPercentage + introducerPercentage1 + introducerPercentage2;

      if (totalIntroducerPercentage < 0 || totalIntroducerPercentage > 100) {
        throw { code: 400, message: 'The sum of introducer percentages must be between 0 and 100.' };
      }

      // Construct the SQL update query
      const updateUserQuery = `UPDATE User SET firstname = ?, lastname = ?, introducersUserName = ?,
        introducerPercentage = ?, introducersUserName1 = ?,
        introducerPercentage1 = ?, introducersUserName2 = ?, introducerPercentage2 = ? WHERE id = ?`;

      // Execute the update query with the provided data
      await query(updateUserQuery, [
        data.firstname || existingUser.firstname,
        data.lastname || existingUser.lastname,
        data.introducersUserName || existingUser.introducersUserName,
        introducerPercentage,
        data.introducersUserName1 || existingUser.introducersUserName1,
        introducerPercentage1,
        data.introducersUserName2 || existingUser.introducersUserName2,
        introducerPercentage2,
        id[0].id,
      ]);

      return true;
    } catch (e) {
      console.error(e);
      throw { code: e.code || 500, message: e.message || 'Internal server error' };
    }
  },

  SubAdminPasswordResetCode: async (userName, password) => {
    try {
      // Check if the user exists
      const existingUser = await query(`SELECT * FROM Admin WHERE userName = '${userName}';`);
      if (existingUser.length === 0) {
        throw {
          code: 404,
          message: 'User not found',
        };
      }
      // Compare new password with the existing password
      const passwordIsDuplicate = await bcrypt.compare(password, existingUser[0].password);
      if (passwordIsDuplicate) {
        throw {
          code: 409,
          message: 'New Password cannot be the same as existing password',
        };
      }
      // Hash the new password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(password, passwordSalt);
      // Update the password in the database
      const updateQuery = await query(
        `UPDATE Admin SET password = '${encryptedPassword}' WHERE userName = '${userName}';`,
      );
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  SuperAdminPasswordResetCode: async (userName, oldPassword, password) => {
    try {
      // Check if the user exists
      const existingUser = await query(`SELECT * FROM Admin WHERE userName = '${userName}';`);
      if (existingUser.length === 0) {
        throw {
          code: 404,
          message: 'User not found',
        };
      }
      // Compare new password with the existing password
      const passwordIsDuplicate = await bcrypt.compare(password, existingUser[0].password);
      if (passwordIsDuplicate) {
        throw {
          code: 409,
          message: 'New Password cannot be the same as existing password',
        };
      }
      // Hash the new password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(password, passwordSalt);
      // Update the password in the database
      const updateQuery = await query(
        `UPDATE Admin SET password = '${encryptedPassword}' WHERE userName = '${userName}';`,
      );
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  updateSubAdminProfile: async (id, data) => {
    try {
      const userId = id[0].id;
      const existingUser = await query(`SELECT * FROM Admin WHERE id = ?`, [userId]);
      // Check if the user exists
      if (!existingUser || existingUser.length === 0) {
        throw {
          code: 404,
          message: `Existing User not found with id: ${userId}`,
        };
      }
      const user = existingUser[0];
      // Update fields if provided in data
      user.firstname = data.firstname || user.firstname;
      user.lastname = data.lastname || user.lastname;
      // Update user data in the database
      await query(`UPDATE Admin SET firstname = ?, lastname = ? WHERE id = ?`, [user.firstname, user.lastname, userId]);

      return true; // Return true on successful update
    } catch (err) {
      console.error(err);
      throw {
        code: err.code || 500,
        message: err.message || `Failed to update User Profile with id: ${userDetails}`,
      };
    }
  },
};

export default AccountServices;

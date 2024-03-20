import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import connectToDB from '../db/db.js';

const AccountServices = {
  createAdmin: async (data) => {
    const pool = await connectToDB();
    try {
      // Check if required data is provided
      if (!data.firstname || !data.lastname || !data.userName || !data.password || !data.roles) {
        throw { code: 400, message: 'Invalid data provided' };
      }

      // Check if the username already exists in any of the relevant tables
      const existingAdmin = await pool.execute('SELECT * FROM Admin WHERE userName = ?', [data.userName]);
      const existingUser = await pool.execute('SELECT * FROM User WHERE userName = ?', [data.userName]);
      const existingIntroducerUser = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [
        data.userName,
      ]);

      if (existingAdmin[0].length > 0 || existingUser[0].length > 0 || existingIntroducerUser[0].length > 0) {
        throw { code: 409, message: `Admin already exists with user name: ${data.userName}` };
      }

      // Generate salt and hash the password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(data.password, passwordSalt);
      const admin_id = uuidv4();

      // Convert roles data into an array if it's not already an array
      const rolesArray = Array.isArray(data.roles) ? data.roles : [data.roles];

      // Insert new admin into the Admin table
      const result = await pool.execute(
        'INSERT INTO Admin (admin_id, firstname, lastname, userName, password, roles) VALUES (?, ?, ?, ?, ?, ?)',
        [admin_id, data.firstname, data.lastname, data.userName, encryptedPassword, JSON.stringify(rolesArray)],
      );

      if (result[0].affectedRows === 1) {
        // Admin creation successful, return success status
        return { code: 201, message: 'Admin created successfully' };
      } else {
        // Admin creation failed, throw error
        throw { code: 500, message: 'Failed to create new admin' };
      }
    } catch (err) {
      console.error(err);
      throw { code: err.code || 500, message: err.message || 'Internal Server Error' };
    }
  },

  generateAdminAccessToken: async (userName, password, persist) => {
    const pool = await connectToDB();
    if (!userName) {
      throw { code: 400, message: 'Invalid value for: User Name' };
    }
    if (!password) {
      throw { code: 400, message: 'Invalid value for: password' };
    }

    try {
      const rows = await pool.execute('SELECT * FROM Admin WHERE userName = ?', [userName]);
      const existingUser = rows[0];
      console.log('user', existingUser);
      if (!existingUser) {
        throw { code: 401, message: 'Invalid User Name or password' };
      }

      const passwordValid = await bcrypt.compare(String(password), String(existingUser[0].password));
      console.log('passwordValid', passwordValid);
      if (!passwordValid) {
        throw { code: 401, message: 'Invalid User Name or password' };
      }

      const accessTokenResponse = {
        admin_id: existingUser[0].admin_id,
        userName: existingUser[0].userName,
        roles: existingUser[0].roles,
      };

      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
        expiresIn: persist ? '1y' : '8h',
      });

      return {
        accessToken: accessToken,
        admin_id: existingUser[0].admin_id,
        userName: existingUser[0].userName,
        roles: existingUser[0].roles,
      };
    } catch (err) {
      console.error(err);
      throw { code: err.code || 500, message: err.message || 'Internal Server Error' };
    }
  },

  IntroducerBalance: async (introUserId) => {
    const pool = await connectToDB();
    try {
      console.log('introUserId', introUserId);
      const [intorTranasction] = await pool.execute('SELECT * FROM IntroducerTransaction WHERE introUserId = ?', [
        introUserId,
      ]);
      console.log('intorTranasction', intorTranasction);
      let balance = 0;
      intorTranasction.forEach((transaction) => {
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
    }
  },

  updateUserProfile: async (id, data) => {
    const pool = await connectToDB();
    try {
      // Fetch existing user data from the database
      const [existingUser] = await pool.execute(`SELECT * FROM User WHERE user_id = ?`, [id[0].user_id]);
      console.log('existingUser', existingUser[0].user_id);

      // Check if the user exists
      if (!existingUser) {
        throw { code: 404, message: `Existing User not found with id: ${id}` };
      }

      // Validate introducerPercentage, introducerPercentage1, and introducerPercentage2
      const introducerPercentage =
        data.introducerPercentage !== undefined
          ? parseFloat(data.introducerPercentage)
          : existingUser[0].introducerPercentage;
      const introducerPercentage1 =
        data.introducerPercentage1 !== undefined
          ? parseFloat(data.introducerPercentage1)
          : existingUser[0].introducerPercentage1;
      const introducerPercentage2 =
        data.introducerPercentage2 !== undefined
          ? parseFloat(data.introducerPercentage2)
          : existingUser[0].introducerPercentage2;

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
        introducerPercentage1 = ?, introducersUserName2 = ?, introducerPercentage2 = ? WHERE user_id = ?`;

      // Execute the update query with the provided data
      await pool.execute(updateUserQuery, [
        data.firstname || existingUser[0].firstname,
        data.lastname || existingUser[0].lastname,
        data.introducersUserName || existingUser[0].introducersUserName,
        introducerPercentage,
        data.introducersUserName1 || existingUser[0].introducersUserName1,
        introducerPercentage1,
        data.introducersUserName2 || existingUser[0].introducersUserName2,
        introducerPercentage2,
        id[0].user_id,
      ]);

      return true;
    } catch (e) {
      console.error(e);
      throw { code: e.code || 500, message: e.message || 'Internal server error' };
    }
  },

  SubAdminPasswordResetCode: async (userName, password) => {
    const pool = await connectToDB();
    try {
      // Check if the user exists
      const existingUser = await pool.execute(`SELECT * FROM Admin WHERE userName = '${userName}';`);
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
    const pool = await connectToDB();
    try {
      // Check if the user exists
      const [existingUser] = await pool.execute(`SELECT * FROM Admin WHERE userName = '${userName}';`);
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
      const updateQuery = await pool.execute(
        `UPDATE Admin SET password = '${encryptedPassword}' WHERE userName = '${userName}';`,
      );
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  updateSubAdminProfile: async (id, data) => {
    const pool = await connectToDB();
    try {
      const userId = id[0].admin_id;
      const [existingUser] = await pool.execute(`SELECT * FROM Admin WHERE admin_id = ?`, [userId]);
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
      await pool.execute(`UPDATE Admin SET firstname = ?, lastname = ? WHERE admin_id = ?`, [
        user.firstname,
        user.lastname,
        userId,
      ]);

      return true; // Return true on successful update
    } catch (err) {
      console.error(err);
      throw {
        code: err.code || 500,
        message: err.message || `Failed to update User Profile with id: ${userDetails}`,
      };
    }
  },

  getIntroBalance: async (introUserId) => {
    console.log('introUserId', introUserId);
    const pool = await connectToDB();
    try {
      const [intorTranasction] = await pool.execute('SELECT * FROM IntroducerTransaction WHERE introUserId = ?', [
        introUserId,
      ]);
      let balance = 0;
      intorTranasction.forEach((transaction) => {
        if (transaction.transactionType === 'Deposit') {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      });
      const liveBalance = await AccountServices.introducerLiveBalance(introUserId);
      const currentDue = liveBalance - balance;
      // console.log("currentDue", currentDue)
      return {
        balance: balance,
        currentDue: currentDue,
      };
    } catch (err) {
      console.error(err);
      throw {
        code: err.code || 500,
        message: err.message || `Failed to update User Profile with id: ${userDetails}`,
      };
    }
  },

  introducerLiveBalance: async (id) => {
    const pool = await connectToDB();
    try {
      const [introId] = await pool.execute('SELECT * FROM IntroducerUser WHERE intro_id = ?', [id]);

      if (!introId.length) {
        throw {
          code: 404,
          message: `Introducer with ID ${id} not found`,
        };
      }

      const IntroducerId = introId[0].userName;

      // Check if IntroducerId exists in any of the introducer user names
      const [userIntroId] = await pool.execute(
        `SELECT *
            FROM User
            WHERE introducersUserName = ?
            OR introducersUserName1 = ?
            OR introducersUserName2 = ?`,
        [IntroducerId, IntroducerId, IntroducerId],
      );

      if (!userIntroId.length) {
        return 0;
      }

      let liveBalance = 0;
      for (const user of userIntroId) {
        let matchedIntroducersUserName, matchedIntroducerPercentage;

        if (user.introducersUserName === IntroducerId) {
          matchedIntroducersUserName = user.introducersUserName;
          matchedIntroducerPercentage = user.introducerPercentage;
        } else if (user.introducersUserName1 === IntroducerId) {
          matchedIntroducersUserName = user.introducersUserName1;
          matchedIntroducerPercentage = user.introducerPercentage1;
        } else if (user.introducersUserName2 === IntroducerId) {
          matchedIntroducersUserName = user.introducersUserName2;
          matchedIntroducerPercentage = user.introducerPercentage2;
        }

        const [transDetails] = await pool.execute(`SELECT * FROM UserTransactionDetail WHERE userName = ?`, [
          user.userName,
        ]);

        if (!transDetails.length) {
          continue;
        }

        let totalDep = 0;
        let totalWith = 0;

        transDetails.forEach((res) => {
          if (res.transactionType === 'Deposit') {
            totalDep += Number(res.amount);
          }
          if (res.transactionType === 'Withdraw') {
            totalWith += Number(res.amount);
          }
        });

        let diff = totalDep - totalWith;
        let amount = (matchedIntroducerPercentage / 100) * diff;
        liveBalance += amount;
      }

      return Math.round(liveBalance);
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

export default AccountServices;

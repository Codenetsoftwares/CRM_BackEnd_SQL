import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';

export const UserServices = {
  createUser: async (data) => {
    try {
      if (!data.firstname || !data.lastname || !data.userName || !data.password) {
        throw { code: 400, message: 'Invalid data provided' };
      }
      const [existingUsers] = await pool.execute('SELECT * FROM User WHERE userName = ?', [data.userName]);
      const [existingAdmin] = await pool.execute('SELECT * FROM Admin WHERE userName = ?', [data.userName]);
      const [existingIntroducerUser] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [
        data.userName,
      ]);

      if (
        (existingAdmin && existingAdmin[0] && existingAdmin[0].length > 0) ||
        (existingUsers && existingUsers[0] && existingUsers[0].length > 0) ||
        (existingIntroducerUser && existingIntroducerUser[0] && existingIntroducerUser[0].length > 0)
      ) {
        throw { code: 409, message: `User already exists with user name: ${data.userName}` };
      }

      // Generate salt and hash the password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(data.password, passwordSalt);
      const user_id = uuidv4();
      // Insert new admin into the Admin table
      const [result] = await pool.execute(
        `INSERT INTO User (user_id, firstname, lastname, contactNumber, userName, password, introducersUserName, introducerPercentage,
        introducersUserName1, introducerPercentage1, introducersUserName2, introducerPercentage2, wallet) VALUES (?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          data.firstname,
          data.lastname,
          data.contactNumber,
          data.userName,
          encryptedPassword,
          data.introducersUserName || null,
          data.introducerPercentage || null,
          data.introducersUserName1 || null,
          data.introducerPercentage1 || null,
          data.introducersUserName2 || null,
          data.introducerPercentage2 || null,
          0,
        ],
      );
      if (result.affectedRows === 1) {
        return { code: 201, message: 'User created successfully' };
      } else {
        throw { code: 500, message: 'Failed to create new admin' };
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  generateAccessToken: async (userName, password, persist) => {
    try {
      if (!userName) {
        throw { code: 400, message: 'Invalid value for: User Name' };
      }
      if (!password) {
        throw { code: 400, message: 'Invalid value for: Password' };
      }

      const [rows] = await pool.execute('SELECT * FROM User WHERE userName = ?', [userName]);
      const existingUser = rows[0];
      console.log('deee', existingUser);
      if (!existingUser) {
        throw { code: 401, message: 'Invalid User Name or Password' };
      }

      const passwordValid = await bcrypt.compare(password, existingUser.password);
      if (!passwordValid) {
        throw { code: 401, message: 'Invalid User Name or Password' };
      }

      const accessTokenResponse = {
        user_id: existingUser.user_id,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        userName: existingUser.userName,
        role: existingUser.role,
      };

      const expiresIn = persist ? '1y' : '8h';
      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, { expiresIn });

      return {
        userName: existingUser.userName,
        accessToken: accessToken,
        role: existingUser.role,
        user_id: existingUser.user_id,
      };
    } catch (err) {
      console.error(err);
      if (err.code) {
        throw err; // Re-throw the specific error with code and message
      } else {
        throw { code: 500, message: 'Internal Server Error' }; // Generic error for unhandled cases
      }
    }
  },

  updateUserProfile: async (userDetails, data) => {
    try {
      const userId = userDetails[0].user_id;
      const [existingUser] = await pool.execute(`SELECT * FROM User WHERE user_id = ?`, [userId]);
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
      await pool.execute(`UPDATE User SET firstname = ?, lastname = ? WHERE user_id = ?`, [
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

  userPasswordResetCode: async (userName, password) => {
    try {
      // Check if the user exists
      const [existingUser] = await pool.execute(`SELECT * FROM User WHERE userName = '${userName}';`);
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
        `UPDATE User SET password = '${encryptedPassword}' WHERE userName = '${userName}';`,
      );
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },
};

export default UserServices;

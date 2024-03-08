import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

export const UserServices = {
  createUser: async (data) => {
    try {
      const connection = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Himanshu@10',
        database: 'CRM',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      if (!data.firstname || !data.lastname || !data.userName || !data.password) {
        throw { code: 400, message: 'Invalid data provided' };
      }
      const [existingUsers] = await connection.execute('SELECT * FROM User WHERE userName = ?', [data.userName]);

      if (existingUsers.length > 0) {
        throw { code: 409, message: `User already exists: ${data.userName}` };
      }
      // Generate salt and hash the password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(data.password, passwordSalt);
      console.log('data', data.firstname, data.lastname, data.userName, encryptedPassword, data.roles);
      // Insert new admin into the Admin table
      const [result] = await connection.execute(
        'INSERT INTO User (firstname, lastname, userName, password) VALUES (?, ?, ?, ?)',
        [data.firstname, data.lastname, data.userName, encryptedPassword],
      );
      if (result.affectedRows === 1) {
        return { code: 201, message: 'User created successfully' };
      } else {
        throw { code: 500, message: 'Failed to create new admin' };
      }
    } catch (err) {
      console.error(err);
      throw { code: 500, message: 'Internal Server Error' };
    }
  },

  generateAccessToken: async (userName, password, persist) => {
    if (!userName) {
      throw { code: 400, message: 'Invalid value for: User Name' };
    }
    if (!password) {
      throw { code: 400, message: 'Invalid value for: password' };
    }

    try {
      const [rows] = await connection.execute('SELECT * FROM User WHERE userName = ?', [userName]);
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
      throw { code: 500, message: 'Internal Server Error' };
    }
  },

  updateUserProfile: async (userDetails, data) => {
    try {
      const userId = userDetails[0].id;
      const existingUser = await query(`SELECT * FROM User WHERE id = ?`, [userId]);
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
      await query(`UPDATE User SET firstname = ?, lastname = ? WHERE id = ?`, [user.firstname, user.lastname, userId]);

      return true; // Return true on successful update
    } catch (err) {
      console.error(err);
      throw {
        code: err.code || 500,
        message: err.message || `Failed to update User Profile with id: ${userDetails}`,
      };
    }
  },

  userPasswordResetCode: async (userName, oldPassword, newPassword) => {
    try {
      const [existingUser] = await connection.query('SELECT * FROM User WHERE userName = ?', [userName]);
      if (!existingUser) {
        throw {
          code: 404,
          message: 'User not found',
        };
      }
      // Compare old password hashes
      const oldPasswordIsCorrect = await bcrypt.compare(oldPassword, existingUser[0].password);
      if (!oldPasswordIsCorrect) {
        throw {
          code: 401,
          message: 'Invalid old password',
        };
      }
      // Compare new password with old password
      const newPasswordIsDuplicate = await bcrypt.compare(newPassword, existingUser[0].password);
      if (newPasswordIsDuplicate) {
        throw {
          code: 409,
          message: 'New Password cannot be the same as existing password',
        };
      }
      // Hash the new password
      const passwordSalt = existingUser[0].password.substring(0, 29); // Extract salt from existing hashed password
      const encryptedNewPassword = await bcrypt.hash(newPassword, passwordSalt);
      // Update user's password in the database
      await connection.query('UPDATE User SET password = ? WHERE userName = ?', [encryptedNewPassword, userName]);
      return true;
    } catch (error) {
      console.error(error);
      throw {
        code: error.code || 500,
        message: error.message || 'Failed to reset password',
      };
    }
  },
};

export default UserServices;

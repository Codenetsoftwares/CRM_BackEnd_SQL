import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
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
    const [rows, fields] = await pool.execute(sql, filteredParams);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

export const introducerUser = {
  generateIntroducerAccessToken: async (userName, password, persist) => {
    if (!userName) {
      throw { code: 400, message: 'Invalid value for: User Name' };
    }
    if (!password) {
      throw { code: 400, message: 'Invalid value for: password' };
    }
    try {
      const [rows] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [userName]);
      const existingUser = rows[0];
      if (!existingUser) {
        throw { code: 401, message: 'Invalid User Name or password' };
      }

      const passwordValid = await bcrypt.compare(password, existingUser.password);
      if (!passwordValid) {
        throw { code: 401, message: 'Invalid User Name or password' };
      }

      const accessTokenResponse = {
        id: existingUser._id,
        name: existingUser.firstname,
        userName: existingUser.userName,
        role: existingUser.role,
      };
      console.log(accessTokenResponse);
      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
        expiresIn: persist ? '1y' : '8h',
      });

      return {
        userName: existingUser.userName,
        accessToken: accessToken,
      };
    } catch (err) {
      console.error(err);
      if (err.code) {
        // If the error object has a 'code' property, it means it's a custom error with specific status code and message
        return { code: err.code, message: err.message };
      } else {
        // If it's not a custom error, return a generic internal server error
        return { code: 500, message: 'Internal Server Error' };
      }
    }
  },

  createintroducerUser: async (data, user) => {
    if (!data.firstname) {
      throw { code: 400, message: 'Firstname is required' };
    }
    if (!data.lastname) {
      throw { code: 400, message: 'Lastname is required' };
    }
    if (!data.userName) {
      throw { code: 400, message: 'Username is required' };
    }
    if (!data.password) {
      throw { code: 400, message: 'Password is required' };
    }

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
      const [existingUsers] = await connection.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [
        data.userName,
      ]);

      if (existingUsers.length > 0) {
        throw { code: 409, message: `User already exists: ${data.userName}` };
      }

      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(data.password, passwordSalt);

      const [result] = await connection.execute(
        'INSERT INTO IntroducerUser (firstname, lastname, password, introducerId, userName) VALUES (?, ?, ?, ?, ?)',
        [data.firstname, data.lastname, encryptedPassword, user.userName, data.userName],
      );
      if (result.affectedRows === 1) {
        return { code: 201, message: 'Introducer User created successfully' };
      } else {
        throw { code: 500, message: 'Failed to create new Introducer User' };
      }
    } catch (err) {
      console.error(err);
      throw { code: 500, message: 'Internal Server Error' };
    }
  },

  introducerLiveBalance: async (id) => {
    try {
      const introUser = await query(`SELECT * FROM IntroducerUser WHERE id = ?`, [id]);
      if (introUser.length === 0) {
        throw {
          code: 404,
          message: `Introducer with ID ${id} not found`,
        };
      }

      const introducerUserName = introUser[0].userName;
      const userIntroId = await query(`SELECT * FROM IntroducedUsers WHERE introducerUserName = ?`, [
        introducerUserName,
      ]);

      if (userIntroId.length === 0) {
        return 0;
      }

      let liveBalance = 0;
      for (const user of userIntroId) {
        const introducerPercent = user.introducerPercentage;
        const transDetails = user.transactionDetail;

        let totalDep = 0;
        let totalWith = 0;

        transDetails?.forEach((res) => {
          if (res.transactionType === 'Deposit') {
            totalDep += Number(res.amount);
          }
          if (res.transactionType === 'Withdraw') {
            totalWith += Number(res.amount);
          }
        });

        let diff = Math.abs(totalDep - totalWith);
        let amount = (introducerPercent / 100) * diff;

        liveBalance += amount;
      }

      return liveBalance;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  updateIntroducerProfile: async (introUserId, data) => {
    try {
      console.log('idqqqqqq', introUserId);
      // Ensure introUserId is of the correct type
      const userId = introUserId[0].id;
      console.log('iddddd', userId);
      // Query the existing user
      const existingUser = await query(`SELECT * FROM IntroducerUser WHERE id = ?`, [userId]);
      console.log('existingUser', existingUser);

      // Check if the user exists
      if (!existingUser || existingUser.length === 0) {
        throw {
          code: 404,
          message: `Existing Introducer User not found with id: ${userId}`,
        };
      }

      // Extracting existing user data
      const user = existingUser[0];

      // Update fields if provided in data
      user.firstname = data.firstname || user.firstname;
      user.lastname = data.lastname || user.lastname;

      // Update user data in the database
      await query(`UPDATE IntroducerUser SET firstname = ?, lastname = ? WHERE id = ?`, [
        user.firstname,
        user.lastname,
        userId,
      ]);

      return true; // Return true on successful update
    } catch (err) {
      console.error(err);
      throw {
        code: err.code || 500,
        message: err.message || `Failed to update Introducer User Profile with id: ${introUserId}`,
      };
    }
  },

  introducerPasswordResetCode: async (userName, oldPassword, newPassword) => {
    try {
      // Fetch user from the database
      const [existingUser] = await pool.query('SELECT * FROM IntroducerUser WHERE userName = ?', [userName]);

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
      await pool.query('UPDATE IntroducerUser SET password = ? WHERE userName = ?', [encryptedNewPassword, userName]);

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

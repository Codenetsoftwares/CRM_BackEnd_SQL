import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import IntroducerUser from '../models/introducerUser.model.js';
import sequelize from '../db.js';
import CustomError from '../utils/extendError.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';

export const createUser = async (req, res) => {
  const {
    firstName,
    lastName,
    contactNumber,
    userName,
    password,
    introducersUserName,
    introducerPercentage,
    introducersUserName1,
    introducerPercentage1,
    introducersUserName2,
    introducerPercentage2,
  } = req.body;

  let transaction;

  try {
    const existingUser = await User.findOne({ where: { userName } });
    const existingAdmin = await Admin.findOne({ where: { userName } });
    const existingIntroducerUser = await IntroducerUser.findOne({ where: { userName } });

    if (existingUser || existingAdmin || existingIntroducerUser) {
      throw new CustomError(`User already exists with username: ${userName}`, null, 409);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    transaction = await sequelize.transaction();

    const userId = uuidv4();
    const newUser = await User.create({
      userId,
      firstName,
      lastName,
      contactNumber,
      userName,
      password: hashedPassword,
      introducersUserName,
      introducerPercentage,
      introducersUserName1,
      introducerPercentage1,
      introducersUserName2,
      introducerPercentage2,
    }, { transaction });

    await transaction.commit();
    return apiResponseSuccess(newUser, true, statusCode.create, 'User created successfully', res);

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error(error);
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res
    );
  }
};


export const userPasswordResetCode = async (req, res) => {
  const { userName, password } = req.body;

  try {
    // Check if the user exists
    const existingUser = await User.findOne({ where: { userName } });
    if (!existingUser) {
      throw new CustomError('User not found', 404);
    }

    // Compare new password with the existing password
    const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
    if (passwordIsDuplicate) {
      throw new CustomError('New Password cannot be the same as existing password', 409);
    }

    // Hash the new password
    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);

    // Update the password in the database
    const resetUser = await User.update({ password: encryptedPassword }, { where: { userName } });

    return apiResponseSuccess(resetUser, true, statusCode.success, 'Password reset successful!', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res
    );
  }
};

export const UserServices = {
  generateAccessToken: async (userName, password, persist) => {
    try {
      if (!userName) {
        throw { code: 400, message: 'Invalid value for: User Name' };
      }
      if (!password) {
        throw { code: 400, message: 'Invalid value for: Password' };
      }

      const [rows] = await database.execute('SELECT * FROM User WHERE userName = ?', [userName]);
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
        userId: existingUser.userId,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        userName: existingUser.userName,
        role: existingUser.role,
      };

      const expiresIn = persist ? '1y' : '8h';
      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, { expiresIn });

      return {
        userName: existingUser.userName,
        accessToken: accessToken,
        role: existingUser.role,
        userId: existingUser.userId,
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
      const userId = userDetails[0].userId;
      const [existingUser] = await database.execute(`SELECT * FROM User WHERE userId = ?`, [userId]);
      // Check if the user exists
      if (!existingUser || existingUser.length === 0) {
        throw {
          code: 404,
          message: `Existing User not found with id: ${userId}`,
        };
      }
      const user = existingUser[0];
      // Update fields if provided in data
      user.firstName = data.firstName || user.firstName;
      user.lastName = data.lastName || user.lastName;
      // Update user data in the database
      await database.execute(`UPDATE User SET firstName = ?, lastName = ? WHERE userId = ?`, [
        user.firstName,
        user.lastName,
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

};

export default UserServices;

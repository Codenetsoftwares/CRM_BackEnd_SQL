import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import IntroducerUser from '../models/introducerUser.model.js';
import sequelize from '../db.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';
import { string } from '../constructor/string.js';
import CustomError from '../utils/extendError.js';
import { Op } from 'sequelize';

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
    const newUser = await User.create(
      {
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
      },
      { transaction },
    );

    await transaction.commit();
    return apiResponseSuccess(newUser, true, statusCode.create, 'User created successfully', res);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error(error);
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const userPasswordResetCode = async (req, res) => {
  const { userName, password } = req.body;

  try {
    // Check if the user exists
    const existingUser = await User.findOne({ where: { userName } });
    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
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
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};


export const addBankDetails = async (req, res) => {
  try {
    console.log('user');
    const bankDetailsArray = req.body.bank_details;
    const user = req.user;

    if (!user || !user.userId) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not authenticated', res);
    }

    const existingUser = await User.findOne({ where: { userId: user.userId } });

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    let bankDetails = existingUser.Bank_Details ? JSON.parse(existingUser.Bank_Details) : [];

    for (const bankDetail of bankDetailsArray) {
      if (bankDetails.some((existingBankDetail) => existingBankDetail.bank_name === bankDetail.bank_name)) {
        return apiResponseErr(
          null,
          false,
          statusCode.badRequest,
          `Bank details already exist for account number ${bankDetail.bank_name}`,
          res,
        );
      }
      bankDetails.push({
        account_holder_name: bankDetail.account_holder_name,
        bank_name: bankDetail.bank_name,
        ifsc_code: bankDetail.ifsc_code,
        account_number: bankDetail.account_number,
      });
    }

    existingUser.Bank_Details = JSON.stringify(bankDetails);
    await existingUser.save();

    return apiResponseSuccess(bankDetails, true, statusCode.success, 'User bank details added successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const addWebsiteDetails = async (req, res) => {
  try {
    const websites = req.body.website_name;
    const user = req.user;

    const existingUser = await User.findOne({ where: { userId: user.userId } });

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    let websitesArray = existingUser.Websites_Details ? JSON.parse(existingUser.Websites_Details) : [];
    if (!Array.isArray(websites)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid format for website names', res);
    }

    for (const website of websites) {
      if (websitesArray.includes(website)) {
        return apiResponseErr(null, false, statusCode.badRequest, `Website details already exist for ${website}`, res);
      }
      websitesArray.push(website);
    }

    existingUser.Websites_Details = JSON.stringify(websitesArray);
    await existingUser.save();

    return apiResponseSuccess(websitesArray, true, statusCode.create, 'User website details added successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const addUpiDetails = async (req, res) => {
  try {
    const upiDetailsArray = req.body.upi_details;
    const user = req.user;

    // Check if req.user is defined and has userId property
    if (!user || !user.userId) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not authenticated', res);
    }

    // Find existing user based on userId
    const existingUser = await User.findOne({ where: { userId: user.userId } });

    // If user not found, return error
    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    // Parse existing UPI details or initialize as empty array
    let upiDetails = existingUser.Upi_Details ? JSON.parse(existingUser.Upi_Details) : [];

    // Check for duplicates and add new UPI details
    for (const upiDetail of upiDetailsArray) {
      if (upiDetails.some((existingUpiDetail) => existingUpiDetail.upi_id === upiDetail.upi_id)) {
        return apiResponseErr(
          null,
          false,
          statusCode.badRequest,
          `UPI details already exist for UPI ID ${upiDetail.upi_id}`,
          res,
        );
      }
      upiDetails.push({
        upi_id: upiDetail.upi_id,
        upi_app: upiDetail.upi_app,
        upi_number: upiDetail.upi_number,
      });
    }

    // Update and stringify UPI details in existingUser
    existingUser.Upi_Details = JSON.stringify(upiDetails);
    await existingUser.save();

    // Return success response
    return apiResponseSuccess(upiDetails, true, statusCode.create, 'User UPI details added successfully', res);
  } catch (error) {
    // Handle errors and return appropriate error response
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};


export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const userDetails = await User.findOne({ where: { userId } });

    if (!userDetails) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    const updatedDetails = await userDetails.update(req.body);

    if (updatedDetails) {
      return apiResponseSuccess(updatedDetails, true, statusCode.create, 'Profile updated successfully', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Failed to update profile', res);
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const getUserProfileData = async (req, res) => {
  try {
    const userId = req.params.userId;

    const userDetails = await User.findOne({ where: { userId } });

    if (!userDetails) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    const userTransactionDetails = await UserTransactionDetail.findAll({ where: { userName: userDetails.userName } });
    userDetails.dataValues.UserTransactionDetail = userTransactionDetails;

    return apiResponseSuccess(userDetails, true, statusCode.success, 'User profile data retrieved successfully', res);
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage, res);
  }
};

export const getSuperAdminUserProfile = async (req, res) => {
  const page = parseInt(req.params.page, 10);
  const searchQuery = req.query.search;

  try {
    if (searchQuery) {
      console.log('first');
      const results = await User.findAll({
        where: {
          userName: {
            [Op.like]: `%${searchQuery}%`,
          },
        },
      });
      const allIntroDataLength = results.length;
      const pageNumber = Math.ceil(allIntroDataLength / 10);

      return apiResponseSuccess(
        { results, pageNumber, allIntroDataLength },
        true,
        200,
        'Data retrieved successfully',
        res,
      );
    } else {
      console.log('second');
      const introData = await User.findAll();
      const SecondArray = [];
      const Limit = page * 10;

      for (let j = Limit - 10; j < Limit; j++) {
        if (introData[j]) {
          SecondArray.push(introData[j]);
        }
      }
      const allIntroDataLength = introData.length;

      if (SecondArray.length === 0) {
        return apiResponseErr(null, false, statusCode.badRequest, 'No data found for the selected criteria.', res);
      }

      const pageNumber = Math.ceil(allIntroDataLength / 10);
      return apiResponseSuccess(
        { SecondArray, pageNumber, allIntroDataLength },
        true,
        statusCode.success,
        'Data retrieved successfully',
        res,
      );
    }
  } catch (error) {
    return apiResponseErr(null, false, error.responseCode ?? statusCode.internalServerError, error.message, res);
  }
};

export const UserServices = {
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

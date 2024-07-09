import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../services/database.service.js';
import Admin from '../models/admin.model.js';
import User from '../models/user.model.js';
import IntroducerUser from '../models/introducerUser.model.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import CustomError from '../utils/extendError.js';
import UserTransactionDetail from '../models/userTransactionDetail.model.js';

export const createAdmin = async (req, res) => {
  try {
    const { firstname, lastname, userName, password, roles } = req.body;

    const existingAdmin = await Admin.findOne({ where: { userName } });

    if (existingAdmin) {
      throw new CustomError(`Admin already exists with user name: ${userName}`,null, 409);
    }

    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    const admin_id = uuidv4();

    const rolesArray = Array.isArray(roles) ? roles : [roles];

    const newAdmin = await Admin.create({
      admin_id,
      firstname,
      lastname,
      userName,
      password: encryptedPassword,
      roles: JSON.stringify(rolesArray),
    });

    if (newAdmin) {
      return apiResponseSuccess(newAdmin, true, statusCode.create, 'Admin create successfully', res);
    } else {
      throw new CustomError('Failed to create new admin', null, 400);
    }
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message, res
    )
  }
};

export const generateAdminAccessToken = async (userName, password, persist) => {
  if (!userName) {
    throw new Error('Invalid value for: User Name');
  }
  if (!password) {
    throw new Error('Invalid value for: Password');
  }

  try {
    const admin = await Admin.findOne({ where: { userName } });

    if (!admin) {
      throw new Error('Invalid User Name or password');
    }

    const passwordValid = await bcrypt.compare(password, admin.password);

    if (!passwordValid) {
      throw new Error('Invalid User Name or password');
    }

    const accessTokenPayload = {
      admin_id: admin.admin_id,
      userName: admin.userName,
      roles: admin.roles,
    };

    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET_KEY, {
      expiresIn: persist ? '1y' : '8h',
    });

    return {
      accessToken,
      admin_id: admin.admin_id,
      userName: admin.userName,
      roles: admin.roles,
    };
  } catch (error) {
    throw new Error(error.message || 'Internal Server Error');
  }
};

export const updateUserProfile = async (req, res) => {
  const { user_id } = req.params;
  const {
    firstname,
    lastname,
    introducersUserName,
    introducerPercentage,
    introducersUserName1,
    introducerPercentage1,
    introducersUserName2,
    introducerPercentage2,
  } = req.body;

  try {
    const existingUser = await User.findByPk(user_id);

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.badRequest, `User not found with id: ${user_id}`, res);
    }

    const validatePercentage = (percentage) => {
      return typeof percentage === 'number' && !isNaN(percentage) && percentage >= 0 && percentage <= 100;
    };

    if (!validatePercentage(introducerPercentage) || !validatePercentage(introducerPercentage1) || !validatePercentage(introducerPercentage2)) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Introducer percentages must be valid numbers between 0 and 100.', res);
    }

    existingUser.firstname = firstname || existingUser.firstname;
    existingUser.lastname = lastname || existingUser.lastname;
    existingUser.introducersUserName = introducersUserName || existingUser.introducersUserName;
    existingUser.introducerPercentage = introducerPercentage || existingUser.introducerPercentage;
    existingUser.introducersUserName1 = introducersUserName1 || existingUser.introducersUserName1;
    existingUser.introducerPercentage1 = introducerPercentage1 || existingUser.introducerPercentage1;
    existingUser.introducersUserName2 = introducersUserName2 || existingUser.introducersUserName2;
    existingUser.introducerPercentage2 = introducerPercentage2 || existingUser.introducerPercentage2;

    await existingUser.save();
    return apiResponseSuccess({user: existingUser } , true, statusCode.success, 'Profile updated successfully', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message, res
    )
  }
};

export const getUserProfile = async (req, res) => {
  const page = parseInt(req.params.page);
  const searchQuery = req.query.search;
  
  try {
    let users;
    let allIntroDataLength;

    if (searchQuery) {
      users = await User.findAll({
        where: {
          userName: {
            [Op.like]: `%${searchQuery}%`,
          },
        },
      });
    } else {
      users = await User.findAll();
    }

    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const paginatedUsers = users.slice(offset, offset + pageSize);

    const SecondArray = [];
    for (const user of paginatedUsers) {
      const userWithTransaction = await User.findOne({
        where: { userName: user.userName },
        include: { model: UserTransactionDetail, as: 'transactionDetails' }, 
      });
      SecondArray.push(userWithTransaction);
    }

    allIntroDataLength = users.length;
    const pageNumber = Math.ceil(allIntroDataLength / pageSize);

    if (SecondArray.length === 0) {
      return apiResponseErr(null, false, statusCode.badRequest, 'No data found for the selected criteria.', res);
    }

    return apiResponseSuccess({ SecondArray, pageNumber, allIntroDataLength }, true, statusCode.success, 'Profile retrieved successfully', res);

  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message, res
    )
  }
};

const AccountServices = {

  IntroducerBalance: async (introUserId) => {
    try {
      console.log('introUserId', introUserId);
      const [intorTranasction] = await database.execute('SELECT * FROM IntroducerTransaction WHERE introUserId = ?', [
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


  SubAdminPasswordResetCode: async (userName, password) => {
    try {
      // Check if the user exists
      const [existingUser] = await database.execute(`SELECT * FROM Admin WHERE userName = ?`, [userName]);
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
      const updateQuery = await database.execute(
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
      const [existingUser] = await database.execute(`SELECT * FROM Admin WHERE userName = '${userName}';`);
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
      const updateQuery = await database.execute(
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
      const userId = id[0].admin_id;
      const [existingUser] = await database.execute(`SELECT * FROM Admin WHERE admin_id = ?`, [userId]);
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
      await database.execute(`UPDATE Admin SET firstname = ?, lastname = ? WHERE admin_id = ?`, [
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
    try {
      const [intorTranasction] = await database.execute('SELECT * FROM IntroducerTransaction WHERE introUserId = ?', [
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
    try {
      const [introId] = await database.execute('SELECT * FROM IntroducerUser WHERE intro_id = ?', [id]);

      if (!introId.length) {
        throw {
          code: 404,
          message: `Introducer with ID ${id} not found`,
        };
      }

      const IntroducerId = introId[0].userName;

      // Check if IntroducerId exists in any of the introducer user names
      const [userIntroId] = await database.execute(
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

        const [transDetails] = await database.execute(`SELECT * FROM UserTransactionDetail WHERE userName = ?`, [
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

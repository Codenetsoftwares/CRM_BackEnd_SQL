import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import IntroducerUser from '../models/introducerUser.model.js';

export const createIntroducerUser = async (req, res) => {
  try {
    const { firstname, lastname, userName, password } = req.body;
    const user = req.user;

    if (!firstname || !lastname || !userName || !password) {
      return apiResponseErr(null, false, statusCode.badRequest, 'All fields are required', res);
    }

    const existingIntroducerUser = await IntroducerUser.findOne({ where: { userName } });

    if (existingIntroducerUser) {
      return apiResponseErr(null, false, statusCode.conflict, `User already exists: ${userName}`, res);
    }

    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    const intro_id = uuidv4();

    const newIntroducerUser = await IntroducerUser.create({
      intro_id,
      firstname,
      lastname,
      userName,
      password: encryptedPassword,
      introducerId: user.userName,
    });

    if (newIntroducerUser) {
      return apiResponseSuccess(newIntroducerUser, true, statusCode.create, 'Introducer User registered successfully!', res);
    } else {
      return apiResponseErr(null, false, statusCode.badRequest, 'Failed to create new Introducer User', res);
    }
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message, res
    );
  }
};

export const introducerUser = {

  // introducerLiveBalance: async (id) => {
  //   const pool = await connectToDB();
  //   try {
  //     const [introUser] = await database.execute(`SELECT * FROM IntroducerUser WHERE id = ?`, [id]);
  //     if (introUser.length === 0) {
  //       throw {
  //         code: 404,
  //         message: `Introducer with ID ${id} not found`,
  //       };
  //     }

  //     const introducerUserName = introUser[0].userName;
  //     const [userIntroId] = await database.execute(`SELECT * FROM IntroducedUsers WHERE introducerUserName = ?`, [
  //       introducerUserName,
  //     ]);

  //     if (userIntroId.length === 0) {
  //       return 0;
  //     }

  //     let liveBalance = 0;
  //     for (const user of userIntroId) {
  //       const introducerPercent = user.introducerPercentage;
  //       const transDetails = user.transactionDetail;

  //       let totalDep = 0;
  //       let totalWith = 0;

  //       transDetails?.forEach((res) => {
  //         if (res.transactionType === 'Deposit') {
  //           totalDep += Number(res.amount);
  //         }
  //         if (res.transactionType === 'Withdraw') {
  //           totalWith += Number(res.amount);
  //         }
  //       });

  //       let diff = Math.abs(totalDep - totalWith);
  //       let amount = (introducerPercent / 100) * diff;

  //       liveBalance += amount;
  //     }

  //     return liveBalance;
  //   } catch (error) {
  //     console.error(error);
  //     throw error;
  //   }
  // },

  updateIntroducerProfile: async (introUserId, data) => {
    try {
      const userId = introUserId[0].intro_id;
      const [existingUser] = await database.execute(`SELECT * FROM IntroducerUser WHERE intro_id = ?`, [userId]);
      if (!existingUser || existingUser.length === 0) {
        throw {
          code: 404,
          message: `Existing Introducer User not found with id: ${userId}`,
        };
      }
      const user = existingUser[0];
      user.firstname = data.firstname || user.firstname;
      user.lastname = data.lastname || user.lastname;
      await database.execute(`UPDATE IntroducerUser SET firstname = ?, lastname = ? WHERE intro_id = ?`, [
        user.firstname,
        user.lastname,
        userId,
      ]);
      return true;
    } catch (err) {
      console.error(err);
      throw {
        code: err.code || 500,
        message: err.message || `Failed to update Introducer User Profile with id: ${introUserId}`,
      };
    }
  },

  introducerPasswordResetCode: async (userName, password) => {
    try {
      // Fetch user from the database
      const [existingUser] = await database.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [userName]);
      if (!existingUser || existingUser.length === 0) {
        throw {
          code: 404,
          message: 'User not found',
        };
      }

      // Compare new password with old password
      const newPasswordIsDuplicate = await bcrypt.compare(password, existingUser[0].password);

      if (newPasswordIsDuplicate) {
        throw {
          code: 409,
          message: 'New Password cannot be the same as existing password',
        };
      }

      // Hash the new password
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(password, passwordSalt);

      // Update user's password in the database
      await database.execute('UPDATE IntroducerUser SET password = ? WHERE userName = ?', [encryptedPassword, userName]);

      return true;
    } catch (error) {
      console.error(error);
      throw {
        code: error.code || 500,
        message: error.message || 'Failed to reset password',
      };
    }
  },

  // introducerPercentageCut: async (id, startDate, endDate) => {
  //   const pool = await connectToDB();
  //   try {
  //     const [user] = await database.execute(`SELECT * FROM User WHERE user_id = ?`, [id])
  //     const userName = user[0].userName;
  //     const userId = user.userId;
  //     const introducerUserId = user.introducersUserId;
  //     console.log("introducerUserId", introducerUserId);

  //     const introducerId = await IntroducerUser.findOne({
  //       id: introducerUserId,
  //     }).exec();
  //     console.log("introducerUser", introducerId);
  //     const introducerid = introducerId.introducerId;
  //     console.log("introducerid", introducerid);

  //     // This is Introducer's User's Percentage
  //     const introducerpercent = user.introducerPercentage;

  //     const transDetails = user.transactionDetail;

  //     const selectedStartDate = new Date(startDate);
  //     const selectedEndDate = new Date(endDate);

  //     const transactionsWithin7Days = transDetails.filter((transaction) => {
  //       const transDate = new Date(transaction.createdAt);
  //       return transDate >= selectedStartDate && transDate <= selectedEndDate;
  //     });

  //     let totalDep = 0;
  //     let totalWith = 0;

  //     transactionsWithin7Days.map((res) => {
  //       if (res.transactionType === "Deposit") {
  //         totalDep += Number(res.amount);
  //       }
  //       if (res.transactionType === "Withdraw") {
  //         totalWith += Number(res.amount);
  //       }
  //     });

  //     if (totalDep <= totalWith) {
  //       throw { message: "Can't send amount to Introducer" };
  //     }
  //     const date = new Date();
  //     let amount = 0;
  //     const transactionType = "Credit";
  //     if (totalDep > totalWith) {
  //       let diff = totalDep - totalWith;
  //       amount = (introducerpercent / 100) * diff;
  //       introducerId.wallet += amount;
  //     }
  //     introducerId.creditTransaction.push({
  //       date,
  //       transactionType,
  //       amount,
  //       userId,
  //       userName,
  //     });
  //     introducerId.save();
  //   } catch (error) {
  //     console.error(error);
  //   }
  // },
};

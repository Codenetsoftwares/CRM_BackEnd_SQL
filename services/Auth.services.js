import Admin from '../models/admin.model.js';
import IntroducerUser from '../models/introducerUser.model.js';
import User from '../models/user.model.js';
import { apiResponseErr, apiResponseSuccess } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';
import { generateAdminAccessToken } from './Account.Services.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const loginAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;
    // if (!userName || !password) {
    //     return apiResponseErr(null, false, statusCode.badRequest, 'User Name and Password are required', res);
    // }

    const admin = await Admin.findOne({ where: { userName } });

    if (!admin) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return apiResponseErr(null, false, statusCode.unauthorize, 'Incorrect password', res);
    }

    const accessToken = await generateAdminAccessToken(userName, password);

    if (!accessToken) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Failed to generate access token', res);
    }

    return apiResponseSuccess(accessToken, true, statusCode.success, 'Login Successfully', res);
  } catch (error) {
    console.error(error);
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const generateIntroducerAccessToken = async (req, res) => {
  const { userName, password, persist } = req.body;

  if (!userName || !password) {
    return apiResponseErr(null, false, statusCode.badRequest, 'User Name and Password are required', res);
  }

  try {
    const existingUser = await IntroducerUser.findOne({ where: { userName } });

    if (!existingUser) {
      return apiResponseErr(null, false, statusCode.unauthorize, 'Invalid User Name or Password', res);
    }

    const passwordValid = await bcrypt.compare(password, existingUser.password);

    if (!passwordValid) {
      return apiResponseErr(null, false, statusCode.unauthorize, 'Invalid User Name or Password', res);
    }

    const accessTokenResponse = {
      introId: existingUser.introId,
      name: existingUser.firstName,
      userName: existingUser.userName,
      role: existingUser.role,
    };

    const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
      expiresIn: persist ? '1y' : '8h',
    });

    return apiResponseSuccess(
      {
        userName: existingUser.userName,
        accessToken: accessToken,
        role: existingUser.role,
        introId: existingUser.introId,
      },
      true,
      statusCode.success,
      'Access token generated successfully',
      res,
    );
  } catch (error) {
    console.error(error);
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    // if (!userName) {
    //   return apiResponseErr(null, false, statusCode.badRequest, 'User Name is required', res);
    // }

    // if (!password) {
    //   return apiResponseErr(null, false, statusCode.badRequest, 'Password is required', res);
    // }

    const accessToken = await generateAccessToken(userName, password, false, res);

    if (!accessToken) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Failed to generate access token', res);
    }

    const user = await User.findOne({ where: { userName } });

    if (!user) {
      return apiResponseErr(null, false, statusCode.badRequest, 'User not found', res);
    }
    return apiResponseSuccess({ token: accessToken.accessToken }, true, statusCode.success, 'Login successful', res);
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

export const generateAccessToken = async (userName, password, persist, res) => {
  try {
    // if (!userName) {
    //   return apiResponseErr(null, false, statusCode.badRequest, 'User Name is required', res);
    // }

    // if (!password) {
    //   return apiResponseErr(null, false, statusCode.badRequest, 'Password is required', res);
    // }
    const user = await User.findOne({ where: { userName } });

    if (!user) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid User Name', res);
    }
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return apiResponseErr(null, false, statusCode.badRequest, 'Invalid Password', res);
    }

    const accessTokenResponse = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      role: user.role,
    };
    const expiresIn = persist ? '1y' : '8h';
    const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, { expiresIn });

    return apiResponseSuccess(
      {
        userName: user.userName,
        accessToken: accessToken,
        role: user.role,
        userId: user.userId,
      },
      true,
      statusCode.success,
      'Login successful',
      res,
    );
  } catch (error) {
    return apiResponseErr(
      null,
      false,
      error.responseCode ?? statusCode.internalServerError,
      error.errMessage ?? error.message,
      res,
    );
  }
};

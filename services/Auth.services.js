import Admin from "../models/admin.model.js";
import { statusCode } from "../utils/statusCodes.js";
import { generateAdminAccessToken } from "./Account.Services.js";
import bcrypt from 'bcrypt';

export const loginAdmin = async (req, res) => {
    try {
        const { userName, password } = req.body;
        if (!userName || !password) {
            return apiResponseErr(null, false, statusCode.badRequest, 'User Name and Password are required', res);
        }

        const admin = await Admin.findOne({ where: { userName } });

        if (!admin) {
            throw { code: 404, message: 'User not found' };
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            return apiResponseErr(null, false, statusCode.unauthorize, 'Incorrect password', res);
        }

        const accessToken = await generateAdminAccessToken(userName, password);

        if (!accessToken) {
            return apiResponseErr(null, false, statusCode.badRequest, 'Failed to generate access token', res);
        }
        return res.status(200).send({ token: accessToken, code: 200, message: 'Login Successfully' });

    } catch (error) {
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
            intro_id: existingUser.intro_id,
            name: existingUser.firstname,
            userName: existingUser.userName,
            role: existingUser.role,
        };

        const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
            expiresIn: persist ? '1y' : '8h',
        });

        return apiResponseSuccess({
            userName: existingUser.userName,
            accessToken: accessToken,
            role: existingUser.role,
            intro_id: existingUser.intro_id,
        }, true, statusCode.success, 'Access token generated successfully', res);
    } catch (error) {
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
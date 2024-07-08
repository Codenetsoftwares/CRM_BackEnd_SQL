import Admin from "../models/admin.model.js";
import AccountServices from "./Account.Services.js";
import bcrypt from 'bcrypt';

export const loginAdmin = async (req, res) => {
    try {
        const { userName, password } = req.body;
        if (!userName) {
            throw { code: 400, message: 'User Name is required' };
        }

        if (!password) {
            throw { code: 400, message: 'Password is required' };
        }

        const admin = await Admin.findOne({ where: { userName } });

        if (!admin) {
            throw { code: 404, message: 'User not found' };
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            throw { code: 401, message: 'Incorrect password' };
        }

        const accessToken = await AccountServices.generateAdminAccessToken(userName, password);

        if (!accessToken) {
            throw { code: 500, message: 'Failed to generate access token' };
        }
        return res.status(200).send({ token: accessToken, code: 200, message: 'Login Successfully' });

    } catch (e) {
        console.error(e);
        throw { code: e.code || 500, message: e.message || 'Internal Server Error' };
    }
};

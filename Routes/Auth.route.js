import { loginAdmin } from "../services/Auth.services.js";

export const AuthRoute = (app) =>
{
    app.post('/admin/login', loginAdmin);
}
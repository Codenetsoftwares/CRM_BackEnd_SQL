// models/Admin.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
const Admin = sequelize.define('Admin', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  admin_id: { type: DataTypes.STRING },
  firstname: { type: DataTypes.STRING },
  lastname: { type: DataTypes.STRING },
  userName: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING },
  roles: { type: DataTypes.JSON },
});

export default Admin;
// models/User.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.STRING },
  firstName: { type: DataTypes.STRING },
  lastName: { type: DataTypes.STRING },
  contactNumber: { type: DataTypes.BIGINT },
  userName: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING },
  introducersUserName: { type: DataTypes.STRING },
  introducerPercentage: { type: DataTypes.INTEGER },
  introducersUserName1: { type: DataTypes.STRING },
  introducerPercentage1: { type: DataTypes.INTEGER },
  introducersUserName2: { type: DataTypes.STRING },
  introducerPercentage2: { type: DataTypes.INTEGER },
  wallet: { type: DataTypes.INTEGER },
  profilePicture: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING },
  Websites_Details: { type: DataTypes.JSON },
  Bank_Details: { type: DataTypes.JSON },
  Upi_Details: { type: DataTypes.JSON },
});

export default User;

// models/BankRequest.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BankRequest = sequelize.define('BankRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bank_id: { type: DataTypes.STRING },
  bankName: { type: DataTypes.STRING },
  accountHolderName: { type: DataTypes.STRING },
  accountNumber: { type: DataTypes.BIGINT },
  ifscCode: { type: DataTypes.STRING },
  upiId: { type: DataTypes.STRING },
  upiAppName: { type: DataTypes.STRING },
  upiNumber: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  isApproved: { type: DataTypes.BOOLEAN },
  isActive: { type: DataTypes.BOOLEAN },
});

export default BankRequest;

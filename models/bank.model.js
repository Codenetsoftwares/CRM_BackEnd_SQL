// models/Bank.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Bank = sequelize.define('Bank', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bankId: { type: DataTypes.STRING },
  bankName: { type: DataTypes.STRING },
  accountHolderName: { type: DataTypes.STRING },
  accountNumber: { type: DataTypes.BIGINT },
  ifscCode: { type: DataTypes.STRING },
  upiId: { type: DataTypes.STRING },
  upiAppName: { type: DataTypes.STRING },
  upiNumber: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeposit: { type: DataTypes.BOOLEAN, defaultValue: true },
  isWithdraw: { type: DataTypes.BOOLEAN, defaultValue: true },
  isEdit: { type: DataTypes.BOOLEAN, defaultValue: true },
  isRenew: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDelete: { type: DataTypes.BOOLEAN, defaultValue: true },
});

export default Bank;

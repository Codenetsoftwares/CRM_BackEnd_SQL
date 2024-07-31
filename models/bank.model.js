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
  isDeposit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isWithdraw: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEdit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isRenew: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDelete: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default Bank;

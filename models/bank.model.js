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
  isActive: { type: DataTypes.BOOLEAN },
  isDeposit: { type: DataTypes.BOOLEAN },
  isWithdraw: { type: DataTypes.BOOLEAN },
  isEdit: { type: DataTypes.BOOLEAN },
  isRenew: { type: DataTypes.BOOLEAN },
  isDelete: { type: DataTypes.BOOLEAN },
});

export default Bank;

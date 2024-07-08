// models/BankSubAdmins.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BankSubAdmins = sequelize.define('BankSubAdmins', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bankId: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  isDeposit: { type: DataTypes.BOOLEAN },
  isWithdraw: { type: DataTypes.BOOLEAN },
  isEdit: { type: DataTypes.BOOLEAN },
  isRenew: { type: DataTypes.BOOLEAN },
  isDelete: { type: DataTypes.BOOLEAN },
});

export default BankSubAdmins;

// models/BankSubAdmins.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BankSubAdmins = sequelize.define('BankSubAdmins', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bankId: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  isDeposit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isWithdraw: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEdit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isRenew: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDelete: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default BankSubAdmins;

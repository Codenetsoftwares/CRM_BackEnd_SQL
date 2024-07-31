// models/Website.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Website = sequelize.define('Website', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  websiteName: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeposit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isWithdraw: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEdit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isRenew: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDelete: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default Website;

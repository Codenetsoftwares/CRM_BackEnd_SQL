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
  isDeposit: { type: DataTypes.BOOLEAN, defaultValue: true },
  isWithdraw: { type: DataTypes.BOOLEAN, defaultValue: true },
  isEdit: { type: DataTypes.BOOLEAN, defaultValue: true },
  isRenew: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDelete: { type: DataTypes.BOOLEAN, defaultValue: true },
});

export default Website;

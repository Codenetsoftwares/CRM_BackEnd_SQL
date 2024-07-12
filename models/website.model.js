// models/Website.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Website = sequelize.define('Website', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  websiteName: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  isActive: { type: DataTypes.BOOLEAN },
  isDeposit: { type: DataTypes.BOOLEAN },
  isWithdraw: { type: DataTypes.BOOLEAN },
  isEdit: { type: DataTypes.BOOLEAN },
  isRenew: { type: DataTypes.BOOLEAN },
  isDelete: { type: DataTypes.BOOLEAN },
});

export default Website;

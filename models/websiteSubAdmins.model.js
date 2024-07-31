// models/WebsiteSubAdmins.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const WebsiteSubAdmins = sequelize.define('WebsiteSubAdmins', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  isDeposit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isWithdraw: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEdit: { type: DataTypes.BOOLEAN, defaultValue: false },
  isRenew: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDelete: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default WebsiteSubAdmins;

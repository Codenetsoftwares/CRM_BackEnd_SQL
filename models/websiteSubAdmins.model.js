// models/WebsiteSubAdmins.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const WebsiteSubAdmins = sequelize.define('WebsiteSubAdmins', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  isDeposit: { type: DataTypes.BOOLEAN },
  isWithdraw: { type: DataTypes.BOOLEAN },
  isEdit: { type: DataTypes.BOOLEAN },
  isRenew: { type: DataTypes.BOOLEAN },
  isDelete: { type: DataTypes.BOOLEAN },
});

export default WebsiteSubAdmins;

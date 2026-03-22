const { DataTypes } = require('sequelize');
const { connectAdhocDB } = require('../config/db');

let PrintAndSubRate;

const definePrintAndSubRate = async () => {
  const adhoc = await connectAdhocDB();

  if (!PrintAndSubRate) {
    PrintAndSubRate = adhoc.define('PrintAndSubRate', {
      rateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'rateid',
      },
      market: {
        type: DataTypes.STRING,
        field: 'Market',
      },
      type: {
        type: DataTypes.STRING,
        field: 'Type',
      },
      rateDescription: {
        type: DataTypes.STRING,
        field: 'RateDescr',
      },
      printDayPattern: {
        type: DataTypes.STRING,
        field: 'PrintDayPattern',
      },
      printTerm: {
        type: DataTypes.INTEGER,
        field: 'PrintTerm',
      },
      printTermUnit: {
        type: DataTypes.STRING,
        field: 'PrintTermUnit',
      },
      eDayPattern: {
        type: DataTypes.STRING,
        field: 'EDayPattern',
      },
      term: {
        type: DataTypes.INTEGER,
        field: 'ETerm',
      },
      termUnit: {
        type: DataTypes.STRING,
        field: 'ETermUnit',
      },
      currency: {
        type: DataTypes.STRING,
        field: 'Curr',
      },
      rate: {
        type: DataTypes.FLOAT,
        field: 'Rate',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        field: 'SortOrder',
      },
      active: {
        type: DataTypes.INTEGER,
        field: 'Active',
      },
    }, {
      tableName: 'printandsubrates',
      timestamps: false,
    });
  }

  return PrintAndSubRate;
};

module.exports = definePrintAndSubRate;

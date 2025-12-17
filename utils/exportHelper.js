const json2csv = require('json2csv').parse;

const exportToCSV = (data, fields) => {
  return json2csv(data, { fields });
};

module.exports = { exportToCSV };
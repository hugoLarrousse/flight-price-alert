const index = require('./index');

module.exports.cron = async () => {
  try {
    console.log('OK')
    // await index.launchScript();
  } catch (error) {
    console.log(error)
  }
};

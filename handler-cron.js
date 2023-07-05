const index = require('./index');

module.exports.cron = async () => {
  try {
    await index.launchScript();
  } catch (error) {
    console.log(error)
  }
};

const index = require('./index');

module.exports.cron = async () => {
  try {
    console.log('IN CRON')
    await index.launchScript();
    console.log('OUT CRON')
  } catch (error) {
    console.log(error)
  }
};

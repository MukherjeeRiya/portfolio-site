const fs = require('fs');
const axios = require('axios');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const profile = config.profiles.find((entry) => entry.name === config.defaultProfile);

async function main() {
  const url = profile.baseUrl.replace(/\/$/, '') + '/api/now/table/sys_user';
  try {
    const response = await axios.get(url, {
      auth: { username: profile.username, password: profile.password },
      timeout: 30000,
      validateStatus: () => true,
    });
    console.log('STATUS', response.status);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('NETWORK_ERROR', error.message);
  }
}

main();

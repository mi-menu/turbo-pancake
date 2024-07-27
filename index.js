const axios = require('axios');
const cron = require('node-cron');

const GODADDY_KEY = process.env.GODADDY_KEY;
const GODADDY_SECRET = process.env.GODADDY_SECRET;
const DOMAIN = process.env.CLIENT_URL;
const RECORD_NAMES = ['@', '*'];

let currentIp = '';

async function getPublicIp() {
    const services = [
        'https://api64.ipify.org?format=json',
        'https://httpbin.org/ip',
        'https://ipinfo.io/ip'
    ];

    for (const service of services) {
        try {
            const response = await axios.get(service);
            if (service.includes('ipify') || service.includes('httpbin')) {
                return response.data.ip || response.data.origin.trim();
            } else {
                return response.data.trim();
            }
        } catch (error) {
            console.warn(`Error getting public IP from ${service}:`, error.message);
        }
    }

    console.error('All services failed to get public IP.');
    return null;
}

async function updateGodaddyDns(ip) {
    const config = {
        headers: {
            Authorization: `sso-key ${GODADDY_KEY}:${GODADDY_SECRET}`,
            'Content-Type': 'application/json'
        }
    };

    for (const RECORD_NAME of RECORD_NAMES) {
        const url = `https://api.godaddy.com/v1/domains/${DOMAIN}/records/A/${RECORD_NAME}`;
        const data = [{ data: ip }];

        try {
            await axios.put(url, data, config);
            console.log(`DNS record for ${RECORD_NAME} updated to ${ip}`);
        } catch (error) {
            console.error(`Error updating DNS record for ${RECORD_NAME}:`, error.response ? error.response.data : error.message);
        }
    }
}

async function checkAndUpdateIp() {
    const newIp = await getPublicIp();
    if (newIp && newIp !== currentIp) {
        await updateGodaddyDns(newIp);
        currentIp = newIp;
    } else {
        console.log('IP has not changed');
    }
}

// Run the function every 5 minutes
cron.schedule('*/5 * * * *', () => {
    console.log('Checking IP...');
    checkAndUpdateIp();
});

// Initial check
checkAndUpdateIp();

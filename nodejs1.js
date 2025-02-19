const axios = require('axios');

const API_KEY = '1863ef6e-b5e6-450b-b9f3b-bca1fbbb1cbc';
const BASE_URL = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';

async function getScanConfigs() {
    try {
        const response = await axios.get(BASE_URL, {
            headers: {
                'X-Api-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('Scan Configs:', response.data);
    } catch (error) {
        console.error('Error fetching scan configs:', error.response ? error.response.data : error.message);
    }
}

getScanConfigs();

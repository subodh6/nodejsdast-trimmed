const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY; // Store API key in environment variables
const API_URL = 'https://us3.api.insight.rapid7.com/ias/v1/apps';

const triggerScan = async () => {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('API Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error triggering scan:', error.response ? error.response.data : error.message);
        process.exit(1); // Ensure failure in pipeline if API call fails
    }
};

triggerScan();

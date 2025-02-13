const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY; // API Key from environment variable
const API_URL_APPS = 'https://us3.api.insight.rapid7.com/ias/v1/apps';
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';

const APP_NAME = process.env.APP_NAME || 'devopssphere.site'; // Set app name as an environment variable

const getScanConfigs = async () => {
    try {
        // Step 1: Fetch all applications
        const appsResponse = await axios.get(API_URL_APPS, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const apps = appsResponse.data.data;

        // Step 2: Find the application ID for the given APP_NAME
        const app = apps.find(app => app.name === APP_NAME);

        if (!app) {
            console.error(`Application "${APP_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`Found Application: ${app.name}, ID: ${app.id}`);

        // Step 3: Fetch Scan Configs for the Application ID
        const scanConfigsResponse = await axios.get(API_URL_SCAN_CONFIGS, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scanConfigs = scanConfigsResponse.data.data.filter(config => config.app.id === app.id);

        if (scanConfigs.length === 0) {
            console.log(`No scan configurations found for Application: ${APP_NAME}`);
        } else {
            console.log(`Scan Configurations for ${APP_NAME}:`);
            scanConfigs.forEach(config => {
                console.log(`- Name: ${config.name}, ID: ${config.id}`);
            });
        }
    } catch (error) {
        console.error('Error fetching scan configurations:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

getScanConfigs();

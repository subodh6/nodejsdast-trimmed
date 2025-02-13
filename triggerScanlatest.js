const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY; // API Key from environment variable
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';
const API_URL_SCAN_STATUS = 'https://us3.api.insight.rapid7.com/ias/v1/scans/'; // Append Scan ID

const APP_NAME = process.env.APP_NAME || 'devopssphere.site'; // Set app name
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan'; // Set scan config name

const POLLING_INTERVAL = 30 * 1000; // 30 seconds
const MAX_RETRIES = 40; // Wait for 40*30 = 1200 seconds (20 mins)

const triggerScan = async () => {
    try {
        // Step 1: Fetch Scan Configs
        const scanConfigsResponse = await axios.get(API_URL_SCAN_CONFIGS, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scanConfigs = scanConfigsResponse.data.data;

        // Step 2: Find the Scan Config ID for the given SCAN_CONFIG_NAME
        const scanConfig = scanConfigs.find(config => config.name === SCAN_CONFIG_NAME);

        if (!scanConfig) {
            console.error(`Scan Configuration "${SCAN_CONFIG_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`Found Scan Configuration: ${scanConfig.name}, ID: ${scanConfig.id}`);

        // Step 3: Trigger Scan
        const scanRequestBody = {
            scan_config: {
                id: scanConfig.id
            }
        };

        const scanResponse = await axios.post(API_URL_SCANS, scanRequestBody, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scanId = scanResponse.data.id;
        console.log(`Scan Triggered Successfully! Scan ID: ${scanId}`);

        // Step 4: Wait for Scan Completion
        let retryCount = 0;
        while (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL)); // Wait before polling

            const statusResponse = await axios.get(`${API_URL_SCAN_STATUS}${scanId}`, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const scanStatus = statusResponse.data.status;
            console.log(`Current Scan Status: ${scanStatus}`);

            // Check if scan is completed
            if (scanStatus === 'SUCCESS') {
                console.log('Scan completed successfully!');
                process.exit(0); // Exit with success
            } else if (scanStatus === 'FAILED' || scanStatus === 'CANCELED') {
                console.error(`Scan failed with status: ${scanStatus}`);
                process.exit(1); // Exit with failure
            }

            retryCount++;
        }

        console.error('Scan timed out without completion.');
        process.exit(1); // Fail if timeout reached

    } catch (error) {
        console.error('Error triggering scan:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

triggerScan();

const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY; // API Key from environment variable
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';

const APP_NAME = process.env.APP_NAME || 'devopssphere.site'; // Set app name
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan'; // Set scan config name

const triggerScan = async () => {
    try {
        // Step 1: Fetch Scan Configs
        console.log("Fetching scan configurations...");
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

        console.log("Triggering scan...");
        const scanResponse = await axios.post(API_URL_SCANS, scanRequestBody, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!scanResponse.data || !scanResponse.data.id) {
            console.error("Scan ID not received. Response:", scanResponse.data);
            process.exit(1);
        }

        const scanId = scanResponse.data.id;
        console.log(`Scan Triggered Successfully! Scan ID: ${scanId}`);

        // Step 4: Monitor Scan Status
        await monitorScan(scanId);

    } catch (error) {
        console.error('Error triggering scan:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

const monitorScan = async (scanId) => {
    try {
        console.log(`Monitoring scan status for Scan ID: ${scanId}`);
        const scanStatusUrl = `${API_URL_SCANS}/${scanId}`;

        while (true) {
            const statusResponse = await axios.get(scanStatusUrl, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const scanStatus = statusResponse.data.status;

            console.log(`Current Scan Status: ${scanStatus}`);

            if (scanStatus === "COMPLETE") {
                console.log("Scan completed successfully!");
                break;
            } else if (scanStatus === "FAILED") {
                console.error("Scan failed!");
                process.exit(1);
            }

            // Wait for 10 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    } catch (error) {
        console.error('Error fetching scan status:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

triggerScan();

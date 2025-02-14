const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY;
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';

const APP_NAME = process.env.APP_NAME || 'devopssphere.site';
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan';

// Function to delay execution (for polling)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const triggerAndMonitorScan = async () => {
    try {
        // Step 1: Fetch Scan Configurations
        const scanConfigsResponse = await axios.get(API_URL_SCAN_CONFIGS, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        const scanConfigs = scanConfigsResponse.data.data;
        const scanConfig = scanConfigs.find(config => config.name === SCAN_CONFIG_NAME);

        if (!scanConfig) {
            console.error(`Scan Configuration "${SCAN_CONFIG_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`✅ Found Scan Configuration: ${scanConfig.name}, ID: ${scanConfig.id}`);

        // Step 2: Trigger Scan
        const scanRequestBody = { scan_config: { id: scanConfig.id } };
        const scanResponse = await axios.post(API_URL_SCANS, scanRequestBody, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        const scanId = scanResponse.data.id;
        console.log(`🚀 Scan Triggered Successfully! Scan ID: ${scanId}`);

        // Step 3: Monitor Scan Status
        let scanStatus = "";
        const SCAN_STATUS_URL = `${API_URL_SCANS}/${scanId}`;
        
        console.log(`⏳ Waiting for scan ${scanId} to complete...`);

        while (true) {
            await sleep(30 * 1000); // Wait for 30 seconds before polling

            const statusResponse = await axios.get(SCAN_STATUS_URL, {
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
            });

            scanStatus = statusResponse.data.status;
            console.log(`🔄 Scan Status: ${scanStatus}`);

            if (scanStatus === "SUCCESS") {
                console.log(`✅ Scan Completed Successfully!`);
                process.exit(0); // Success in pipeline
            } 
            if (scanStatus === "FAILED") {
                console.log(`❌ Scan Failed!`);
                process.exit(1); // Fail the pipeline
            }
        }
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

triggerAndMonitorScan();

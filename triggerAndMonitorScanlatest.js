const axios = require('axios');

// Environment Variables
const API_KEY = process.env.RAPID7_API_KEY; // API Key from buildspec.yml
const APP_NAME = process.env.APP_NAME || 'devopssphere.site'; // Application name
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan'; // Scan config name

// API Endpoints
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';

// Polling Parameters
const MAX_WAIT_TIME = 60 * 60 * 1000; // 1 Hour Timeout
const POLL_INTERVAL = 60000; // 60 Seconds Polling

async function triggerScan() {
    try {
        // Fetch Scan Configs
        const scanConfigsResponse = await axios.get(API_URL_SCAN_CONFIGS, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scanConfigs = scanConfigsResponse.data.data;
        const scanConfig = scanConfigs.find(config => config.name === SCAN_CONFIG_NAME);

        if (!scanConfig) {
            console.error(`Scan Configuration "${SCAN_CONFIG_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`Found Scan Configuration: ${scanConfig.name}, ID: ${scanConfig.id}`);

        // Trigger Scan
        const scanResponse = await axios.post(API_URL_SCANS, {
            scan_config: { id: scanConfig.id }
        }, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scanId = scanResponse.data.id;
        console.log(`Scan Triggered Successfully! Scan ID: ${scanId}`);

        return scanId;

    } catch (error) {
        console.error('Error triggering scan:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function monitorScan(scanId) {
    const statusUrl = `${API_URL_SCANS}/${scanId}`;
    const startTime = Date.now();

    while (true) {
        try {
            const response = await axios.get(statusUrl, {
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
            });

            const status = response.data.status;
            console.log(`Scan Status: ${status}`);

            if (status === "COMPLETED") {
                console.log("Scan completed successfully.");
                process.exit(0);
            } else if (status === "FAILED" || status === "CANCELLED") {
                console.error("Scan failed or was cancelled.");
                process.exit(1);
            }

            // Timeout condition
            if (Date.now() - startTime > MAX_WAIT_TIME) {
                console.error("Scan took too long and timed out.");
                process.exit(1);
            }

            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

        } catch (error) {
            console.error('Error fetching scan status:', error.response ? error.response.data : error.message);
            process.exit(1);
        }
    }
}

async function run() {
    const scanId = await triggerScan();
    await monitorScan(scanId);
}

run();

const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY;
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';

const APP_NAME = process.env.APP_NAME || 'devopssphere.site';
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan';

const MAX_WAIT_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const POLL_INTERVALS = [30000, 60000, 120000, 240000, 300000]; // Retry intervals: 30s, 1m, 2m, 4m, 5m

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const triggerScan = async () => {
    try {
        console.log("Fetching scan configurations...");
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
        console.log("Triggering the scan...");

        let scanId = null;
        let elapsedTime = 0;

        for (const interval of POLL_INTERVALS) {
            if (elapsedTime >= MAX_WAIT_TIME) {
                console.error("Timed out waiting for scan ID.");
                process.exit(1);
            }

            try {
                const scanResponse = await axios.post(API_URL_SCANS, {
                    scan_config: { id: scanConfig.id }
                }, {
                    headers: {
                        'x-api-key': API_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                scanId = scanResponse.data.id;

                if (scanId) {
                    console.log(`Scan Triggered Successfully! Scan ID: ${scanId}`);
                    return;
                }
            } catch (error) {
                console.error(`Attempt failed, retrying in ${interval / 1000}s...`);
                console.error('Error:', error.response ? error.response.data : error.message);
            }

            await sleep(interval);
            elapsedTime += interval;
        }

        console.error("Failed to retrieve Scan ID after multiple retries.");
        process.exit(1);
    } catch (error) {
        console.error('Critical Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

triggerScan();

const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY;
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';

const APP_NAME = process.env.APP_NAME || 'devopssphere.site';
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan';

const MAX_WAIT_TIME = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL = 60 * 1000; // 1 minute

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const triggerScan = async () => {
    try {
        console.log("Fetching scan configurations...");
        const scanConfigsResponse = await axios.get(API_URL_SCAN_CONFIGS, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        const scanConfigs = scanConfigsResponse.data.data;
        const scanConfig = scanConfigs.find(config => config.name === SCAN_CONFIG_NAME);

        if (!scanConfig) {
            console.error(`Scan Configuration "${SCAN_CONFIG_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`Found Scan Configuration: ${scanConfig.name}, ID: ${scanConfig.id}`);
        console.log("Triggering the scan...");

        const scanResponse = await axios.post(API_URL_SCANS, {
            scan_config: { id: scanConfig.id }
        }, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        let scanId = scanResponse.data.id;
        if (!scanId) {
            console.log("Failed to retrieve scan ID after triggering. Retrying...");
        } else {
            console.log(`Scan Triggered Successfully! Scan ID: ${scanId}`);
            return scanId;
        }

        // Poll for the scan ID
        let elapsedTime = 0;
        while (elapsedTime < MAX_WAIT_TIME) {
            console.log(`Waiting for scan ID... (${elapsedTime / 1000}s elapsed)`);
            await sleep(POLL_INTERVAL);
            elapsedTime += POLL_INTERVAL;

            // Check if scan has started
            const scansResponse = await axios.get(API_URL_SCANS, {
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
            });

            const runningScan = scansResponse.data.data.find(scan => scan.scan_config.id === scanConfig.id && scan.status !== 'Queued');
            if (runningScan) {
                console.log(`Scan started with ID: ${runningScan.id}`);
                return runningScan.id;
            }
        }

        console.error("Timed out waiting for scan ID.");
        process.exit(1);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

const monitorScan = async (scanId) => {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_TIME) {
        try {
            const response = await axios.get(`${API_URL_SCANS}/${scanId}`, {
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
            });

            const scanStatus = response.data.status;
            console.log(`Current scan status: ${scanStatus}`);

            if (scanStatus === 'COMPLETE') {
                console.log('✅ Scan completed successfully.');
                process.exit(0);
            } 
            if (scanStatus === 'FAILED' || scanStatus === 'CANCELED') {
                console.error(`❌ Scan ended with status: ${scanStatus}.`);
                process.exit(1);
            }
        } catch (error) {
            console.error('Error fetching scan status:', error.response ? error.response.data : error.message);
        }

        await sleep(POLL_INTERVAL);
    }

    console.error('⏳ Scan monitoring timed out.');
    process.exit(1);
};

const run = async () => {
    const scanId = await triggerScan();
    if (!scanId) process.exit(1);

    await monitorScan(scanId);
};

run();

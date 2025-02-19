const axios = require('axios');

const API_KEY = process.env.RAPID7_API_KEY;
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';
const SCAN_CONFIG_ID = 'your-scan-config-id'; // Replace with your actual Scan Config ID

const MAX_WAIT_TIME = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const POLL_INTERVAL = 60 * 1000; // 1 minute in milliseconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const triggerScan = async () => {
    try {
        console.log("Triggering the scan...");
        const scanResponse = await axios.post(API_URL_SCANS, {
            scan_config: { id: SCAN_CONFIG_ID }
        }, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        const scanId = scanResponse.data.id;
        if (!scanId) {
            console.error("Failed to retrieve Scan ID after triggering the scan.");
            process.exit(1);
        }

        console.log(`Scan triggered successfully! Scan ID: ${scanId}`);
        return scanId;
    } catch (error) {
        console.error('Error triggering scan:', error.response ? error.response.data : error.message);
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

            if (scanStatus === 'Complete') {
                console.log('Scan completed successfully.');
                return true;
            } else if (scanStatus === 'Failed') {
                console.error('Scan failed.');
                return false;
            } else if (scanStatus === 'Blacked Out') {
                console.error('Scan is in a blackout period.');
                return false;
            }
            // Add additional status checks as needed

        } catch (error) {
            console.error('Error fetching scan status:', error.response ? error.response.data : error.message);
            // Optionally, you can choose to exit or continue based on the error
        }

        await sleep(POLL_INTERVAL);
    }

    console.error('Scan monitoring timed out.');
    return false;
};

const run = async () => {
    const scanId = await triggerScan();
    const success = await monitorScan(scanId);
    process.exit(success ? 0 : 1);
};

run();

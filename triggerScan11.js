const axios = require('axios');

// ✅ Load environment variables (pass these in your pipeline)
const API_KEY = process.env.API_KEY;
const API_URL_SCANS = process.env.API_URL_SCANS; // Example: "https://api.scanner.com/scans"
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME; // Example: "nodejsscan"
const MAX_WAIT_TIME = 30 * 60 * 1000; // 30 minutes timeout
const POLL_INTERVAL = 60 * 1000; // 60 seconds

// Utility function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ Fetch scan configuration ID by name
const getScanConfigId = async () => {
    try {
        console.log("Fetching scan configurations...");
        const response = await axios.get(`${API_URL_SCANS}/configs`, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        const scanConfig = response.data.find(config => config.name === SCAN_CONFIG_NAME);
        if (!scanConfig) {
            console.error(`❌ Scan configuration "${SCAN_CONFIG_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`Found Scan Configuration: ${SCAN_CONFIG_NAME}, ID: ${scanConfig.id}`);
        return scanConfig.id;
    } catch (error) {
        console.error("Error fetching scan configurations:", error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

// ✅ Trigger a new scan and return scan ID
const triggerScan = async (configId) => {
    try {
        console.log("Triggering the scan...");
        const response = await axios.post(`${API_URL_SCANS}`, { configId }, {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        });

        if (!response.data || !response.data.id) {
            console.log("Failed to retrieve scan ID after triggering. Retrying...");
            await sleep(5000);
            return triggerScan(configId); // Retry triggering scan
        }

        console.log(`Scan started with ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error("Error triggering scan:", error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

// ✅ Monitor scan status and exit accordingly
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
                process.exit(0); // ✅ Exit immediately
            } else if (scanStatus === 'FAILED' || scanStatus === 'CANCELED') {
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

// ✅ Main Execution Flow
(async () => {
    const configId = await getScanConfigId();
    const scanId = await triggerScan(configId);
    await monitorScan(scanId);
})();

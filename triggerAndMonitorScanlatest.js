const axios = require('axios');

const API_KEY = "1863ef6e-b5e6-450b-9f3b-bca1fbbb1cbc";  // Replace with your API key
const APP_NAME = "devopssphere.site";  // Replace with your App name
const SCAN_CONFIG_NAME = "nodejsscan";  // Replace with your Scan Config
const MAX_WAIT_TIME = 60 * 60 * 1000;  // 1 hour timeout
const POLL_INTERVAL = 60000;  // Check status every 60 seconds

async function triggerScan() {
    const triggerUrl = `https://us.api.insight.rapid7.com/ias/v1/scans`;
    
    try {
        const response = await axios.post(triggerUrl, {
            app: APP_NAME,
            scanConfig: SCAN_CONFIG_NAME
        }, {
            headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' }
        });

        const scanId = response.data.id;
        console.log(`Scan triggered successfully. Scan ID: ${scanId}`);
        return scanId;

    } catch (error) {
        console.error('Error triggering scan:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function monitorScan(scanId) {
    const statusUrl = `https://us.api.insight.rapid7.com/ias/v1/scans/${scanId}`;
    const startTime = Date.now();

    while (true) {
        try {
            const response = await axios.get(statusUrl, {
                headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' }
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

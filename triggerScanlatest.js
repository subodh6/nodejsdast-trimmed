const axios = require('axios');

// Fetch API Key and Scan Config Name from Environment Variables (set in buildspec.yml)
const API_KEY = process.env.RAPID7_API_KEY;
const SCAN_CONFIG_NAME = process.env.SCAN_CONFIG_NAME || 'nodejsscan';

// Rapid7 API Endpoints
const API_URL_SCAN_CONFIGS = 'https://us3.api.insight.rapid7.com/ias/v1/scan-configs';
const API_URL_SCANS = 'https://us3.api.insight.rapid7.com/ias/v1/scans';

// Polling Configuration
const POLLING_INTERVAL = 30 * 1000; // 30 seconds
const MAX_RETRIES = 40; // Wait for 40*30 = 20 mins

const triggerScan = async () => {
    try {
        console.log('🔍 Fetching Scan Configurations...');

        // Step 1: Fetch Scan Configs
        const scanConfigsResponse = await axios.get(API_URL_SCAN_CONFIGS, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scanConfigs = scanConfigsResponse.data.data;

        // Step 2: Find the Scan Config ID
        const scanConfig = scanConfigs.find(config => config.name === SCAN_CONFIG_NAME);

        if (!scanConfig) {
            console.error(`❌ Scan Configuration "${SCAN_CONFIG_NAME}" not found.`);
            process.exit(1);
        }

        console.log(`✅ Found Scan Configuration: ${scanConfig.name}, ID: ${scanConfig.id}`);

        // Step 3: Trigger Scan
        const scanRequestBody = {
            scan_config: { id: scanConfig.id }
        };

        let scanResponse;
        try {
            scanResponse = await axios.post(API_URL_SCANS, scanRequestBody, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('❌ Error triggering scan:', error.response ? error.response.data : error.message);
            process.exit(1);
        }

        console.log('📌 Scan API Response:', scanResponse.data);

        if (!scanResponse.data || !scanResponse.data.id) {
            console.error('❌ Scan did not return a valid Scan ID. Possible API issue.');
            process.exit(1);
        }

        const scanId = scanResponse.data.id;
        console.log(`🚀 Scan Triggered Successfully! Scan ID: ${scanId}`);

        // Step 4: Wait for Scan Completion
        let retryCount = 0;
        while (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

            const statusResponse = await axios.get(`${API_URL_SCANS}/${scanId}`, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const scanStatus = statusResponse.data.status;
            console.log(`🔄 Current Scan Status: ${scanStatus}`);

            if (scanStatus === 'SUCCESS') {
                console.log('✅ Scan completed successfully!');
                process.exit(0);
            } else if (scanStatus === 'FAILED' || scanStatus === 'CANCELED') {
                console.error(`❌ Scan failed with status: ${scanStatus}`);
                process.exit(1);
            }

            retryCount++;
        }

        console.error('⏳ Scan timed out without completion.');
        process.exit(1);
    } catch (error) {
        console.error('❌ Unexpected Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

triggerScan();

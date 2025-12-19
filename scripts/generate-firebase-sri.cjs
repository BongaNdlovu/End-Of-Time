#!/usr/bin/env node

/**
 * Firebase SRI Hash Generator
 * ===========================
 * 
 * This script fetches Firebase SDK files and generates SHA-384 hashes
 * for Subresource Integrity (SRI) attributes.
 * 
 * Usage: node scripts/generate-firebase-sri.js
 */

const https = require('https');
const crypto = require('crypto');

const FIREBASE_VERSION = '9.23.0';
const FIREBASE_FILES = [
    'firebase-app-compat.js',
    'firebase-auth-compat.js',
    'firebase-firestore-compat.js',
    'firebase-analytics-compat.js'
];

const BASE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;

/**
 * Fetches a file from URL and returns its content as a Buffer
 */
function fetchFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

/**
 * Generates SHA-384 hash for the given buffer
 */
function generateSHA384Hash(buffer) {
    return crypto.createHash('sha384').update(buffer).digest('base64');
}

/**
 * Generates SRI hash for a Firebase file
 */
async function generateSRIForFile(filename) {
    try {
        console.log(`Fetching ${filename}...`);
        const url = BASE_URL + filename;
        const content = await fetchFile(url);
        const hash = generateSHA384Hash(content);
        return hash;
    } catch (error) {
        console.error(`Error generating hash for ${filename}:`, error.message);
        return null;
    }
}

/**
 * Main function to generate all SRI hashes
 */
async function main() {
    console.log(`Generating Firebase SRI hashes for version ${FIREBASE_VERSION}\n`);
    
    const results = {};
    
    for (const filename of FIREBASE_FILES) {
        const hash = await generateSRIForFile(filename);
        if (hash) {
            results[filename] = hash;
            console.log(`✓ ${filename}: sha384-${hash}`);
        } else {
            console.log(`✗ Failed to generate hash for ${filename}`);
        }
    }
    
    console.log('\n=== SRI Hashes for HTML ===');
    console.log('Copy these integrity attributes into your script tags:\n');
    
    for (const [filename, hash] of Object.entries(results)) {
        console.log(`${filename}:`);
        console.log(`  integrity="sha384-${hash}" crossorigin="anonymous"`);
        console.log('');
    }
    
    console.log('=== JSON Output ===');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { generateSRIForFile, main };

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

async function generateToken() {
  try {
    const appId = process.env.GITHUB_APP_ID;
    const privateKeyBase64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;

    if (!appId || !privateKeyBase64 || privateKeyBase64 === 'local_placeholder') {
      console.log('Missing or invalid Github App credentials in .env');
      return;
    }

    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('ascii');

    // Generate JWT
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + (10 * 60),
      iss: appId
    };

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    console.log('Generated JWT for GitHub App.');

    // Get app installations
    const { data: installations } = await axios.get('https://api.github.com/app/installations', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (installations.length === 0) {
      console.log('No installations found for this GitHub App. Please visit the INSTALL_URL to install it on an account/repo first.');
      return;
    }

    const installationId = installations[0].id;
    console.log(`Found installation ID: ${installationId}`);

    // Generate Installation Access Token
    const { data: accessData } = await axios.post(`https://api.github.com/app/installations/${installationId}/access_tokens`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const accessToken = accessData.token;
    console.log('Successfully generated Installation Access Token.');

    // Update .env file
    let envFile = fs.readFileSync('.env', 'utf8');
    envFile = envFile.replace(/GITHUB_APP_TOKEN=.*/g, `GITHUB_APP_TOKEN=${accessToken}`);
    fs.writeFileSync('.env', envFile);
    
    console.log('Successfully updated .env with the new GITHUB_APP_TOKEN.');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

generateToken();

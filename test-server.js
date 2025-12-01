// Test script to verify server setup
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Server Setup...\n');

async function testServer() {
  try {
    // Check if backend directory exists
    const backendPath = path.join(__dirname, 'backend');
    if (!fs.existsSync(backendPath)) {
      console.log('❌ Backend directory not found');
      return false;
    }

    // Check if server.js exists
    const serverPath = path.join(backendPath, 'src/server.js');
    if (!fs.existsSync(serverPath)) {
      console.log('❌ server.js not found');
      return false;
    }

    // Check if package.json has the right scripts
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const requiredScripts = ['build:all', 'start'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

    if (missingScripts.length > 0) {
      console.log(`❌ Missing scripts: ${missingScripts.join(', ')}`);
      return false;
    }

    // Check if railway.toml exists
    const railwayConfigPath = path.join(__dirname, 'railway.toml');
    if (!fs.existsSync(railwayConfigPath)) {
      console.log('❌ railway.toml not found');
      return false;
    }

    // Check railway.toml content
    const railwayConfig = fs.readFileSync(railwayConfigPath, 'utf8');
    const requiredConfigs = [
      'builder = "NIXPACKS"',
      'buildCommand = "npm run build:all"',
      'startCommand = "npm run start"'
    ];

    const missingConfigs = requiredConfigs.filter(config => !railwayConfig.includes(config));

    if (missingConfigs.length > 0) {
      console.log(`❌ Missing railway configs: ${missingConfigs.join(', ')}`);
      return false;
    }

    // Check if server.js has static file serving
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    if (!serverContent.includes('express.static(distPath)')) {
      console.log('❌ Server missing static file serving');
      return false;
    }

    console.log('✅ Backend directory exists');
    console.log('✅ server.js exists');
    console.log('✅ Package.json has required scripts');
    console.log('✅ railway.toml exists with correct config');
    console.log('✅ Server configured for static file serving');

    console.log('\n📋 Deployment Setup Summary:');
    console.log('- Single service deployment on Railway');
    console.log('- Backend serves frontend static files');
    console.log('- Automatic build process');
    console.log('- PostgreSQL database integration');

    console.log('\n🎉 Server setup is ready for Railway deployment!');
    console.log('\nNext steps for Railway:');
    console.log('1. Railway will run: npm run build:all');
    console.log('2. Railway will start: npm run start');
    console.log('3. Backend will serve API at /api/*');
    console.log('4. Backend will serve frontend at all other routes');

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testServer();
// Simple test script to verify the setup
console.log('🧪 Testing Mangrove Portfolio Setup...\n');

// Check if backend directory exists
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [
  {
    name: 'Backend directory',
    path: './backend',
    type: 'directory'
  },
  {
    name: 'Backend package.json',
    path: './backend/package.json',
    type: 'file'
  },
  {
    name: 'Railway configuration',
    path: './railway.toml',
    type: 'file'
  },
  {
    name: 'Environment example',
    path: './.env.example',
    type: 'file'
  },
  {
    name: 'Backend server',
    path: './backend/src/server.js',
    type: 'file'
  },
  {
    name: 'Database config',
    path: './backend/src/config/database.js',
    type: 'file'
  }
];

let allPassed = true;

checks.forEach(check => {
  const fullPath = path.resolve(__dirname, check.path);
  const exists = fs.existsSync(fullPath);
  const isCorrectType = exists &&
    (check.type === 'directory' ? fs.statSync(fullPath).isDirectory() : fs.statSync(fullPath).isFile());

  if (exists && isCorrectType) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - Missing or incorrect type`);
    allPassed = false;
  }
});

console.log('\n📋 Setup Summary:');
console.log(`- Frontend: React app with Vite`);
console.log(`- Backend: Express.js API with PostgreSQL`);
console.log(`- Database: PostgreSQL with automatic migrations`);
console.log(`- Deployment: Railway with multi-service setup`);

if (allPassed) {
  console.log('\n🎉 All checks passed! Ready for deployment to Railway.');
  console.log('\nNext steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Connect repository to Railway');
  console.log('3. Add environment variables in Railway dashboard');
  console.log('4. Deploy!');
} else {
  console.log('\n⚠️  Some checks failed. Please review the setup.');
}
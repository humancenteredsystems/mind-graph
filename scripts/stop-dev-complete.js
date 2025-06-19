#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛑 Stopping MakeItMakeSense.io development environment...\n');

// Function to execute command and handle errors gracefully
function safeExec(command, description) {
  try {
    console.log(`📋 ${description}...`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    if (result.trim()) {
      console.log(`   ✅ ${description} completed`);
      return result;
    } else {
      console.log(`   ℹ️  ${description} - nothing to do`);
      return '';
    }
  } catch (error) {
    console.log(`   ⚠️  ${description} - ${error.message.split('\n')[0]}`);
    return '';
  }
}

// Function to kill processes by pattern
function killProcessesByPattern(pattern, description) {
  try {
    console.log(`🔍 Checking for ${description}...`);
    const pids = execSync(`pgrep -f "${pattern}"`, { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (pids) {
      const pidList = pids.split('\n').filter(pid => pid.trim());
      console.log(`   Found ${pidList.length} process(es): ${pidList.join(', ')}`);
      try {
        execSync(`pkill -f "${pattern}"`, { stdio: 'pipe' });
        console.log(`   ✅ Killed ${description}`);
        return pidList.length;
      } catch (killError) {
        console.log(`   ⚠️  Some ${description} may have already exited`);
        return pidList.length;
      }
    } else {
      console.log(`   ℹ️  No ${description} found`);
      return 0;
    }
  } catch (error) {
    console.log(`   ℹ️  No ${description} found`);
    return 0;
  }
}

// Function to kill processes by port
function killProcessesByPort(ports, description) {
  try {
    console.log(`🔍 Checking processes on ${description}...`);
    const portList = Array.isArray(ports) ? ports.join(',') : ports;
    const pids = execSync(`lsof -ti:${portList}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (pids) {
      const pidList = pids.split('\n').filter(pid => pid.trim());
      console.log(`   Found ${pidList.length} process(es) on ports: ${pidList.join(', ')}`);
      execSync(`lsof -ti:${portList} | xargs -r kill -9`, { stdio: 'pipe' });
      console.log(`   ✅ Killed processes on ${description}`);
      return pidList.length;
    } else {
      console.log(`   ℹ️  No processes found on ${description}`);
      return 0;
    }
  } catch (error) {
    console.log(`   ℹ️  No processes found on ${description}`);
    return 0;
  }
}

async function stopDevelopmentEnvironment() {
  let totalKilled = 0;

  // 1. Stop Docker containers (preserve volumes)
  console.log('🐳 Stopping Docker containers...');
  safeExec('docker-compose down', 'Docker Compose shutdown');

  // 2. Kill specific application processes by pattern
  console.log('\n🎯 Killing application processes...');
  
  // Kill main development processes
  totalKilled += killProcessesByPattern('scripts/start-dev.js', 'start-dev script');
  totalKilled += killProcessesByPattern('concurrently.*npm:dev', 'concurrently processes');
  
  // Kill server processes
  totalKilled += killProcessesByPattern('ts-node.*server.ts', 'API server (ts-node)');
  totalKilled += killProcessesByPattern('nodemon.*server.ts', 'nodemon processes');
  
  // Kill frontend processes
  totalKilled += killProcessesByPattern('vite', 'Vite dev server');
  totalKilled += killProcessesByPattern('esbuild.*--service', 'ESBuild processes');
  
  // Kill documentation processes
  totalKilled += killProcessesByPattern('docusaurus.*start', 'Docusaurus dev server');
  totalKilled += killProcessesByPattern('yarn.*start', 'Yarn processes');
  
  // Kill any Dgraph processes (in case running outside Docker)
  totalKilled += killProcessesByPattern('dgraph', 'Dgraph processes');

  // 3. Kill processes by port (backup method)
  console.log('\n🔌 Cleaning up ports...');
  const appPorts = [3000, 5173, 3001]; // API, Frontend, Docs
  const dgraphPorts = [8080, 8000, 5080, 6080, 9080]; // Dgraph ports
  
  totalKilled += killProcessesByPort(appPorts, 'application ports (3000, 5173, 3001)');
  totalKilled += killProcessesByPort(dgraphPorts, 'Dgraph ports (8080, 8000, 5080, 6080, 9080)');

  // 4. Final verification
  console.log('\n🔍 Final verification...');
  
  // Check if any of our key ports are still in use
  const stillRunning = [];
  const allPorts = [...appPorts, ...dgraphPorts];
  
  for (const port of allPorts) {
    try {
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (result) {
        stillRunning.push(`${port} (PID: ${result})`);
      }
    } catch (error) {
      // Port is free, which is what we want
    }
  }

  // 5. Report results
  console.log('\n📊 Cleanup Summary:');
  console.log(`   🔥 Total processes killed: ${totalKilled}`);
  
  if (stillRunning.length > 0) {
    console.log(`   ⚠️  Ports still in use: ${stillRunning.join(', ')}`);
    console.log('   💡 You may need to manually kill these processes');
  } else {
    console.log('   ✅ All application ports are now free');
  }
  
  console.log('\n🎉 Development environment cleanup complete!');
  console.log('💾 All data has been preserved (Docker volumes intact)');
}

// Run the cleanup
stopDevelopmentEnvironment().catch(error => {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
});

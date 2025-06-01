#!/usr/bin/env node

const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

let dockerStarted = false;
let devProcesses = null;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = colors.blue) {
  console.log(`${color}[DEV-ENV]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}[DEV-ENV ERROR]${colors.reset} ${message}`);
}

async function checkDockerStatus() {
  try {
    const { stdout } = await exec('docker-compose ps --format json');
    const containers = stdout.trim().split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    
    const runningContainers = containers.filter(c => c.State === 'running');
    return runningContainers.length > 0;
  } catch (err) {
    return false;
  }
}

async function startDockerContainers() {
  log('Starting Docker containers...', colors.blue);
  
  try {
    await exec('docker-compose up -d');
    dockerStarted = true;
    log('Docker containers started successfully', colors.green);
    
    // Wait a moment for containers to be ready
    log('Waiting for containers to be ready...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (err) {
    error(`Failed to start Docker containers: ${err.message}`);
    process.exit(1);
  }
}

async function stopDockerContainers() {
  if (dockerStarted) {
    log('Stopping Docker containers...', colors.yellow);
    try {
      await exec('docker-compose down');
      log('Docker containers stopped successfully', colors.green);
    } catch (err) {
      error(`Error stopping Docker containers: ${err.message}`);
    }
  }
}

function startDevServers() {
  log('Starting development servers...', colors.blue);
  
  // Start the existing dev command which uses concurrently
  devProcesses = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  devProcesses.on('error', (err) => {
    error(`Failed to start development servers: ${err.message}`);
    cleanup();
  });

  devProcesses.on('exit', (code) => {
    if (code !== 0) {
      error(`Development servers exited with code ${code}`);
    }
    cleanup();
  });

  log('Development servers started', colors.green);
}

async function cleanup() {
  log('Cleaning up...', colors.yellow);
  
  // Stop development processes
  if (devProcesses && !devProcesses.killed) {
    log('Stopping development servers...', colors.yellow);
    devProcesses.kill('SIGTERM');
    
    // Give processes time to gracefully shut down
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!devProcesses.killed) {
      devProcesses.kill('SIGKILL');
    }
  }
  
  // Stop Docker containers
  await stopDockerContainers();
  
  log('Cleanup complete', colors.green);
  process.exit(0);
}

// Handle various exit signals
process.on('SIGINT', () => {
  log('Received SIGINT (Ctrl+C), cleaning up...', colors.yellow);
  cleanup();
});

process.on('SIGTERM', () => {
  log('Received SIGTERM (terminal close), cleaning up...', colors.yellow);
  cleanup();
});

process.on('exit', () => {
  // This is synchronous, so we can't wait for promises
  if (dockerStarted) {
    console.log(`${colors.yellow}[DEV-ENV]${colors.reset} Process exiting, Docker containers may still be running`);
    console.log(`${colors.yellow}[DEV-ENV]${colors.reset} Run 'npm run stop-dev-env' if needed`);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  cleanup();
});

// Main execution
async function main() {
  try {
    log('Starting MiMS Graph development environment...', colors.green);
    
    // Check if Docker containers are already running
    const isDockerRunning = await checkDockerStatus();
    if (isDockerRunning) {
      log('Docker containers already running, skipping startup', colors.yellow);
      dockerStarted = true;
    } else {
      await startDockerContainers();
    }
    
    startDevServers();
    
    log('Development environment ready!', colors.green);
    log('Press Ctrl+C to stop all services and clean up', colors.blue);
    
  } catch (err) {
    error(`Failed to start development environment: ${err.message}`);
    await cleanup();
    process.exit(1);
  }
}

// Start the development environment
main();

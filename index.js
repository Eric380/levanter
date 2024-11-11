const { spawnSync, spawn } = require('child_process');
const { existsSync, writeFileSync } = require('fs');
const path = require('path');

const SESSION_ID = 'levanter_12132809622a87436aadecec43ce166543'; // Edit this line only, don't remove ' <- this symbol

function startApp() {
  const child = spawn('node', ['index.js'], { cwd: 'levanter', stdio: 'inherit' });

  child.on('exit', (code) => {
    if (code === 102) {
      console.log('restarting...');
      startApp();
    }
  });
}

function installDependencies() {
  console.log('Installing dependencies...');
  const installResult = spawnSync('yarn', ['install', '--force', '--non-interactive', '--network-concurrency', '3'], {
    cwd: 'levanter',
    stdio: 'inherit',
  });

  if (installResult.error) {
    throw new Error(`Failed to install dependencies: ${installResult.error.message}`);
  }
}

function checkDependencies() {
  if (!existsSync(path.resolve('levanter/package.json'))) {
    console.error('package.json not found!');
    process.exit(1);
  }

  try {
    console.log('Checking for missing dependencies...');
    spawnSync('yarn', ['check', '--verify-tree'], { cwd: 'levanter', stdio: 'inherit' });
    console.log('All dependencies are installed properly.');
  } catch (error) {
    console.error('Some dependencies are missing or incorrectly installed.');
    installDependencies();
  }
}

function cloneRepository() {
  console.log('Cloning the repository...');
  const cloneResult = spawnSync(
    'git',
    ['clone', 'https://github.com/lyfe00011/levanter.git', 'levanter'],
    {
      stdio: 'inherit',
    }
  );

  if (cloneResult.error) {
    throw new Error(`Failed to clone the repository: ${cloneResult.error.message}`);
  }

  const configPath = 'levanter/config.env';
  try {
    console.log('Writing to config.env...');
    writeFileSync(configPath, `VPS=true\nSESSION_ID=${SESSION_ID}`);
  } catch (err) {
    throw new Error(`Failed to write to config.env: ${err.message}`);
  }

  installDependencies();
}

if (!existsSync('levanter')) {
  cloneRepository();
  checkDependencies();
} else {
  checkDependencies();
}

startApp(); //delete this line to use pm2

// Uncomment below line to use pm2
// spawnSync('yarn', ['docker'], { cwd: 'levanter', stdio: 'inherit' });

const { Client, logger } = require('./lib/client')
const { DATABASE, VERSION } = require('./config')
const { stopInstance } = require('./lib/pm2')

const start = async () => {
  logger.info(`levanter ${VERSION}`)
  try {
    await DATABASE.authenticate({ retry: { max: 3 } })
  } catch (error) {
    const databaseUrl = process.env.DATABASE_URL
    logger.error({ msg: 'Unable to connect to the database', error: error.message, databaseUrl })
    return stopInstance()
  }
  try {
    const bot = new Client()
    await bot.connect()
  } catch (error) {
    logger.error(error)
  }
}
start()

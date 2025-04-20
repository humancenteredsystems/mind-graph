const { dgraphClient } = require('../api/dgraphClient');

async function dropAllData() {
  try {
    console.log('Attempting to drop all data from Dgraph...');
    const op = new dgraphClient.Operation();
    op.setDropAll(true);
    await dgraphClient.alter(op);
    console.log('✅ All data dropped successfully.');
  } catch (error) {
    console.error('❌ Failed to drop all data:', error);
    process.exit(1); // Exit with error code
  } finally {
    // It's good practice to close the client connection
    // dgraphClient.close(); // Assuming dgraphClient has a close method
  }
}

dropAllData();

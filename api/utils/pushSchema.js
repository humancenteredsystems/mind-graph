const axios = require('axios');

async function pushSchemaViaHttp(adminUrl, schema) {
  try {
    const response = await axios.post(adminUrl, schema, {
      headers: { 'Content-Type': 'application/graphql' },
    });

    // Dgraph admin schema push returns {"data":{"code":"Success","message":"Done"}} on success
    // We can add a check here if needed, but for now, assume 2xx status is success
    return { success: true, response: response.data };
  } catch (err) {
    console.error(`❌ Error pushing schema to ${adminUrl}:`, err.message);
    // Provide more details if available in the response
    const errorDetails = err.response?.data || err.message;
    return { success: false, error: errorDetails };
  }
}

module.exports = { pushSchemaViaHttp };

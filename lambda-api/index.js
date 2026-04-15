const { Client } = require('pg');
const queries = require('./db-queries');

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};

  const client = new Client({
    host: 'postgres-db',
    port: 5432,
    user: 'admin',
    password: 'password',
    database: 'products_db',
  });

  const tApiStart = Date.now();
  let products = [];

  try {
    await client.connect();
    
    const { queryStr, queryParams } = queries.getProductsQuery(qs);
    
    const res = await client.query(queryStr, queryParams);
    products = res.rows;
    
    const apiDelay = 800; // Simulated latency
    const totalLatency = Date.now() - tApiStart + apiDelay;
    const [createTable, insertMetric] = queries.setMetricsQueries();
    await client.query(createTable);
    await client.query(insertMetric, [totalLatency]);
    
  } catch (err) {
    console.error('Error executing query', err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await client.end();
  }

  // Simulamos latencia adicional de un ORM pesado o lógica de API
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(products),
  };
};

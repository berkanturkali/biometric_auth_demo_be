const { Pool } = require("pg");
const connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
}
const pool = new Pool(connectionConfig);

module.exports = pool;
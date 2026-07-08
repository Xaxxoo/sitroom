export default () => ({
  port: parseInt(process.env.PORT || '3001', 10) || 3001,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'sitroom',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'sitroom-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});

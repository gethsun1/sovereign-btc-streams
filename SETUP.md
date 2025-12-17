# Sovereign BTC Streams - Setup Guide

This guide will help you set up the Sovereign BTC Streams application for development and production.

## Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 15.x or higher
- **Docker** (optional, for containerized setup)
- **npm** or **yarn** package manager

## Quick Start (Docker)

The fastest way to get started is using Docker Compose:

```bash
# 1. Clone the repository
git clone <repository-url>
cd sovereign-btc-streams

# 2. Copy environment file
cp .env.example .env

# 3. Start the database
docker compose up -d db

# 4. Run database migrations
npx prisma migrate deploy

# 5. Start the application
docker compose up -d app

# Application is now running at http://localhost:3000
```

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:

```bash
# Database (required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streams?schema=public

# Node environment
NODE_ENV=development

# Security (set to false for local dev)
REQUIRE_WALLET_SIG=false

# API endpoints (use defaults or configure your own)
CHARMS_API_BASE=https://v8.charms.dev
SCROLLS_API_BASE=https://scrolls.charms.dev
```

### 3. Set Up Database

#### Option A: Using Docker

```bash
# Start PostgreSQL container
docker compose up -d db

# Database will be available at localhost:5432
```

#### Option B: Local PostgreSQL

Install PostgreSQL 15 and create a database:

```sql
CREATE DATABASE streams;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE streams TO postgres;
```

### 4. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Running Tests

### Install Test Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Production Deployment

### 1. Environment Configuration

Create a production `.env` file with the following changes:

```bash
# Set production mode
NODE_ENV=production

# Use strong database credentials
DATABASE_URL=postgresql://prod_user:strong_password@db-host:5432/streams?schema=public

# Enable security features
REQUIRE_WALLET_SIG=true

# Disable fallbacks
CHARMS_ALLOW_FALLBACK=false
ZKBTC_ALLOW_FALLBACK=false
GRAIL_ALLOW_FALLBACK=false

# Add real API keys
CHARMS_API_KEY=your_production_charms_key
ZKBTC_API_KEY=your_production_zkbtc_key
GRAIL_API_KEY=your_production_grail_key
```

### 2. Build Application

```bash
npm run build
```

### 3. Run Database Migrations

```bash
npm run migrate:deploy
```

### 4. Start Production Server

```bash
npm start
```

### 5. Health Checks

Verify the application is running:

```bash
# Health check
curl http://localhost:3000/api/health

# Readiness check
curl http://localhost:3000/api/ready
```

## Docker Production Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t sovereign-btc-streams .

# Run with docker-compose
docker compose up -d
```

### Environment Variables in Docker

Update `docker-compose.yml` to use production environment variables or use a `.env` file.

## Database Management

### Create a New Migration

```bash
npx prisma migrate dev --name migration_name
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

### View Database

```bash
npx prisma studio
```

## Monitoring and Observability

### Health Endpoints

- **Health Check**: `GET /api/health` - Returns application health status
- **Readiness Check**: `GET /api/ready` - Returns readiness for traffic

### Logs

Application logs are written to stdout. In production, configure log aggregation:

- **Recommended**: Use structured logging with Winston or Pino
- **Aggregation**: Send logs to CloudWatch, Datadog, or ELK stack

### Metrics

Currently, the application does not expose metrics. For production:

- Add Prometheus metrics endpoint
- Monitor API response times
- Track database connection pool usage
- Monitor rate limit hits

## Security Considerations

### Development

- Wallet signature verification is **disabled** by default
- Mock data is used when external APIs are unavailable
- HTTPS is not required

### Production

- **Enable** wallet signature verification (`REQUIRE_WALLET_SIG=true`)
- **Disable** all fallback mechanisms
- **Use** HTTPS/TLS for all connections
- **Implement** API key rotation
- **Enable** rate limiting (configured by default)
- **Use** secrets manager for sensitive data
- **Configure** CORS appropriately
- **Enable** security headers

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Check database logs
docker compose logs db
```

### Migration Failures

```bash
# View migration status
npx prisma migrate status

# Resolve migration issues
npx prisma migrate resolve --applied "migration_name"
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### TypeScript Errors After Adding Tests

```bash
# Install test dependencies
npm install

# The @types/jest package will resolve TypeScript errors
```

## API Rate Limits

The application implements rate limiting to prevent abuse:

- **Default**: 60 requests per minute per IP
- **Strict endpoints**: 10 requests per minute per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

Rate limits can be configured in `lib/rateLimit.ts`.

## Next Steps

1. **Testing**: Run `npm test` to verify all tests pass
2. **Development**: Start building features with `npm run dev`
3. **Documentation**: Read the main README.md for architecture details
4. **Production**: Follow the production deployment checklist

## Support

For issues and questions:

- Check the main README.md
- Review the codebase documentation
- Open an issue in the repository

## License

MIT

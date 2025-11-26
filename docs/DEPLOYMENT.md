# Deployment Documentation

This document describes the deployment process, environment configuration, and scaling strategies for NEX://VOID.

## Table of Contents

- [Environments](#environments)
- [Deployment Process](#deployment-process)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Rollback Procedures](#rollback-procedures)
- [Scaling Strategies](#scaling-strategies)

## Environments

### Development

- **Purpose**: Local development
- **Database**: Local PostgreSQL
- **Redis**: Local Redis (optional)
- **Firebase**: Development project

### Staging

- **Purpose**: Pre-production testing
- **URL**: `https://staging-nex-void.firebaseapp.com`
- **Database**: Staging PostgreSQL instance
- **Redis**: Staging Redis instance
- **Firebase**: `staging-nex-void` project

### Production

- **Purpose**: Live game
- **URL**: `https://nex-void.firebaseapp.com`
- **Database**: Production PostgreSQL instance
- **Redis**: Production Redis instance
- **Firebase**: `nex-void` project

## Deployment Process

### CI/CD Pipeline

Deployment is automated via GitHub Actions (`.github/workflows/ci.yml`):

1. **Test**: Run all tests
2. **Build**: Build client and server
3. **Security Scan**: Scan for vulnerabilities
4. **Deploy**: Deploy to staging/production

### Manual Deployment

#### Client Deployment

```bash
# Build client
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Server Deployment

```bash
# Build server
cd server
npm run build

# Deploy to server
# (Deployment method depends on hosting provider)
```

### Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Database migrations tested
- [ ] Environment variables updated
- [ ] Monitoring configured
- [ ] Backup created
- [ ] Rollback plan prepared

## Environment Configuration

### Client Environment Variables

```env
VITE_SERVER_URL=https://api.nex-void.com
VITE_WS_URL=wss://api.nex-void.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### Server Environment Variables

```env
NODE_ENV=production
PORT=2567
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
FIREBASE_PROJECT_ID=nex-void
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Firebase Configuration

1. Create Firebase project
2. Enable Authentication
3. Enable Hosting
4. Configure security rules
5. Set up environment variables

## Database Migrations

### Running Migrations

```bash
cd server
npm run migrate
```

### Creating Migrations

```bash
cd server
npm run migrate:create -- migration_name
```

### Migration Best Practices

- Always test migrations on staging first
- Create backups before running migrations
- Use transactions for data migrations
- Keep migrations small and focused
- Never modify existing migrations

### Rollback Migrations

```bash
cd server
npm run migrate:rollback
```

## Monitoring and Alerting

### Monitoring Setup

1. **Server Monitoring**: Configure monitoring service
2. **Client Monitoring**: Enable performance dashboard
3. **Database Monitoring**: Set up PostgreSQL monitoring
4. **Redis Monitoring**: Monitor cache performance

### Key Metrics

- **Server**: CPU, memory, response time, error rate
- **Database**: Connection pool, query time, slow queries
- **Redis**: Hit rate, memory usage, connection count
- **Game**: Player count, room count, message rate

### Alerting

Configure alerts for:

- High error rate (> 1% of requests)
- High response time (> 500ms p95)
- Low cache hit rate (< 70%)
- Database connection pool exhaustion
- High memory usage (> 80%)

### Monitoring Tools

- **Server**: Custom monitoring service + external tools
- **Database**: PostgreSQL logs + pg_stat_statements
- **Redis**: Redis INFO command + monitoring tools
- **Client**: Performance dashboard + analytics

## Rollback Procedures

### Client Rollback

```bash
# Rollback Firebase Hosting
firebase hosting:rollback

# Or deploy previous version
git checkout <previous-commit>
npm run build
firebase deploy --only hosting
```

### Server Rollback

1. Stop current server
2. Deploy previous version
3. Restart server
4. Verify functionality

### Database Rollback

```bash
# Rollback migrations
cd server
npm run migrate:rollback

# Restore from backup if needed
pg_restore -d database_name backup_file.dump
```

### Rollback Checklist

- [ ] Identify issue
- [ ] Determine rollback scope
- [ ] Notify team
- [ ] Execute rollback
- [ ] Verify functionality
- [ ] Document issue
- [ ] Plan fix

## Scaling Strategies

### Horizontal Scaling

#### Multiple Server Instances

1. Deploy multiple Colyseus server instances
2. Use load balancer to distribute traffic
3. Configure Redis pub/sub for cross-instance communication
4. Use sticky sessions or stateless design

#### Database Scaling

1. **Read Replicas**: Use read replicas for analytics
2. **Connection Pooling**: Configure appropriate pool sizes
3. **Query Optimization**: Optimize slow queries
4. **Partitioning**: Partition large tables if needed

#### Redis Scaling

1. **Redis Cluster**: Use Redis cluster for high availability
2. **Cache Sharding**: Shard cache by key prefix
3. **Memory Management**: Configure eviction policies

### Vertical Scaling

#### Server Resources

- Increase CPU cores for more concurrent connections
- Increase memory for larger player counts
- Use faster storage for database

#### Database Resources

- Increase memory for better caching
- Use SSD storage for faster I/O
- Optimize PostgreSQL configuration

### Performance Optimization

#### Server-Side

- Use spatial hash grids for efficient queries
- Implement delta compression for state updates
- Batch database writes
- Use connection pooling

#### Client-Side

- Implement object pooling
- Use instanced rendering
- Optimize asset loading
- Implement LOD system

### Load Testing

Before scaling, perform load testing:

1. **Test Scenarios**: Define test scenarios
2. **Load Generation**: Use load testing tools
3. **Monitor Metrics**: Track performance metrics
4. **Identify Bottlenecks**: Find performance bottlenecks
5. **Optimize**: Optimize identified bottlenecks

### Scaling Checklist

- [ ] Monitor current performance
- [ ] Identify scaling needs
- [ ] Plan scaling strategy
- [ ] Test scaling solution
- [ ] Deploy scaling changes
- [ ] Monitor after scaling
- [ ] Adjust as needed

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automated backups
- **Code**: Version control (Git)
- **Configuration**: Stored in version control
- **Assets**: Stored in Firebase Storage

### Recovery Procedures

1. **Database Failure**: Restore from backup
2. **Server Failure**: Deploy to new instance
3. **Data Loss**: Restore from backup
4. **Security Breach**: Rotate credentials, audit logs

### Recovery Time Objectives (RTO)

- **Database**: 1 hour
- **Server**: 30 minutes
- **Full System**: 2 hours

### Recovery Point Objectives (RPO)

- **Database**: 24 hours (daily backups)
- **Configuration**: Real-time (version control)
- **Assets**: Real-time (Firebase Storage)


# Docker Development Setup

This project includes a Docker Compose setup for local development with PostgreSQL and Next.js.

## Quick Start

1. **Start all services (PostgreSQL + Next.js):**
   ```bash
   docker-compose up -d
   # or
   pnpm docker:up
   ```

2. **Set up the database schema:**
   ```bash
   # Connect to the database container and run Prisma migrations
   docker-compose exec postgres psql -U postgres -d kopy -c "CREATE TABLE IF NOT EXISTS pastes (id TEXT PRIMARY KEY, encrypted_content TEXT NOT NULL, sender_name TEXT, password_hash TEXT, content_type TEXT DEFAULT 'text', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), expires_at TIMESTAMP WITH TIME ZONE NOT NULL);"
   
   # Or use Prisma to set up the database
   docker-compose exec nextjs pnpm prisma migrate dev
   ```

3. **Access the application:**
   - Next.js app: http://localhost:3000
   - PostgreSQL: localhost:5432

## Docker Commands

- `docker-compose up -d` or `pnpm docker:up` - Start all services
- `docker-compose down` or `pnpm docker:down` - Stop all services
- `docker-compose logs -f nextjs` - View Next.js logs
- `docker-compose logs -f postgres` or `pnpm docker:logs` - View database logs
- `docker-compose down -v` or `pnpm docker:reset` - Reset everything (removes all data)

## Services

### Next.js (Port 3000)
- Development server with hot reload
- Code is mounted as volume for live changes
- Automatically connects to PostgreSQL container

### PostgreSQL (Port 5432)
- **Host:** localhost (from host) or `postgres` (from Next.js container)
- **Port:** 5432
- **User:** postgres
- **Password:** postgres
- **Database:** kopy

## Accessing the Database

From your host machine:
```bash
psql -h localhost -U postgres -d kopy
# Password: postgres
```

From within Docker:
```bash
docker-compose exec postgres psql -U postgres -d kopy
```

Or use Prisma Studio (from host):
```bash
docker-compose exec nextjs pnpm prisma:studio
```

## Development Workflow

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Make code changes** - They'll be reflected immediately (hot reload)

3. **View logs:**
   ```bash
   docker-compose logs -f nextjs
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Notes

- The database data persists in a Docker volume (`postgres_data`)
- Code changes are reflected immediately due to volume mounting
- The Next.js container waits for PostgreSQL to be healthy before starting
- Both services are on the same Docker network for easy communication


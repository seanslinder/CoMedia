# CoMedia — Local run instructions

Prerequisites
- Node.js (v18+ recommended)
- Docker & Docker Compose (for local Postgres + Redis)

Quick start (recommended)

1. Start the DB and Redis services:

```bash
docker-compose up -d
```

2. Create a local env file and install server dependencies:

```bash
cd server
npm install
```

3. Apply Prisma migrations and generate the client:

```bash
# uses DATABASE_URL from .env (see .env.example or .env)
npx prisma migrate deploy
npx prisma generate
```

4. Start the backend in development mode:

```bash
npm run dev
```

5. Open the frontend in your browser:
- Open `frontend/index.html` (or other pages) directly in your browser.
- Or serve the frontend folder with a simple static server (optional):

```bash
# from project root
python3 -m http.server --directory frontend 8000
# then open http://localhost:8000
```

Environment variables
- Create `server/.env` with at least:

```
DATABASE_URL=postgres://admin:password@localhost:5432/comedia
PORT=3000
# optional: MEDIA_DIR=./media
```

Notes
- The app expects a Postgres database. The repository includes a `docker-compose.yml` that starts Postgres and Redis.
- If you change DB credentials, update `DATABASE_URL` accordingly and re-run the migrations.

Troubleshooting
- If the server fails to start, check `server` logs for Prisma/DB connection errors and ensure Docker Postgres is running and accessible.

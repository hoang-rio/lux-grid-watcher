# Docker Profiles For Multi-Tenant PostgreSQL

This folder contains two Docker Compose variants:

- `docker-compose.dev.yml`: development workflow with source mounted into container
- `docker-compose.prod.yml`: production-ready workflow with persistent PostgreSQL + app volumes

## 1) Development

1. Copy env template:

```bash
cp docker/env/dev.env.example docker/env/dev.env
```

2. Fill required variables in `docker/env/dev.env`:
- `DONGLE_SERIAL`
- `INVERT_SERIAL`
- `JWT_SECRET`
- Optional `FCM_*` / `SMTP_*`

3. Start stack:

```bash
docker compose -f docker/docker-compose.dev.yml --env-file docker/env/dev.env up -d --build
```

4. Stop stack:

```bash
docker compose -f docker/docker-compose.dev.yml --env-file docker/env/dev.env down
```

## 2) Production

1. Copy env template:

```bash
cp docker/env/prod.env.example docker/env/prod.env
```

2. Fill required secure values in `docker/env/prod.env`:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `DONGLE_SERIAL`
- `INVERT_SERIAL`
- HTTPS cert paths if `HTTPS_ENABLED=true`

3. Start stack:

```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/env/prod.env up -d --build
```

4. Stop stack:

```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/env/prod.env down
```

## Notes

- In PostgreSQL mode, app runs with multi-tenant auth (`/auth/*`) and user-scoped data.
- Compose command runs `alembic upgrade head` before app startup.
- Basic auth settings are kept for backward compatibility but are redundant in multi-tenant PG mode.

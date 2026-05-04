<div align="center">
  <h1>Mileage</h1>
  <p><strong>Self-hosted asset cost tracker</strong></p>
  <p>Turn purchase price, repairs, residual value, and holding time into a real daily cost.</p>

  <p>
    <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg"></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.2.0-44cc7a.svg">
    <img alt="Docker" src="https://img.shields.io/badge/docker-GHCR-2496ED.svg?logo=docker&logoColor=white">
    <img alt="Self hosted" src="https://img.shields.io/badge/self--hosted-Docker%20Compose-111827.svg">
  </p>

  <img src="docs/page.png" alt="Mileage dashboard" width="100%">
</div>

[中文文档](README.zh.md)

## Why

Most expensive things aren't one-time purchases. You replace a phone screen, swap a laptop battery, get an earbud repaired, and eventually resell it. Mileage tracks how much an item has *actually* cost across its entire ownership period.

It helps answer questions like:

- What is this item costing me per day, on average?
- Is it worth repairing, or should I upgrade?
- Should follow-up expenses count toward the total cost?
- Which assets have outlived their expected lifespan?

## Features

- Track electronics, appliances, furniture, vehicles, and other big-ticket items
- Record purchase price, date, channel, notes, and estimated residual value
- Three statuses: active, retired, sold
- Log follow-up expenses: repairs, battery replacement, maintenance, accessories, warranty
- Choose per expense whether it counts toward total cost of ownership
- OCR from order/receipt screenshots — review extracted fields before applying to the form
- Auto-calculated daily cost, annual cost, total invested, and archive stats
- Single password login — designed for personal self-hosting
- One-command deploy with Docker Compose
- English / Chinese UI toggle

## Quick Start

You need a machine with Docker and Docker Compose installed:

```bash
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/Mileage/main/compose.release.yml
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/Mileage/main/.env.example
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
APP_PASSWORD=your_login_password
API_TOKEN=a_long_random_secret
POSTGRES_PASSWORD=a_long_random_db_password
```

Generate random secrets with OpenSSL:

```bash
openssl rand -hex 32
```

Start:

```bash
docker compose -f compose.release.yml up -d
```

Access at:

```text
http://localhost:8088
```

Replace `localhost` with your server address when deploying remotely.

## Docker Images

Pre-built images are published on GitHub Container Registry:

```text
ghcr.io/moyuin-aka/mileage-api:0.2.0
ghcr.io/moyuin-aka/mileage-frontend:0.2.0
```

`compose.release.yml` uses `latest` by default. To pin a specific version, set in `.env`:

```bash
MILEAGE_API_IMAGE=ghcr.io/moyuin-aka/mileage-api:0.2.0
MILEAGE_FRONTEND_IMAGE=ghcr.io/moyuin-aka/mileage-frontend:0.2.0
```

## Upgrading

```bash
docker compose -f compose.release.yml pull
docker compose -f compose.release.yml up -d
```

Database migrations run automatically on API startup. Data is stored in the `pgdata` Docker volume — back it up before upgrading.

## Backup

Export the database:

```bash
docker compose -f compose.release.yml exec db pg_dump -U mileage mileage > mileage-backup.sql
```

Stop the service and ensure the target database is empty before restoring.

## Cost Model

The core formula:

```text
Daily Cost = (Purchase Price + Included Expenses - Recovery Amount) / Days Owned
```

Recovery amount rules:

- Sold items use the actual sale price
- Unsold items use the estimated residual value

Each follow-up expense can individually be included or excluded from the total cost. Battery replacements and screen repairs typically count; free warranty claims or record-only entries can be excluded.

## Roadmap

`0.2.0` adds OCR-assisted entry and English/Chinese UI switching on top of the original asset tracking, cost stats, follow-up expenses, and password protection.

`1.0.0` will polish the OCR experience for more reliable extraction from purchase screenshots, order confirmations, and receipts.

## Local Development

```bash
cp .env.example .env
cd frontend && npm install && npm run build && cd ..
docker compose up --build
```

Stack:

- React + TypeScript + Vite + Tailwind CSS
- Hono + TypeScript + PostgreSQL
- Docker Compose

## License

Mileage is licensed under the [GNU Affero General Public License v3.0](LICENSE).

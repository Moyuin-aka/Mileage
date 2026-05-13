<div align="center">
  <img src="frontend/public/favicon.svg" alt="Mileage icon" width="84" height="84">
  <h1>Mileage</h1>
  <p><strong>Self-hosted asset cost tracker for real daily ownership cost.</strong></p>

  <p>
    <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg"></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.4.0-44cc7a.svg">
    <img alt="Docker" src="https://img.shields.io/badge/docker-GHCR-2496ED.svg?logo=docker&logoColor=white">
    <img alt="Self hosted" src="https://img.shields.io/badge/self--hosted-Docker%20Compose-111827.svg">
  </p>
  <p>
    <img alt="React" src="https://img.shields.io/badge/React-20232A.svg?logo=react&logoColor=61DAFB">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white">
    <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF.svg?logo=vite&logoColor=white">
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4.svg?logo=tailwindcss&logoColor=white">
    <img alt="Hono" src="https://img.shields.io/badge/Hono-E36002.svg?logo=hono&logoColor=white">
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1.svg?logo=postgresql&logoColor=white">
    <img alt="Tauri" src="https://img.shields.io/badge/Tauri-24C8DB.svg?logo=tauri&logoColor=white">
  </p>

  <img src="docs/page.png" alt="Mileage dashboard" width="100%">
</div>

[中文文档](README.zh.md)

## Deploy First

Mileage is distributed as pre-built Docker images and a release Compose file.
It is meant to run on your own server, NAS, VPS, or homelab box.

Requirements:

- Docker
- Docker Compose
- A stable URL or IP address you can open from your browser or client app

Create a directory and download the release files:

```bash
mkdir mileage && cd mileage
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/Mileage/main/compose.release.yml
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/Mileage/main/.env.example
cp .env.example .env
```

Edit `.env`:

```bash
APP_PASSWORD=your-login-password
API_TOKEN=a-long-random-secret
POSTGRES_PASSWORD=a-long-random-db-password
FRONTEND_PORT=8088
```

Generate secrets when needed:

```bash
openssl rand -hex 32
```

Start Mileage:

```bash
docker compose -f compose.release.yml up -d
```

`compose.release.yml` uses the GHCR images above by default. If the images are
not present locally, Docker Compose pulls them automatically. No local image
build is required.

The release compose file uses:

```text
ghcr.io/moyuin-aka/mileage-api
ghcr.io/moyuin-aka/mileage-frontend
```

Open:

```text
http://localhost:8088
```

On a remote machine, replace `localhost` with your server domain or IP, for example:

```text
https://mileage.example.com
http://192.168.1.10:8088
```

## Update

```bash
docker compose -f compose.release.yml pull && docker compose -f compose.release.yml up -d
```

Migrations run automatically when the API starts. Data lives in the `pgdata` Docker volume; back it up before upgrading.

Pin a release image if you do not want `latest`:

```bash
MILEAGE_API_IMAGE=ghcr.io/moyuin-aka/mileage-api:0.4.0
MILEAGE_FRONTEND_IMAGE=ghcr.io/moyuin-aka/mileage-frontend:0.4.0
```

Backup:

```bash
docker compose -f compose.release.yml exec db pg_dump -U mileage mileage > mileage-backup.sql
```

## Client Apps

The web app is the main interface. Release builds may also include macOS, Windows, and Android APK client packages.

Client apps do not contain a separate database. On the login screen, enter:

- Service URL: the Mileage web address you deployed, such as `https://mileage.example.com`
- Access password: the `APP_PASSWORD` from your `.env`

## How To Use

1. Add an item with purchase price, date, category, channel, notes, and optional residual value.
2. For foreign-currency purchases, use the built-in reference FX converter and bank-fee field.
3. Add later expenses such as repairs, batteries, accessories, warranty work, or maintenance.
4. Choose whether each expense counts toward total ownership cost.
5. Review daily cost, dynamic residual value, reference lines, and the cost curve.
6. Use the replacement calculator when considering an upgrade.
7. Retire or sell the item when it leaves active use.

## Features

- Asset tracking for electronics, appliances, furniture, vehicles, and other durable goods
- Daily cost, annualized cost, total investment, archive stats, and cost curves
- Later-expense tracking with per-expense cost inclusion
- Sold / retired / active lifecycle states
- OCR-assisted entry from order screenshots, receipts, or payment pages
- Reference FX conversion powered by Frankfurter
- Dynamic salvage value model with resale profiles
- Replacement verdict with green/yellow/red decision states
- Old-device handling: sell for recovery, or keep as spare with willingness-to-pay
- Light / dark mode and English / Chinese UI
- Single-password self-hosted login
- Tauri client MVP for connecting to a remote Mileage service

## Replacement Logic

Mileage separates three related ideas:

1. Historical daily cost

```text
Daily Cost = (Purchase Price + Included Expenses - Recovery Amount) / Days Owned
```

Sold items use the actual sale price as recovery. Unsold items use the residual value; if residual value is left blank, electronic devices can use the dynamic salvage model.

2. Dynamic salvage value

```text
V(t) = P * (1 - r) ^ (t / 365)
```

`P` is purchase price, `r` is annual depreciation rate, and `t` is days used. Mileage ships with rough profiles: value-keeper, steady-service, and fast-drop.

3. Upgrade verdict

For upgrade decisions, Mileage compares future marginal cost rather than only historical sunk cost:

- Keeping the current main device: estimated next-year value loss + optional daily hassle cost
- Buying the new device: first-year depreciation, plus old-device opportunity cost if you keep the old one as a spare
- If you sell the old one, its current value is treated as recovery; if you keep it, the model asks what you are willing to pay per day for having it as a spare

The verdict preferences are inspired by:

- Weber-Fechner law / just noticeable difference: small relative differences may not feel meaningful
- Mental accounting and the "latte factor": small daily premiums can feel different from one large purchase
- Loss aversion and status quo bias: large daily or ratio increases should trigger a stronger warning
- Sunk cost framing: already-paid repairs are shown as context, but the upgrade decision focuses on future cost

This is a decision aid, not financial advice. Real replacement decisions also include emotion, reliability, work needs, software support, comfort, curiosity, aesthetics, and many other factors Mileage cannot fully quantify.

## Local Development

```bash
cp .env.example .env
cd frontend && npm install && npm run build && cd ..
docker compose up --build
```

## License

Mileage is licensed under the [GNU Affero General Public License v3.0](LICENSE).

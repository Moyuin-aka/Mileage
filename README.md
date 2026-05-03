# Mileage

长期主义资产追踪器，用来记录电子产品和大额物品，按持有时间计算日均成本，辅助判断是否继续使用或换购。

## 技术栈

- Frontend: React + TypeScript + Vite + Tailwind CSS + PWA
- Backend: Hono + TypeScript + PostgreSQL
- Deployment: Docker Compose

## 使用预构建镜像

镜像发布到 GitHub Container Registry：

```text
ghcr.io/moyuin-aka/mileage-api:latest
ghcr.io/moyuin-aka/mileage-frontend:latest
```

使用 release compose 启动：

```bash
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/mileage/main/compose.release.yml
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/mileage/main/.env.example
cp .env.example .env
```

编辑 `.env`，至少修改：

- `APP_PASSWORD`: 登录页密码
- `API_TOKEN`: 服务端会话签名密钥，建议用 `openssl rand -hex 32`
- `POSTGRES_PASSWORD`: PostgreSQL 密码，建议用 `openssl rand -hex 32`

启动：

```bash
docker compose -f compose.release.yml up -d
```

默认访问 `http://localhost:8088`。

## 本地 Docker 启动

1. 准备环境变量：

```bash
cp .env.example .env
```

编辑 `.env`：

- `APP_PASSWORD` 是登录页输入的专属密码
- `API_TOKEN` 是服务端会话签名密钥，不会再写入前端 bundle

2. 启动：

```bash
cd frontend && npm install && npm run build && cd ..
docker compose up --build
```

默认访问：

- 前端: `http://localhost:8088`
- 后端健康检查: `http://localhost:18080/health`

前端生产容器会把 `/api` 反代到后端容器。后端端口默认只绑定宿主机 `127.0.0.1`，公网只需要暴露前端端口。修改 `APP_PASSWORD` 或 `API_TOKEN` 后需要重启后端容器。

## 镜像发布

`.github/workflows/docker-publish.yml` 会在以下情况构建 Docker 镜像：

- push 到 `main`
- push `v*.*.*` tag
- pull request，仅构建校验，不推送
- 手动 `workflow_dispatch`

推送到 `main` 后会发布 `latest`、`main` 和 `sha-*` tag。版本 tag 例如 `v0.1.0` 会额外发布 `0.1.0` 和 `0.1` tag。

如果 GitHub Packages 默认没有公开，请在仓库的 Packages 页面把 `mileage-api` 和 `mileage-frontend` 设置为 public。

## 数据库

schema migration 位于：

```text
backend/migrations/001_init.sql
backend/migrations/002_item_expenses.sql
```

API 启动时会自动执行尚未应用的 migration，并记录到 `mileage_schema_migrations`。旧部署如果已经通过 PostgreSQL 初始化脚本建过表，API 会自动 baseline，不会重复执行旧 migration。

## API 认证

登录接口：

```text
POST /api/auth/login
```

请求体：

```json
{ "password": "<APP_PASSWORD>" }
```

响应会返回短期会话 token。除 `/api/auth/login` 外，所有 `/api/*` 请求都需要：

```http
Authorization: Bearer <session_token>
```

`/health` 不需要认证，供容器健康检查或反代探活使用。

## 核心 API

```text
GET    /api/items
GET    /api/items?status=active
GET    /api/items/:id
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id
PATCH  /api/items/:id/retire
PATCH  /api/items/:id/sell
GET    /api/items/:id/expenses
POST   /api/items/:id/expenses
DELETE /api/items/:id/expenses/:expenseId

POST   /api/auth/login
GET    /api/auth/session

GET    /api/stats/dashboard
GET    /api/stats/cost-trend/:id

POST   /api/ocr/parse
```

`DELETE` 是软删除，会写入 `deleted_at`。

## 成本计算

后端是成本计算的权威来源：

```text
daily_cost = (purchase_price + expense_total - recovered_value) / days_owned
annual_cost = daily_cost * 365
```

`recovered_value` 规则：

- 已转手物品使用 `sold_price`
- 其他物品使用 `residual_value`

`expense_total` 是勾选“计入总拥有成本”的后续支出合计，例如维修、换电池、保养、配件等。免费保修或只想留档的记录可以取消计入成本。

生命周期天数规则：

- 使用中：从 `purchase_date` 计算到今天
- 已退役：从 `purchase_date` 计算到 `retired_at`
- 已转手：从 `purchase_date` 计算到 `sold_at`

同一天购入的物品按至少 1 天计算，避免除以 0。

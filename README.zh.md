<div align="center">
  <img src="frontend/public/favicon.svg" alt="Mileage icon" width="84" height="84">
  <h1>Mileage</h1>
  <p><strong>自托管资产成本追踪器，帮你看清一件东西真实的日均拥有成本。</strong></p>

  <p>
    <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg"></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.3.0-44cc7a.svg">
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

[English README](README.md)

## 部署

Mileage 通过预构建 Docker 镜像和发布版 Compose 文件分发，适合部署在自己的服务器、NAS、VPS 或家庭实验室机器上。

需要准备：

- Docker
- Docker Compose
- 一个浏览器或客户端能访问到的域名 / IP

创建目录并下载发布文件：

```bash
mkdir mileage && cd mileage
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/Mileage/main/compose.release.yml
curl -fsSLO https://raw.githubusercontent.com/Moyuin-aka/Mileage/main/.env.example
cp .env.example .env
```

编辑 `.env`：

```bash
APP_PASSWORD=你的登录密码
API_TOKEN=一串足够长的随机密钥
POSTGRES_PASSWORD=一串足够长的数据库密码
FRONTEND_PORT=8088
```

需要随机密钥时可以用：

```bash
openssl rand -hex 32
```

启动：

```bash
docker compose -f compose.release.yml up -d
```

`compose.release.yml` 默认使用上面的 GHCR 镜像；本地没有镜像时，Docker Compose
会自动拉取。不需要在本地构建镜像。

发布版 Compose 使用：

```text
ghcr.io/moyuin-aka/mileage-api
ghcr.io/moyuin-aka/mileage-frontend
```

打开：

```text
http://localhost:8088
```

如果部署在远程机器上，把 `localhost` 换成你的服务地址，例如：

```text
https://mileage.example.com
http://192.168.1.10:8088
```

## 更新

```bash
docker compose -f compose.release.yml pull && docker compose -f compose.release.yml up -d
```

数据库迁移会在 API 启动时自动执行。数据保存在 Docker volume `pgdata` 中，升级前建议备份。

如果不想使用 `latest`，可以固定镜像版本：

```bash
MILEAGE_API_IMAGE=ghcr.io/moyuin-aka/mileage-api:0.3.0
MILEAGE_FRONTEND_IMAGE=ghcr.io/moyuin-aka/mileage-frontend:0.3.0
```

备份数据库：

```bash
docker compose -f compose.release.yml exec db pg_dump -U mileage mileage > mileage-backup.sql
```

## 客户端

网页端是主入口。Release 里也可以提供 macOS、Windows 和 Android APK 客户端包。

客户端本身不保存独立数据库。登录时填写：

- 服务地址：你部署好的 Mileage Web 地址，例如 `https://mileage.example.com`
- 专属密码：`.env` 里的 `APP_PASSWORD`

## 如何使用

1. 添加物品，填写购入价格、日期、类别、渠道、备注和可选残值。
2. 外币支付可以用内置参考汇率换算，并记录银行手续费。
3. 后续添加维修、换电池、配件、保修、保养等支出。
4. 每笔后续支出都可以选择是否计入总拥有成本。
5. 在详情页查看日均成本、动态残值、参考线和成本曲线。
6. 想换新时，用换购对比和决策红绿灯做参考。
7. 不再使用时，标记为退役或转手。

## 功能

- 记录电子产品、家电、家具、交通工具和其他耐用品
- 日均成本、年化成本、总投入、归档统计和成本曲线
- 后续支出记录，并支持逐条决定是否计入成本
- 使用中 / 已退役 / 已转手生命周期
- 订单截图、票据、付款页 OCR 辅助录入
- 基于 Frankfurter 的参考汇率换算
- 动态残值衰减模型和设备保值评级
- 换购对比与红 / 黄 / 绿决策建议
- 旧设备处置：卖掉回血，或留作备用并填写每日愿意支付金额
- Light / Dark 模式，中英文界面
- 单密码自托管登录
- Tauri 客户端 MVP，可连接远程 Mileage 服务

## 换购比较逻辑

Mileage 会把三个概念分开：

1. 历史日均成本

```text
日均成本 = (购入价格 + 计入成本的后续支出 - 回收金额) / 持有天数
```

已转手物品使用实际转手价格作为回收金额。未转手物品使用残值；如果电子产品没有手填残值，可以走动态残值模型。

2. 动态残值

```text
V(t) = P * (1 - r) ^ (t / 365)
```

`P` 是购入价，`r` 是年化折旧率，`t` 是已使用天数。Mileage 内置了理财产品级、稳定服役级、高台跳水级等粗略保值档位。

3. 换购决策

做换新判断时，Mileage 更关注未来边际成本，而不是只看历史沉没成本：

- 继续把当前设备当主力：估算未来一年的残值损耗 + 可选的每日卡顿 / 麻烦成本
- 买新设备：估算新设备首年折旧；如果旧设备留作备用，还会加入备用机机会成本
- 如果卖掉旧设备，当前残值视为回血；如果留作备用，系统会询问你愿意每天为这个备用价值支付多少

决策偏好参考了这些心理学 / 行为经济学概念：

- 韦伯-费希纳定律 / 最小可觉差：很小的相对差距，体感上可能并不明显
- 心理账户与拿铁因子：每天几块钱的溢价，和一次性大额支出的感受不同
- 损失厌恶与现状偏见：当日均成本或倍数明显升高时，需要更强提醒
- 沉没成本提醒：已经发生的维修费会显示为背景，但换购判断重点看未来成本

这些结论只适合作为参考，不是财务建议。真实换机还包含情绪价值、可靠性、工作需要、系统支持、手感、审美、新功能好奇心等 Mileage 无法完全量化的因素。

## 本地开发

```bash
cp .env.example .env
cd frontend && npm install && npm run build && cd ..
docker compose up --build
```

## License

Mileage is licensed under the [GNU Affero General Public License v3.0](LICENSE).

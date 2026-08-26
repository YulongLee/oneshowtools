# 牛来了桌面宠物

Electron + React + TypeScript 桌面客户端。正式发布前必须配置代码签名和安装包下载地址。

- Web 权益：`product_code=stock_pet`，1000 积分终身解锁
- 设备：每个权益最多 3 台
- 行情：默认由 OneShowTools 服务端读取腾讯财经公开行情，支持 A 股、港股和美股；桌面端不直接连接行情源
- 安全：`contextIsolation=true`、`nodeIntegration=false`、`sandbox=true`、IPC 白名单

## 行情配置

默认不需要 API Key。服务端会使用腾讯财经行情并做 12 秒短缓存：

- `STOCK_MARKET_PROVIDER=tencent_finance`：显式固定使用腾讯财经（默认行为）
- `STOCK_QUOTE_CACHE_TTL_MS`：行情缓存时长，默认 `12000`
- `STOCK_MARKET_CLOSED_DATES`：逗号分隔的 A 股休市日期，例如 `2026-10-01,2026-10-02`

腾讯财经接口属于可替换的数据适配层，适合产品验证与低成本运行，但没有面向本产品的商业 SLA。若后续需要持牌数据、稳定性承诺或更完整的交易所授权，可在后台保存正式行情服务，并设置 `STOCK_MARKET_PROVIDER=licensed_http`：

- `STOCK_QUOTE_API_URL`：授权行情供应商的批量报价接口，接收 `{ symbols }`，返回 `{ quotes }`
- `STOCK_SEARCH_API_URL`：股票搜索接口，接收 `{ query, market, limit }`，返回 `{ items }`
- `STOCK_QUOTE_API_KEY`：仅保存在服务端的供应商密钥

## 发布所需服务端配置

- 安装包默认发布到后台“对象存储”配置的私有 OSS 目录 `oneshowtools/releases/stock-pet/<版本>/`，下载时由后端签发短时有效地址。
- `STOCK_PET_WINDOWS_DOWNLOAD_URL`、`STOCK_PET_MACOS_DOWNLOAD_URL` 仅作为外部下载站的可选覆盖配置。
- `STOCK_PET_VERSION`：对外展示版本号

桌面端构建时通过 `ONESHOWTOOLS_API_URL` 指向正式平台，通过 `STOCK_PET_UPDATE_URL` 指向签名更新源。行情响应至少包含 `symbol`、`price`、`change`、`changePercent`、`updatedAt`；涨跌停由供应商返回 `limitStatus: "up" | "down"`，禁止客户端按固定 10% 推断。

本地开发：`npm install && npm run dev`。构建：`npm run build`。安装包：`npm run package`。

# trade-xyz-spread-panel

一个用于监控 Hyperliquid `xyz:BRENTOIL` 与 `xyz:CL` 价差的独立面板。

当前线上版本已经支持：

- 服务端常驻拉取与广播
- 只要已有双边数据，服务端就立即推送最新快照
- 图表层使用 ECharts，支持 dataZoom（滑条缩放 + 鼠标/触控 inside 缩放）
- 图表刷新后会自动恢复当前 tooltip 高亮位置，避免悬浮信息被实时推送冲掉
- 前端 WebSocket 实时展示
- 服务端小时级历史持久化
- 浏览器阈值提醒
- Nginx + systemd 部署

---

## 监控的价差口径

面板同时展示 3 组价差：

1. `BRENTOIL bid - CL ask`
   - 对应：**BRENTOIL 做空现价 - CL 做多现价**
   - 这是当前提醒和小时历史记录使用的主口径
2. `BRENTOIL ask - CL bid`
   - 对应：**BRENTOIL 做多现价 - CL 做空现价**
3. `BRENTOIL mid - CL mid`

### 为什么主口径用 `bid - ask`

因为这里按“**立即可成交**”定义现价：

- 做空现价取 **bid**
- 做多现价取 **ask**

所以：

- `BRENTOIL 做空现价 - CL 做多现价`
- 就等于 `BRENTOIL bid - CL ask`

这个口径比单纯看 mid 更接近真实执行成本。

---

## 当前功能

### 1. 实时数据

服务端通过 Hyperliquid WebSocket 订阅：

- `xyz:BRENTOIL`
- `xyz:CL`

然后把处理后的快照通过本地 WebSocket 推送给前端页面。

### 2. 服务端小时历史

历史**由服务端持续记录**，不依赖网页是否打开。

当前会为每个小时桶记录：

- `maxValue`：该小时最大 `BRENTOIL bid - CL ask`
- `maxTime`：该小时最大值出现时间
- `minValue`：该小时最小 `BRENTOIL bid - CL ask`
- `minTime`：该小时最小值出现时间

历史保存在：

- `data/history.json`

### 3. 浏览器提醒

提醒基于：

- `BRENTOIL bid - CL ask`

当前提醒阈值不是写死值，而是：

- **最近 3 个小时桶的最大价差均值**

触发方式：

- 浏览器通知（需要授权）
- 提示音严格 6 次一组
- 提醒冷却时间：10 秒

触发逻辑：

- 第一次上穿阈值时提醒一次
- 若价差一直保持在阈值上方，不会连续重复提醒
- 回到阈值下方后重新复位，下次再次上穿再提醒

### 4. 前端展示

页面会展示：

- 当前 3 组价差
- BRENTOIL / CL 最新 bid / ask / mid
- 当前提醒阈值
- 最近一个月小时级 max / min 曲线
- ECharts `dataZoom` 缩放条
- 小时记录表

时间显示为：

- **北京时间（Asia/Shanghai）**

---

## 项目结构

```text
trade-xyz-spread-panel/
├── data/                          # 服务端历史数据
│   └── history.json
├── deploy/
│   └── trade-xyz-spread-panel.service
├── dist/                          # 前端构建产物
├── server/
│   ├── historyStore.js            # 服务端历史存储逻辑
│   └── index.js                   # Express + WebSocket 后端
├── src/                           # 前端 React 代码
├── index.html
├── package.json
└── README.md
```

---

## 本地开发

安装依赖：

```bash
npm install
```

启动后端：

```bash
npm run server
```

启动前端开发服务：

```bash
npm run dev
```

默认职责：

- 前端：Vite dev server
- 后端：本地 `8787`（HTTP）+ `8788`（WebSocket）

---

## 生产构建

构建前端：

```bash
npm run build
```

构建产物目录：

```bash
dist/
```

---

## 服务端接口

### `GET /health`

返回当前最新快照：

```json
{
  "ok": true,
  "latest": {
    "ts": 1774752069251,
    "source": "ws",
    "spreads": {
      "shortBrentLongCl": 6.78,
      "longBrentShortCl": 6.84,
      "midMid": 6.81
    }
  }
}
```

### `GET /history`

返回服务端小时历史：

```json
{
  "ok": true,
  "history": [
    {
      "bucket": 1774753200000,
      "maxTime": 1774754272735,
      "minTime": 1774753277075,
      "maxValue": 6.93,
      "minValue": 6.73
    }
  ]
}
```

### `GET /ws`

前端通过 Nginx 代理连接到服务端 WebSocket。

---

## 前端配置

在 `index.html` 中可配置：

```html
<script>
  window.__PANEL_CONFIG__ = {
    pollIntervalMs: 5000,
    historyHours: 24 * 30,
    historyStorageKey: 'hl-oil-spread-history-v1'
  };
</script>
```

说明：

- `pollIntervalMs`
  - 保留字段，当前主链路已经是 WebSocket
- `historyHours`
  - 前端展示窗口，默认 30 天
- `historyStorageKey`
  - 兼容保留字段；当前小时历史以服务端 `data/history.json` 为准

> 注意：`alertThreshold` 已不再通过 `index.html` 手写配置。当前阈值由最近 3 个小时桶的平均值动态计算。

---

## systemd 部署

仓库内提供：

- `deploy/trade-xyz-spread-panel.service`

当前 service 已使用这台机器的绝对 Node 路径：

- `/home/ubuntu/nvm/versions/node/v24.14.0/bin/node`

安装：

```bash
sudo cp deploy/trade-xyz-spread-panel.service /etc/systemd/system/trade-xyz-spread-panel.service
sudo systemctl daemon-reload
sudo systemctl enable --now trade-xyz-spread-panel.service
sudo systemctl status trade-xyz-spread-panel.service
```

---

## Nginx 部署

前端静态文件建议部署到：

- `/var/www/trade-xyz-spread-panel`

Nginx 需要正确代理这几个路径：

- `/ws` → `127.0.0.1:8788`
- `/health` → `127.0.0.1:8787/health`
- `/history` → `127.0.0.1:8787/history`

一个可用示例：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /var/www/trade-xyz-spread-panel;
    index index.html;

    location /health {
        proxy_pass http://127.0.0.1:8787/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /history {
        proxy_pass http://127.0.0.1:8787/history;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8788;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 600s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 很重要

如果忘了代理 `/history`：

- 前端请求 `/history` 时会被 `location /` 吃掉
- 返回的会是 `index.html`
- 页面就会误以为“历史是空的”

这是部署时最容易踩的坑之一。

---

## 当前线上行为总结

当前线上版本的真实行为是：

- 服务端常驻记录小时历史
- 前端只负责展示和浏览器本地提醒
- 网页关闭后，服务端仍会继续记历史
- 小时历史不再依赖浏览器 localStorage
- 页面通过 `/history` 读取服务端记录

---

## 常见排查

### 1. 页面实时数据有，但历史是 0
先检查：

```bash
curl http://127.0.0.1:8787/history
curl http://127.0.0.1/history
curl http://你的公网IP/history
```

如果后端有数据，但公网 `/history` 返回的是 HTML，说明：

- Nginx 没正确代理 `/history`

### 2. 页面打不开
检查：

- 安全组是否放行 80
- Nginx 是否运行
- 静态目录是否已同步到 `/var/www/trade-xyz-spread-panel`

### 3. systemd 服务起不来
检查 service 文件里的 Node 路径是否正确。当前机器不能用：

- `/usr/bin/node`

应使用：

- `/home/ubuntu/nvm/versions/node/v24.14.0/bin/node`

---

## 脚本命令

```bash
# 后端开发
npm run server

# 前端开发
npm run dev

# 生产构建
npm run build
```

---

## 备注

- 数据源：Hyperliquid HTTP + WebSocket
- 品种：`xyz:BRENTOIL` 与 `xyz:CL`
- 历史记录主口径：`BRENTOIL bid - CL ask`
- 展示时区：北京时间

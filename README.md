# trade-xyz-spread-panel

参照 `trade.xyz-ostium` 的思路实现的一个独立面板，专门用于监控 Hyperliquid `xyz:BRENTOIL` 与 `xyz:CL` 的价差。

## 功能

1. 对比以下三种价差：
   - `BRENTOIL bid - CL ask`（对应：BRENTOIL 做空现价 - CL 做多现价）
   - `BRENTOIL ask - CL bid`
   - `BRENTOIL mid - CL mid`
2. 支持浏览器提醒：
   - 当 `BRENTOIL 做空现价 - CL 做多现价 > config.alertThreshold` 时触发
3. 记录近一个月小时级历史：
   - 每小时只保留该小时出现过的最大 `BRENTOIL bid - CL ask`
   - 记录格式为：`该小时的某个时刻 -> 差价值`
4. 支持打包：`npm run build`
5. 构建后产物在 `dist/`，可直接静态部署使用

## 配置

在 `index.html` 中修改：

```html
<script>
  window.__PANEL_CONFIG__ = {
    alertThreshold: 6,
    pollIntervalMs: 5000,
    historyHours: 24 * 30,
    historyStorageKey: 'hl-oil-spread-history-v1'
  };
</script>
```

- `alertThreshold`：提醒阈值
- `pollIntervalMs`：轮询毫秒数
- `historyHours`：历史保留时长，默认 30 天
- `historyStorageKey`：本地存储 key

## 本地运行

```bash
npm install
npm run dev
```

## 打包

```bash
npm install
npm run build
```

打包后目录：

```bash
dist/
```

## 说明

- 数据源：Hyperliquid `https://api.hyperliquid.xyz/info`
- 品种：`xyz:BRENTOIL` 与 `xyz:CL`
- 页面是纯前端实现，历史存储在浏览器 `localStorage`
- 提醒使用浏览器 Notification API，因此首次打开需要授权通知权限

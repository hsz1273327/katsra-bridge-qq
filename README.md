# katsra-bridge-qq

Official QQ Bot bridge plugin for [OpenKatsura](https://github.com/hsz1273327/openkatsura) — connect QQ private, group, and guild chats via the QQ Open Platform v2 WebSocket API.

OpenKatsura 官方 QQ 机器人桥接插件，通过 QQ 开放平台 v2 API 与 WebSocket 长连接接入 QQ 私信、群聊与频道，支持文本与图片/视频/语音/文件分片上传收发。

---

## Install / 安装

### Build & Install to Local Dev (`~/.katsura-dev`) / 构建并安装到本地开发环境

```bash
npm install
npm run install:dev
```

This builds a self-contained single-file ESM bundle (`dist/index.js` + `dist/manifest.json`) with zero runtime `node_modules` required and copies it to `~/.katsura-dev/plugins/bridge-qq/`.

### Install to Production (`~/.katsura`) / 安装到正式环境

```bash
npm run build
cp -r dist ~/.katsura/plugins/bridge-qq
```

Restart OpenKatsura, enable **Full-access community plugins** in **Settings → Plugins (设置 → 插件)**, then open **Settings → Social Platforms (设置 → 社交平台)** to configure your QQ Bot **AppID** and **AppSecret**.

---

## Development / 开发与测试

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

Apache-2.0

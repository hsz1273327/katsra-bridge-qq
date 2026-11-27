# Changelog / 更新日志

All notable changes to **katsra-bridge-qq** are documented in this file.  
本文档记录 **katsra-bridge-qq** 的所有重要变更。

## [1.0.0] - Unreleased

### Added / 新增
- Initial standalone QQ Bot bridge plugin extracted from OpenKatsura (`bridge-qq`), implementing the `HanaBridgeProviderDefinition` contract via `bridge:register-provider`. / 从 OpenKatsura 独立抽离的 QQ 机器人桥接插件，遵循 `bridge:register-provider` 插件契约。
- Full QQ Open Platform v2 WebSocket + REST adapter with chunked local file upload (`image` / `video` / `audio` / `document`) and secret masking. / 完整支持 QQ 开放平台 v2 WebSocket 长连接、REST 通信、媒体分片上传与凭据脱敏。
- Self-contained single-file ESM build (`dist/index.js` + `dist/manifest.json`, zero runtime `node_modules`) with Vitest unit tests and GitHub Actions CI. / 单文件自包含 ESM 打包（零运行时依赖）、独立 Vitest 单测与 GitHub Actions CI。

# OneShowTools 多端发布说明

## 已完成的客户端范围

网页端、App 和微信小程序共用同一套用户、积分、会员、工具发布、任务和
文件数据。网页继续使用 HttpOnly Cookie；App 与小程序使用服务端签发、可
随时撤销的 Bearer 会话。原有网页端不读取也不暴露原生客户端令牌。

当前原生客户端包括：

- 短信和邮箱登录；小程序支持微信 `wx.login` 服务端换取身份；
- 仪表盘、真实积分、会员状态；
- 后台已发布工具目录及真实模型就绪状态；
- AI 音乐生成、一键换装和食物营养分析；
- 任务中心、文件中心和账户退出。

工具结果仍由服务器保存到现有任务、积分账本和 OSS 文件中心，不在客户端
建立第二份业务数据。

## App 配置

1. 在 `apps/mobile/.env` 设置：

   `EXPO_PUBLIC_API_BASE_URL=https://www.gameforcast.top`

2. 在 `apps/mobile/app.json` 确认 iOS Bundle ID 和 Android Package Name。
3. 使用 Expo/EAS 分别创建 iOS 和 Android 签名及发布构建。
4. 上架前为数字积分和会员增加 Apple IAP/Google Play Billing 客户端适配；
   订单最终仍由 OneShowTools 后端验签并写入统一积分账本。

## 微信小程序配置

1. 将 `apps/miniprogram/project.config.json` 的 `appid` 替换成正式小程序
   AppID。
2. 服务端配置：

   - `WECHAT_MINIPROGRAM_APP_ID`
   - `WECHAT_MINIPROGRAM_APP_SECRET`

3. 在微信公众平台配置合法域名：

   - request：`https://www.gameforcast.top`
   - uploadFile：`https://www.gameforcast.top`
   - downloadFile：`https://www.gameforcast.top`

   ICP 备案完成并恢复主域名后，只需将以上 API 域名统一切回
   `https://www.oneshowtools.com`，不需要修改业务代码。

4. 小程序客户端只发送 `wx.login` 得到的临时 code；AppSecret、OpenID
   映射和 session_key 均只在服务器处理。
5. 将 `apps/miniprogram/.env.example` 复制为对应发布环境文件并设置
   `TARO_APP_API_BASE_URL`。

## 本地和持续集成验证

```bash
npm test
npm run build
npm run build:clients
```

`npm run deploy:prod` 仍然只发布现有 Web 和 API 服务，不会把 App 或小程序
构建物覆盖到网页目录。App 通过应用商店发布，小程序通过微信开发者工具或
小程序 CI 发布，三条发布链路彼此隔离。

## 正式上架前仍需完成

- Apple Developer、Google Play 或国内 Android 渠道账号；
- 微信小程序主体、AppID、隐私保护指引和类目审核；
- Apple IAP、Google Play Billing 与小程序微信支付；
- App 推送和微信订阅消息；
- 账号合并页面，让微信身份与已有手机号/邮箱账户主动绑定；
- iOS/Android 真机、弱网、相机/相册权限及审核账号测试。

# OneShowTools 短信登录配置

短信登录使用阿里云短信服务 `SendSms`（API 版本 `2017-05-25`）和阿里云官方 Node SDK。当前面向中国大陆手机号，邮箱密码登录保持不变。

## 上线前配置

在服务器环境变量中配置：

```dotenv
SMS_AUTH_ENABLED=true
ALIYUN_SMS_ACCESS_KEY_ID=
ALIYUN_SMS_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
ALIYUN_SMS_ENDPOINT=https://dysmsapi.aliyuncs.com/
ALIYUN_SMS_REGION_ID=cn-qingdao
SMS_CODE_TTL_SECONDS=300
SMS_PHONE_HASH_KEY=
```

也可以直接使用 OfferSteady 兼容变量：

```dotenv
OFFERSTEADY_AUTH_SMS_ENABLED=true
OFFERSTEADY_AUTH_SMS_PROVIDER_MODE=aliyun-dysmsapi
OFFERSTEADY_AUTH_SMS_ALIYUN_ENDPOINT=https://dysmsapi.aliyuncs.com
OFFERSTEADY_AUTH_SMS_ALIYUN_REGION_ID=cn-qingdao
OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_ID=
OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_SECRET=
OFFERSTEADY_AUTH_SMS_ALIYUN_SIGN_NAME=
OFFERSTEADY_AUTH_SMS_ALIYUN_TEMPLATE_CODE=
OFFERSTEADY_AUTH_SMS_CODE_PEPPER=
```

不要把号码认证服务 `dypnsapi.aliyuncs.com` 用作短信发送端点；登录验证码使用短信服务 `dysmsapi.aliyuncs.com`。

- AccessKey 应来自仅授予 `dysms:SendSms` 权限的 RAM 用户，不要使用主账号 AccessKey。
- `ALIYUN_SMS_SIGN_NAME` 必须与审核通过的签名完整一致。
- `ALIYUN_SMS_TEMPLATE_CODE` 必须是审核通过的验证码模板，变量名为 `${code}`。
- `SMS_PHONE_HASH_KEY` 使用稳定的随机字符串（建议至少 32 字节），上线后不要随意更换。
- 密钥只存在于服务端，不会进入网页构建产物或接口响应。

## 已实施的安全限制

- 验证码有效期 5 分钟，只能使用一次。
- 同一手机号 60 秒内不能重复发送；每小时最多 5 条，每天最多 10 条。
- 单个验证码最多尝试 5 次，同时叠加手机号和访问来源频控。
- 验证码仅保存带随机盐的摘要；手机号仅保存不可逆索引、国家码和末四位。
- 首次验证手机号自动创建账户并发放一次欢迎积分，重复验证不会重复创建账户或发放积分。
- 所有发送、失败、限流和验证结果都会写入安全审计事件。

export function apiErrorCode(payload) {
  if (typeof payload?.error === "string") return payload.error;
  if (typeof payload?.error?.code === "string") return payload.error.code;
  if (typeof payload?.code === "string") return payload.code;
  return "REQUEST_FAILED";
}

const zhMessages = {
  IMAGE_REQUIRED: "请先上传一张清晰的人物照片。",
  IMAGE_TOO_LARGE: "图片超过 25 MB，请压缩后重新上传。",
  USER_FILE_LIMIT_REACHED: "存储空间不足：本次需要保存 10 张结果，但会超过每位用户最多 100 个文件的上限。请先到文件中心删除旧文件，确保至少留出 10 个空位后重试。",
  INSUFFICIENT_CREDITS: "积分不足：本次生成需要扣除对应积分，请先充值积分或开通会员后重试。",
  IMAGE_PROVIDER_NOT_CONFIGURED: "图片编辑模型尚未配置或未启用，请管理员在后台完成图片编辑模型配置。",
  IMAGE_PROVIDER_AUTH_FAILED: "图片模型认证失败：API Key 无效、已失效或与当前工作空间不匹配，请管理员重新测试并保存配置。",
  IMAGE_PROVIDER_MODEL_UNAVAILABLE: "当前图片模型不可用：模型名称错误、尚未开通或当前工作空间没有调用权限，请管理员检查模型授权。",
  IMAGE_PROVIDER_QUOTA_EXCEEDED: "图片模型额度不足：上游账户余额或调用额度已用完，请管理员充值或更换可用模型。",
  IMAGE_PROVIDER_RATE_LIMITED: "图片模型请求过于频繁：10 张图片需要连续调用模型，当前触发了上游限流。请等待 1–2 分钟后重试。",
  IMAGE_PROVIDER_TIMEOUT: "图片模型生成超时：上游服务在限定时间内没有完成生成。请稍后重试，避免重复点击生成。",
  IMAGE_PROVIDER_UNREACHABLE: "暂时无法连接图片模型服务，请检查网络或上游服务状态后重试。",
  IMAGE_PROVIDER_UNAVAILABLE: "图片模型服务暂时不可用，请稍后重试。",
  IMAGE_PROVIDER_REJECTED: "图片模型拒绝了本次请求：图片内容、格式或生成要求可能不符合上游规则，请更换清晰人物图后重试。",
  IMAGE_PROVIDER_EMPTY_OUTPUT: "图片模型已响应但没有返回有效图片，请稍后重试或更换模型。",
  IMAGE_PROVIDER_OUTPUT_INVALID: "图片模型返回的文件无效，系统无法保存结果，请稍后重试或检查模型接口。",
};

const enMessages = {
  IMAGE_REQUIRED: "Upload a clear portrait first.",
  IMAGE_TOO_LARGE: "The image exceeds 25 MB. Compress it and upload again.",
  USER_FILE_LIMIT_REACHED: "Not enough storage: this run saves 10 results and would exceed the 100-file account limit. Delete old files in File Center and leave at least 10 free slots before retrying.",
  INSUFFICIENT_CREDITS: "Insufficient credits for this generation. Top up or subscribe, then try again.",
  IMAGE_PROVIDER_NOT_CONFIGURED: "The image editing model is not configured or enabled. An administrator must configure it first.",
  IMAGE_PROVIDER_AUTH_FAILED: "Model authentication failed. The API key may be invalid, expired, or assigned to another workspace.",
  IMAGE_PROVIDER_MODEL_UNAVAILABLE: "The selected image model is unavailable or not authorized for the configured workspace.",
  IMAGE_PROVIDER_QUOTA_EXCEEDED: "The upstream image-model balance or quota has been exhausted.",
  IMAGE_PROVIDER_RATE_LIMITED: "The image provider rate-limited this 10-image run. Wait 1–2 minutes before retrying.",
  IMAGE_PROVIDER_TIMEOUT: "The image provider did not finish within the allowed time. Try again later and avoid duplicate submissions.",
  IMAGE_PROVIDER_UNREACHABLE: "The image provider cannot be reached right now. Check the network or upstream service and retry.",
  IMAGE_PROVIDER_UNAVAILABLE: "The image provider is temporarily unavailable. Try again later.",
  IMAGE_PROVIDER_REJECTED: "The image provider rejected this request. Try a clearer portrait or revise the requested style.",
  IMAGE_PROVIDER_EMPTY_OUTPUT: "The provider responded without a valid image. Retry later or choose another model.",
  IMAGE_PROVIDER_OUTPUT_INVALID: "The provider returned an invalid image file, so the result could not be saved.",
};

export function slidingAncestorErrorMessage(code, locale = "zh-CN") {
  const messages = locale === "en" ? enMessages : zhMessages;
  return messages[code] || (locale === "en"
    ? `Generation failed (${code || "REQUEST_FAILED"}). Please retry or contact support with this error code.`
    : `生成失败（错误码：${code || "REQUEST_FAILED"}）。请稍后重试；如果仍然失败，请提交工单并附上该错误码。`);
}

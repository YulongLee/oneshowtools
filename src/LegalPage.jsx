import React, { useMemo, useState } from "react";

export const LEGAL_VERSION = "2026-08-24";

export function resolveLegalDocument(pathname) {
  const match = String(pathname || "").match(/^\/legal\/(terms|privacy|credits)\/?$/);
  return match?.[1] || null;
}

const documents = {
  "zh-CN": {
    terms: {
      title: "OneShowTools 用户服务协议",
      intro: "本协议适用于你访问和使用 OneShowTools 网站、工作台、AI 工具、任务中心、文件中心及相关服务。注册或使用服务前，请完整阅读并理解本协议。",
      sections: [
        ["1. 服务提供者与适用范围", "OneShowTools 由杭州临平知界智能技术运营。本协议构成你与运营者之间关于平台服务的约定。若某项工具另有专项规则，以专项规则与本协议共同适用；冲突部分以明确、较新的专项规则为准。"],
        ["2. 账号注册与安全", "平台支持邮箱或中国大陆手机号注册、登录。你应提供真实、可联系的信息，妥善保管密码和验证码，并对账号内操作负责。发现异常登录或账号被盗时，请立即通过站内客服提交工单。平台可对存在安全风险、违法违规或滥用行为的账号采取限制、暂停或终止措施。"],
        ["3. AI 工具与输出", "AI 结果具有概率性，可能不准确、不完整或不适合特定目的。你应在发布、决策或商业使用前自行审核，不应将其直接用于医疗、法律、金融、安全等高风险决策。不同工具可能调用平台模型或你自行配置的模型接口，页面显示的运行方式与费用规则为准。"],
        ["4. 用户内容与授权", "你保留对合法上传内容、提示词及生成结果依法享有的权利。为完成存储、模型处理、格式转换、内容交付和故障排查，你授予平台在提供服务所必需范围内处理这些内容的许可。你确认拥有上传内容所需的权利，不得侵犯肖像、隐私、著作权、商标或其他第三方权益。"],
        ["5. 禁止行为", "不得利用平台制作、传播违法有害内容，不得冒充他人、绕过安全限制、批量滥用接口、攻击系统、抓取非公开数据，或生成未经授权的人脸、声音及身份仿冒内容。平台可依据法律、监管要求和风险控制规则处置相关内容与账号。"],
        ["6. 积分、套餐与支付", "积分用于计量平台服务消耗，不是法定货币，不支持私下转让或兑换现金。具体价格、赠送积分、有效期和扣费量以购买页及任务确认页为准。支付能力未启用时，平台不会创建真实收费订单。详细规则见《积分、套餐与退款规则》。"],
        ["7. 知识产权", "平台软件、界面、品牌、文档和平台自有素材的权利归运营者或许可方所有。未经许可，不得复制、出售、反向工程或以易引起混淆的方式使用 OneShowTools 标识。"],
        ["8. 服务变更与可用性", "平台会持续改进工具，也可能因维护、模型供应商、网络、合规或不可抗力调整或暂停部分能力。对于重大不利变化，平台将通过页面公告或账号通知提供合理提示。"],
        ["9. 责任边界", "平台将在法律允许范围内提供服务。因用户输入、第三方模型或服务、网络故障、不可抗力造成的损失，按适用法律和双方责任承担。任何条款均不排除依法不得限制的消费者权利或法定责任。"],
        ["10. 终止、法律与争议", "你可在设置中心申请注销账号。协议终止不影响终止前已产生的权利义务。本协议适用中华人民共和国法律；发生争议时，双方应先友好协商或通过工单处理，协商不成的，依法向有管辖权的人民法院提起诉讼。"],
      ],
    },
    privacy: {
      title: "OneShowTools 隐私政策",
      intro: "本政策说明杭州临平知界智能技术作为个人信息处理者，如何在 OneShowTools 中收集、使用、存储、共享和保护你的个人信息，以及你如何行使相关权利。",
      sections: [
        ["1. 我们处理的信息", "账号信息：姓名或昵称、邮箱、手机号（以不可逆标识及末四位保存）、语言偏好；安全信息：会话、登录时间、设备和浏览器信息、经哈希处理的网络标识；服务数据：提示词、上传文件、生成结果、任务、项目、收藏和操作记录；交易数据：订单、积分流水、套餐状态和支付结果，不保存完整银行卡信息；支持数据：客服对话、工单及处理记录；模型连接：你提交的连接名称、接口地址、模型名及加密保存的 API Key。"],
        ["2. 处理目的与依据", "用于创建和保护账号、执行工具任务、保存和交付结果、计算积分、处理订单、提供客服、排查故障、防止欺诈、履行法定义务并改进产品。需要你同意的处理将征得同意；为履行合同、安全保障或法律义务所必需的处理，依适用法律进行。"],
        ["3. 文件与 AI 模型处理", "文件和生成结果可保存到平台配置的阿里云 OSS 私有目录，并按用户隔离。任务执行时，必要的输入会发送至平台配置或你自行选择的模型服务商。模型服务商、接口所在地区和保留规则可能不同，请勿上传不必要的敏感个人信息、商业秘密或无权处理的内容。"],
        ["4. 委托处理、共享与转移", "我们可能委托云存储、邮件、短信、AI 模型、监控及支付服务商处理完成服务所需的数据，并通过合同和权限控制限制用途。支付未启用时不会向支付机构创建真实订单。除取得你的单独同意、完成你主动选择的服务、企业重组依法承接，或法律要求外，我们不会向其他主体提供个人信息。"],
        ["5. 保存期限", "我们仅在实现目的所需期限内保存信息：账号存续期间保存账号与必要服务记录；会话按有效期自动失效；任务、文件和结果受页面显示的数量及套餐配额限制；账号注销进入 7 天安全等待期后执行删除或匿名化。因备份轮换、安全审计、争议处理或法定义务需要保留的，将在期限届满后清除或匿名化。"],
        ["6. 安全措施", "我们采用访问控制、最小权限、传输保护、密钥加密、日志审计和账号隔离等措施。互联网服务无法保证绝对安全；发生可能影响你权益的安全事件时，我们将依法采取补救措施并进行通知或报告。"],
        ["7. 你的权利", "你可在设置中心查看、更正资料、修改密码、管理会话、导出数据或申请注销账号；可在文件中心删除文件，在 AI Runtime 删除自配模型连接。对访问、更正、复制、删除、撤回同意或限制处理有疑问时，可通过站内智能客服提交工单。"],
        ["8. 未成年人", "平台主要面向具备相应民事行为能力的用户。未满 14 周岁的未成年人应在监护人同意和指导下使用；如发现未经有效同意处理了儿童个人信息，请通过工单联系我们。"],
        ["9. 跨境与第三方链接", "当你主动配置境外模型接口或选择可能在境外处理数据的服务时，数据可能被传输至对应地区；平台将在依法需要时另行告知并取得相应同意。第三方网站和服务适用其自身隐私政策。"],
        ["10. 更新与联系我们", "重大政策更新将通过显著页面提示、账号通知或重新征求同意的方式告知。有关个人信息的问题，请使用网页左侧智能客服提交“隐私与数据”工单；我们会核验身份并在法定期限内处理。"],
      ],
    },
    credits: {
      title: "OneShowTools 积分、套餐与退款规则",
      intro: "本规则说明积分充值、会员套餐、任务扣费、失败退回及退款处理方式。当前支付通道未配置或未开放时，购买按钮仅展示状态，不会产生真实扣款。",
      sections: [
        ["1. 积分性质", "积分是平台内部服务计量单位，不是存款、电子货币或投资产品，不产生利息，不支持用户间转让或兑换现金。免费、赠送和活动积分可设置不同有效期及使用范围。"],
        ["2. 价格与到账", "充值包、会员价格、基础积分、赠送积分、有效期和权益以结算前页面展示为准。支付成功并经服务端回调验证后才会记入积分账本或激活套餐；前端提示不作为到账依据。"],
        ["3. 扣费与失败退回", "任务提交前会展示预计消耗。平台采用积分账本记录每次获得和消耗；实际规则以工具页面为准。因平台或模型服务失败且未交付有效结果时，系统应自动退回对应任务积分；如未退回，可提交工单并附任务编号。"],
        ["4. 会员套餐", "会员按页面展示周期提供积分和权益，不代表无限使用。自动续费仅在结算页明确说明并经你确认后启用；你可在续费日前按页面指引取消。套餐变更、到期和剩余积分处理以购买时展示的规则为准。"],
        ["5. 退款", "重复扣款、支付成功但未到账、平台确认的系统故障等情形，可通过工单申请核查和退款。已实际消耗的积分、已交付的数字化服务或赠送积分原则上不支持退款，但法律另有强制规定的除外。退款将尽量原路退回，到账时间取决于支付机构。"],
        ["6. 争议与凭证", "积分明细、订单号、任务编号和服务端支付回调记录是核查依据。若对扣费有异议，请在发现后及时提交“支付与积分”工单。平台不会要求你通过私人账号转账。"],
        ["7. 规则更新", "价格与权益调整不会追溯改变已完成订单；对未到期套餐产生重大不利影响的调整将提前提示，并依法提供处理方案。"],
      ],
    },
  },
};

documents.en = {
  terms: { title: "OneShowTools Terms of Service", intro: "These Terms govern your access to OneShowTools, including its workspace, AI tools, tasks and file services.", sections: [
    ["1. Provider and scope", "OneShowTools is operated by Hangzhou Linping Zhijie Intelligent Technology. Tool-specific terms apply together with these Terms."],
    ["2. Account and security", "You must provide reachable account information, protect passwords and verification codes, and promptly report suspected compromise through an in-product support ticket."],
    ["3. AI tools and outputs", "AI output is probabilistic and may be inaccurate. Review it before publication or commercial use and do not rely on it for high-risk medical, legal, financial or safety decisions."],
    ["4. Your content", "You retain lawful rights in your content and grant us a limited license to process it only as needed to store, transform, generate and deliver the requested service. You must have all necessary rights to uploaded content."],
    ["5. Prohibited use", "Do not create unlawful content, impersonate others, bypass safeguards, abuse APIs, attack the service, scrape non-public data, or create unauthorized identity, face or voice imitations."],
    ["6. Credits and plans", "Credits are internal service units, not currency, and cannot be privately transferred or redeemed for cash. Prices, validity and task charges shown at checkout and task confirmation control."],
    ["7. Intellectual property", "The platform software, interface, brand, documentation and platform-owned assets belong to the operator or its licensors and may not be copied, sold or reverse engineered without permission."],
    ["8. Availability and changes", "Tools may change or pause for maintenance, provider availability, network, compliance or force majeure. Material adverse changes will receive reasonable notice where practicable."],
    ["9. Liability", "Responsibility is allocated under applicable law. Nothing in these Terms excludes non-waivable consumer rights or statutory liability."],
    ["10. Termination and disputes", "You may request account deletion in Settings. These Terms are governed by the laws of the People's Republic of China. Please first seek resolution through an in-product ticket."],
  ] },
  privacy: { title: "OneShowTools Privacy Policy", intro: "This Policy explains how OneShowTools processes account, security, content, billing and support data and how you may exercise your privacy rights.", sections: [
    ["1. Information we process", "We process account and contact data; hashed network and session data; prompts, files, outputs, tasks, projects and favorites; order and credit records; support tickets; and encrypted API keys for model connections you configure."],
    ["2. Purposes and legal basis", "We use data to create and secure accounts, run tools, store and deliver results, calculate credits, process orders, provide support, prevent abuse and meet legal obligations. We request consent when required."],
    ["3. Files and AI processing", "Files and outputs may be stored in a private, user-isolated Alibaba Cloud OSS path. Necessary inputs are sent to the platform or user-selected model provider. Avoid unnecessary sensitive data and content you lack authority to process."],
    ["4. Processors and sharing", "Cloud storage, email, SMS, AI, monitoring and payment vendors may process only data needed to provide their service. No live payment order is created while payments are disabled. We do not otherwise disclose personal data without a lawful basis."],
    ["5. Retention", "We retain data only as needed for the stated purposes. Sessions expire, files are subject to plan quotas, and account deletion has a seven-day safety period. Limited backups, security logs or dispute records may remain until their applicable cycle or legal period ends."],
    ["6. Security", "We use access controls, least privilege, transport protection, key encryption, audit logs and account isolation. No internet service can guarantee absolute security."],
    ["7. Your rights", "Settings lets you correct profile data, change passwords, manage sessions, export data or request deletion. You can delete files and personal model connections. Submit a Privacy & Data ticket for other access, correction, copy, deletion or consent requests."],
    ["8. Children", "The service is mainly intended for users with legal capacity. Children under 14 should use it only with verified guardian consent and supervision."],
    ["9. International processing", "A custom model endpoint you choose may process data outside your region. Where legally required, we will provide additional notice and obtain the appropriate consent."],
    ["10. Updates and contact", "Material updates will be announced prominently or require renewed consent. Contact us through the in-product support assistant and select Privacy & Data; we will verify identity and respond within the legally required period."],
  ] },
  credits: { title: "OneShowTools Credits, Plans and Refund Rules", intro: "These Rules explain credits, subscriptions, task charging, failed-task reversals and refunds. No real charge is made while payment channels are disabled.", sections: [
    ["1. Nature of credits", "Credits are internal service units, not deposits, e-money or investments. They do not earn interest and cannot be transferred between users or redeemed for cash."],
    ["2. Pricing and delivery", "The pre-checkout page controls the price, included and bonus credits, validity and benefits. Credits or plans activate only after a payment callback is verified by the server."],
    ["3. Charging and reversals", "Estimated cost is shown before submission. The credit ledger records usage. A platform or provider failure that delivers no valid result should automatically reverse the task charge."],
    ["4. Membership plans", "Plans provide periodic credits and benefits, not unlimited use. Auto-renewal is enabled only when clearly disclosed and confirmed at checkout."],
    ["5. Refunds", "Duplicate charges, paid-but-not-credited orders and confirmed system failures can be reviewed through a ticket. Used credits, delivered digital services and bonus credits are generally non-refundable unless mandatory law requires otherwise."],
    ["6. Disputes", "Credit entries, order IDs, task IDs and verified payment callbacks are used for review. We never ask you to transfer money to a personal account."],
    ["7. Updates", "Changes do not retroactively alter completed orders. Material adverse changes to an active plan will receive advance notice and a legally compliant remedy."],
  ] },
};

export function LegalPage({ type }) {
  const [locale, setLocale] = useState(() => localStorage.getItem("ost_locale") === "en" ? "en" : "zh-CN");
  const document = useMemo(() => documents[locale]?.[type] || documents["zh-CN"].terms, [locale, type]);
  const labels = locale === "en" ? { home: "Back to home", terms: "Terms", privacy: "Privacy", credits: "Credits & refunds", effective: "Effective / updated" } : { home: "返回首页", terms: "用户协议", privacy: "隐私政策", credits: "积分与退款", effective: "生效及更新日期" };
  const switchLocale = () => setLocale((value) => { const next = value === "en" ? "zh-CN" : "en"; localStorage.setItem("ost_locale", next); return next; });
  return <div className="legal-shell">
    <header className="legal-topbar"><a className="legal-brand" href="/"><span>1</span><strong>OneShow<span>Tools</span></strong></a><nav><a href="/legal/terms">{labels.terms}</a><a href="/legal/privacy">{labels.privacy}</a><a href="/legal/credits">{labels.credits}</a></nav><button onClick={switchLocale}>{locale === "en" ? "中文" : "EN"}</button></header>
    <main className="legal-document"><a className="legal-back" href="/">← {labels.home}</a><div className="legal-title"><p>LEGAL · ONESHOWTOOLS</p><h1>{document.title}</h1><span>{labels.effective}：{LEGAL_VERSION}</span></div>
      <p className="legal-intro">{document.intro}</p>
      {document.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
    </main>
    <footer className="legal-footer">© 2026 OneShowTools · 杭州临平知界智能技术</footer>
  </div>;
}

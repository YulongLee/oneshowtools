export const MBTI_ASSESSMENT_VERSION = "ost-mbti-v2";

const axisItems = {
  EI: [
    ["在热闹的交流中逐渐有精神", "独处一段时间后更有精神"], ["想到一个点子时倾向先说出来", "想到一个点子时倾向先在心里推演"],
    ["参加活动时会主动认识新朋友", "参加活动时更愿意和熟悉的人相处"], ["长时间独自工作会想找人聊聊", "长时间与人协作后会想独处恢复"],
    ["讨论能帮助我理清想法", "写下来能帮助我理清想法"], ["我通常很快融入陌生群体", "我通常先观察再融入陌生群体"],
    ["周末更想安排多人活动", "周末更想留出安静的个人时间"], ["面对新团队会主动打开话题", "面对新团队会等别人先打开话题"],
    ["连续开会对我影响不大", "连续开会会明显消耗我的精力"], ["我乐于同时维持广泛的人际联系", "我更重视少数深入而稳定的关系"],
    ["临场表达常比事前准备更自然", "准备充分后表达会更自然"], ["遇到好消息会立刻找人分享", "遇到好消息会先自己消化"],
    ["我喜欢在开放环境中工作", "我喜欢在少打扰的环境中工作"], ["陌生来电通常不会让我犹豫", "陌生来电前我会先想好要说什么"],
    ["参与越多互动越容易进入状态", "拥有完整安静时段越容易进入状态"], ["我常通过外部反馈确认方向", "我常通过内部判断确认方向"],
  ],
  SN: [
    ["我先关注可观察的事实", "我先关注事实背后的可能性"], ["说明越具体越容易让我行动", "说明给出方向后我愿意自行探索"],
    ["我更信任已经验证的方法", "我更愿意尝试尚未验证的新方法"], ["复盘时我重视发生了什么", "复盘时我重视这意味着什么"],
    ["我擅长发现实际细节的偏差", "我擅长发现整体模式的变化"], ["学习新技能时我喜欢先看示例", "学习新技能时我喜欢先理解原理"],
    ["清晰的步骤让我更安心", "自由的空间让我更有灵感"], ["我通常按字面理解一段话", "我通常会联想到言外之意"],
    ["我关注当下能落地的改进", "我关注未来可能产生的突破"], ["描述经历时我会保留具体过程", "描述经历时我会提炼核心主题"],
    ["做决定前我会核对现实条件", "做决定前我会推演多种未来"], ["我喜欢把复杂事物拆成具体动作", "我喜欢把零散信息连成整体图景"],
    ["可靠和可重复对我更重要", "新颖和可延展对我更重要"], ["我容易记住细节和原话", "我容易记住印象和主旨"],
    ["面对模糊任务我会先补齐信息", "面对模糊任务我会先提出假设"], ["我更常问‘现在怎么做’", "我更常问‘以后会怎样’"],
  ],
  TF: [
    ["做判断时我先检验逻辑是否一致", "做判断时我先考虑人会受到怎样的影响"], ["给反馈时我更重视准确直接", "给反馈时我更重视对方能否接受"],
    ["争论中有力的证据最能说服我", "争论中具体的处境最能打动我"], ["规则应尽量对所有人一致", "规则也应为特殊处境保留弹性"],
    ["我更容易发现推理漏洞", "我更容易察觉关系中的不舒服"], ["艰难决定中我能暂时放下个人感受", "艰难决定中我会把个人感受纳入权衡"],
    ["我欣赏冷静而清晰的沟通", "我欣赏真诚而有温度的沟通"], ["解决冲突时我先厘清责任和事实", "解决冲突时我先恢复理解和信任"],
    ["公平更接近统一标准", "公平也包含照顾不同需要"], ["我倾向指出方案中不合理的地方", "我倾向指出方案对人的潜在影响"],
    ["被质疑时我会解释依据", "被质疑时我会先理解对方的感受"], ["选择合作伙伴时能力匹配更重要", "选择合作伙伴时价值观契合更重要"],
    ["我会为了更优结果接受短期摩擦", "我会为了长期关系调整推进方式"], ["我常用原则判断一件事是否合适", "我常用同理判断一件事是否合适"],
    ["会议跑题时我会拉回结论", "会议紧张时我会先缓和气氛"], ["建议应该首先可验证", "建议应该首先让人愿意行动"],
  ],
  JP: [
    ["提前确定计划会让我更轻松", "保留选择空间会让我更轻松"], ["我喜欢先完成再放松", "我常在临近节点时集中完成"],
    ["清单和日程能提升我的效率", "灵活响应当下更能提升我的效率"], ["旅行前我倾向安排主要行程", "旅行时我倾向边走边决定"],
    ["做出决定后我希望尽快推进", "做出决定后我仍愿意继续比较"], ["我不喜欢任务长期处于未定状态", "我不介意任务暂时保持开放"],
    ["工作区有固定秩序更舒服", "工作区随手可用更舒服"], ["需求变化会打乱我的节奏", "需求变化常带来新的可能"],
    ["我会主动把大任务切成节点", "我会根据进展自然调整任务结构"], ["我更愿意遵循已经确认的安排", "我更愿意根据新情况改变安排"],
    ["提前交付让我更安心", "在截止前持续优化让我更安心"], ["一次只推进少数明确事项", "同时探索多个方向让我更有动力"],
    ["我喜欢明确的结论和责任人", "我喜欢开放的讨论和备选项"], ["突发邀请通常会影响我的安排", "突发邀请常让一天更有趣"],
    ["我倾向先定标准再开始", "我倾向先开始再逐步形成标准"], ["稳定节奏比临场发挥更可靠", "临场发挥比固定节奏更有活力"],
  ],
};

const axisCodes = { EI: ["E", "I"], SN: ["S", "N"], TF: ["T", "F"], JP: ["J", "P"] };
// Alternate the visible side of each preference. This removes the left-side
// response bias present in v1 while keeping the question wording original.
export const mbtiQuestions = Object.entries(axisItems).flatMap(([axis, items]) => items.map(([first, second], index) => {
  const [firstCode, secondCode] = axisCodes[axis];
  const reversed = index % 2 === 1;
  return {
    id: `${axis}-${index + 1}`,
    axis,
    left: reversed ? second : first,
    right: reversed ? first : second,
    leftCode: reversed ? secondCode : firstCode,
    rightCode: reversed ? firstCode : secondCode,
    reversed,
  };
}));

const typeNames = { INTJ: "系统策划型", INTP: "逻辑探索型", ENTJ: "目标统筹型", ENTP: "创新辩证型", INFJ: "洞察引导型", INFP: "价值理想型", ENFJ: "共情组织型", ENFP: "灵感连接型", ISTJ: "稳健执行型", ISFJ: "细致守护型", ESTJ: "结构管理型", ESFJ: "关系协调型", ISTP: "实践分析型", ISFP: "审美体验型", ESTP: "行动应变型", ESFP: "活力体验型" };

const letterNotes = {
  E: ["通过互动激活想法", "主动连接资源与反馈"], I: ["通过独处深化思考", "善于形成独立判断"],
  S: ["重视事实、细节与可执行性", "擅长让方案落到现实"], N: ["关注模式、含义与未来可能", "擅长跨信息建立联系"],
  T: ["偏好一致的逻辑和标准", "能够冷静拆解复杂问题"], F: ["关注价值、关系与人的体验", "能够感知沟通中的细微影响"],
  J: ["偏好计划、边界与完成感", "善于建立稳定推进节奏"], P: ["偏好探索、弹性与开放选择", "善于根据变化快速调整"],
};

function responseQuality(answers, durationSeconds) {
  const values = mbtiQuestions.map((item) => Number(answers[item.id]));
  const neutralRatio = values.filter((value) => value === 3).length / values.length;
  const counts = values.reduce((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {});
  const dominantRatio = Math.max(...Object.values(counts)) / values.length;
  let longestRun = 1;
  let run = 1;
  values.slice(1).forEach((value, index) => {
    run = value === values[index] ? run + 1 : 1;
    longestRun = Math.max(longestRun, run);
  });
  const warnings = [];
  if (neutralRatio >= 0.55) warnings.push("NEUTRAL_RESPONSE_PATTERN");
  if (dominantRatio >= 0.72 || longestRun >= 18) warnings.push("STRAIGHT_LINE_PATTERN");
  if (Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) > 0 && Number(durationSeconds) < 150) warnings.push("VERY_FAST_COMPLETION");
  return {
    status: warnings.length >= 2 ? "low" : warnings.length ? "review" : "good",
    warnings,
    neutralRatio: Math.round(neutralRatio * 100),
    dominantRatio: Math.round(dominantRatio * 100),
    durationSeconds: Number.isFinite(Number(durationSeconds)) ? Math.max(0, Math.round(Number(durationSeconds))) : null,
  };
}

export function scoreMbtiAnswers(answers = {}, options = {}) {
  if (!answers || typeof answers !== "object") throw Object.assign(new Error("MBTI_ANSWERS_INVALID"), { code: "MBTI_ANSWERS_INVALID", status: 400 });
  const missing = mbtiQuestions.filter((item) => !Number.isInteger(Number(answers[item.id])) || Number(answers[item.id]) < 1 || Number(answers[item.id]) > 5);
  if (missing.length) throw Object.assign(new Error("MBTI_ANSWERS_INCOMPLETE"), { code: "MBTI_ANSWERS_INCOMPLETE", status: 422, missing: missing.map((item) => item.id) });
  const dimensions = Object.entries(axisCodes).map(([axis, [leftCode, rightCode]]) => {
    const items = mbtiQuestions.filter((item) => item.axis === axis);
    // Map 1..5 to -2..2 and orient every item toward the canonical left code.
    const evidence = items.reduce((sum, item) => {
      const visualEvidence = 3 - Number(answers[item.id]);
      return sum + (item.leftCode === leftCode ? visualEvidence : -visualEvidence);
    }, 0);
    const maximum = items.length * 2;
    const normalized = evidence / maximum;
    const leftPercent = Math.round(50 + normalized * 50);
    const rightPercent = 100 - leftPercent;
    const clarity = Math.abs(normalized);
    const selected = clarity < 0.1 ? "X" : evidence > 0 ? leftCode : rightCode;
    return {
      axis, leftCode, rightCode, leftPercent, rightPercent, selected,
      clarity: Math.round(clarity * 100),
      closeness: selected === "X" ? "balanced" : clarity < 0.28 ? "moderate" : "clear",
    };
  });
  const type = dimensions.map((item) => item.selected).join("");
  const resolvedLetters = dimensions.map((item) => item.selected === "X" ? (item.leftPercent >= item.rightPercent ? item.leftCode : item.rightCode) : item.selected);
  const resolvedType = resolvedLetters.join("");
  const balancedNotes = {
    EI: "能在独立思考和外部交流之间切换，会根据情境选择恢复精力的方式。",
    SN: "既会关注可验证的事实，也愿意讨论模式、可能性与长期方向。",
    TF: "做决定时会同时考虑一致标准与相关人的实际感受。",
    JP: "既能使用计划推进，也愿意在新信息出现时调整路径。",
  };
  const strengths = [...new Set(dimensions.flatMap((dimension) => (
    dimension.selected === "X" ? [balancedNotes[dimension.axis]] : letterNotes[dimension.selected]
  )))].slice(0, 5);
  const adviceFor = (axis, letter) => {
    if (letter === "X") return {
      EI: "连续记录一周：哪些任务适合独立完成、哪些任务通过讨论更高效，再据此安排协作节奏。",
      SN: "面对重要问题时分别列出已知事实与未来假设，避免只依赖其中一种信息。",
      TF: "重要决定同时写下判断标准和利益相关者影响，观察哪一部分最容易被忽略。",
      JP: "为任务设置清晰交付点，同时预留可调整区间，找到适合自己的计划颗粒度。",
    }[axis];
    return {
      I: "重要协作前主动同步关键想法，避免别人只能猜测你的判断。",
      E: "为高强度互动安排安静复盘时间，减少被即时反馈牵着走。",
      N: "把灵感转成可验证的小步骤，并主动检查现实限制。",
      S: "在可靠方案之外，定期为长期可能性留出探索空间。",
      F: "遇到高风险决定时补充明确标准，区分共情与迁就。",
      T: "给出结论时补充对人的影响，让正确的方案也更容易被接受。",
      P: "为关键事项设置足够早的中间节点，避免选择过多拖慢完成。",
      J: "在计划中预留试错空间，允许新信息合理改变原定路径。",
    }[letter];
  };
  const growth = dimensions.map((dimension) => adviceFor(dimension.axis, dimension.selected));
  const quality = responseQuality(answers, options.durationSeconds);
  const ambiguousAxes = dimensions.filter((item) => item.selected === "X").map((item) => item.axis);
  return { type, resolvedType, typeName: ambiguousAxes.length ? "偏好尚未定型" : typeNames[type], dimensions, strengths, growth, quality, ambiguousAxes };
}

export function buildMbtiReport(answers, locale = "zh", options = {}) {
  const scored = scoreMbtiAnswers(answers, options);
  const uncertain = scored.ambiguousAxes.length > 0;
  const intro = locale === "en"
    ? uncertain ? `Your result is ${scored.type}. “X” marks a balanced dimension that this response set cannot distinguish reliably.` : `Your answers currently lean toward ${scored.type}, a pattern we call “${scored.typeName}”. Treat it as a conversation starter, not a fixed label.`
    : uncertain ? `你的结果为 ${scored.type}，“X”表示该维度在本次回答中较为均衡，当前证据不足以强行归类。` : `你的回答目前更接近 ${scored.type}「${scored.typeName}」。它描述的是此刻更常用的偏好，不是固定标签。`;
  const preference = (axis) => scored.dimensions.find((item) => item.axis === axis)?.selected;
  return {
    version: MBTI_ASSESSMENT_VERSION, questionCount: mbtiQuestions.length, ...scored, summary: intro,
    workStyle: preference("JP") === "X" ? "适合明确目标与交付节点，同时保留调整方法的空间。" : preference("JP") === "J" ? "在目标、边界和交付节点明确时更容易稳定发挥。" : "在目标清楚、方法可调整时更容易发挥创造力。",
    collaboration: preference("EI") === "X" ? "既需要独立思考，也能从及时讨论中受益；可按任务阶段切换协作方式。" : preference("EI") === "E" ? "通过及时讨论获得能量，适合用短周期同步推动协作。" : "需要独立思考时间，提前提供材料通常能获得更高质量的反馈。",
    learning: preference("SN") === "X" ? "结合具体案例与整体框架学习，并在两者之间反复验证。" : preference("SN") === "S" ? "从案例、演示与即时练习进入状态，再总结规律。" : "先理解框架与意义，再用案例验证并补足细节。",
    disclaimer: "本工具为 OneShowTools 原创自我探索问卷，并非 Myers-Briggs Company 官方 MBTI® 量表；结果不用于医疗诊断、心理诊断、招聘筛选或重大人生决策。",
  };
}

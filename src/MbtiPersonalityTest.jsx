import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, Briefcase, Check, CheckCircle, Clock, Copy, DownloadSimple, Heart, Lightbulb, ShieldCheck, Sparkle, SpinnerGap, Target, UsersThree, Warning } from "@phosphor-icons/react";
import { mbtiQuestions } from "../shared/mbti-assessment.mjs";
import "./mbti-personality-test.css";

const ui = {
  zh: { back: "返回工具市场", title: "MBTI 性格偏好自测", subtitle: "通过原创平衡题库，了解四维偏好、优势与成长建议", original: "原创平衡题库", types: "16 型与模糊维度", private: "结果私密", free: "免费测试", start: "开始测试", login: "登录后开始", questions: "64 题", duration: "8–12 分钟", introTitle: "为什么做性格偏好自测？", noRight: "请按你通常的真实反应选择，没有标准答案；不确定时可以选择中间项。", previous: "上一题", next: "下一题", submit: "生成我的报告", incomplete: "请完成当前题目后继续。", result: "你的性格偏好结果", retake: "重新测试", copy: "复制摘要", print: "导出 PDF", exporting: "正在生成 PDF…", history: "历史报告", strengths: "你可能更自然的优势", growth: "成长建议", dimensions: "四维偏好", work: "工作方式", collaboration: "协作偏好", learning: "学习方式", saved: "报告已保存到任务中心。" },
  en: { back: "Back to tools", title: "Personality Preference Self-Test", subtitle: "Explore four preference dimensions, strengths, and growth ideas through original scenarios", original: "Original bank", types: "16 patterns", private: "Private results", free: "Free", start: "Start assessment", login: "Sign in to start", questions: "64 questions", duration: "8–12 min", introTitle: "Why explore your preferences?", noRight: "Choose what is usually true for you. There are no right answers.", previous: "Previous", next: "Next", submit: "Build my report", incomplete: "Choose an answer before continuing.", result: "Your preference pattern", retake: "Retake", copy: "Copy summary", print: "Export PDF", exporting: "Building PDF…", history: "Past reports", strengths: "Natural strengths", growth: "Growth ideas", dimensions: "Four preferences", work: "Work style", collaboration: "Collaboration", learning: "Learning style", saved: "Saved to Task Center." },
};

const benefits = [
  [Brain, "了解真实的自己", "观察你在能量、信息、决策和行动上的习惯"],
  [Sparkle, "发现优势潜能", "识别更容易进入状态的环境与工作方式"],
  [UsersThree, "改善沟通协作", "理解自己和他人可能偏好的表达方式"],
  [Briefcase, "规划职业发展", "把偏好当作探索方向，而不是岗位限制"],
];
const reportBenefits = [
  [Sparkle, "性格类型详解", "16 种偏好组合解析"],
  [Target, "四维偏好雷达", "查看各维度倾向强度"],
  [Briefcase, "职业发展建议", "探索更自然的工作方式"],
  [Heart, "关系沟通指南", "理解不同表达与决策偏好"],
  [Brain, "学习工作风格", "获得可执行的效率建议"],
  [Lightbulb, "个性化成长建议", "把偏好转化为行动提示"],
];
const scale = [1, 2, 3, 4, 5];
const scaleLabels = ["非常像 A", "比较像 A", "两者都像", "比较像 B", "非常像 B"];
const qualityWarningText = {
  NEUTRAL_RESPONSE_PATTERN: "中间项选择较多",
  STRAIGHT_LINE_PATTERN: "连续使用相同选项",
  VERY_FAST_COMPLETION: "完成速度明显偏快",
  INCONSISTENT_DIMENSIONS: "部分维度回答前后不够一致",
};

export function MbtiPersonalityTest({ tool, task, historyTasks = [], locale = "zh", authenticated, onBack, onAuth, onCompleted }) {
  const t = ui[locale] || ui.zh;
  const storageKey = "oneshowtools_mbti_draft_v2";
  const startedAt = useRef(Date.now());
  const autoAdvanceTimer = useRef(null);
  const pdfDocumentRef = useRef(null);
  const [stage, setStage] = useState(task?.output?.type ? "result" : "intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; } });
  const [report, setReport] = useState(task?.output?.type ? task.output : null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const current = mbtiQuestions[index];
  const completed = Object.keys(answers).filter((id) => mbtiQuestions.some((item) => item.id === id)).length;
  const progress = Math.round((completed / mbtiQuestions.length) * 100);
  const histories = useMemo(() => historyTasks.filter((item) => item.toolSlug === tool.slug && item.output?.type).slice(0, 6), [historyTasks, tool.slug]);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(answers)); }, [answers]);
  useEffect(() => () => window.clearTimeout(autoAdvanceTimer.current), []);
  useEffect(() => { if (task?.output?.type) { setReport(task.output); setStage("result"); } }, [task?.id]);

  const begin = () => {
    if (!authenticated) return onAuth?.();
    const firstUnanswered = mbtiQuestions.findIndex((item) => !answers[item.id]);
    setIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
    startedAt.current = Date.now();
    setStage("quiz");
    setError("");
  };
  const choose = (value) => {
    const nextAnswers = { ...answers, [current.id]: value };
    setAnswers(nextAnswers);
    setError("");
    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = window.setTimeout(() => {
      if (index < mbtiQuestions.length - 1) {
        setIndex((currentIndex) => currentIndex + 1);
      } else submit(nextAnswers);
    }, 260);
  };
  const submit = async (answerSet = answers) => {
    const answerCount = Object.keys(answerSet).filter((id) => mbtiQuestions.some((item) => item.id === id)).length;
    if (answerCount !== mbtiQuestions.length) return setError(locale === "en" ? `Complete all ${mbtiQuestions.length} questions first.` : `请先完成全部 ${mbtiQuestions.length} 道题。`);
    setBusy(true); setError(""); setStage("generating");
    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const response = await fetch(`/api/tool-actions/${tool.slug}`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: answerSet, locale, durationSeconds }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.code || "REQUEST_FAILED");
      setReport(data.output); setStage("result"); localStorage.removeItem(storageKey); onCompleted?.(data);
    } catch (caught) { setStage("quiz"); setError(locale === "en" ? `Unable to build report (${caught.message}).` : `生成报告失败（${caught.message}），请稍后重试。`); }
    finally { setBusy(false); }
  };
  const restart = () => { setAnswers({}); setIndex(0); setReport(null); setStage("intro"); localStorage.removeItem(storageKey); };
  const copySummary = async () => report && navigator.clipboard?.writeText(`${report.type} ${report.typeName}\n${report.summary}\n结果稳定度：${report.stability ?? "--"}%\n${report.strengths.join("；")}`);
  const exportPdf = async () => {
    if (!report || !pdfDocumentRef.current || exporting) return;
    setExporting(true); setError("");
    try {
      const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([import("html2canvas"), import("pdf-lib")]);
      await document.fonts?.ready;
      const pdf = await PDFDocument.create();
      pdf.setTitle(`OneShowTools ${t.title} - ${report.type}`);
      pdf.setAuthor("OneShowTools");
      pdf.setSubject(locale === "en" ? "Personality preference self-assessment report" : "性格偏好自测报告");
      const pages = [...pdfDocumentRef.current.querySelectorAll(".mbti-pdf-page")];
      for (const pageNode of pages) {
        const canvas = await html2canvas(pageNode, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        const image = await pdf.embedJpg(canvas.toDataURL("image/jpeg", 0.94));
        const page = pdf.addPage([595.28, 841.89]);
        page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
      }
      const bytes = await pdf.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      anchor.href = url; anchor.download = `OneShowTools-MBTI-${report.type}-${date}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(locale === "en" ? "The PDF could not be generated. Please try again." : "PDF 生成失败，请稍后重试。");
    } finally { setExporting(false); }
  };

  return <main className="mbti-page">
    <button className="mbti-back" type="button" onClick={onBack}><ArrowLeft size={18} />{t.back}</button>
    <section className="mbti-hero">
      <img className="mbti-icon" src="/mbti/mbti-icon-v1.webp" alt="" />
      <div className="mbti-hero-copy"><span>PERSONALITY PREFERENCES</span><h1>{t.title}</h1><p>{t.subtitle}</p><div>{[t.original, t.types, t.private, t.free].map((item) => <em key={item}><CheckCircle size={15} weight="fill" />{item}</em>)}</div></div>
      <img className="mbti-hero-art" src="/mbti/mbti-hero-v1.webp" alt="" />
      <aside><b>16</b><small>{locale === "en" ? "patterns" : "种偏好组合"}</small><b>{t.duration}</b><small>{t.questions}</small></aside>
    </section>
    <nav className="mbti-steps" aria-label="Assessment progress">{[["intro", "开始测试"], ["quiz", "回答问题"], ["generating", "生成结果"], ["result", "查看报告"]].map(([key, label], stepIndex) => <span key={key} className={stage === key || (stage === "result" && stepIndex < 4) ? "active" : ""}><b>{stepIndex + 1}</b>{locale === "en" ? ["Start", "Questions", "Score", "Report"][stepIndex] : label}</span>)}</nav>

    {stage === "intro" && <div className="mbti-intro-grid">
      <section className="mbti-benefits"><h2>{t.introTitle}</h2>{benefits.map(([Icon, title, text]) => <article key={title}><i><Icon size={23} weight="duotone" /></i><div><strong>{locale === "en" ? ["Understand yourself", "Notice your strengths", "Improve collaboration", "Explore development"][benefits.findIndex((item) => item[1] === title)] : title}</strong><p>{locale === "en" ? ["See your habits across four preference dimensions.", "Notice environments where you more easily do your best.", "Understand different communication preferences.", "Use preferences as prompts, never as limits."][benefits.findIndex((item) => item[1] === title)] : text}</p></div></article>)}</section>
      <section className="mbti-start-card"><span>👋</span><h2>{locale === "en" ? "Welcome to your preference self-test" : "欢迎开始性格偏好自测"}</h2><p>{t.noRight}</p><div><article><Brain size={28} /><b>{t.original}</b><small>{locale === "en" ? "Original scenarios" : "基于公开理论维度"}</small></article><article><Target size={28} /><b>{t.types}</b><small>{locale === "en" ? "Four preference axes" : "四维偏好解读"}</small></article><article><ShieldCheck size={28} /><b>{t.private}</b><small>{locale === "en" ? "Saved to your account" : "仅你的账户可查看"}</small></article></div><button type="button" onClick={begin}>{authenticated ? t.start : t.login}<ArrowRight size={20} /></button><small><Clock size={15} />{t.duration} · {t.questions}</small></section>
      <aside className="mbti-sample"><small>SAMPLE REPORT</small><div><img src="/mbti/mbti-icon-v1.webp" alt="" /><span><b>INFJ</b><em>洞察引导型</em></span></div><p>示例仅展示报告结构。你的结果将由完整答题实时计算。</p><ul><li><Heart size={18} />关注意义与人的体验</li><li><Brain size={18} />善于连接复杂信息</li><li><Target size={18} />重视长期方向</li></ul></aside>
    </div>}
    {stage === "intro" && <section className="mbti-report-benefits"><h2>{locale === "en" ? "Your report includes" : "你将获得一份完整的偏好分析报告"}</h2><div>{reportBenefits.map(([Icon, title, text], featureIndex) => <article key={title}><i><Icon size={25} weight="duotone" /></i><span><strong>{locale === "en" ? ["Preference pattern", "Dimension profile", "Career prompts", "Relationship guide", "Learning style", "Growth ideas"][featureIndex] : title}</strong><small>{locale === "en" ? ["A practical 16-pattern summary", "See the strength of each preference", "Explore natural ways of working", "Understand communication styles", "Actionable productivity prompts", "Turn preferences into experiments"][featureIndex] : text}</small></span></article>)}</div></section>}

    {stage === "quiz" && <section className="mbti-quiz">
      <header><div><small>{locale === "en" ? "QUESTION" : "问题"} {index + 1} / {mbtiQuestions.length}</small><strong>{progress}%</strong></div><span><i style={{ width: `${progress}%` }} /></span></header>
      <div className="mbti-question-card" aria-live="polite"><div className="mbti-question-content" key={current.id}><span className="mbti-neutral-label">{locale === "en" ? "Think about your usual behavior" : "请按多数时候的真实行为选择"}</span><h2>{locale === "en" ? "Which statement is usually closer to you?" : "哪一种描述通常更接近你？"}</h2><div className="mbti-statements"><button type="button" onClick={() => choose(1)} className={answers[current.id] === 1 ? "selected" : ""}><small>A</small><strong>{current.left}</strong></button><button type="button" onClick={() => choose(5)} className={answers[current.id] === 5 ? "selected" : ""}><small>B</small><strong>{current.right}</strong></button></div><div className="mbti-scale">{scale.map((value, valueIndex) => <button key={value} className={answers[current.id] === value ? "selected" : ""} type="button" onClick={() => choose(value)} aria-label={scaleLabels[valueIndex]}><span>{value}</span><small>{scaleLabels[valueIndex]}</small></button>)}</div><p className="mbti-auto-next"><CheckCircle size={15} />{index === mbtiQuestions.length - 1 ? (locale === "en" ? "Your report will be generated after selection" : "选择后将自动生成报告") : (locale === "en" ? "Moves to the next question automatically" : "选择后自动进入下一题")}</p></div>{error && <p className="mbti-error"><Warning size={17} />{error}</p>}<footer><button type="button" disabled={!index} onClick={() => { window.clearTimeout(autoAdvanceTimer.current); setIndex((value) => Math.max(0, value - 1)); }}><ArrowLeft size={17} />{t.previous}</button><span>{locale === "en" ? "You can revise earlier answers at any time" : "可随时返回修改之前的答案"}</span></footer></div>
    </section>}

    {stage === "generating" && <section className="mbti-generating"><SpinnerGap className="spin" size={45} /><h2>{locale === "en" ? "Scoring your four preferences" : "正在计算你的四维偏好"}</h2><p>{locale === "en" ? "Building a practical, non-diagnostic report…" : "正在生成一份可回看的非诊断性报告…"}</p></section>}

    {stage === "result" && report && <section className="mbti-report">
      <header><div><small>{t.result}</small><h2>{report.type}<em>{report.typeName}</em></h2><p>{report.summary}</p>{Number.isFinite(report.stability) && <div className="mbti-stability"><ShieldCheck size={17} weight="duotone" /><span>{locale === "en" ? "Result stability" : "结果稳定度"}</span><b>{report.stability}%</b><small>{report.stability >= 65 ? (locale === "en" ? "Stable signal" : "偏好较稳定") : report.stability >= 40 ? (locale === "en" ? "Some close dimensions" : "部分维度接近") : (locale === "en" ? "Review against daily behavior" : "建议结合日常行为复核")}</small></div>}</div><img src="/mbti/mbti-icon-v1.webp" alt="" /></header>
      {!!report.ambiguousAxes?.length && <div className="mbti-boundary-note"><Lightbulb size={21} weight="duotone" /><div><strong>{locale === "en" ? "A close preference is not a wrong result" : "这不是“测错”，而是你的部分偏好非常接近"}</strong><p>{report.resolvedType && !report.resolvedType.includes("X") ? (locale === "en" ? `The nearest pattern is ${report.resolvedType}, but ${report.ambiguousAxes.join(", ")} is not stable enough to classify.` : `按本次答案，最接近 ${report.resolvedType}，但 ${report.ambiguousAxes.join("、")} 维度不足以稳定定型。`) : (locale === "en" ? "This response set cannot support a stable four-letter pattern. Consider retaking later in a relaxed setting." : "本次答案不足以给出稳定的四字母类型，建议隔一段时间在更放松的状态下复测。")}</p>{report.alternativeTypes?.length > 1 && <span>{locale === "en" ? "Possible patterns" : "可能组合"}：{report.alternativeTypes.slice(0, 6).join(" / ")}{report.alternativeTypes.length > 6 ? " …" : ""}</span>}</div></div>}
      <div className="mbti-dimensions"><h3>{t.dimensions}</h3>{report.dimensions.map((item) => <article key={item.axis}><div><b>{item.leftCode} {item.leftPercent}%</b><span>{item.axis}</span><b>{item.rightPercent}% {item.rightCode}</b></div><span><i style={{ width: `${item.leftPercent}%` }} /></span><small>{item.closeness === "balanced" ? (locale === "en" ? "Too close to call" : "接近边界，暂不强行定型") : item.closeness === "moderate" ? (locale === "en" ? `Slightly leans ${item.selected}` : `轻微偏向 ${item.selected} · 稳定度 ${item.confidence ?? "--"}%`) : (locale === "en" ? `Clearly leans ${item.selected}` : `较明确偏向 ${item.selected} · 稳定度 ${item.confidence ?? "--"}%`)}</small></article>)}</div>
      <div className="mbti-report-grid"><article><h3><Sparkle size={20} />{t.strengths}</h3><ul>{report.strengths.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></article><article><h3><Lightbulb size={20} />{t.growth}</h3><ul>{report.growth.map((item) => <li key={item}><ArrowRight size={16} />{item}</li>)}</ul></article></div>
      {report.quality && <div className={"mbti-quality " + report.quality.status}><ShieldCheck size={20} weight="duotone" /><div><strong>{locale === "en" ? "Response quality" : "答题质量"}：{report.quality.status === "good" ? (locale === "en" ? "Good" : "良好") : report.quality.status === "review" ? (locale === "en" ? "Review suggested" : "建议复核") : (locale === "en" ? "Low confidence" : "可信度较低")}</strong><p>{report.quality.warnings?.length ? (locale === "en" ? "Some response patterns reduce confidence. Consider a calm retake." : `发现：${report.quality.warnings.map((warning) => qualityWarningText[warning] || warning).join("、")}。建议在不受打扰时复测。`) : (locale === "en" ? "No obvious rushed or repetitive response pattern was detected." : "未发现明显的过快作答、机械重复或维度内矛盾。")}</p></div></div>}
      <div className="mbti-style-grid">{[[Briefcase, t.work, report.workStyle], [UsersThree, t.collaboration, report.collaboration], [Brain, t.learning, report.learning]].map(([Icon, title, body]) => <article key={title}><Icon size={24} /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      <p className="mbti-disclaimer"><ShieldCheck size={17} />{report.disclaimer}</p><footer><button type="button" onClick={restart}>{t.retake}</button><button type="button" onClick={copySummary}><Copy size={17} />{t.copy}</button><button className="primary" type="button" onClick={exportPdf} disabled={exporting}>{exporting ? <SpinnerGap className="spin" size={17} /> : <DownloadSimple size={17} />}{exporting ? t.exporting : t.print}</button></footer>
    </section>}
    {error && stage !== "quiz" && <p className="mbti-error"><Warning size={17} />{error}</p>}
    {!!histories.length && <section className="mbti-history"><h2><Clock size={20} />{t.history}</h2><div>{histories.map((item) => <button type="button" key={item.id} onClick={() => { setReport(item.output); setStage("result"); }}><img src="/mbti/mbti-icon-v1.webp" alt="" /><span><strong>{item.output.type} · {item.output.typeName}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span><ArrowRight size={17} /></button>)}</div></section>}
    {report && <div className="mbti-pdf-export-root" ref={pdfDocumentRef} aria-hidden="true">
      <section className="mbti-pdf-page">
        <header className="mbti-pdf-brand"><div><img src="/mbti/mbti-icon-v1.webp" alt="" /><span><strong>OneShowTools</strong><small>{locale === "en" ? "PERSONALITY PREFERENCE REPORT" : "性格偏好自测报告"}</small></span></div><em>{new Date(report.assessedAt || Date.now()).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}</em></header>
        <div className="mbti-pdf-result"><small>{t.result}</small><h1>{report.type}<span>{report.typeName}</span></h1><p>{report.summary}</p>{Number.isFinite(report.stability) && <div className="mbti-pdf-stability"><ShieldCheck size={14} /><b>{locale === "en" ? "Result stability" : "结果稳定度"} {report.stability}%</b><span>{report.stability >= 65 ? (locale === "en" ? "Stable preference signal" : "偏好信号较稳定") : (locale === "en" ? "Review close dimensions" : "请重点复核接近维度")}</span></div>}</div>
        <div className="mbti-pdf-section-title"><span>01</span><div><strong>{t.dimensions}</strong><small>{locale === "en" ? "Preference strength across four dimensions" : "四个维度的偏好强度与清晰度"}</small></div></div>
        <div className="mbti-pdf-dimensions">{report.dimensions.map((item) => <article key={item.axis}><header><b>{item.leftCode} {item.leftPercent}%</b><span>{item.axis}</span><b>{item.rightPercent}% {item.rightCode}</b></header><div><i style={{ width: `${item.leftPercent}%` }} /></div><small>{item.closeness === "balanced" ? (locale === "en" ? "Too close to call" : "接近边界，暂不强行定型") : (locale === "en" ? `Leans ${item.selected} · stability ${item.confidence ?? "--"}%` : `偏向 ${item.selected} · 稳定度 ${item.confidence ?? "--"}%`)}</small></article>)}</div>
        {report.quality && <div className={`mbti-pdf-quality ${report.quality.status}`}><ShieldCheck size={20} /><div><strong>{locale === "en" ? "Response quality" : "答题质量"} · {report.quality.status === "good" ? (locale === "en" ? "Good" : "良好") : (locale === "en" ? "Review suggested" : "建议复核")}</strong><p>{report.quality.warnings?.length ? (locale === "en" ? "Your response pattern may have been rushed or repetitive. Consider a retake when uninterrupted." : "检测到过快、中立项较多或重复选择，建议在不受打扰时复测。") : (locale === "en" ? "No obvious rushed or repetitive pattern was detected." : "未发现明显的过快作答或机械重复选择。")}</p></div></div>}
        <footer><span>OneShowTools · {locale === "en" ? "Private self-exploration report" : "私密自我探索报告"}</span><b>1 / 2</b></footer>
      </section>
      <section className="mbti-pdf-page">
        <header className="mbti-pdf-brand compact"><div><img src="/mbti/mbti-icon-v1.webp" alt="" /><span><strong>{report.type} · {report.typeName}</strong><small>{locale === "en" ? "ACTIONABLE PREFERENCE INSIGHTS" : "可执行的偏好洞察"}</small></span></div><em>OneShowTools</em></header>
        <div className="mbti-pdf-two-columns"><section><div className="mbti-pdf-section-title"><span>02</span><div><strong>{t.strengths}</strong><small>{locale === "en" ? "Patterns that may feel more natural" : "你可能更容易自然发挥的方式"}</small></div></div><ul>{report.strengths.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></section><section><div className="mbti-pdf-section-title"><span>03</span><div><strong>{t.growth}</strong><small>{locale === "en" ? "Small experiments for growth" : "可尝试的成长行动"}</small></div></div><ul>{report.growth.map((item) => <li key={item}><ArrowRight size={16} />{item}</li>)}</ul></section></div>
        <div className="mbti-pdf-section-title"><span>04</span><div><strong>{locale === "en" ? "How you may work best" : "适合你的工作与学习方式"}</strong><small>{locale === "en" ? "Use these as experiments, not fixed rules" : "把建议当作实验，而不是固定规则"}</small></div></div>
        <div className="mbti-pdf-styles">{[[Briefcase, t.work, report.workStyle], [UsersThree, t.collaboration, report.collaboration], [Brain, t.learning, report.learning]].map(([Icon, title, body]) => <article key={title}><Icon size={22} /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
        <div className="mbti-pdf-note"><ShieldCheck size={18} /><p>{report.disclaimer}</p></div>
        <footer><span>© 2026 OneShowTools · oneshowtools.com</span><b>2 / 2</b></footer>
      </section>
    </div>}
  </main>;
}

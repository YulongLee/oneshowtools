import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChartBar, CheckCircle, Clock, CloudArrowUp, Coins, ForkKnife, ShieldCheck, SpinnerGap, Warning, X } from "@phosphor-icons/react";

const labels = {
  zh: { title: "AI 食物热量分析", intro: "拍下这一餐，获得带误差区间的热量与营养估算。", upload: "上传食物照片", hint: "支持 JPG、PNG、WebP、HEIC，建议俯拍并让全部食物入镜", portion: "份量补充（可选）", portionPh: "例如：米饭约半碗、饮料 330ml、两人分食", context: "用餐场景", analyze: "开始分析", login: "登录后分析", history: "历史分析", noHistory: "完成分析后，结果会保存在任务记录中。", result: "本餐估算", calories: "热量", protein: "蛋白质", carbs: "碳水", fat: "脂肪", fiber: "膳食纤维", sodium: "钠", foods: "识别到的食物", uncertainty: "可能影响结果", tips: "记录建议", change: "更换图片", confidence: "可信度", high: "较高", medium: "中等", low: "较低" },
  en: { title: "AI Food Nutrition Analyzer", intro: "Photograph a meal and get calorie and nutrient estimates with honest ranges.", upload: "Upload a food photo", hint: "JPG, PNG, WebP or HEIC. Include the whole meal for a better estimate.", portion: "Portion notes (optional)", portionPh: "e.g. half a bowl of rice, 330 ml drink, shared by two", context: "Meal", analyze: "Analyze meal", login: "Sign in to analyze", history: "Analysis history", noHistory: "Completed analyses will remain available in task history.", result: "Meal estimate", calories: "Calories", protein: "Protein", carbs: "Carbs", fat: "Fat", fiber: "Fiber", sodium: "Sodium", foods: "Detected foods", uncertainty: "What may change this estimate", tips: "Logging tips", change: "Change photo", confidence: "Confidence", high: "High", medium: "Medium", low: "Low" },
};

const errors = {
  IMAGE_REQUIRED: "请先上传一张清晰的食物照片。", IMAGE_TOO_LARGE: "图片超过 12MB，请压缩后重试。", IMAGE_FORMAT_UNSUPPORTED: "暂不支持这种图片格式。", IMAGE_INVALID: "图片无法读取，请更换文件。", FOOD_NOT_RECOGNIZED: "没有识别到可分析的食物，请换一张完整餐食照片。", PLATFORM_MODEL_UNAVAILABLE: "食物营养识别模型尚未配置，请联系管理员。", MODEL_AUTH_FAILED: "模型密钥认证失败，请联系管理员检查配置。", MODEL_RATE_LIMITED: "模型请求较多，请稍后再试。", MODEL_TIMEOUT: "本次识别超时，请稍后重试。", INSUFFICIENT_CREDITS: "积分不足，请先充值积分。",
};
const metric = (value, unit) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;
const range = (value, unit) => `${metric(value?.min, unit)} – ${metric(value?.max, unit)}`;

export function FoodNutritionAnalyzer({ tool, task, historyTasks = [], locale = "zh", authenticated, onBack, onAuth, onCompleted }) {
  const t = labels[locale] || labels.zh;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [portionHint, setPortionHint] = useState("");
  const [mealContext, setMealContext] = useState("unspecified");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(task?.output || null);
  const history = useMemo(() => historyTasks.filter((item) => item.toolSlug === tool.slug && item.output?.total).slice(0, 10), [historyTasks, tool.slug]);

  useEffect(() => { if (task?.output?.total) setResult(task.output); }, [task?.id]);
  useEffect(() => {
    if (!file) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async () => {
    if (!authenticated) return onAuth?.();
    if (!file) return setError(errors.IMAGE_REQUIRED);
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("file", file); form.set("portionHint", portionHint); form.set("mealContext", mealContext); form.set("locale", locale);
      const response = await fetch(`/api/tool-actions/${tool.slug}`, { method: "POST", credentials: "include", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(data?.error?.code || "REQUEST_FAILED"), { status: response.status });
      setResult(data.output); onCompleted?.(data);
    } catch (caught) { setError((locale === "zh" && errors[caught.message]) || (locale === "en" ? `Analysis failed (${caught.message}). Please try again.` : `分析失败（${caught.message}），请稍后重试。`)); }
    finally { setBusy(false); }
  };

  const cards = result ? [
    [t.calories, result.total.caloriesKcal, " kcal"], [t.protein, result.total.proteinG, " g"], [t.carbs, result.total.carbsG, " g"],
    [t.fat, result.total.fatG, " g"], [t.fiber, result.total.fiberG, " g"], [t.sodium, result.total.sodiumMg, " mg"],
  ] : [];

  return <main className="food-analyzer-page">
    <header className="food-analyzer-hero"><button type="button" onClick={onBack}><ArrowLeft size={18} />{locale === "en" ? "Back" : "返回工具市场"}</button><div><span><ForkKnife size={20} />SMART NUTRITION</span><h1>{t.title}</h1><p>{t.intro}</p></div><aside><Coins size={19} /><strong>{tool.creditCost}</strong><small>{locale === "en" ? "credits / analysis" : "积分 / 次"}</small></aside></header>
    <div className="food-analyzer-grid">
      <section className="food-input-card">
        <div className={`food-dropzone ${preview ? "has-image" : ""}`}>
          {preview ? <><img src={preview} alt="" /><button type="button" onClick={() => { setFile(null); setResult(null); }}><X size={16} />{t.change}</button></> : <label><CloudArrowUp size={34} /><strong>{t.upload}</strong><small>{t.hint}</small><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); setError(""); }} /></label>}
        </div>
        <label className="food-field"><span>{t.portion}</span><textarea value={portionHint} onChange={(event) => setPortionHint(event.target.value)} placeholder={t.portionPh} maxLength={300} /></label>
        <label className="food-field"><span>{t.context}</span><select value={mealContext} onChange={(event) => setMealContext(event.target.value)}><option value="unspecified">—</option><option value="breakfast">{locale === "en" ? "Breakfast" : "早餐"}</option><option value="lunch">{locale === "en" ? "Lunch" : "午餐"}</option><option value="dinner">{locale === "en" ? "Dinner" : "晚餐"}</option><option value="snack">{locale === "en" ? "Snack" : "加餐"}</option></select></label>
        {error && <div className="food-error"><Warning size={18} />{error}</div>}
        <button className="food-analyze-button" type="button" onClick={submit} disabled={busy}>{busy ? <SpinnerGap className="spin" size={20} /> : <ChartBar size={20} />}{authenticated ? t.analyze : t.login}</button>
        <p className="food-privacy"><ShieldCheck size={16} />{locale === "en" ? "The source photo is processed for analysis and is not added to File Center." : "原始照片仅用于本次分析，不会写入文件中心；分析结论会保留在任务记录中。"}</p>
      </section>
      <section className="food-result-panel">
        {!result ? <div className="food-empty-result"><ChartBar size={42} /><h2>{t.result}</h2><p>{locale === "en" ? "Your calorie range, macros, detected foods, and uncertainty will appear here." : "这里会显示热量区间、主要营养素、食物明细和误差来源。"}</p></div> : <>
          <header><div><small>{t.result}</small><h2>{result.mealName}</h2><p>{result.summary}</p></div><span className={`food-confidence ${result.confidence}`}><CheckCircle size={15} />{t.confidence}：{t[result.confidence]}</span></header>
          <div className="food-metric-grid">{cards.map(([name, value, unit], index) => <article key={name} className={index === 0 ? "primary" : ""}><small>{name}</small><strong>{metric(value.estimate, unit)}</strong><em>{range(value, unit)}</em></article>)}</div>
          <h3>{t.foods}</h3><div className="food-items">{result.items.map((item, index) => <article key={`${item.name}-${index}`}><div><strong>{item.name}</strong><span>{item.portionDescription}{item.estimatedWeightG ? ` · ≈ ${item.estimatedWeightG}g` : ""}</span></div><b>{metric(item.caloriesKcal.estimate, " kcal")}</b><small>{range(item.caloriesKcal, " kcal")}</small></article>)}</div>
          {!!result.hiddenUncertainties?.length && <div className="food-notes warning"><h3>{t.uncertainty}</h3><ul>{result.hiddenUncertainties.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {!!result.tips?.length && <div className="food-notes"><h3>{t.tips}</h3><ul>{result.tips.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <p className="food-disclaimer"><ShieldCheck size={16} />{result.disclaimer}</p>
        </>}
      </section>
    </div>
    <section className="food-history"><h2><Clock size={20} />{t.history}</h2>{history.length ? <div>{history.map((item) => <button type="button" key={item.id} onClick={() => setResult(item.output)}><span>{item.output.mealName}</span><strong>{metric(item.output.total.caloriesKcal.estimate, " kcal")}</strong></button>)}</div> : <p>{t.noHistory}</p>}</section>
  </main>;
}

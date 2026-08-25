import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Camera, Check, CheckCircle, ChefHat, Clock, CloudArrowUp,
  Coins, ForkKnife, ImageSquare, ListChecks, Minus, Plus, ShieldCheck, ShoppingCart,
  Sparkle, SpinnerGap, Warning, X,
} from "@phosphor-icons/react";

const categoryNames = {
  zh: { protein: "肉蛋类", vegetable: "蔬菜类", staple: "主食豆制品", dairy: "乳制品", fruit: "水果", condiment: "调味品", other: "其他" },
  en: { protein: "Protein", vegetable: "Vegetables", staple: "Staples", dairy: "Dairy", fruit: "Fruit", condiment: "Condiments", other: "Other" },
};
const errors = {
  IMAGE_REQUIRED: "请先上传一张清晰的冰箱内部照片。",
  IMAGE_TOO_LARGE: "图片超过 15MB，请压缩后重试。",
  IMAGE_FORMAT_UNSUPPORTED: "暂不支持这种图片格式。",
  IMAGE_INVALID: "图片无法读取，请更换文件。",
  FRIDGE_FOOD_NOT_RECOGNIZED: "没有识别到可用食材，请拍摄打开冰箱后的内部区域。",
  FRIDGE_RECIPE_NOT_GENERATED: "食材已识别，但食谱生成失败，请重试。",
  FRIDGE_ANALYSIS_INVALID_RESPONSE: "模型返回格式异常，请重试或检查模型配置。",
  PLATFORM_MODEL_UNAVAILABLE: "OneShowModel 尚未配置，请联系管理员。",
  IMAGE_PROVIDER_NOT_CONFIGURED: "图片生成模型尚未配置，请管理员在后台模型管理中完成配置。",
  IMAGE_PROVIDER_AUTH_FAILED: "图片模型认证失败，请管理员检查 API Key 或工作空间。",
  IMAGE_PROVIDER_RATE_LIMITED: "图片模型当前限流，请稍后重试。",
  IMAGE_PROVIDER_TIMEOUT: "菜品图生成超时，请稍后重试。",
  MODEL_AUTH_FAILED: "OneShowModel 认证失败，请管理员检查模型配置。",
  MODEL_RATE_LIMITED: "识别请求较多，请稍后重试。",
  MODEL_TIMEOUT: "本次识别超时，请稍后重试。",
  INSUFFICIENT_CREDITS: "积分不足，请先充值积分。",
  FILE_QUOTA_EXCEEDED: "文件存储数量已达套餐上限，请先清理文件或升级套餐。",
};

export function FridgeRecipePlanner({ tool, task, historyTasks = [], locale = "zh", authenticated, onBack, onAuth, onCompleted }) {
  const zh = locale !== "en";
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [allergies, setAllergies] = useState("");
  const [maxCookTime, setMaxCookTime] = useState("45");
  const [servings, setServings] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(task?.output || null);
  const [resultImage, setResultImage] = useState(task?.output?.resultFileId ? `/api/files/${task.output.resultFileId}/download` : "");
  const [selectedRecipeId, setSelectedRecipeId] = useState(task?.output?.primaryRecipeId || "");
  const [hiddenIngredients, setHiddenIngredients] = useState(new Set());
  const history = useMemo(() => historyTasks.filter((item) => item.toolSlug === tool.slug && item.output?.recipes?.length).slice(0, 8), [historyTasks, tool.slug]);

  useEffect(() => {
    if (!file) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!task?.output?.recipes?.length) return;
    setResult(task.output); setSelectedRecipeId(task.output.primaryRecipeId || task.output.recipes[0].id);
    setResultImage(task.output.resultFileId ? `/api/files/${task.output.resultFileId}/download` : "");
  }, [task?.id]);

  const activeIngredients = useMemo(() => (result?.ingredients || []).filter((item) => !hiddenIngredients.has(item.id)), [result, hiddenIngredients]);
  const groupedIngredients = useMemo(() => activeIngredients.reduce((groups, item) => {
    (groups[item.category] ||= []).push(item); return groups;
  }, {}), [activeIngredients]);
  const selectedRecipe = result?.recipes?.find((item) => item.id === selectedRecipeId) || result?.recipes?.[0];

  const selectFile = (selected) => {
    setFile(selected || null); setResult(null); setResultImage(""); setError(""); setHiddenIngredients(new Set());
  };
  const submit = async () => {
    if (!authenticated) return onAuth?.();
    if (!file) return setError(errors.IMAGE_REQUIRED);
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("file", file); form.set("locale", locale); form.set("dietaryPreference", dietaryPreference);
      form.set("allergies", allergies); form.set("maxCookTime", maxCookTime); form.set("servings", servings);
      const response = await fetch(`/api/tool-actions/${tool.slug}`, { method: "POST", credentials: "include", body: form });
      const data = await response.json().catch(() => ({}));
      const code = data?.error?.code || "REQUEST_FAILED";
      if (!response.ok) throw new Error(code);
      setResult(data.output); setSelectedRecipeId(data.output.primaryRecipeId || data.output.recipes?.[0]?.id || "");
      setResultImage(data.file?.downloadUrl || ""); setHiddenIngredients(new Set()); onCompleted?.(data);
    } catch (caught) {
      setError(zh ? (errors[caught.message] || `生成失败（错误码：${caught.message}），请稍后重试。`) : `Generation failed (${caught.message}). Please try again.`);
    } finally { setBusy(false); }
  };

  return <main className="fridge-recipe-page">
    <header className="fridge-recipe-head">
      <button type="button" onClick={onBack}><ArrowLeft size={17} />{zh ? "返回工具市场" : "Back to marketplace"}</button>
      <div className="fridge-title-icon"><img src="/fridge-recipes/fridge-recipe-icon-v1.webp" alt="" /></div>
      <div><h1>{zh ? "AI 冰箱食谱" : "AI Fridge Recipe Planner"}</h1><p>{zh ? "拍一拍冰箱，AI 识别食材，推荐真正能做的菜和完整步骤" : "Photograph your fridge and turn visible ingredients into practical recipes."}</p></div>
      <span className="fridge-paid"><Coins size={18} /><strong>{tool.creditCost}</strong>{zh ? "积分 / 次" : "credits / run"}</span>
    </header>

    <nav className="fridge-flow">
      {[[Camera, zh ? "拍照识别" : "Upload", zh ? "上传冰箱照片" : "Fridge photo"], [ListChecks, zh ? "识别食材" : "Ingredients", zh ? "AI 识别并确认" : "Review detected items"], [Sparkle, zh ? "推荐食谱" : "Recipes", zh ? "生成 6 道推荐" : "Six matched recipes"], [ChefHat, zh ? "查看步骤" : "Cook", zh ? "获取制作流程" : "Follow the steps"]].map(([Icon, title, subtitle], index) => <div key={title} className={(result ? 3 : file ? 1 : 0) >= index ? "active" : ""}><i>{index + 1}</i><Icon size={20} /><span><strong>{title}</strong><small>{subtitle}</small></span>{index < 3 && <ArrowRight size={20} />}</div>)}
    </nav>

    <section className="fridge-workspace">
      <div className="fridge-photo-column">
        <h2><i>1</i>{zh ? "拍摄你的冰箱" : "Photograph your fridge"}</h2>
        <div className={`fridge-upload ${preview ? "has-preview" : ""}`}>
          {preview ? <><img src={preview} alt={zh ? "冰箱照片预览" : "Fridge preview"} /><button type="button" onClick={() => selectFile(null)}><X size={16} />{zh ? "移除" : "Remove"}</button></> : <label><CloudArrowUp size={34} /><strong>{zh ? "上传冰箱照片" : "Upload a fridge photo"}</strong><small>{zh ? "打开冰箱门后拍摄，JPG / PNG / WebP / HEIC，最大 15MB" : "Open the door and capture the shelves, max 15MB"}</small><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => selectFile(event.target.files?.[0])} /></label>}
        </div>
        <div className="fridge-settings">
          <label><span>{zh ? "饮食偏好" : "Diet"}</span><input value={dietaryPreference} onChange={(event) => setDietaryPreference(event.target.value)} placeholder={zh ? "例如：少油、素食、高蛋白" : "e.g. vegetarian, high protein"} maxLength={100} /></label>
          <label><span>{zh ? "过敏原 / 忌口" : "Allergies"}</span><input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder={zh ? "例如：花生、海鲜" : "e.g. peanuts, shellfish"} maxLength={180} /></label>
          <div><label><span>{zh ? "最长时间" : "Max time"}</span><select value={maxCookTime} onChange={(event) => setMaxCookTime(event.target.value)}><option value="20">20 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label><label><span>{zh ? "用餐人数" : "Servings"}</span><span className="serving-stepper"><button type="button" onClick={() => setServings(String(Math.max(1, Number(servings) - 1)))}><Minus /></button><b>{servings}</b><button type="button" onClick={() => setServings(String(Math.min(12, Number(servings) + 1)))}><Plus /></button></span></label></div>
        </div>
        {error && <p className="fridge-error"><Warning size={18} />{error}</p>}
        <button className="fridge-submit" type="button" disabled={busy} onClick={submit}>{busy ? <SpinnerGap className="spin" /> : <Sparkle />} {authenticated ? (busy ? (zh ? "正在识别并生成食谱…" : "Analyzing…") : (zh ? "识别食材并生成食谱" : "Generate recipes")) : (zh ? "登录后开始" : "Sign in to start")}</button>
        <p className="fridge-privacy"><ShieldCheck size={15} />{zh ? "原始冰箱照片仅用于识别；生成的菜品图与结果会保存在你的任务和文件中心。" : "The source photo is used for recognition; results and the generated dish image are saved to your account."}</p>
      </div>

      <div className="fridge-result-column">
        {!result ? <div className="fridge-empty"><img src="/fridge-recipes/fridge-recipe-icon-v1.webp" alt="" /><h2>{zh ? "把现有食材变成今晚的菜" : "Turn what you have into dinner"}</h2><p>{zh ? "识别完成后，这里会显示食材清单、6 道食谱、缺少食材和可执行步骤。" : "Ingredients, six recipes, shopping gaps, and clear steps will appear here."}</p></div> : <>
          <section className="fridge-ingredients">
            <header><div><h2><i>2</i>{zh ? `识别出的食材（${activeIngredients.length} 种）` : `Detected ingredients (${activeIngredients.length})`}</h2><p>{result.fridgeSummary}</p></div><span className={`confidence ${result.confidence}`}><CheckCircle />{zh ? "请人工确认" : "Review suggested"}</span></header>
            <div className="ingredient-groups">{Object.entries(groupedIngredients).map(([category, items]) => <article key={category}><h3>{categoryNames[zh ? "zh" : "en"][category] || category}</h3><div>{items.map((item) => <button type="button" key={item.id} title={zh ? "从当前识别清单中隐藏，不改变已生成食谱" : "Hide from this list; generated recipes stay unchanged"} onClick={() => setHiddenIngredients((current) => new Set([...current, item.id]))}><span>{item.name}</span><small>{item.quantity}</small><X size={12} /></button>)}</div></article>)}</div>
          </section>
          <section className="fridge-recipes"><header><h2><i>3</i>{zh ? `为你推荐 ${result.recipes.length} 道菜` : `${result.recipes.length} recipes for you`}</h2></header><div className="recipe-cards">{result.recipes.map((recipe, index) => <button type="button" key={recipe.id} className={selectedRecipe?.id === recipe.id ? "selected" : ""} onClick={() => setSelectedRecipeId(recipe.id)}><div className="recipe-card-image">{index === 0 && resultImage ? <img src={resultImage} alt="" /> : <span className="recipe-card-placeholder"><ForkKnife size={42} weight="duotone" /></span>}<b>{recipe.matchPercent}%{zh ? "匹配" : " match"}</b></div><strong>{recipe.name}</strong><p>{recipe.cookTimeMinutes} min · {recipe.difficulty === "easy" ? (zh ? "简单" : "Easy") : recipe.difficulty}</p><div>{recipe.tags.map((tag) => <em key={tag}>{tag}</em>)}</div></button>)}</div></section>
        </>}
      </div>

      <aside className="fridge-side-column">
        <section><h2><ShoppingCart size={20} />{zh ? "可能需要补充" : "You may need"}</h2>{result?.shoppingList?.length ? <ul>{result.shoppingList.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul> : <p>{zh ? "选择冰箱照片后生成采购清单" : "A shopping list will appear after analysis."}</p>}</section>
        <section><h2><Clock size={20} />{zh ? "快过期食材提醒" : "Use soon"}</h2>{activeIngredients.filter((item) => item.expiryHintDays != null && item.expiryHintDays <= 4).length ? <ul>{activeIngredients.filter((item) => item.expiryHintDays != null && item.expiryHintDays <= 4).map((item) => <li key={item.id}><span>{item.name}</span><b>{zh ? `约 ${item.expiryHintDays} 天` : `~${item.expiryHintDays} days`}</b></li>)}</ul> : <p>{zh ? "暂无明确提醒；请以实际包装日期和气味为准。" : "No clear reminders. Always inspect food before use."}</p>}</section>
        {history.length > 0 && <section><h2><Clock size={20} />{zh ? "历史食谱" : "History"}</h2><div className="fridge-history-list">{history.map((item) => <button type="button" key={item.id} onClick={() => { setResult(item.output); setSelectedRecipeId(item.output.primaryRecipeId || item.output.recipes[0].id); setResultImage(item.output.resultFileId ? `/api/files/${item.output.resultFileId}/download` : ""); }}>{item.output.recipes[0].name}<ArrowRight /></button>)}</div></section>}
      </aside>
    </section>

    {selectedRecipe && <section className="fridge-recipe-detail"><header><div><span>4</span><small>{zh ? "食谱详情" : "Recipe details"}</small><h2>{selectedRecipe.name}</h2><p>{selectedRecipe.summary}</p></div><div><span><Clock />{selectedRecipe.cookTimeMinutes} min</span><span><ForkKnife />{selectedRecipe.servings} {zh ? "人份" : "servings"}</span><span>{selectedRecipe.caloriesKcalPerServing} kcal/{zh ? "份" : "serving"}</span></div></header><div className="recipe-detail-body"><div className="recipe-hero-image">{resultImage ? <img src={resultImage} alt={selectedRecipe.name} /> : <ForkKnife size={64} weight="duotone" />}</div><article><h3>{zh ? "所需食材" : "Ingredients"}</h3><ul>{selectedRecipe.useIngredients.map((item) => <li key={item}><CheckCircle />{item}</li>)}</ul>{selectedRecipe.missingIngredients.length > 0 && <><h3>{zh ? "仍需补充" : "Missing"}</h3><ul className="missing">{selectedRecipe.missingIngredients.map((item) => <li key={item}><ShoppingCart />{item}</li>)}</ul></>}</article><article className="cooking-steps"><h3>{zh ? "制作步骤" : "Steps"}</h3><ol>{selectedRecipe.steps.map((step) => <li key={step.order}><i>{step.order}</i><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}</ol></article></div><footer><ShieldCheck />{result.disclaimer}</footer></section>}
  </main>;
}

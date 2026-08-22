import { useEffect, useState } from "react";
import { View, Text, Input, Textarea, Button, Image } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { api, errorText, requireLogin, uploadTool } from "../../api";
import { ErrorBox } from "../../components";
import "./index.css";

export default function ToolPage() {
  const slug = decodeURIComponent(useRouter().params.slug || "");
  const [tool, setTool] = useState(null);
  const [image, setImage] = useState("");
  const [draft, setDraft] = useState({ title: "", idea: "", genre: "流行", mood: "自然", outfit: "商务休闲穿搭", prompt: "", portionHint: "" });
  const [rights, setRights] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!requireLogin()) return;
    api.tools().then(({ tools }) => {
      const found = tools.find((item) => item.slug === slug && item.runtimeStatus === "ready");
      if (!found) return setError("工具尚未发布或模型未配置");
      setTool(found); Taro.setNavigationBarTitle({ title: found.nameZh });
    }).catch((reason) => setError(errorText(reason)));
  }, [slug]);
  const change = (key) => (event) => setDraft({ ...draft, [key]: event.detail.value });
  const choose = async () => {
    const result = await Taro.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album", "camera"] });
    setImage(result.tempFiles?.[0]?.tempFilePath || "");
  };
  const submit = async () => {
    if (!tool) return;
    setBusy(true); setError("");
    try {
      if (slug === "ai-music-studio") {
        await api.createMusic({ mode: "inspiration", title: draft.title || "未命名音乐", idea: draft.idea, genre: draft.genre, mood: draft.mood, language: "中文", durationSeconds: 120, variants: 1, rightsConfirmed: rights, locale: "zh-CN" });
      } else {
        await uploadTool(slug, image, slug === "ai-outfit-changer"
          ? { outfit: draft.outfit, prompt: draft.prompt }
          : { portionHint: draft.portionHint, mealContext: "正餐", locale: "zh-CN" });
      }
      Taro.showModal({ title: slug === "ai-music-studio" ? "任务已提交" : "处理完成", content: "结果会同步保存到任务中心和文件中心。", showCancel: false, success: () => Taro.switchTab({ url: "/pages/tasks/index" }) });
    } catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  };
  if (!tool) return <View className="page"><View className="title">加载工具</View><ErrorBox text={error} /></View>;
  const music = slug === "ai-music-studio";
  const outfit = slug === "ai-outfit-changer";
  const valid = music ? draft.idea.trim() && rights : image;
  return <View className="page"><View className="tool-hero"><View className="tool-avatar">{tool.nameZh.slice(0,1)}</View><View><View className="title tool-name">{tool.nameZh}</View><View className="lead tool-lead">{tool.descriptionZh}</View></View></View><ErrorBox text={error}/><View className="card runner">
    {music ? <><Label>歌曲名称</Label><Input className="input" value={draft.title} onInput={change("title")} placeholder="例如：夏天的最后一班地铁"/><Label>音乐灵感</Label><Textarea className="textarea" value={draft.idea} onInput={change("idea")} placeholder="描述歌曲故事、画面或情绪"/><View className="two"><View><Label>风格</Label><Input className="input" value={draft.genre} onInput={change("genre")}/></View><View><Label>情绪</Label><Input className="input" value={draft.mood} onInput={change("mood")}/></View></View><View className="rights" onClick={()=>setRights(!rights)}><Text className={`check ${rights?"checked":""}`}>{rights?"✓":""}</Text><Text>我确认输入内容和生成用途合法，并拥有所需素材权利。</Text></View></>
      : <><Label>{outfit?"上传目标人物图片":"上传食物照片"}</Label><View className="uploader" onClick={choose}>{image?<Image className="preview" mode="aspectFill" src={image}/>:<><Text className="upload-plus">+</Text><Text>拍摄或选择图片</Text></>}</View>{outfit?<><Label>换装要求</Label><Input className="input" value={draft.outfit} onInput={change("outfit")}/><Label>补充要求（可选）</Label><Textarea className="textarea small" value={draft.prompt} onInput={change("prompt")}/></>:<><Label>份量说明（可选）</Label><Textarea className="textarea small" value={draft.portionHint} onInput={change("portionHint")} placeholder="例如：米饭约一碗"/></>}</>}
    <Button className="primary submit" loading={busy} disabled={!valid||busy} onClick={submit}>{music?"开始生成音乐":outfit?"开始 AI 换装":"开始分析营养"}</Button><Text className="cost-note">预计消耗 {tool.creditCost} 积分，失败任务会自动退款。</Text>
  </View></View>;
}

function Label({ children }) { return <Text className="label">{children}</Text>; }

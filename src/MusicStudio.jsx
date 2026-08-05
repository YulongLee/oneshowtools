import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CheckCircle, Coins, DownloadSimple, Headphones, LockKey, MusicNotes,
  Play, Sparkle, SpinnerGap, Trash, Warning, FileText, ImageSquare, Microphone,
  Stop, UploadSimple, Waveform,
} from "@phosphor-icons/react";

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.code || "REQUEST_FAILED"), { code: payload?.error?.code || "REQUEST_FAILED", status: response.status });
  return payload;
}

const initialDraft = {
  mode: "inspiration", title: "", idea: "", lyrics: "", language: "中文",
  genre: "流行", mood: "治愈", vocal: "自动选择", instruments: "",
  durationSeconds: "120", variants: "1", rightsConfirmed: false, referenceId: "",
};

const copy = {
  "zh-CN": {
    kicker: "ONESH​OW MUSIC STUDIO", title: "把一个想法，变成一首完整音乐", sub: "创作歌曲、编写歌词或生成纯音乐。模型由平台安全托管，作品自动保存到你的音乐库。",
    inspiration: "灵感歌曲", lyrics: "自定义歌词", cover: "参考音频", instrumental: "纯音乐", titleLabel: "歌曲名称", titleHint: "例如：夏天的最后一班地铁",
    idea: "音乐灵感", ideaHint: "描述歌曲故事、使用场景、画面或希望表达的情绪…", lyricsLabel: "歌词", lyricsHint: "支持 [Verse]、[Chorus]、[Bridge] 等歌曲结构标签。",
    genre: "音乐风格", mood: "情绪", language: "语言", vocal: "演唱方式", instruments: "乐器偏好", instrumentsHint: "例如：钢琴、木吉他、弦乐",
    duration: "目标时长", variants: "生成版本", one: "1 个版本", two: "2 个版本", rights: "我确认输入的歌词、素材和创作要求拥有合法使用权，并且不要求模仿具体歌手或复制已有歌曲。",
    create: "开始创作", creating: "正在创建任务", cost: "预计消耗", credits: "积分", library: "我的音乐", librarySub: "生成完成后可以试听、下载和继续创作。",
    empty: "还没有音乐作品", emptyBody: "完成第一次创作后，作品会安全保存在这里。", notReady: "音乐模型尚未配置", notReadyBody: "工作台已经就绪。管理员在后台完成音乐模型配置后即可真实生成，当前不会产生假音频或扣除积分。",
    login: "登录后开始创作", queued: "排队中", running: "生成中", completed: "已完成", failed: "生成失败", download: "下载", remove: "删除", provider: "OneShowMusic",
    required: "请完整填写音乐灵感并确认素材权利。", lyricsRequired: "自定义歌词模式需要填写歌词。", insufficient: "积分不足，请先充值。", failedMessage: "创建失败，请稍后重试。", showLyrics: "查看歌词", hideLyrics: "收起歌词", generatedLyrics: "生成歌词", createCover: "生成封面", recreateCover: "重新生成", coverNotReady: "管理员尚未配置图片模型", coverFailed: "封面生成失败", creatingCover: "生成中",
    referenceTitle: "参考音频", referenceHint: "上传已有歌曲，或直接录制一段演唱。系统会提取歌词和歌曲结构，再生成新的风格版本。", uploadReference: "上传音频", startRecording: "开始录音", stopRecording: "结束录音", requestingMic: "正在申请麦克风权限…", recordingNow: "正在录音", analyzingReference: "正在分析音频与歌词…", referenceReady: "参考音频已就绪", referenceDuration: "音频时长", replaceReference: "更换音频", coverLyricsHint: "已从音频提取歌词，你可以修改后再生成（10～1000 字）。", referenceRequired: "请先上传或录制参考音频并等待分析完成。", coverLyricsRequired: "翻唱歌词需为 10～1000 字。", referenceFailed: "参考音频分析失败，请确认音频为 6 秒至 6 分钟，且格式正确。", recordingDenied: "麦克风权限被拒绝。请在浏览器地址栏的网站权限中允许麦克风后重试。", recordingUnsupported: "当前浏览器不支持直接录音，请使用最新版 Chrome、Edge 或 Safari，或者上传音频文件。", recordingMissing: "没有检测到可用麦克风，请连接麦克风后重试。", recordingBusy: "麦克风正在被其他应用占用，请关闭占用程序后重试。", referenceRights: "我确认拥有参考音频及其中声音、歌词和音乐作品的合法使用或改编授权，不用于冒充他人或未经授权的翻唱。",
  },
  en: {
    kicker: "ONESH​OW MUSIC STUDIO", title: "Turn one idea into a complete track", sub: "Create songs, write lyrics, or generate instrumental music. Your work is saved securely to your library.",
    inspiration: "Idea to song", lyrics: "Custom lyrics", cover: "Reference audio", instrumental: "Instrumental", titleLabel: "Track title", titleHint: "e.g. The last train of summer",
    idea: "Creative direction", ideaHint: "Describe the story, use case, scene, or emotion…", lyricsLabel: "Lyrics", lyricsHint: "Supports sections such as [Verse], [Chorus], and [Bridge].",
    genre: "Genre", mood: "Mood", language: "Language", vocal: "Vocal", instruments: "Instruments", instrumentsHint: "e.g. piano, acoustic guitar, strings",
    duration: "Target length", variants: "Versions", one: "1 version", two: "2 versions", rights: "I confirm I have the rights to all submitted material and am not requesting imitation of a named artist or an existing song.",
    create: "Create music", creating: "Creating task", cost: "Estimated cost", credits: "credits", library: "My music", librarySub: "Listen, download, and revisit completed tracks.",
    empty: "No tracks yet", emptyBody: "Your first completed creation will appear here.", notReady: "Music model not configured", notReadyBody: "The studio is ready. An administrator can connect the music provider later; no fake audio or credits will be generated now.",
    login: "Sign in to create", queued: "Queued", running: "Generating", completed: "Completed", failed: "Failed", download: "Download", remove: "Delete", provider: "OneShowMusic",
    required: "Add a creative direction and confirm your rights.", lyricsRequired: "Custom lyrics mode requires lyrics.", insufficient: "Not enough credits.", failedMessage: "Could not create the task. Try again.", showLyrics: "View lyrics", hideLyrics: "Hide lyrics", generatedLyrics: "Generated lyrics", createCover: "Generate cover", recreateCover: "Regenerate", coverNotReady: "Image model is not configured", coverFailed: "Cover generation failed", creatingCover: "Generating",
    referenceTitle: "Reference audio", referenceHint: "Upload a song or record a performance. We will extract its lyrics and structure before creating a new arrangement.", uploadReference: "Upload audio", startRecording: "Start recording", stopRecording: "Stop recording", requestingMic: "Requesting microphone access…", recordingNow: "Recording", analyzingReference: "Analyzing audio and lyrics…", referenceReady: "Reference ready", referenceDuration: "Duration", replaceReference: "Replace audio", coverLyricsHint: "Lyrics extracted from the reference. You may edit them before generation (10–1000 characters).", referenceRequired: "Upload or record reference audio and wait for analysis first.", coverLyricsRequired: "Cover lyrics must contain 10–1000 characters.", referenceFailed: "Could not analyze this audio. Use a valid 6-second to 6-minute audio file.", recordingDenied: "Microphone permission was denied. Allow microphone access in this site's browser permissions and try again.", recordingUnsupported: "Direct recording is not supported in this browser. Use a current Chrome, Edge, or Safari browser, or upload an audio file.", recordingMissing: "No microphone was found. Connect one and try again.", recordingBusy: "The microphone is being used by another application. Close it and try again.", referenceRights: "I confirm I have the rights to use or adapt the reference audio, voices, lyrics, and composition, and will not use it to impersonate another person.",
  },
};

const statusClass = (status) => ["queued", "running", "completed", "failed"].includes(status) ? status : "queued";

export function MusicStudio({ locale = "zh-CN", authenticated, account, focusTaskId, onBack, onAuth, onCompleted }) {
  const t = copy[locale] || copy["zh-CN"];
  const [draft, setDraft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("oneshow-music-lyrics-draft") || "null");
      if (saved?.lyrics) {
        sessionStorage.removeItem("oneshow-music-lyrics-draft");
        return { ...initialDraft, mode: "lyrics", title: String(saved.title || "").slice(0, 120), idea: String(saved.idea || "").slice(0, 1200), lyrics: String(saved.lyrics).slice(0, 3500) };
      }
    } catch { /* ignore malformed browser drafts */ }
    return initialDraft;
  });
  const [status, setStatus] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expandedLyrics, setExpandedLyrics] = useState(null);
  const [coverBusy, setCoverBusy] = useState(null);
  const [reference, setReference] = useState(null);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingRequesting, setRecordingRequesting] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const load = useCallback(async () => {
    const provider = await request("/api/music/status");
    setStatus(provider);
    if (authenticated) setTracks((await request("/api/music/tracks")).tracks || []);
  }, [authenticated]);
  useEffect(() => { load().catch(() => setStatus({ ready: false, creditCost: 30 })); }, [load]);
  useEffect(() => { if (focusTaskId) setTimeout(() => document.querySelector(`[data-task-id="${focusTaskId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120); }, [focusTaskId, tracks.length]);
  const active = tracks.some((track) => ["queued", "running"].includes(track.status));
  useEffect(() => {
    if (!authenticated || !active) return undefined;
    const timer = setInterval(() => load().catch(() => {}), 3000);
    return () => clearInterval(timer);
  }, [active, authenticated, load]);
  const estimatedCost = Number(status?.creditCost || 30) * Number(draft.variants || 1);
  const balance = account?.credits?.balance;
  const modeInfo = useMemo(() => ({ inspiration: t.inspiration, lyrics: t.lyrics, cover: t.cover, instrumental: t.instrumental }), [t]);
  const prepareReference = async (file) => {
    if (!file) return;
    if (!authenticated) return onAuth?.();
    setReferenceBusy(true); setError(""); setReference(null);
    try {
      const form = new FormData(); form.append("file", file);
      const payload = await request("/api/music/references", { method: "POST", body: form });
      setReference(payload.reference);
      setDraft((current) => ({ ...current, referenceId: payload.reference.id, lyrics: payload.reference.formattedLyrics || "" }));
      onCompleted?.();
    } catch { setError(t.referenceFailed); }
    finally { setReferenceBusy(false); }
  };
  const startRecording = async () => {
    if (!authenticated) return onAuth?.();
    setRecordingError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError(t.recordingUnsupported); return;
    }
    setRecordingRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream; recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        const file = new File(chunksRef.current, `recording-${Date.now()}.${extension}`, { type });
        stream.getTracks().forEach((track) => track.stop()); streamRef.current = null; recorderRef.current = null;
        if (file.size) prepareReference(file);
      };
      recorder.start(1000); setRecording(true); setRecordingSeconds(0); setError("");
    } catch (recordingFailure) {
      const message = recordingFailure?.name === "NotFoundError" ? t.recordingMissing
        : ["NotReadableError", "AbortError"].includes(recordingFailure?.name) ? t.recordingBusy
          : recordingFailure?.name === "NotAllowedError" || recordingFailure?.name === "SecurityError" ? t.recordingDenied
            : t.recordingUnsupported;
      setRecordingError(message);
    } finally { setRecordingRequesting(false); }
  };
  const stopRecording = () => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); setRecording(false); };
  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setRecordingSeconds((current) => {
      if (current >= 359) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        setRecording(false); return 360;
      }
      return current + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!authenticated) return onAuth?.();
    if (!draft.idea.trim() || !draft.rightsConfirmed) return setError(t.required);
    if (draft.mode === "lyrics" && !draft.lyrics.trim()) return setError(t.lyricsRequired);
    if (draft.mode === "cover" && (!reference || !draft.referenceId)) return setError(t.referenceRequired);
    if (draft.mode === "cover" && (draft.lyrics.trim().length < 10 || draft.lyrics.trim().length > 1000)) return setError(t.coverLyricsRequired);
    setBusy(true);
    try {
      await request("/api/music/generations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, locale }) });
      setDraft((current) => ({ ...initialDraft, mode: current.mode })); setReference(null);
      await load();
      onCompleted?.();
    } catch (requestError) {
      setError(requestError.code === "INSUFFICIENT_CREDITS" ? t.insufficient : requestError.code === "MUSIC_PROVIDER_NOT_CONFIGURED" ? t.notReadyBody : t.failedMessage);
    } finally { setBusy(false); }
  };
  const remove = async (id) => {
    await request(`/api/music/tracks/${id}`, { method: "DELETE" });
    await load();
  };
  const createCover = async (id) => {
    if (!status?.cover?.ready) return setError(t.coverNotReady);
    setCoverBusy(id); setError("");
    try { await request(`/api/music/tracks/${id}/cover`, { method: "POST" }); await load(); onCompleted?.(); }
    catch (requestError) { setError(requestError.code === "INSUFFICIENT_CREDITS" ? t.insufficient : t.coverFailed); }
    finally { setCoverBusy(null); }
  };
  return <div className="music-studio-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{locale === "en" ? "Back to marketplace" : "返回工具市场"}</button>
    <header className="music-studio-hero">
      <div className="music-hero-mark"><MusicNotes size={30} weight="duotone" /></div>
      <div><p className="eyebrow">{t.kicker}</p><h1>{t.title}</h1><p>{t.sub}</p></div>
      <aside><Coins size={18} /><span>{locale === "en" ? "Balance" : "可用积分"}</span><strong>{authenticated ? (balance?.toLocaleString() ?? "—") : "—"}</strong></aside>
    </header>
    {!status?.ready && <section className="music-provider-notice"><LockKey size={22} /><div><strong>{t.notReady}</strong><p>{t.notReadyBody}</p></div></section>}
    <main className="music-studio-layout">
      <form className="music-composer" onSubmit={submit}>
        <nav className="music-mode-tabs">{Object.entries(modeInfo).map(([id, label]) => <button type="button" className={draft.mode === id ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, mode: id }))} key={id}>{id === "instrumental" ? <Headphones size={18} /> : id === "cover" ? <Waveform size={18} /> : <MusicNotes size={18} />}{label}</button>)}</nav>
        <div className="music-form-grid">
          <label className="wide"><span>{t.titleLabel}</span><input value={draft.title} onChange={update("title")} placeholder={t.titleHint} maxLength="100" /></label>
          {draft.mode === "cover" && <section className={`music-reference-panel wide ${reference ? "ready" : ""}`}>
            <header><span><Waveform size={20} /></span><div><strong>{t.referenceTitle}</strong><p>{t.referenceHint}</p></div></header>
            {referenceBusy ? <div className="music-reference-progress"><SpinnerGap className="spin" size={21} /><span>{t.analyzingReference}</span></div> : reference ? <div className="music-reference-ready"><audio controls preload="metadata" src={reference.previewUrl} /><div><CheckCircle size={18} weight="fill" /><span><strong>{t.referenceReady}</strong><small>{reference.fileName} · {t.referenceDuration} {Math.round(reference.durationSeconds)}s</small></span></div><label><UploadSimple size={16} />{t.replaceReference}<input type="file" accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/webm,audio/ogg,.mp3,.wav,.flac,.m4a,.webm,.ogg" onChange={(event) => prepareReference(event.target.files?.[0])} /></label></div> : <><div className="music-reference-actions"><label><UploadSimple size={18} />{t.uploadReference}<input type="file" accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/webm,audio/ogg,.mp3,.wav,.flac,.m4a,.webm,.ogg" onChange={(event) => prepareReference(event.target.files?.[0])} /></label><button type="button" disabled={recordingRequesting} className={recording ? "recording" : ""} onClick={recording ? stopRecording : startRecording}>{recordingRequesting ? <SpinnerGap className="spin" size={18} /> : recording ? <Stop size={18} weight="fill" /> : <Microphone size={18} />}{recordingRequesting ? t.requestingMic : recording ? t.stopRecording : t.startRecording}</button></div>{recording && <div className="music-recording-status"><i /><strong>{t.recordingNow}</strong><span>{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span></div>}{recordingError && <div className="music-recording-error"><Warning size={16} /><span>{recordingError}</span></div>}</>}
          </section>}
          <label className="wide"><span>{t.idea}</span><textarea rows="5" value={draft.idea} onChange={update("idea")} placeholder={t.ideaHint} maxLength="1000" /></label>
          {(draft.mode === "lyrics" || draft.mode === "cover") && <label className="wide"><span>{t.lyricsLabel}{draft.mode === "cover" && <small className="music-lyrics-count">{draft.lyrics.length}/1000</small>}</span><textarea className="music-lyrics-input" rows="10" value={draft.lyrics} onChange={update("lyrics")} placeholder={draft.mode === "cover" ? t.coverLyricsHint : t.lyricsHint} maxLength={draft.mode === "cover" ? "1000" : "3500"} /></label>}
          <label><span>{t.genre}</span><select value={draft.genre} onChange={update("genre")}>{["流行","民谣","摇滚","电子","说唱","R&B","古风","爵士","Lo-fi","影视配乐"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>{t.mood}</span><select value={draft.mood} onChange={update("mood")}>{["治愈","欢快","浪漫","忧郁","史诗","平静","紧张","梦幻"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>{t.language}</span><select value={draft.language} onChange={update("language")}>{["中文","English","日本語","한국어","Español","无歌词"].map((value) => <option key={value}>{value}</option>)}</select></label>
          {draft.mode !== "instrumental" && <label><span>{t.vocal}</span><select value={draft.vocal} onChange={update("vocal")}>{["自动选择","男声","女声","男女对唱","合唱"].map((value) => <option key={value}>{value}</option>)}</select></label>}
          <label className={draft.mode === "instrumental" ? "wide" : ""}><span>{t.instruments}</span><input value={draft.instruments} onChange={update("instruments")} placeholder={t.instrumentsHint} /></label>
          <label><span>{t.duration}</span><select value={draft.durationSeconds} onChange={update("durationSeconds")}>{[[30,"30 秒"],[60,"1 分钟"],[120,"2 分钟"],[180,"3 分钟"],[300,"5 分钟"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        </div>
        <div className="music-variant-row"><span>{t.variants}</span><div><button type="button" className={draft.variants === "1" ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, variants: "1" }))}>{t.one}</button><button type="button" className={draft.variants === "2" ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, variants: "2" }))}>{t.two}</button></div></div>
        <label className="music-rights"><input type="checkbox" checked={draft.rightsConfirmed} onChange={update("rightsConfirmed")} /><span>{draft.mode === "cover" ? t.referenceRights : t.rights}</span></label>
        {error && <div className="music-form-error"><Warning size={17} />{error}</div>}
        <footer className="music-composer-footer"><div><small>{t.cost}</small><strong>{estimatedCost} {t.credits}</strong></div><button disabled={busy || referenceBusy || recording || !status?.ready}>{busy ? <SpinnerGap className="spin" size={18} /> : <Sparkle size={18} weight="fill" />}{!authenticated ? t.login : busy ? t.creating : t.create}</button></footer>
      </form>
      <section className="music-library">
        <header><div><p className="eyebrow">LIBRARY</p><h2>{t.library}</h2><span>{t.librarySub}</span></div><MusicNotes size={24} /></header>
        {tracks.length ? <div className="music-track-list">{tracks.map((track) => <article className={`music-track ${focusTaskId === track.taskId ? "focused" : ""}`} data-task-id={track.taskId} key={track.id}>
          <div className={`music-track-cover ${statusClass(track.status)} ${track.coverUrl ? "has-image" : ""}`} style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})` } : undefined}>{track.status === "completed" ? <Play size={22} weight="fill" /> : track.status === "failed" ? <Warning size={22} /> : <SpinnerGap className="spin" size={22} />}</div>
          <div className="music-track-main"><header><div><strong>{track.title}</strong><small>{modeInfo[track.mode]} · {track.providerAlias || t.provider}</small></div><span className={`music-track-status ${statusClass(track.status)}`}>{track.status === "completed" && <CheckCircle size={13} weight="fill" />}{t[track.status] || track.status}</span></header>
            {track.status === "completed" && <audio controls preload="metadata" src={track.downloadUrl} />}
            {track.status === "failed" && <p>{track.errorCode || t.failedMessage}</p>}
            {expandedLyrics === track.id && track.lyrics && <div className="music-track-lyrics"><strong>{t.generatedLyrics}</strong><pre>{track.lyrics}</pre></div>}
            <footer><span>{new Date(track.createdAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN")}</span><div>{track.lyrics && <button onClick={() => setExpandedLyrics(expandedLyrics === track.id ? null : track.id)}><FileText size={15} />{expandedLyrics === track.id ? t.hideLyrics : t.showLyrics}</button>}{track.status === "completed" && <button title={!status?.cover?.ready ? t.coverNotReady : ""} onClick={() => createCover(track.id)} disabled={coverBusy === track.id || !status?.cover?.ready}>{coverBusy === track.id ? <SpinnerGap className="spin" size={15} /> : <ImageSquare size={15} />}{coverBusy === track.id ? t.creatingCover : track.coverUrl ? t.recreateCover : t.createCover}</button>}{track.downloadUrl && <a href={track.downloadUrl}><DownloadSimple size={15} />{t.download}</a>}<button onClick={() => remove(track.id)}><Trash size={15} />{t.remove}</button></div></footer>
          </div>
        </article>)}</div> : <div className="music-library-empty"><MusicNotes size={34} weight="duotone" /><strong>{t.empty}</strong><p>{t.emptyBody}</p></div>}
      </section>
    </main>
  </div>;
}

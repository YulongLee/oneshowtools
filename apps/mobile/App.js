import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable,
  RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from "react-native";
import { createPlatformClient, PlatformError } from "@oneshowtools/platform-client";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://www.gameforcast.top";
const tokenKey = "ost_access_token";
const tokenStore = {
  get: async () => Platform.OS === "web" ? globalThis.localStorage?.getItem(tokenKey) || null : SecureStore.getItemAsync(tokenKey),
  set: async (value) => {
    if (Platform.OS === "web") {
      if (value) globalThis.localStorage?.setItem(tokenKey, value);
      else globalThis.localStorage?.removeItem(tokenKey);
      return;
    }
    if (value) await SecureStore.setItemAsync(tokenKey, value);
    else await SecureStore.deleteItemAsync(tokenKey);
  },
};

const palette = { blue: "#246BFD", indigo: "#6257F5", ink: "#14213A", muted: "#75839A", line: "#E5EAF2", canvas: "#F6F8FC", white: "#FFFFFF", green: "#14966D" };
const NATIVE_TOOL_SLUGS = new Set(["ai-music-studio", "ai-outfit-changer", "food-nutrition-analyzer"]);
const errors = {
  INVALID_CREDENTIALS: "邮箱或密码不正确。", EMAIL_UNVERIFIED: "请先前往邮箱完成验证。",
  SMS_CODE_INVALID: "验证码不正确。", SMS_CODE_EXPIRED: "验证码已过期，请重新获取。",
  SMS_RATE_LIMITED: "发送太频繁，请稍后再试。", UNAUTHENTICATED: "登录已过期，请重新登录。",
};

function errorText(error) {
  if (error instanceof PlatformError) return errors[error.code] || `请求失败（${error.code}）`;
  return "网络连接失败，请稍后重试。";
}

function Logo() {
  return <View style={styles.logoRow}><View style={styles.logoMark}><Text style={styles.logoGlyph}>1</Text></View><View><Text style={styles.logo}>OneShow<Text style={styles.logoBlue}>Tools</Text></Text><Text style={styles.platform}>PLATFORM</Text></View></View>;
}

function LoginScreen({ client, onSignedIn }) {
  const [mode, setMode] = useState("sms");
  const [emailAction, setEmailAction] = useState("login");
  const [form, setForm] = useState({ phone: "", code: "", name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const change = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "email" && emailAction === "register") {
        await client.register({ name: form.name, email: form.email, password: form.password, locale: "zh-CN" });
        Alert.alert("注册申请已提交", "验证邮件已发送，请完成邮箱验证后登录。", [{ text: "去登录", onPress: () => setEmailAction("login") }]);
        return;
      }
      const result = mode === "sms" ? await client.verifySms(form.phone, form.code, "OneShow 用户") : await client.login(form.email, form.password);
      onSignedIn(result.user);
    } catch (error) { Alert.alert("无法登录", errorText(error)); }
    finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true);
    try { await client.sendSms(form.phone); setSent(true); Alert.alert("验证码已发送", "请查看手机短信，验证码 5 分钟内有效。"); }
    catch (error) { Alert.alert("发送失败", errorText(error)); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.authPage}><StatusBar barStyle="dark-content" /><KeyboardAvoidingView style={styles.authInner} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <Logo /><View style={styles.authHero}><Text style={styles.authTitle}>随时使用你的 AI 工具</Text><Text style={styles.authText}>一个账户，共享网页、App 和微信小程序的积分、任务与文件。</Text></View>
    <View style={styles.authCard}><View style={styles.segment}><Pressable style={[styles.segmentItem, mode === "sms" && styles.segmentActive]} onPress={() => setMode("sms")}><Text style={[styles.segmentText, mode === "sms" && styles.segmentTextActive]}>短信登录</Text></Pressable><Pressable style={[styles.segmentItem, mode === "email" && styles.segmentActive]} onPress={() => setMode("email")}><Text style={[styles.segmentText, mode === "email" && styles.segmentTextActive]}>邮箱登录</Text></Pressable></View>
      {mode === "sms" ? <><TextInput style={styles.input} keyboardType="phone-pad" placeholder="中国大陆手机号" value={form.phone} onChangeText={change("phone")} /><View style={styles.codeRow}><TextInput style={[styles.input, styles.codeInput]} keyboardType="number-pad" placeholder="6 位验证码" value={form.code} onChangeText={change("code")} maxLength={6} /><Pressable style={styles.codeButton} onPress={send} disabled={busy || form.phone.length < 11}><Text style={styles.codeButtonText}>{sent ? "重新发送" : "获取验证码"}</Text></Pressable></View></> : <><View style={styles.emailActions}><Pressable onPress={() => setEmailAction("login")}><Text style={[styles.emailAction, emailAction === "login" && styles.emailActionActive]}>登录</Text></Pressable><Pressable onPress={() => setEmailAction("register")}><Text style={[styles.emailAction, emailAction === "register" && styles.emailActionActive]}>注册账号</Text></Pressable></View>{emailAction === "register" && <TextInput style={styles.input} placeholder="你的称呼" value={form.name} onChangeText={change("name")} />}<TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="邮箱地址" value={form.email} onChangeText={change("email")} /><TextInput style={styles.input} secureTextEntry placeholder={emailAction === "register" ? "至少 10 位密码" : "密码"} value={form.password} onChangeText={change("password")} /></>}
      <Pressable style={[styles.primaryButton, busy && styles.disabled]} disabled={busy || (mode === "sms" ? form.code.length !== 6 : !form.email || !form.password || (emailAction === "register" && (!form.name || form.password.length < 10)))} onPress={submit}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === "email" && emailAction === "register" ? "创建 OneShowTools 账号" : "登录 OneShowTools"}</Text>}</Pressable>
      <Text style={styles.authLegal}>登录即表示你同意服务条款与隐私政策</Text>
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}

function Metric({ label, value, suffix, tone = "blue" }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: tone === "green" ? "#E8F8F2" : "#EDF3FF" }]}><Text>{tone === "green" ? "✓" : "✦"}</Text></View><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value ?? 0}<Text style={styles.metricSuffix}> {suffix}</Text></Text></View>;
}

function Dashboard({ data, onNavigate }) {
  const name = data?.user?.name || "OneShow 用户";
  return <ScrollView contentContainerStyle={styles.content}><View style={styles.welcome}><Text style={styles.welcomeEyebrow}>OneShow AI Lab</Text><Text style={styles.welcomeTitle}>你好，{name} 👋</Text><Text style={styles.welcomeText}>今天想用 AI 完成什么？</Text><Pressable style={styles.heroButton} onPress={() => onNavigate("tools")}><Text style={styles.heroButtonText}>探索全部工具　→</Text></Pressable></View>
    <Text style={styles.sectionTitle}>账户概览</Text><View style={styles.metrics}><Metric label="可用积分" value={data?.metrics?.credits} suffix="Credits" /><Metric label="已完成任务" value={data?.metrics?.completed} suffix="个" tone="green" /><Metric label="文件中心" value={data?.metrics?.files} suffix="个" /><Metric label="运行中" value={data?.metrics?.running} suffix="个" tone="green" /></View>
    <Text style={styles.sectionTitle}>最近任务</Text>{data?.recentTasks?.length ? data.recentTasks.map((task) => <TaskRow key={task.id} task={task} />) : <Empty text="还没有任务，先去工具市场体验一下吧。" />}
  </ScrollView>;
}

function ToolRow({ item, onPress }) {
  const ready = item.runtimeStatus === "ready";
  const supported = NATIVE_TOOL_SLUGS.has(item.slug);
  const usable = ready && supported;
  return <Pressable style={styles.toolCard} onPress={() => usable && onPress?.(item)}><View style={[styles.toolIcon, { backgroundColor: item.iconBackground || "#EEF3FF" }]}><Text style={{ color: item.iconColor || palette.blue, fontWeight: "800" }}>{item.nameZh.slice(0, 1)}</Text></View><View style={styles.grow}><View style={styles.row}><Text style={styles.toolTitle}>{item.nameZh}</Text><Text style={[styles.status, !usable && styles.statusWaiting]}>{!supported ? "App 适配中" : ready ? "可运行" : "待配置"}</Text></View><Text numberOfLines={2} style={styles.toolDescription}>{item.descriptionZh}</Text><View style={styles.row}><Text style={styles.cost}>{item.creditCost} 积分 / 次</Text>{usable && <Text style={styles.useLink}>立即使用 →</Text>}</View></View></Pressable>;
}

function ToolRunner({ client, tool, onBack, onSubmitted }) {
  const music = tool.slug === "ai-music-studio";
  const food = tool.slug === "food-nutrition-analyzer";
  const outfit = tool.slug === "ai-outfit-changer";
  const [draft, setDraft] = useState({ title: "", idea: "", genre: "流行", mood: "自然", outfit: "商务休闲穿搭", prompt: "", portionHint: "", mealContext: "正餐" });
  const [images, setImages] = useState([]);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
  const chooseImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("需要相册权限", "请允许 OneShowTools 选择需要处理的图片。");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: .9, allowsMultipleSelection: outfit, selectionLimit: outfit ? 2 : 1 });
    if (!result.canceled) setImages(result.assets.slice(0, outfit ? 2 : 1));
  };
  const submit = async () => {
    setBusy(true);
    try {
      let response;
      if (music) {
        response = await client.request("/api/music/generations", { method: "POST", body: { mode: "inspiration", title: draft.title || "未命名音乐", idea: draft.idea, genre: draft.genre, mood: draft.mood, language: "中文", durationSeconds: 120, variants: 1, rightsConfirmed: rights, locale: "zh-CN" } });
      } else {
        if (!images.length) throw new PlatformError("IMAGE_REQUIRED", 422);
        const form = new FormData();
        images.forEach((asset, index) => form.append(outfit ? "files" : "file", { uri: asset.uri, name: asset.fileName || `image-${index + 1}.jpg`, type: asset.mimeType || "image/jpeg" }));
        if (outfit) { form.append("outfit", draft.outfit); form.append("prompt", draft.prompt); }
        if (food) { form.append("portionHint", draft.portionHint); form.append("mealContext", draft.mealContext); form.append("locale", "zh-CN"); }
        response = await client.request(`/api/tool-actions/${tool.slug}`, { method: "POST", body: form });
      }
      Alert.alert(music ? "任务已提交" : "处理完成", music ? "歌曲会在后台继续生成，可前往任务中心查看进度。" : "结果已保存到任务中心和文件中心。", [{ text: "查看任务", onPress: onSubmitted }]);
      return response;
    } catch (error) { Alert.alert("提交失败", errorText(error)); }
    finally { setBusy(false); }
  };
  const valid = music ? draft.idea.trim() && rights : images.length > 0;
  return <ScrollView contentContainerStyle={styles.content}><Pressable onPress={onBack}><Text style={styles.back}>‹ 返回工具市场</Text></Pressable><View style={styles.runnerHead}><View style={styles.toolIcon}><Text style={{ color: palette.blue, fontWeight: "800" }}>{tool.nameZh.slice(0, 1)}</Text></View><View style={styles.grow}><Text style={styles.pageTitle}>{tool.nameZh}</Text><Text style={styles.pageLead}>{tool.descriptionZh}</Text></View></View><View style={styles.runnerCard}>
    {music ? <><Text style={styles.fieldLabel}>歌曲名称</Text><TextInput style={styles.input} value={draft.title} onChangeText={update("title")} placeholder="例如：夏天的最后一班地铁" /><Text style={styles.fieldLabel}>音乐灵感</Text><TextInput style={[styles.input, styles.textarea]} multiline value={draft.idea} onChangeText={update("idea")} placeholder="描述歌曲故事、画面或想表达的情绪" /><View style={styles.twoFields}><View style={styles.grow}><Text style={styles.fieldLabel}>风格</Text><TextInput style={styles.input} value={draft.genre} onChangeText={update("genre")} /></View><View style={styles.grow}><Text style={styles.fieldLabel}>情绪</Text><TextInput style={styles.input} value={draft.mood} onChangeText={update("mood")} /></View></View><Pressable style={styles.checkRow} onPress={() => setRights(!rights)}><View style={[styles.checkbox, rights && styles.checkboxActive]}><Text style={styles.checkboxText}>{rights ? "✓" : ""}</Text></View><Text style={styles.checkText}>我确认输入内容和生成用途合法，并拥有所需素材权利。</Text></Pressable></>
      : <><Text style={styles.fieldLabel}>{outfit ? "上传人物图和可选服装参考图" : "上传一张清晰的食物照片"}</Text><Pressable style={styles.picker} onPress={chooseImages}><Text style={styles.pickerIcon}>{images.length ? "✓" : "+"}</Text><Text style={styles.pickerTitle}>{images.length ? `已选择 ${images.length} 张图片` : "从相册选择图片"}</Text><Text style={styles.pickerHint}>{outfit ? "第一张为目标人物，第二张可作为服装参考" : "支持 JPG、PNG、WebP"}</Text></Pressable>{outfit ? <><Text style={styles.fieldLabel}>换装要求</Text><TextInput style={styles.input} value={draft.outfit} onChangeText={update("outfit")} /><Text style={styles.fieldLabel}>补充要求（可选）</Text><TextInput style={[styles.input, styles.textareaSmall]} multiline value={draft.prompt} onChangeText={update("prompt")} /></> : <><Text style={styles.fieldLabel}>份量说明（可选）</Text><TextInput style={[styles.input, styles.textareaSmall]} multiline value={draft.portionHint} onChangeText={update("portionHint")} placeholder="例如：米饭约一碗，饮料未计入" /></>}</>}
    <Pressable style={[styles.primaryButton, (!valid || busy) && styles.disabled]} disabled={!valid || busy} onPress={submit}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{music ? "开始生成音乐" : food ? "开始分析营养" : "开始 AI 换装"}</Text>}</Pressable><Text style={styles.runnerCost}>预计消耗 {tool.creditCost} 积分，失败任务会自动退款。</Text>
  </View></ScrollView>;
}

function TaskRow({ task }) {
  const completed = task.status === "completed";
  return <View style={styles.listRow}><View style={[styles.dot, { backgroundColor: completed ? palette.green : palette.blue }]} /><View style={styles.grow}><Text style={styles.listTitle}>{task.toolNameZh || task.toolNameEn}</Text><Text style={styles.listMeta}>{new Date(task.createdAt).toLocaleString()} · {task.creditCost} 积分</Text></View><Text style={[styles.status, !completed && styles.statusWaiting]}>{completed ? "已完成" : task.status}</Text></View>;
}

function FileRow({ item }) {
  return <View style={styles.listRow}><View style={styles.fileIcon}><Text>▤</Text></View><View style={styles.grow}><Text numberOfLines={1} style={styles.listTitle}>{item.name}</Text><Text style={styles.listMeta}>{Math.max(1, Math.round(item.sizeBytes / 1024))} KB · {new Date(item.createdAt).toLocaleDateString()}</Text></View></View>;
}

function Empty({ text }) { return <View style={styles.empty}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyText}>{text}</Text></View>; }

function MainApp({ client, user, onLogout }) {
  const [tab, setTab] = useState("home");
  const [selectedTool, setSelectedTool] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState({ dashboard: null, tools: [], tasks: [], files: [] });
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [dashboard, tools, tasks, files] = await Promise.all([client.dashboard(), client.tools(), client.tasks(), client.files()]);
      setState({ dashboard, tools: tools.tools || [], tasks: tasks.tasks || [], files: files.files || [] });
    } catch (error) {
      if (error?.code === "UNAUTHENTICATED") onLogout(); else Alert.alert("刷新失败", errorText(error));
    } finally { setRefreshing(false); }
  }, [client, onLogout]);
  useEffect(() => { load(); }, [load]);
  const body = selectedTool ? <ToolRunner client={client} tool={selectedTool} onBack={() => setSelectedTool(null)} onSubmitted={() => { setSelectedTool(null); setTab("tasks"); load(); }} />
    : tab === "home" ? <Dashboard data={state.dashboard} onNavigate={setTab} />
    : tab === "tools" ? <FlatList contentContainerStyle={styles.content} data={state.tools} keyExtractor={(item) => item.id} renderItem={({ item }) => <ToolRow item={item} onPress={setSelectedTool} />} ListHeaderComponent={<><Text style={styles.pageTitle}>工具市场</Text><Text style={styles.pageLead}>后台发布的工具会同步出现在这里。</Text></>} ListEmptyComponent={<Empty text="当前还没有已发布工具" />} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />} />
      : tab === "tasks" ? <FlatList contentContainerStyle={styles.content} data={state.tasks} keyExtractor={(item) => item.id} renderItem={({ item }) => <TaskRow task={item} />} ListHeaderComponent={<><Text style={styles.pageTitle}>任务中心</Text><Text style={styles.pageLead}>跨端查看真实任务进度与结果。</Text></>} ListEmptyComponent={<Empty text="还没有任务记录" />} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />} />
        : tab === "files" ? <FlatList contentContainerStyle={styles.content} data={state.files} keyExtractor={(item) => item.id} renderItem={({ item }) => <FileRow item={item} />} ListHeaderComponent={<><Text style={styles.pageTitle}>文件中心</Text><Text style={styles.pageLead}>所有生成结果集中保存在这里。</Text></>} ListEmptyComponent={<Empty text="还没有文件" />} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />} />
          : <ScrollView contentContainerStyle={styles.content}><Text style={styles.pageTitle}>我的账户</Text><View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || "One").slice(0, 1)}</Text></View><Text style={styles.profileName}>{user?.name}</Text><Text style={styles.profileEmail}>{user?.email || user?.phone}</Text><Text style={styles.profilePlan}>{state.dashboard?.subscription?.nameZh || "免费版"}</Text></View><Pressable style={styles.logoutButton} onPress={onLogout}><Text style={styles.logoutText}>退出登录</Text></Pressable></ScrollView>;
  return <SafeAreaView style={styles.app}><StatusBar barStyle="dark-content" /><View style={styles.topbar}><Logo /><Text style={styles.topCredits}>{state.dashboard?.metrics?.credits || 0} 积分</Text></View><View style={styles.body}>{body}</View>{!selectedTool && <View style={styles.tabs}>{[["home", "⌂", "首页"], ["tools", "✦", "工具"], ["tasks", "☷", "任务"], ["files", "▤", "文件"], ["me", "○", "我的"]].map(([key, icon, label]) => <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}><Text style={[styles.tabIcon, tab === key && styles.tabActive]}>{icon}</Text><Text style={[styles.tabLabel, tab === key && styles.tabActive]}>{label}</Text></Pressable>)}</View>}</SafeAreaView>;
}

export default function App() {
  const client = useMemo(() => createPlatformClient({ baseUrl: API_BASE_URL, clientKind: "mobile", tokenStore }), []);
  const [state, setState] = useState({ loading: true, user: null });
  useEffect(() => { (async () => {
    await client.restore();
    if (!client.hasSession()) return setState({ loading: false, user: null });
    try { const result = await client.session(); setState({ loading: false, user: result.user }); }
    catch { await client.setToken(null); setState({ loading: false, user: null }); }
  })(); }, [client]);
  const logout = useCallback(async () => { await client.logout().catch(() => client.setToken(null)); setState({ loading: false, user: null }); }, [client]);
  if (state.loading) return <View style={styles.loading}><Logo /><ActivityIndicator color={palette.blue} size="large" /></View>;
  return state.user ? <MainApp client={client} user={state.user} onLogout={logout} /> : <LoginScreen client={client} onSignedIn={(user) => setState({ loading: false, user })} />;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: palette.canvas }, body: { flex: 1 }, loading: { flex: 1, gap: 32, justifyContent: "center", alignItems: "center", backgroundColor: palette.white },
  topbar: { height: 68, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.white, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9 }, logoMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: palette.blue, justifyContent: "center", alignItems: "center", transform: [{ rotate: "-8deg" }] }, logoGlyph: { color: "white", fontWeight: "900", fontSize: 21 }, logo: { color: palette.ink, fontSize: 17, fontWeight: "800" }, logoBlue: { color: palette.blue }, platform: { fontSize: 7, letterSpacing: 2.2, color: palette.muted, fontWeight: "700" }, topCredits: { fontSize: 12, color: palette.blue, fontWeight: "700" },
  authPage: { flex: 1, backgroundColor: palette.canvas }, authInner: { flex: 1, padding: 24, justifyContent: "center" }, authHero: { marginTop: 42, marginBottom: 24 }, authTitle: { fontSize: 30, lineHeight: 39, color: palette.ink, fontWeight: "900" }, authText: { marginTop: 10, fontSize: 15, lineHeight: 23, color: palette.muted }, authCard: { padding: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 22 },
  segment: { flexDirection: "row", backgroundColor: "#F0F3F8", padding: 4, borderRadius: 13, marginBottom: 18 }, segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 }, segmentActive: { backgroundColor: palette.white }, segmentText: { color: palette.muted, fontWeight: "700" }, segmentTextActive: { color: palette.blue },
  emailActions: { flexDirection: "row", gap: 22, marginBottom: 14 }, emailAction: { color: palette.muted, fontWeight: "700", paddingBottom: 6 }, emailActionActive: { color: palette.blue, borderBottomWidth: 2, borderBottomColor: palette.blue },
  input: { height: 52, borderWidth: 1, borderColor: "#D8E0EC", borderRadius: 13, paddingHorizontal: 15, fontSize: 15, color: palette.ink, marginBottom: 12, backgroundColor: "#FBFCFE" }, codeRow: { flexDirection: "row", gap: 10 }, codeInput: { flex: 1 }, codeButton: { height: 52, minWidth: 112, borderRadius: 13, borderWidth: 1, borderColor: "#BCD0FD", justifyContent: "center", alignItems: "center" }, codeButtonText: { color: palette.blue, fontWeight: "700", fontSize: 13 }, primaryButton: { height: 52, borderRadius: 14, backgroundColor: palette.blue, justifyContent: "center", alignItems: "center", marginTop: 4 }, primaryButtonText: { color: "white", fontWeight: "800", fontSize: 16 }, disabled: { opacity: .5 }, authLegal: { textAlign: "center", color: "#9AA5B6", fontSize: 11, marginTop: 14 },
  content: { padding: 18, paddingBottom: 30 }, welcome: { borderRadius: 24, padding: 22, backgroundColor: "#EAF0FF", marginBottom: 23, overflow: "hidden" }, welcomeEyebrow: { color: palette.blue, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }, welcomeTitle: { marginTop: 12, color: palette.ink, fontSize: 25, fontWeight: "900" }, welcomeText: { marginTop: 5, color: palette.muted, fontSize: 15 }, heroButton: { marginTop: 20, alignSelf: "flex-start", backgroundColor: palette.blue, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, heroButtonText: { color: "white", fontWeight: "800" }, sectionTitle: { color: palette.ink, fontWeight: "800", fontSize: 17, marginBottom: 12, marginTop: 4 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }, metric: { width: "48%", padding: 15, borderRadius: 17, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line }, metricIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 14 }, metricLabel: { color: palette.muted, fontSize: 12 }, metricValue: { marginTop: 4, color: palette.ink, fontSize: 22, fontWeight: "900" }, metricSuffix: { fontSize: 10, color: palette.muted, fontWeight: "500" },
  pageTitle: { color: palette.ink, fontSize: 27, fontWeight: "900", marginTop: 3 }, pageLead: { color: palette.muted, fontSize: 14, marginTop: 6, marginBottom: 20 }, toolCard: { flexDirection: "row", gap: 13, padding: 16, borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, marginBottom: 11 }, toolIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, grow: { flex: 1 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, toolTitle: { flex: 1, color: palette.ink, fontSize: 15, fontWeight: "800" }, toolDescription: { marginTop: 7, color: palette.muted, fontSize: 12, lineHeight: 18 }, cost: { marginTop: 10, color: palette.ink, fontSize: 11, fontWeight: "700" }, useLink: { marginTop: 10, color: palette.blue, fontSize: 11, fontWeight: "800" }, status: { color: palette.green, backgroundColor: "#E8F8F2", borderRadius: 10, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "700" }, statusWaiting: { color: "#9B6A21", backgroundColor: "#FFF4DF" },
  back: { color: palette.blue, fontWeight: "700", marginBottom: 20 }, runnerHead: { flexDirection: "row", gap: 14, alignItems: "flex-start" }, runnerCard: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 22, padding: 18 }, fieldLabel: { color: palette.ink, fontSize: 13, fontWeight: "800", marginBottom: 8 }, textarea: { height: 130, paddingTop: 14, textAlignVertical: "top" }, textareaSmall: { height: 85, paddingTop: 14, textAlignVertical: "top" }, twoFields: { flexDirection: "row", gap: 10 }, picker: { minHeight: 150, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#BFD0F4", borderRadius: 18, backgroundColor: "#F8FAFF", alignItems: "center", justifyContent: "center", marginBottom: 18, padding: 18 }, pickerIcon: { color: palette.blue, fontSize: 28, fontWeight: "800" }, pickerTitle: { color: palette.ink, fontWeight: "800", marginTop: 8 }, pickerHint: { color: palette.muted, fontSize: 11, marginTop: 5, textAlign: "center" }, checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 16 }, checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: "#B7C2D2", alignItems: "center", justifyContent: "center" }, checkboxActive: { backgroundColor: palette.blue, borderColor: palette.blue }, checkboxText: { color: "white", fontWeight: "900" }, checkText: { flex: 1, color: palette.muted, fontSize: 12, lineHeight: 18 }, runnerCost: { color: palette.muted, fontSize: 11, textAlign: "center", marginTop: 12 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, backgroundColor: palette.white, borderBottomWidth: 1, borderBottomColor: palette.line }, dot: { width: 9, height: 9, borderRadius: 5 }, listTitle: { color: palette.ink, fontWeight: "700", fontSize: 14 }, listMeta: { color: palette.muted, fontSize: 11, marginTop: 4 }, fileIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EDF3FF", alignItems: "center", justifyContent: "center" }, empty: { minHeight: 150, alignItems: "center", justifyContent: "center", padding: 24, borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white }, emptyIcon: { color: palette.blue, fontSize: 24 }, emptyText: { color: palette.muted, marginTop: 10, textAlign: "center" },
  profileCard: { backgroundColor: palette.white, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 24, alignItems: "center", marginTop: 20 }, avatar: { width: 66, height: 66, borderRadius: 24, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, avatarText: { color: "white", fontSize: 28, fontWeight: "800" }, profileName: { marginTop: 14, fontSize: 20, color: palette.ink, fontWeight: "900" }, profileEmail: { marginTop: 5, color: palette.muted }, profilePlan: { marginTop: 14, color: palette.indigo, backgroundColor: "#F0EDFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: "hidden", fontSize: 12, fontWeight: "700" }, logoutButton: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: "#F1C7CD", alignItems: "center", justifyContent: "center", marginTop: 16 }, logoutText: { color: "#D44558", fontWeight: "700" },
  tabs: { height: 68, flexDirection: "row", backgroundColor: palette.white, borderTopWidth: 1, borderTopColor: palette.line, paddingBottom: Platform.OS === "ios" ? 8 : 0 }, tab: { flex: 1, justifyContent: "center", alignItems: "center" }, tabIcon: { fontSize: 19, color: "#9AA6B8" }, tabLabel: { fontSize: 10, color: "#8996A9", marginTop: 3 }, tabActive: { color: palette.blue, fontWeight: "800" },
});

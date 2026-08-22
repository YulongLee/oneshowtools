import { useEffect, useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, errorText } from "../../api";
import { Brand, ErrorBox } from "../../components";
import "./index.css";

export default function Login() {
  const [mode, setMode] = useState("wechat");
  const [emailAction, setEmailAction] = useState("login");
  const [health, setHealth] = useState(null);
  const [form, setForm] = useState({ phone: "", code: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.health().then(setHealth).catch(() => {}); }, []);
  const change = (key) => (event) => setForm({ ...form, [key]: event.detail.value });
  const finish = () => Taro.reLaunch({ url: "/pages/index/index" });
  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); finish(); } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  };
  const wechat = () => run(async () => { const login = await Taro.login(); await api.wechatLogin(login.code); });
  const sms = () => run(() => api.verifySms(form.phone, form.code));
  const email = async () => {
    setBusy(true); setError("");
    try {
      if (emailAction === "register") {
        await api.register({ name: form.name, email: form.email, password: form.password, locale: "zh-CN" });
        await Taro.showModal({ title: "注册申请已提交", content: "请查收验证邮件，完成验证后即可登录。", showCancel: false });
        setEmailAction("login");
      } else {
        await api.login(form.email, form.password);
        finish();
      }
    } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  };
  const emailDisabled = !form.email || !form.password || (emailAction === "register" && (!form.name || form.password.length < 10));
  return <View className="page login-page"><Brand/><View className="login-head"><View className="title">欢迎回来</View><View className="lead">一个账户，连接所有 OneShowTools 能力。</View></View><View className="card login-card">
    <View className="modes">{[["wechat","微信快捷登录"],["sms","短信登录"],["email","邮箱登录"]].map(([key,label])=><Text className={mode===key?"active":""} onClick={()=>setMode(key)} key={key}>{label}</Text>)}</View><ErrorBox text={error}/>
    {mode === "wechat" && <><View className="wechat-icon">微</View><Text className="wechat-hint">使用当前微信身份安全登录</Text><Button className="wechat-button" disabled={busy||health?.wechatMiniProgramEnabled===false} onClick={wechat}>{health?.wechatMiniProgramEnabled===false?"管理员尚未配置微信登录":"微信一键登录"}</Button></>}
    {mode === "sms" && <><Input className="input" type="number" placeholder="中国大陆手机号" value={form.phone} onInput={change("phone")}/><View className="code-row"><Input className="input" type="number" maxlength={6} placeholder="6 位验证码" value={form.code} onInput={change("code")}/><Button className="code-button" onClick={async()=>{try{await api.sendSms(form.phone);Taro.showToast({title:"验证码已发送",icon:"success"});}catch(reason){setError(errorText(reason));}}}>获取验证码</Button></View><Button className="primary" disabled={busy||form.code.length!==6} onClick={sms}>短信登录</Button></>}
    {mode === "email" && <><View className="email-actions"><Text className={emailAction==="login"?"active":""} onClick={()=>setEmailAction("login")}>登录</Text><Text className={emailAction==="register"?"active":""} onClick={()=>setEmailAction("register")}>注册账号</Text></View>{emailAction==="register"&&<Input className="input" placeholder="你的称呼" value={form.name} onInput={change("name")}/>}<Input className="input" placeholder="邮箱地址" value={form.email} onInput={change("email")}/><Input className="input" password placeholder={emailAction==="register"?"至少 10 位密码":"密码"} value={form.password} onInput={change("password")}/><Button className="primary" disabled={busy||emailDisabled} onClick={email}>{emailAction==="register"?"创建账号":"邮箱登录"}</Button></>}
    <Text className="legal">登录即表示你同意服务条款与隐私政策</Text>
  </View></View>;
}

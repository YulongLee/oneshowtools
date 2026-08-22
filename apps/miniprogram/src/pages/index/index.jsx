import { useCallback } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { api, hasSession } from "../../api";
import { Brand, ErrorBox } from "../../components";
import { useRemote } from "../../hooks";
import "./index.css";

export default function Home() {
  const loader = useCallback(() => hasSession() ? api.dashboard() : Promise.resolve(null), []);
  const { data, error, reload } = useRemote(loader, null);
  useDidShow(reload);
  return <View className="page"><Brand /><View className="hero"><Text className="eyebrow">ONE ACCOUNT · EVERY TOOL</Text><View className="title">让 AI 帮你完成更多重要的工作</View><View className="lead">网页、App 和小程序共享同一个账户、积分、任务与文件。</View><Button className="primary hero-action" onClick={() => hasSession() ? Taro.switchTab({ url: "/pages/tools/index" }) : Taro.navigateTo({ url: "/pages/login/index" })}>{hasSession() ? "探索工具" : "登录后开始"}</Button></View><ErrorBox text={error} />
    {data && <><View className="section-title">你好，{data.user?.name} 👋</View><View className="metrics"><View className="metric"><Text>可用积分</Text><Strong>{data.metrics?.credits}</Strong><Text>Credits</Text></View><View className="metric"><Text>已完成</Text><Strong>{data.metrics?.completed}</Strong><Text>个任务</Text></View><View className="metric"><Text>文件中心</Text><Strong>{data.metrics?.files}</Strong><Text>个文件</Text></View><View className="metric"><Text>运行中</Text><Strong>{data.metrics?.running}</Strong><Text>个任务</Text></View></View></>}
    <View className="section-title">为什么使用 OneShowTools</View><View className="features">{[["✦","统一积分","所有工具使用同一份积分"],["☁","安全存储","结果自动保存到文件中心"],["✓","真实任务","离开页面后任务继续运行"]].map(([icon,title,text])=><View className="card feature" key={title}><Text className="feature-icon">{icon}</Text><Text className="feature-title">{title}</Text><Text className="feature-text">{text}</Text></View>)}</View>
  </View>;
}
function Strong({ children }) { return <Text className="metric-value">{children || 0}</Text>; }

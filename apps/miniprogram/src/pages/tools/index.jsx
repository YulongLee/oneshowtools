import { useCallback } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../api";
import { Empty, ErrorBox, Status } from "../../components";
import { useRemote } from "../../hooks";
import "./index.css";

const MINI_PROGRAM_TOOL_SLUGS = new Set(["ai-music-studio", "ai-outfit-changer", "food-nutrition-analyzer"]);

export default function Tools() {
  const loader = useCallback(api.tools, []); const { data, error } = useRemote(loader, { tools: [] });
  return <View className="page"><View className="title">工具市场</View><View className="lead tools-lead">只展示后台已经发布的真实工具。</View><ErrorBox text={error} />{data.tools?.length ? data.tools.map((tool)=>{const supported=MINI_PROGRAM_TOOL_SLUGS.has(tool.slug);const usable=supported&&tool.runtimeStatus==="ready";return <View className="card tool" key={tool.id} onClick={()=>usable&&Taro.navigateTo({url:`/pages/tool/index?slug=${encodeURIComponent(tool.slug)}`})}><View className="tool-icon">{tool.nameZh.slice(0,1)}</View><View className="tool-body"><View className="tool-head"><Text className="tool-title">{tool.nameZh}</Text><Status ready={usable}>{!supported?"小程序适配中":tool.runtimeStatus==="ready"?"可运行":"待配置"}</Status></View><Text className="tool-description">{tool.descriptionZh}</Text><View className="tool-foot"><Text className="tool-cost">{tool.creditCost} 积分 / 次</Text>{usable&&<Text className="tool-use">立即使用 →</Text>}</View></View></View>}) : <Empty text="当前还没有已发布工具" />}</View>;
}

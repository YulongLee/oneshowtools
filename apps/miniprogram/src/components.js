import { View, Text } from "@tarojs/components";

export function Brand() { return <View className="brand"><View className="brand-mark">1</View><Text>OneShow<Text className="brand-blue">Tools</Text></Text></View>; }
export function ErrorBox({ text }) { return text ? <View className="error">{text}</View> : null; }
export function Empty({ text }) { return <View className="card empty">✦<View>{text}</View></View>; }
export function Status({ ready, children }) { return <Text className={`status ${ready ? "" : "waiting"}`}>{children}</Text>; }

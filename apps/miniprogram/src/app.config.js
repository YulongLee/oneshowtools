export default defineAppConfig({
  pages: ["pages/index/index", "pages/tools/index", "pages/tasks/index", "pages/files/index", "pages/me/index", "pages/login/index", "pages/tool/index"],
  window: {
    navigationBarTitleText: "OneShowTools",
    navigationBarBackgroundColor: "#ffffff",
    navigationBarTextStyle: "black",
    backgroundColor: "#f6f8fc",
  },
  tabBar: {
    color: "#7b879a",
    selectedColor: "#246bfd",
    backgroundColor: "#ffffff",
    borderStyle: "white",
    list: [
      { pagePath: "pages/index/index", text: "首页" },
      { pagePath: "pages/tools/index", text: "工具" },
      { pagePath: "pages/tasks/index", text: "任务" },
      { pagePath: "pages/files/index", text: "文件" },
      { pagePath: "pages/me/index", text: "我的" }
    ]
  },
  lazyCodeLoading: "requiredComponents"
});

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  FilePdf,
  GridFour,
  Image,
  Info,
  MagicWand,
  MagnifyingGlass,
  MicrophoneStage,
  Sparkle,
  X,
} from "@phosphor-icons/react";

const tools = [
  {
    id: "background-remover",
    name: "图片背景移除",
    description: "智能识别主体，一键去除图片背景，支持透明背景导出。",
    icon: MagicWand,
    tone: "blue",
    keywords: "图片 去背景 抠图 透明",
  },
  {
    id: "copy-polish",
    name: "文案润色",
    description: "优化语句表达，提升文案质量，让内容更专业、更自然。",
    icon: Sparkle,
    tone: "green",
    keywords: "文字 文案 写作 润色",
  },
  {
    id: "pdf-summary",
    name: "PDF 摘要",
    description: "快速提炼 PDF 核心内容，生成结构化摘要，节省阅读时间。",
    icon: FilePdf,
    tone: "red",
    keywords: "PDF 文档 摘要 总结",
  },
  {
    id: "image-compressor",
    name: "图片压缩",
    description: "在保持清晰度的同时减小图片体积，支持批量压缩。",
    icon: Image,
    tone: "orange",
    keywords: "图片 压缩 体积 批量",
  },
  {
    id: "speech-to-text",
    name: "语音转文字",
    description: "高准确率识别语音内容，快速转换为可编辑的文本。",
    icon: MicrophoneStage,
    tone: "purple",
    keywords: "语音 音频 转文字 转录",
  },
];

const quickSearches = ["去除图片背景", "PDF 摘要", "图片压缩", "语音转文字", "文案润色"];

const recentTools = [
  { id: "pdf-summary", time: "2 小时前" },
  { id: "background-remover", time: "昨天" },
  { id: "copy-polish", time: "昨天" },
  { id: "image-compressor", time: "2 天前" },
  { id: "speech-to-text", time: "3 天前" },
];

export function App() {
  const [activeNav, setActiveNav] = useState("工具广场");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const SelectedToolIcon = selectedTool?.icon;

  const visibleTools = useMemo(() => {
    const normalized = submittedQuery.trim().toLowerCase();
    if (!normalized) return tools;
    return tools.filter((tool) =>
      `${tool.name} ${tool.description} ${tool.keywords}`.toLowerCase().includes(normalized),
    );
  }, [submittedQuery]);

  const runSearch = (value = query) => {
    setQuery(value);
    setSubmittedQuery(value);
    setSelectedTool(null);
  };

  const openTool = (tool) => {
    setSelectedTool(tool);
    window.setTimeout(() => {
      document.querySelector(".tool-feedback")?.focus();
    }, 0);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="OneShowTools 首页">
          <span className="brand-mark" aria-hidden="true">
            <GridFour weight="fill" size={18} />
          </span>
          <span className="brand-copy">
            <strong>OneShowTools</strong>
            <small>by OneShow AI Lab</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="主导航">
          {["工具广场", "我的空间", "定价"].map((item) => (
            <button
              className={activeNav === item ? "nav-item active" : "nav-item"}
              key={item}
              type="button"
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <button className="login-button" type="button" onClick={() => setShowLogin(true)}>
          登录
        </button>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">OneShow AI Lab 旗下 AI 工具平台</p>
        <h1>一个网站，解决每天的小需求</h1>
        <p className="hero-copy">发现简单、好用的 AI 小工具，让重复工作更轻松。</p>

        <form
          className="search-form"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch();
          }}
        >
          <MagnifyingGlass size={25} weight="regular" aria-hidden="true" />
          <input
            aria-label="搜索 AI 工具"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入你想要的功能，例如：去除图片背景、总结 PDF、语音转文字..."
          />
          <button type="submit">搜索</button>
        </form>

        <div className="quick-searches" aria-label="热门搜索">
          <span>热门搜索：</span>
          <div>
            {quickSearches.map((item) => (
              <button key={item} type="button" onClick={() => runSearch(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedTool && (
        <div className="tool-feedback" tabIndex="-1" role="status">
          <span className={`mini-icon ${selectedTool.tone}`}>
            <SelectedToolIcon size={18} weight="regular" aria-hidden="true" />
          </span>
          <p>
            <strong>{selectedTool.name}</strong>
            <span>工具已准备好，即将进入使用页面。</span>
          </p>
          <button type="button" onClick={() => setSelectedTool(null)} aria-label="关闭提示">
            <X size={18} />
          </button>
        </div>
      )}

      <section className="content-grid" aria-label="工具内容">
        <section className="panel tools-panel">
          <header className="panel-header">
            <span className="panel-icon">
              <GridFour size={23} weight="regular" />
            </span>
            <h2>{submittedQuery ? "搜索结果" : "工具库"}</h2>
            {submittedQuery && (
              <button
                className="clear-search"
                type="button"
                onClick={() => {
                  setQuery("");
                  setSubmittedQuery("");
                }}
              >
                查看全部
              </button>
            )}
          </header>

          <div className="tool-list">
            {visibleTools.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <button className="tool-row" key={tool.id} type="button" onClick={() => openTool(tool)}>
                  <span className={`tool-icon ${tool.tone}`}>
                    <ToolIcon size={31} weight="regular" aria-hidden="true" />
                  </span>
                  <span className="tool-copy">
                    <strong>{tool.name}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <ArrowRight className="row-arrow" size={27} weight="regular" aria-hidden="true" />
                </button>
              );
            })}
            {visibleTools.length === 0 && (
              <div className="empty-state">
                <MagnifyingGlass size={28} />
                <strong>暂时没有匹配的工具</strong>
                <span>换一个更简单的关键词试试。</span>
              </div>
            )}
          </div>
        </section>

        <aside className="panel recent-panel">
          <header className="panel-header">
            <span className="panel-icon muted">
              <Clock size={24} weight="regular" />
            </span>
            <h2>最近使用</h2>
            <button className="view-all" type="button" onClick={() => setActiveNav("我的空间")}>
              查看全部
            </button>
          </header>

          <div className="recent-list">
            {recentTools.map((recent) => {
              const tool = tools.find((item) => item.id === recent.id);
              const RecentIcon = tool.icon;
              return (
                <button key={recent.id} type="button" onClick={() => openTool(tool)}>
                  <span className={`mini-icon ${tool.tone}`}>
                    <RecentIcon size={18} weight="regular" aria-hidden="true" />
                  </span>
                  <span>{tool.name}</span>
                  <small>{recent.time}</small>
                </button>
              );
            })}
          </div>

          <div className="quota-card">
            <p>
              <strong>免费额度：</strong>
              <span>120 / 200 积分</span>
              <Info size={17} weight="regular" aria-label="额度说明" />
            </p>
            <button type="button" onClick={() => setActiveNav("我的空间")}>
              查看我的空间 <ArrowRight size={18} />
            </button>
          </div>
        </aside>
      </section>

      {showLogin && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLogin(false)}>
          <section
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setShowLogin(false)} aria-label="关闭登录">
              <X size={20} />
            </button>
            <span className="brand-mark large" aria-hidden="true">
              <GridFour weight="fill" size={21} />
            </span>
            <h2 id="login-title">登录 OneShowTools</h2>
            <p>同步你的使用记录、收藏和积分。</p>
            <label>
              邮箱
              <input type="email" placeholder="name@example.com" autoFocus />
            </label>
            <button className="continue-button" type="button" onClick={() => setShowLogin(false)}>
              继续
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

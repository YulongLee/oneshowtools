import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CaretDown,
  CheckCircle,
  Clock,
  Coins,
  Eye,
  EyeSlash,
  GearSix,
  LockKey,
  SignOut,
  Sparkle,
} from "@phosphor-icons/react";
import "./renderer.css";
import "./pet-transparent.css";

const defaults = {
  monthlySalary: 12000,
  workDays: 21.75,
  startHour: 9,
  endHour: 18,
  lunchMinutes: 60,
  privacy: false,
  alwaysOnTop: true,
  launchAtLogin: false,
  showMoney: true,
};
function earnings(config: typeof defaults, now = new Date()) {
  const start = new Date(now);
  start.setHours(config.startHour, 0, 0, 0);
  const end = new Date(now);
  end.setHours(config.endHour, 0, 0, 0);
  const totalSeconds = Math.max(
    60,
    (end.getTime() - start.getTime()) / 1000 - config.lunchMinutes * 60,
  );
  const elapsedRaw = Math.max(
    0,
    Math.min(
      (end.getTime() - start.getTime()) / 1000,
      (now.getTime() - start.getTime()) / 1000,
    ),
  );
  const lunchStart =
    config.startHour < 12 && config.endHour > 13
      ? new Date(now).setHours(12, 0, 0, 0)
      : 0;
  const lunchElapsed = lunchStart
    ? Math.max(
        0,
        Math.min(config.lunchMinutes * 60, (now.getTime() - lunchStart) / 1000),
      )
    : 0;
  const elapsed = Math.max(
    0,
    Math.min(totalSeconds, elapsedRaw - lunchElapsed),
  );
  const daily = config.monthlySalary / Math.max(1, config.workDays);
  const perSecond = daily / totalSeconds;
  const weekday = now.getDay();
  const workingDay = weekday !== 0 && weekday !== 6;
  return {
    today: workingDay ? elapsed * perSecond : 0,
    daily,
    perSecond,
    progress: workingDay ? elapsed / totalSeconds : 0,
    workingDay,
  };
}

function Pet() {
  const [config, setConfig] = useState(defaults);
  const [session, setSession] = useState<any>({ authenticated: false });
  const [tick, setTick] = useState(Date.now());
  const [reaction, setReaction] = useState(0);
  const [affection, setAffection] = useState(0);
  useEffect(() => {
    window.fortuneCat.getConfig().then(setConfig);
    window.fortuneCat.session().then(setSession);
    return window.fortuneCat.onConfig(setConfig);
  }, []);
  useEffect(() => window.fortuneCat.onSession(setSession), []);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!affection) return;
    const timer = setTimeout(() => setAffection(0), 3200);
    return () => clearTimeout(timer);
  }, [affection]);
  const value = useMemo(() => earnings(config, new Date(tick)), [config, tick]);
  const hidden = config.privacy;
  const normalMessage = !session.authenticated
    ? "先登录，再和滚滚一起赚钱"
    : !value.workingDay
      ? "休息日也要好好充电呀"
      : value.progress >= 1
        ? "今天辛苦啦，已经下班！"
        : "每一秒都在稳稳进账";
  const reactions = [
    "摸摸收到，财运 +1！",
    "滚滚给你送来一枚好运金币",
    "今天也要一起加油呀！",
    "认真工作的你会越来越富！",
    "喵～再摸一下就更有好运啦",
  ];
  const interact = () => {
    setAffection((current) => current + 1);
    setReaction((current) => current + 1);
  };
  const reactionMessage = affection
    ? reactions[(affection - 1) % reactions.length]
    : normalMessage;
  const toggleMoney = async () => {
    setConfig(
      await window.fortuneCat.saveConfig({
        ...config,
        showMoney: !config.showMoney,
      }),
    );
  };
  return (
    <main
      className="pet-shell"
      onContextMenu={(event) => {
        event.preventDefault();
        window.fortuneCat.openControl();
      }}
    >
      <div className="pet-drag" />
      <button
        className="pet-settings"
        onClick={() => window.fortuneCat.openControl()}
        aria-label="打开设置"
      >
        <GearSix />
      </button>
      <div className="pet-bubble" aria-live="polite">
        {reactionMessage}
      </div>
      <button
        className={
          reaction ? `pet-character reaction-${reaction % 2}` : "pet-character"
        }
        onClick={interact}
        onDoubleClick={() => window.fortuneCat.openControl()}
        aria-label="摸摸招财滚滚，双击打开设置"
      >
        <img
          src="./zhaocai-gungun-desktop.png"
          alt="招财滚滚"
          draggable="false"
        />
        {reaction > 0 && (
          <span className="fortune-burst" key={reaction} aria-hidden="true">
            <i>¥</i>
            <i>♥</i>
            <i>+</i>
          </span>
        )}
      </button>
      {config.showMoney ? (
        <section className="pet-money">
          <button
            className="money-collapse"
            onClick={toggleMoney}
            aria-label="收起收入信息"
          >
            <CaretDown />
          </button>
          <small>今日已赚</small>
          <strong>{hidden ? "¥ ••••••" : `¥ ${value.today.toFixed(2)}`}</strong>
          <span>
            {hidden ? "隐私模式" : `每秒 +¥ ${value.perSecond.toFixed(4)}`}
          </span>
          <div>
            <i style={{ width: `${Math.min(100, value.progress * 100)}%` }} />
          </div>
          <em>{Math.round(value.progress * 100)}%</em>
        </section>
      ) : (
        <button
          className="money-expand"
          onClick={toggleMoney}
          aria-label="展开收入信息"
        >
          <Coins weight="fill" />
          <span>收入</span>
        </button>
      )}
    </main>
  );
}

function Control() {
  const [config, setConfig] = useState(defaults);
  const [session, setSession] = useState<any>({ authenticated: false });
  const [form, setForm] = useState({ email: "", password: "" });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    window.fortuneCat.getConfig().then(setConfig);
    window.fortuneCat.session().then(setSession);
  }, []);
  const preview = earnings(config);
  const save = async () => {
    setSaving(true);
    setConfig(await window.fortuneCat.saveConfig(config));
    setNotice("设置已保存，桌面上的滚滚会立即更新。");
    setSaving(false);
  };
  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    const result = await window.fortuneCat.login(form);
    if (result.ok) {
      setSession(result.session);
      setNotice("登录与设备授权成功。");
    } else
      setNotice(
        result.error?.code === "PRODUCT_NOT_OWNED"
          ? "请先在 OneShowTools 使用 1000 积分兑换招财滚滚。"
          : "登录失败，请检查账号和密码。",
      );
  };
  return (
    <main className="control-shell">
      <header>
        <div className="control-brand">
          <img src="./zhaocai-gungun-desktop.png" alt="" />
          <span>
            <small>ONESHOWTOOLS · TEST</small>
            <h1>招财滚滚设置中心</h1>
            <p>工资数据只保存在这台电脑，不会上传。</p>
          </span>
        </div>
        <div className="test-badge">
          <i />
          测试版 0.1.2
        </div>
      </header>
      {!session.authenticated ? (
        <form className="login-card" onSubmit={login}>
          <span>
            <LockKey weight="duotone" />
          </span>
          <div>
            <h2>登录 OneShowTools</h2>
            <p>请使用已经兑换招财滚滚的账号登录。</p>
          </div>
          <label>
            邮箱或手机号
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="username"
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
          </label>
          <button>登录并绑定设备</button>
        </form>
      ) : (
        <>
          <section className="account-line">
            <CheckCircle weight="fill" />
            <span>
              <strong>已登录并授权</strong>
              <small>
                {session.account?.user?.email ||
                  session.account?.user?.phone ||
                  "OneShowTools 账号"}
              </small>
            </span>
            <button
              onClick={async () => setSession(await window.fortuneCat.logout())}
            >
              <SignOut />
              退出登录
            </button>
          </section>
          <section className="settings-grid">
            <div className="settings-form">
              <header>
                <span>01</span>
                <div>
                  <h2>收入设置</h2>
                  <p>建议填写实际到手工资，显示会更贴近真实收入。</p>
                </div>
              </header>
              <div className="field-grid">
                <label>
                  税后月薪（元）
                  <input
                    type="number"
                    min="0"
                    max="10000000"
                    value={config.monthlySalary}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        monthlySalary: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  每月工作日
                  <input
                    type="number"
                    min="1"
                    max="31"
                    step="0.25"
                    value={config.workDays}
                    onChange={(e) =>
                      setConfig({ ...config, workDays: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  上班时间
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={config.startHour}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        startHour: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  下班时间
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={config.endHour}
                    onChange={(e) =>
                      setConfig({ ...config, endHour: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="wide">
                  午休时长（分钟）
                  <input
                    type="number"
                    min="0"
                    max="240"
                    value={config.lunchMinutes}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lunchMinutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <header className="second">
                <span>02</span>
                <div>
                  <h2>桌面显示</h2>
                  <p>按你的工作习惯调整滚滚。</p>
                </div>
              </header>
              <div className="toggle-list">
                <label>
                  <span>
                    <Coins />
                    <b>显示收入卡片</b>
                    <small>关闭后桌面只保留一个金币按钮</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.showMoney}
                    onChange={(e) =>
                      setConfig({ ...config, showMoney: e.target.checked })
                    }
                  />
                </label>
                <label>
                  <span>
                    {config.privacy ? <EyeSlash /> : <Eye />}
                    <b>隐私模式</b>
                    <small>隐藏具体金额，保留进度</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.privacy}
                    onChange={(e) =>
                      setConfig({ ...config, privacy: e.target.checked })
                    }
                  />
                </label>
                <label>
                  <span>
                    <Sparkle />
                    <b>始终置顶</b>
                    <small>让滚滚停留在其他窗口上方</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.alwaysOnTop}
                    onChange={(e) =>
                      setConfig({ ...config, alwaysOnTop: e.target.checked })
                    }
                  />
                </label>
                <label>
                  <span>
                    <Clock />
                    <b>开机启动</b>
                    <small>登录电脑后自动打开</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.launchAtLogin}
                    onChange={(e) =>
                      setConfig({ ...config, launchAtLogin: e.target.checked })
                    }
                  />
                </label>
              </div>
              <button className="save" onClick={save} disabled={saving}>
                {saving ? "保存中…" : "保存并应用"}
              </button>
            </div>
            <aside className="preview-card">
              <small>实时预览</small>
              <img src="./zhaocai-gungun-desktop.png" alt="招财滚滚" />
              <span>今日已赚</span>
              <strong>
                {config.privacy ? "¥ ••••••" : `¥ ${preview.today.toFixed(2)}`}
              </strong>
              <p>
                <Coins />
                每秒 +¥ {preview.perSecond.toFixed(4)}
              </p>
              <div>
                <i style={{ width: `${preview.progress * 100}%` }} />
              </div>
              <em>今天完成 {Math.round(preview.progress * 100)}%</em>
              <hr />
              <p className="privacy-note">
                <LockKey />
                工资与排班已加密保存在本机
              </p>
            </aside>
          </section>
        </>
      )}
      {notice && <div className="notice">{notice}</div>}
    </main>
  );
}

const mode =
  new URLSearchParams(location.search).get("mode") === "control"
    ? "control"
    : "pet";
document.documentElement.classList.add(`${mode}-mode`);
document.body.classList.add(`${mode}-mode`);
createRoot(document.getElementById("root")!).render(
  mode === "control" ? <Control /> : <Pet />,
);

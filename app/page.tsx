"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Course = {
  id: number;
  name: string;
  code: string;
  semester: string;
  credits: number;
  score: number;
  scoreLabel?: string;
  required: boolean;
  source?: "demo" | "manual" | "sdufe";
};

type SdufeRow = {
  name: string;
  code: string;
  semester: string;
  credits: number;
  rawScore: string;
  gradePoint: number;
  nature: string;
  attribute: string;
};

const initialCourses: Course[] = [
  { id: 1, name: "高等数学 A（2）", code: "MATH1202", semester: "2025-2026-1", credits: 5, score: 92, required: true, source: "demo" },
  { id: 2, name: "数据结构", code: "CS2103", semester: "2025-2026-1", credits: 4, score: 89, required: true, source: "demo" },
  { id: 3, name: "大学英语（3）", code: "ENG1301", semester: "2025-2026-1", credits: 2, score: 86, required: true, source: "demo" },
  { id: 4, name: "创新创业实践", code: "GE2006", semester: "2025-2026-1", credits: 1, score: 95, required: false, source: "demo" },
  { id: 5, name: "概率论与数理统计", code: "MATH2201", semester: "2024-2025-2", credits: 3, score: 91, required: true, source: "demo" },
  { id: 6, name: "计算机组成原理", code: "CS2204", semester: "2024-2025-2", credits: 3.5, score: 87, required: true, source: "demo" },
];

const STORAGE_KEY = "grade-pocket-courses-v1";
const NEW_RESULTS_KEY = "grade-pocket-new-results-v1";
const SDUFE_BOOKMARKLET = "javascript:(()=>{const d=[];const w=x=>{d.push(x);x.querySelectorAll('iframe').forEach(f=>{try{f.contentDocument&&w(f.contentDocument)}catch(e){}})};w(document);let t;for(const x of d){for(const q of x.querySelectorAll('table')){const s=q.innerText;if(s.includes('课程名称')&&s.includes('成绩')&&s.includes('学分')){t=q;break}}if(t)break}if(!t){alert('未找到成绩表，请先打开“学籍成绩 → 课程成绩查询”并完成查询。');return}const r=[...t.rows],h=[...r[0].cells].map(c=>c.innerText.trim()),i=n=>h.indexOf(n),a=r.slice(1).map(z=>{const c=[...z.cells].map(v=>v.innerText.trim());return[c[i('课程名称')],c[i('课程编号')],c[i('开课学期')],Number(c[i('学分')]),c[i('成绩')],Number(c[i('绩点')]),c[i('课程性质')],c[i('课程属性')]]}).filter(x=>x[0]),u=btoa(unescape(encodeURIComponent(JSON.stringify(a))));window.open('http://localhost:3000/?sdufe='+encodeURIComponent(u),'_blank')})()";
const QUALITATIVE_SCORES: Record<string, number> = { 优秀: 95, 良好: 85, 中等: 75, 及格: 65, 合格: 60 };
const courseKey = (course: Pick<Course, "semester" | "code" | "name">) => `${course.semester}-${course.code}-${course.name}`;

function normalizeSdufeRows(rows: SdufeRow[]): Course[] {
  return rows.map((row, index) => {
    const rawScore = String(row.rawScore ?? "").trim();
    const numericScore = Number(rawScore);
    const gradePoint = Number(row.gradePoint);
    const convertedScore = rawScore !== "" && Number.isFinite(numericScore)
      ? numericScore
      : Number.isFinite(gradePoint)
        ? gradePoint * 10 + 50
        : QUALITATIVE_SCORES[rawScore] ?? 0;
    return {
      id: Date.now() + index,
      name: row.name,
      code: row.code || "—",
      semester: row.semester || "未分类学期",
      credits: Number(row.credits) || 0,
      score: convertedScore,
      scoreLabel: rawScore !== "" && !Number.isFinite(numericScore) ? rawScore : undefined,
      required: /必修/.test(`${row.nature}${row.attribute}`),
      source: "sdufe",
    };
  });
}

function parseCsv(text: string): Course[] {
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows[0].split(",").map((item) => item.trim());
  const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = {
    name: find("课程名称", "课程", "name"),
    code: find("课程代码", "代码", "code"),
    semester: find("学期", "semester"),
    credits: find("学分", "credits"),
    score: find("成绩", "分数", "score"),
    required: find("课程性质", "是否必修", "required"),
  };

  return rows.slice(1).map((row, index) => {
    const cells = row.split(",").map((item) => item.trim());
    const nature = cells[indexes.required] ?? "";
    return {
      id: Date.now() + index,
      name: cells[indexes.name] || `未命名课程 ${index + 1}`,
      code: cells[indexes.code] || "—",
      semester: cells[indexes.semester] || "未分类学期",
      credits: Number(cells[indexes.credits]) || 0,
      score: Number(cells[indexes.score]) || 0,
      required: /必修|是|true|1/i.test(nature),
      source: "manual",
    };
  });
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [viewMode, setViewMode] = useState<"owner" | "guest">("owner");
  const [activeUserName, setActiveUserName] = useState("我的成绩");
  const [semester, setSemester] = useState("全部学期");
  const [onlyRequired, setOnlyRequired] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [draggingBookmark, setDraggingBookmark] = useState(false);
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestAccount, setGuestAccount] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [showGuestPassword, setShowGuestPassword] = useState(false);
  const [guestError, setGuestError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    let savedCourses: Course[] = initialCourses;
    if (saved) {
      try { savedCourses = JSON.parse(saved); } catch { /* keep sample data */ }
    }
    const savedNewResults = window.localStorage.getItem(NEW_RESULTS_KEY);
    if (savedNewResults) {
      try { setNewCourses(JSON.parse(savedNewResults)); } catch { /* ignore invalid history */ }
    }
    const payload = new URLSearchParams(window.location.search).get("sdufe");
    if (!payload) {
      setCourses(savedCourses);
      return;
    }

    try {
      const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
      const rows = JSON.parse(new TextDecoder().decode(bytes)) as Array<[string, string, string, number, string, number, string, string]>;
      const imported = normalizeSdufeRows(rows.map((row) => ({
        name: row[0], code: row[1], semester: row[2], credits: row[3], rawScore: row[4],
        gradePoint: row[5], nature: row[6], attribute: row[7],
      })));
      const previous = savedCourses.filter((course) => course.source !== "demo");
      const merged = new Map<string, Course>();
      [...previous, ...imported].forEach((course) => merged.set(`${course.semester}-${course.code}-${course.name}`, course));
      setCourses(Array.from(merged.values()));
      setNotice(`已从山东财经大学教务系统同步 ${imported.length} 门课程。请检查必修课标记后再使用均分。`);
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      setCourses(savedCourses);
      setNotice("同步数据未能识别，请回到教务系统成绩页重新点击同步书签。");
    }
  }, []);

  useEffect(() => {
    if (viewMode === "owner") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses, viewMode]);

  useEffect(() => {
    window.localStorage.setItem(NEW_RESULTS_KEY, JSON.stringify(newCourses));
  }, [newCourses]);

  const semesters = useMemo(
    () => ["全部学期", ...Array.from(new Set(courses.map((course) => course.semester)))],
    [courses],
  );

  const requiredCourses = courses.filter((course) => course.required);
  const totalCredits = requiredCourses.reduce((sum, course) => sum + course.credits, 0);
  const weightedAverage = totalCredits
    ? requiredCourses.reduce((sum, course) => sum + course.score * course.credits, 0) / totalCredits
    : 0;
  const arithmeticAverage = requiredCourses.length
    ? requiredCourses.reduce((sum, course) => sum + course.score, 0) / requiredCourses.length
    : 0;
  const allCourseCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  const allCourseWeightedAverage = allCourseCredits
    ? courses.reduce((sum, course) => sum + course.score * course.credits, 0) / allCourseCredits
    : 0;
  const allCourseArithmeticAverage = courses.length
    ? courses.reduce((sum, course) => sum + course.score, 0) / courses.length
    : 0;
  const contribution = weightedAverage * 0.75;
  const filteredCourses = courses.filter((course) =>
    (semester === "全部学期" || course.semester === semester) && (!onlyRequired || course.required),
  ).sort((left, right) => right.semester.localeCompare(left.semester) || right.id - left.id);

  function updateCourse(id: number, patch: Partial<Course>) {
    setCourses((current) => current.map((course) => course.id === id ? { ...course, ...patch } : course));
  }

  function addCourse() {
    setCourses((current) => [{
      id: Date.now(), name: "新课程", code: "NEW", semester: "2025-2026-2", credits: 2, score: 80, required: true, source: "manual",
    }, ...current]);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = parseCsv(await file.text());
    if (!imported.length) {
      setNotice("没有识别到课程，请检查 CSV 是否包含表头和数据行。");
      return;
    }
    setCourses(imported);
    setNotice(`已导入 ${imported.length} 门课程，均分已重新计算。`);
    event.target.value = "";
  }

  async function refreshGrades() {
    setSyncing(true);
    setNotice("正在连接教务系统并检查新成绩……");
    try {
      const response = await fetch("http://127.0.0.1:3100/sync", { method: "POST" });
      const result = await response.json() as { status: string; message?: string; courses?: SdufeRow[] };
      if (result.status !== "ok" || !result.courses) {
        setNotice(result.message || "暂时没有读到成绩，请稍后再试。");
        return;
      }
      const imported = normalizeSdufeRows(result.courses);
      const previousSdufe = courses.filter((course) => course.source === "sdufe");
      const previousKeys = new Set(previousSdufe.map(courseKey));
      const previousRequired = new Map(courses.map((course) => [courseKey(course), course.required]));
      const refreshed = imported.map((course) => {
        const previous = previousRequired.get(courseKey(course));
        return previous === undefined ? course : { ...course, required: previous };
      });
      const recoveredFromPartialSync = previousSdufe.length > 0 && imported.length > previousSdufe.length * 2;
      const newlyReleased = recoveredFromPartialSync
        ? refreshed.filter((course) => previousKeys.has(courseKey(course)))
        : refreshed.filter((course) => !previousKeys.has(courseKey(course)));
      setCourses([...courses.filter((course) => course.source === "manual"), ...refreshed]);
      setNewCourses(newlyReleased);
      setNotice(newlyReleased.length
        ? `刷新完成：发现 ${newlyReleased.length} 门新成绩，全部 ${imported.length} 门课程已重新计算。`
        : `刷新完成：暂时没有新成绩，已核对全部 ${imported.length} 门课程。`);
    } catch {
      setNotice("本机成绩连接器还没有启动。请先运行“成绩袋启动器”，也可以使用 Safari 备用同步。");
      setShowConnect(true);
    } finally {
      setSyncing(false);
    }
  }

  async function queryGuestGrades(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guestAccount.trim() || !guestPassword) {
      setGuestError("请让朋友输入完整的教务账号和密码。");
      return;
    }
    setSyncing(true);
    setGuestError("");
    try {
      const response = await fetch("http://127.0.0.1:3100/sync-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: guestAccount.trim(), password: guestPassword }),
      });
      const result = await response.json() as { status: string; message?: string; courses?: SdufeRow[] };
      if (result.status !== "ok" || !result.courses) {
        setGuestError(result.message || "没有查询到成绩，请检查账号和密码。");
        return;
      }
      const imported = normalizeSdufeRows(result.courses);
      const displayName = guestName.trim() || "朋友的成绩";
      setViewMode("guest");
      setActiveUserName(displayName);
      setCourses(imported);
      setNewCourses([]);
      setSemester("全部学期");
      setOnlyRequired(false);
      setShowGuestLogin(false);
      setGuestError("");
      setGuestAccount("");
      setGuestPassword("");
      setShowGuestPassword(false);
      setNotice(`已临时载入${displayName}的 ${imported.length} 门课程；退出后不会保存在这台电脑上。`);
    } catch {
      setGuestError("本机连接器未启动，暂时无法查询朋友的成绩。");
    } finally {
      setSyncing(false);
    }
  }

  function returnToOwner() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const savedNew = window.localStorage.getItem(NEW_RESULTS_KEY);
    try { setCourses(saved ? JSON.parse(saved) : initialCourses); }
    catch { setCourses(initialCourses); }
    try { setNewCourses(savedNew ? JSON.parse(savedNew) : []); }
    catch { setNewCourses([]); }
    setViewMode("owner");
    setActiveUserName("我的成绩");
    setSemester("全部学期");
    setOnlyRequired(false);
    setNotice("已返回我的成绩，朋友的临时查询数据已清除。");
  }

  function closeGuestLogin() {
    if (syncing) return;
    setShowGuestLogin(false);
    setGuestPassword("");
    setShowGuestPassword(false);
    setGuestError("");
  }

  function openGuestLogin() {
    setGuestError("");
    setShowGuestPassword(false);
    setShowGuestLogin(true);
  }

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(SDUFE_BOOKMARKLET);
      setNotice("同步代码已复制。请在 Safari 中编辑“成绩袋同步”书签，把地址替换为复制的内容。");
    } catch {
      setNotice("浏览器未允许自动复制，请点一下代码框后全选复制。");
    }
  }

  function startBookmarkDrag(event: React.DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "copyLink";
    event.dataTransfer.setData("text/uri-list", SDUFE_BOOKMARKLET);
    event.dataTransfer.setData("text/plain", SDUFE_BOOKMARKLET);
    event.dataTransfer.setData("text/html", `<a href="${SDUFE_BOOKMARKLET.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">成绩袋同步</a>`);
    setDraggingBookmark(true);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="成绩袋首页">
          <span className="brand-mark">绩</span>
          <span>成绩袋</span>
        </a>
        <nav className="nav-links" aria-label="主要导航">
          <a className="active" href="#overview">成绩概览</a>
          <a href="#courses">课程明细</a>
          <a href="#how">计算说明</a>
        </nav>
        <div className="topbar-actions">
          <button className="user-pill" type="button" onClick={openGuestLogin}>👤 {activeUserName}</button>
          <button className="connect-button" type="button" onClick={viewMode === "owner" ? refreshGrades : returnToOwner} disabled={syncing}>
            <span className={`status-dot ${syncing ? "" : "connected"}`} />{syncing ? "正在查询…" : viewMode === "owner" ? "刷新成绩" : "返回我的成绩"}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="active-user-line">当前查看 · <strong>{activeUserName}</strong>{viewMode === "guest" && <span>临时模式</span>}</p>
          <p className="eyebrow">为保研准备得更清楚一点</p>
          <h1>每一分，都心中有数。</h1>
          <p className="hero-copy">集中查看成绩，自动识别必修课，按学分算出真实均分。登录会话可在设备上保留，不再每次重复输入密码。</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={viewMode === "owner" ? refreshGrades : returnToOwner} disabled={syncing}>{syncing ? "正在读取成绩…" : viewMode === "owner" ? "↻ 刷新成绩" : "← 返回我的成绩"}</button>
          <button className="secondary-button guest-button" type="button" onClick={openGuestLogin}>＋ 查询朋友成绩</button>
          <button className="secondary-button" type="button" onClick={() => setShowConnect(true)}>同步设置与备用方式</button>
          <label className="secondary-button file-button">
            导入成绩 CSV
            <input type="file" accept=".csv,text/csv" onChange={importCsv} />
          </label>
        </div>
      </section>

      {notice && <div className="notice" role="status"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}

      {newCourses.length > 0 && (
        <section className="new-results" aria-labelledby="new-results-title">
          <div className="new-results-heading">
            <div>
              <p className="new-badge">NEW · 新成绩已发布</p>
              <h2 id="new-results-title">有 {newCourses.length} 门课出成绩了</h2>
              <p>已自动加入下方全部课程，并重新计算三个均分指标。</p>
            </div>
            <button type="button" onClick={() => setNewCourses([])}>我知道了</button>
          </div>
          <div className="new-result-grid">
            {newCourses.map((course) => (
              <article className="new-result-card" key={courseKey(course)}>
                <div><span>{course.semester}</span><strong>{course.name}</strong><small>{course.credits} 学分 · {course.required ? "必修" : "选修"}</small></div>
                <div className="new-result-score">{course.scoreLabel || course.score}<small>{course.scoreLabel ? `折算 ${course.score}` : "分"}</small></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="overview" id="overview">
        <article className="score-card feature-card">
          <div className="card-heading">
            <div><p className="card-label">必修课加权均分</p><p className="card-note">按学分加权 · 自动更新</p></div>
            <span className="metric-chip">核心指标</span>
          </div>
          <div className="big-score">{weightedAverage.toFixed(2)}<span>/ 100</span></div>
          <div className="progress-track"><span style={{ width: `${Math.min(weightedAverage, 100)}%` }} /></div>
          <p className="formula">Σ（成绩 × 学分）÷ Σ 学分 · 75% 贡献为 {contribution.toFixed(2)}</p>
        </article>

        <article className="score-card blue-card">
          <p className="card-label">所有课程加权均分</p>
          <div className="medium-score">{allCourseWeightedAverage.toFixed(2)}</div>
          <p className="card-note">每门课按学分计算权重</p>
          <div className="mini-breakdown"><span>课程与学分</span><strong>{courses.length} 门 · {allCourseCredits.toFixed(1)} 学分</strong></div>
        </article>

        <article className="score-card">
          <p className="card-label">所有课程简单平均分</p>
          <div className="medium-score dark">{allCourseArithmeticAverage.toFixed(2)}</div>
          <p className="card-note">每门课程权重相同</p>
          <div className="mini-breakdown"><span>必修课简单平均</span><strong>{arithmeticAverage.toFixed(2)}</strong></div>
        </article>
      </section>

      <section className="course-section" id="courses">
        <div className="section-heading">
          <div><p className="eyebrow">全部课程成绩</p><h2>{courses.length} 门课程，按学期完整列出</h2></div>
          <div className="table-actions">
            <select value={semester} onChange={(event) => setSemester(event.target.value)} aria-label="筛选学期">
              {semesters.map((item) => <option key={item}>{item}</option>)}
            </select>
            <label className="switch-label"><input type="checkbox" checked={onlyRequired} onChange={(event) => setOnlyRequired(event.target.checked)} /><span />只看必修</label>
            <button type="button" className="add-button" onClick={addCourse}>＋ 添加课程</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>计入</th><th>课程</th><th>学期</th><th>学分</th><th>成绩</th><th>性质</th><th aria-label="操作" /></tr></thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.id}>
                  <td><input className="row-check" type="checkbox" checked={course.required} onChange={(event) => updateCourse(course.id, { required: event.target.checked })} aria-label={`${course.name}计入必修均分`} /></td>
                  <td><input className="course-name" value={course.name} onChange={(event) => updateCourse(course.id, { name: event.target.value })} /><span>{course.code}{course.scoreLabel ? ` · 原成绩 ${course.scoreLabel}` : ""}</span></td>
                  <td><input value={course.semester} onChange={(event) => updateCourse(course.id, { semester: event.target.value })} /></td>
                  <td><input className="number-input" type="number" min="0" step="0.5" value={course.credits} onChange={(event) => updateCourse(course.id, { credits: Number(event.target.value) })} /></td>
                  <td><input className="number-input score-input" type="number" min="0" max="100" value={course.score} onChange={(event) => updateCourse(course.id, { score: Number(event.target.value), scoreLabel: undefined })} /></td>
                  <td><button className={course.required ? "tag required" : "tag elective"} onClick={() => updateCourse(course.id, { required: !course.required })}>{course.required ? "必修" : "选修"}</button></td>
                  <td><button className="delete-button" onClick={() => setCourses((current) => current.filter((item) => item.id !== course.id))} aria-label={`删除${course.name}`}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-tip">直接修改成绩、学分或课程性质，上方结果会立即更新。数据只保存在当前设备。</p>
      </section>

      <section className="how-section" id="how">
        <div><p className="eyebrow">计算说明</p><h2>规则透明，结果才可信</h2></div>
        <div className="how-grid">
          <article><span>01</span><h3>只选择必修课程</h3><p>你可以逐门调整课程性质，选修课默认不参与计算。</p></article>
          <article><span>02</span><h3>成绩按学分加权</h3><p>学分越高的课程，对均分影响越大，更符合常见推免核算方式。</p></article>
          <article><span>03</span><h3>75% 贡献单独显示</h3><p>用必修课加权均分乘以 75%，其余 25% 可按本校细则补充。</p></article>
        </div>
      </section>

      <footer><span className="brand small"><span className="brand-mark">绩</span>成绩袋</span><p>成绩只在你的设备上计算与保存。</p><span>本地演示版 · 2026</span></footer>

      {showGuestLogin && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeGuestLogin}>
          <section className="connect-modal guest-modal" role="dialog" aria-modal="true" aria-labelledby="guest-login-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={closeGuestLogin} disabled={syncing} aria-label="关闭朋友查询窗口">×</button>
            <span className="modal-icon">人</span>
            <p className="eyebrow">临时用户 · 独立查询</p>
            <h2 id="guest-login-title">查询朋友的成绩</h2>
            <p className="modal-copy">请让朋友本人输入教务账号和密码。信息只用于这一次查询，不会写入浏览器、钥匙串或你的成绩记录。</p>
            {guestError && <div className="guest-error" role="alert"><strong>没有切换用户</strong><span>{guestError}</span></div>}
            <form className="guest-login-form" autoComplete="off" onSubmit={queryGuestGrades}>
              <label>怎么称呼（可选）<input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="例如：小王" maxLength={20} /></label>
              <label>教务系统账号<input value={guestAccount} onChange={(event) => setGuestAccount(event.target.value)} placeholder="请朋友本人输入" autoComplete="off" maxLength={80} /></label>
              <label>教务系统密码
                <span className="password-field">
                  <input type={showGuestPassword ? "text" : "password"} value={guestPassword} onChange={(event) => setGuestPassword(event.target.value)} placeholder="仅在本次查询中使用" autoComplete="new-password" maxLength={160} />
                  <button type="button" onClick={() => setShowGuestPassword((visible) => !visible)} aria-label={showGuestPassword ? "隐藏密码" : "显示密码"}>{showGuestPassword ? "隐藏" : "显示"}</button>
                </span>
              </label>
              <button className="primary-button full" type="submit" disabled={syncing}>{syncing ? "正在安全查询…" : "查询全部成绩"}</button>
            </form>
            <p className="security-note">查询完成后密码会立即从页面内存清除；切回“我的成绩”后，朋友的成绩也会清除。</p>
          </section>
        </div>
      )}

      {showConnect && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowConnect(false)}>
          <section className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowConnect(false)} aria-label="关闭连接窗口">×</button>
            <span className="modal-icon">⇄</span>
            <p className="eyebrow">山东财经大学 · 本机连接</p>
            <h2 id="connect-title">一键检查新成绩</h2>
            <p className="modal-copy">连接器只在你的电脑上运行。第一次使用或登录过期时会打开独立登录窗口；它保存登录会话，不保存明文密码。</p>
            <button className="primary-button full refresh-modal-button" type="button" onClick={refreshGrades} disabled={syncing}>{syncing ? "正在连接…" : "↻ 立即刷新全部成绩"}</button>
            <p className="fallback-title">Safari 备用同步</p>
            <ol className="sync-steps">
              <li><span>1</span><div><strong>拖到 Safari 收藏栏</strong><p>按住下方虚线框，拖到 Safari 收藏栏后松开。请勿拖到最上方的标签页区域。</p></div></li>
              <li><span>2</span><div><strong>复制方式备用</strong><p>如果 Safari 没有成功创建书签，点击“复制同步代码”，再手动编辑书签地址。</p></div></li>
              <li><span>3</span><div><strong>回到成绩页点击书签</strong><p>成绩袋会自动打开并导入当前表格。不同学期可以重复同步，课程会自动合并。</p></div></li>
            </ol>
            <div
              className={`draggable-bookmark${draggingBookmark ? " dragging" : ""}`}
              draggable
              role="link"
              tabIndex={0}
              onDragStart={startBookmarkDrag}
              onDragEnd={() => setDraggingBookmark(false)}
              aria-label="拖动成绩袋同步到 Safari 收藏栏"
            >
              <span className="drag-handle">⠿</span>
              <span><strong>成绩袋同步</strong><small>按住拖到 Safari 收藏栏</small></span>
              <span className="drag-arrow">↗</span>
            </div>
            <button className="primary-button full" type="button" onClick={copyBookmarklet}>复制同步代码</button>
            <textarea className="bookmarklet-code" readOnly value={SDUFE_BOOKMARKLET} onFocus={(event) => event.currentTarget.select()} aria-label="Safari 同步代码" />
            <p className="security-note">数据只从已登录的 Safari 页面传到本机 localhost，不经过公网服务器。</p>
          </section>
        </div>
      )}
    </main>
  );
}

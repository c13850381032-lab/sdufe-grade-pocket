import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { webkit } from "playwright";

const HOST = "127.0.0.1";
const PORT = 3100;
const SCHOOL_ORIGIN = "http://jw.sdufe.edu.cn";
const MAIN_URL = `${SCHOOL_ORIGIN}/jsxsd/framework/xsMain.jsp`;
const GRADE_URL = `${SCHOOL_ORIGIN}/jsxsd/kscj/cjcx_frm`;
const here = path.dirname(fileURLToPath(import.meta.url));
const profileDirectory = path.join(here, "profile");
const execFileAsync = promisify(execFile);
const KEYCHAIN_ACCOUNT = process.env.USER || "grade-pocket";
const USERNAME_SERVICE = "GradePocket SDUFE Username";
const PASSWORD_SERVICE = "GradePocket SDUFE Password";

let context;
let syncInProgress = false;

function allowedOrigin(origin = "") {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function sendJson(request, response, statusCode, body) {
  const origin = request.headers.origin || "";
  if (allowedOrigin(origin)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.writeHead(statusCode);
  response.end(JSON.stringify(body));
}

async function getContext() {
  if (context) return context;
  const savedCredentials = await readStoredCredentials();
  const canRunSilently = Boolean(savedCredentials.username && savedCredentials.password);
  context = await webkit.launchPersistentContext(profileDirectory, {
    headless: canRunSilently,
    viewport: { width: 1280, height: 860 },
    locale: "zh-CN",
    ignoreHTTPSErrors: true,
  });
  context.on("close", () => { context = undefined; });
  return context;
}

async function findFrame(page, fragment, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item.url().includes(fragment));
    if (frame) return frame;
    await page.waitForTimeout(300);
  }
  return undefined;
}

async function looksLoggedOut(page) {
  const url = page.url();
  if (/login|cas|authserver|sso/i.test(url)) return true;
  return page.locator('input[type="password"]').count().catch(() => 0).then((count) => count > 0);
}

async function selectMatchingOption(frame, select, wantedText) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({ value: node.value, label: (node.textContent || "").trim() })),
  );
  const match = options.find((option) => option.label.includes(wantedText));
  if (match) await select.selectOption(match.value);
  return Boolean(match);
}

async function configureAllGrades(queryFrame) {
  const selects = queryFrame.locator("select");
  for (let index = 0; index < await selects.count(); index += 1) {
    const select = selects.nth(index);
    const labels = await select.locator("option").allTextContents();
    const combined = labels.join(" ");
    if (combined.includes("全部学期")) await selectMatchingOption(queryFrame, select, "全部学期");
    if (combined.includes("显示全部成绩")) await selectMatchingOption(queryFrame, select, "显示全部成绩");
  }
}

async function clickQuery(queryFrame) {
  const candidates = [
    queryFrame.locator("#btn_query"),
    queryFrame.getByRole("button", { name: /查\s*询|检索|搜索/ }),
    queryFrame.locator('input[type="submit"][value*="查询"]'),
    queryFrame.locator('input[type="button"][value*="查询"]'),
    queryFrame.locator('button:has-text("查询")'),
  ];
  for (const candidate of candidates) {
    if (await candidate.count()) {
      await candidate.first().click();
      return;
    }
  }
  const form = queryFrame.locator("form").first();
  if (await form.count()) {
    await form.evaluate((element) => {
      const htmlForm = element;
      if (typeof htmlForm.requestSubmit === "function") htmlForm.requestSubmit();
      else htmlForm.submit();
    });
    return;
  }
  throw new Error("没有找到成绩查询表单");
}

async function readKeychain(service) {
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", service, "-w",
    ]);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function readStoredCredentials() {
  if (process.platform === "darwin") {
    const [username, password] = await Promise.all([
      readKeychain(USERNAME_SERVICE), readKeychain(PASSWORD_SERVICE),
    ]);
    return { username, password };
  }
  if (process.platform === "win32") {
    try {
      const script = path.join(here, "read-windows-credential.ps1");
      const { stdout } = await execFileAsync("powershell.exe", [
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script,
      ], { windowsHide: true, maxBuffer: 16_384 });
      const credentials = JSON.parse(stdout.trim());
      return {
        username: String(credentials.username || ""),
        password: String(credentials.password || ""),
      };
    } catch {
      return { username: "", password: "" };
    }
  }
  return { username: "", password: "" };
}

async function tryAutomaticLogin(page) {
  const usernameInput = page.locator('#userAccount, input[name="userAccount"]').first();
  const passwordInput = page.locator('#userPassword, input[name="userPassword"]').first();
  if (!await usernameInput.count() || !await passwordInput.count()) return false;
  const { username, password } = await readStoredCredentials();
  if (!username || !password) return false;

  return (await loginWithCredentials(page, username, password)).ok;
}

async function loginWithCredentials(page, username, password) {
  const usernameInput = page.locator('#userAccount, input[name="userAccount"]').first();
  const passwordInput = page.locator('#userPassword, input[name="userPassword"]').first();
  if (!await usernameInput.count() || !await passwordInput.count()) return { ok: false, message: "没有找到教务系统登录框。" };
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  const loginButton = page.locator('button:has-text("登录"), input[type="submit"], [onclick*="login" i]').first();
  const navigation = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
  if (await loginButton.count()) await loginButton.click();
  else await passwordInput.press("Enter");
  await Promise.race([navigation, page.waitForTimeout(1200)]);

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const currentUrl = page.url();
    const currentTitle = await page.title().catch(() => "");
    const passwordFields = await page.locator('input[type="password"]').count().catch(() => 0);
    if (/framework\/xsMain|xsMain\.jsp/i.test(currentUrl) || (passwordFields === 0 && currentTitle !== "登录")) {
      return { ok: true };
    }
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (/用户名或密码错误|账号或密码错误|用户不存在|密码不正确|登录失败/.test(bodyText)) {
      return { ok: false, message: "教务系统明确返回：账号或密码验证失败。" };
    }
    if (/验证码/.test(bodyText) && await page.locator('input[name*="verify" i], input[id*="verify" i], input[name*="code" i]').count().catch(() => 0)) {
      return { ok: false, message: "教务系统要求验证码，临时自动查询暂时无法继续，请稍后再试。" };
    }
    await page.waitForTimeout(500);
  }
  return { ok: false, message: "连接器中的独立登录会话等待超时；Safari 登录状态不会自动共享给连接器。请稍后重试。" };
}

async function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16_384) reject(new Error("请求内容过大"));
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("请求格式错误")); }
    });
    request.on("error", reject);
  });
}

async function parseGradeTable(listFrame) {
  const table = listFrame.locator("table").filter({ hasText: "课程名称" }).filter({ hasText: "成绩" }).first();
  await table.waitFor({ state: "visible", timeout: 30000 });
  return table.evaluate((element) => {
    const rows = Array.from(element.rows);
    if (!rows.length) return [];
    const headers = Array.from(rows[0].cells).map((cell) => (cell.textContent || "").trim());
    const column = (...names) => headers.findIndex((header) => names.some((name) => header.includes(name)));
    const indexes = {
      name: column("课程名称"),
      code: column("课程编号", "课程代码"),
      semester: column("开课学期", "学期"),
      score: column("成绩"),
      credits: column("学分"),
      gradePoint: column("绩点"),
      nature: column("课程性质"),
      attribute: column("课程属性"),
    };
    const read = (cells, index) => index >= 0 ? (cells[index]?.textContent || "").trim() : "";
    return rows.slice(1).map((row) => {
      const cells = Array.from(row.cells);
      return {
        name: read(cells, indexes.name),
        code: read(cells, indexes.code),
        semester: read(cells, indexes.semester),
        rawScore: read(cells, indexes.score),
        credits: Number(read(cells, indexes.credits)) || 0,
        gradePoint: Number(read(cells, indexes.gradePoint)),
        nature: read(cells, indexes.nature),
        attribute: read(cells, indexes.attribute),
      };
    }).filter((course) => course.name);
  });
}

async function syncGrades() {
  const browserContext = await getContext();
  let page = browserContext.pages()[0];
  if (!page) page = await browserContext.newPage();

  await page.bringToFront();
  try {
    await page.goto(GRADE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (error) {
    return { status: "unreachable", message: "暂时无法连接教务系统，请确认校园网或学校 VPN 可用。" };
  }

  let queryFrame = await findFrame(page, "cjcx_query", 3500);
  if (!queryFrame || await looksLoggedOut(page)) {
    const loggedIn = await tryAutomaticLogin(page);
    if (loggedIn) {
      await page.goto(GRADE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
      queryFrame = await findFrame(page, "cjcx_query", 8000);
    }
  }
  if (!queryFrame || await looksLoggedOut(page)) {
    if (page.url() === "about:blank") await page.goto(MAIN_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.bringToFront();
    return { status: "login_required", message: "尚未设置自动登录，或账号信息已失效。请运行当前系统的“自动登录设置”，也可以在已打开的窗口手动登录。" };
  }

  return readAllGrades(page, queryFrame);
}

async function readAllGrades(page, queryFrame) {
  await configureAllGrades(queryFrame);
  const existingListFrame = page.frames().find((item) => item.url().includes("cjcx_list"));
  const listNavigation = existingListFrame?.waitForNavigation({
    waitUntil: "domcontentloaded", timeout: 30000,
  }).catch(() => null);
  await clickQuery(queryFrame);
  if (listNavigation) await listNavigation;
  const listFrame = existingListFrame
    || page.frames().find((item) => item.name() === "cjcx_list_frm")
    || await findFrame(page, "cjcx_list", 10000);
  if (!listFrame) throw new Error("没有找到成绩列表");
  const courses = await parseGradeTable(listFrame);
  if (!courses.length) throw new Error("成绩列表为空");
  return { status: "ok", courses, syncedAt: new Date().toISOString() };
}

async function syncGuestGrades(username, password) {
  const browser = await webkit.launch({ headless: true });
  const guestContext = await browser.newContext({
    locale: "zh-CN", ignoreHTTPSErrors: true,
  });
  const page = await guestContext.newPage();
  try {
    await page.goto(GRADE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    const loginResult = await loginWithCredentials(page, username, password);
    if (!loginResult.ok) {
      return { status: "login_failed", message: loginResult.message || "教务系统没有接受本次登录。" };
    }
    await page.goto(GRADE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    const queryFrame = await findFrame(page, "cjcx_query", 20000);
    if (!queryFrame || await looksLoggedOut(page)) {
      return { status: "login_failed", message: "登录没有成功，请检查账号、密码或教务系统状态。" };
    }
    return await readAllGrades(page, queryFrame);
  } catch (error) {
    return {
      status: "error",
      message: `临时查询失败：${error instanceof Error ? error.message : "未知错误"}`,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return sendJson(request, response, 204, {});
  if (!allowedOrigin(request.headers.origin || "http://localhost")) {
    return sendJson(request, response, 403, { status: "forbidden" });
  }
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(request, response, 200, { status: "ok", browserOpen: Boolean(context) });
  }
  if (request.method === "POST" && request.url === "/sync") {
    if (syncInProgress) return sendJson(request, response, 409, { status: "busy", message: "另一位用户正在查询，请稍后再试。" });
    syncInProgress = true;
    try {
      return sendJson(request, response, 200, await syncGrades());
    } catch (error) {
      console.error(error);
      return sendJson(request, response, 500, {
        status: "error",
        message: `没有读到成绩：${error instanceof Error ? error.message : "未知错误"}。请确认已登录并打开成绩查询权限。`,
      });
    } finally {
      syncInProgress = false;
    }
  }
  if (request.method === "POST" && request.url === "/sync-as") {
    if (syncInProgress) return sendJson(request, response, 409, { status: "busy", message: "另一位用户正在查询，请稍后再试。" });
    try {
      const body = await readRequestJson(request);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!username || !password || username.length > 80 || password.length > 160) {
        return sendJson(request, response, 400, { status: "invalid", message: "请输入有效的教务账号和密码。" });
      }
      syncInProgress = true;
      return sendJson(request, response, 200, await syncGuestGrades(username, password));
    } catch (error) {
      return sendJson(request, response, 400, { status: "invalid", message: error instanceof Error ? error.message : "请求格式错误" });
    } finally {
      syncInProgress = false;
    }
  }
  return sendJson(request, response, 404, { status: "not_found" });
});

server.listen(PORT, HOST, () => {
  console.log(`成绩袋连接器已启动：http://${HOST}:${PORT}`);
});

async function shutdown() {
  server.close();
  await context?.close().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

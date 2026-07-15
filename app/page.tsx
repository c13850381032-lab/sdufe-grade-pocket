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

type ClassCourse = {
  id: string;
  studentId: string;
  studentName: string;
  semester: string;
  courseName: string;
  courseCode: string;
  credits: number;
  score: number;
  required: boolean;
};

type RankingRow = {
  studentId: string;
  studentName: string;
  average: number;
  credits: number;
  courseCount: number;
  rank: number;
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
const CLASS_COURSES_KEY = "grade-pocket-class-courses-v1";
const SDUFE_BOOKMARKLET = "javascript:(()=>{const d=[];const w=x=>{d.push(x);x.querySelectorAll('iframe').forEach(f=>{try{f.contentDocument&&w(f.contentDocument)}catch(e){}})};w(document);let t;for(const x of d){for(const q of x.querySelectorAll('table')){const s=q.innerText;if(s.includes('课程名称')&&s.includes('成绩')&&s.includes('学分')){t=q;break}}if(t)break}if(!t){alert('未找到成绩表，请先打开“学籍成绩 → 课程成绩查询”并完成查询。');return}const r=[...t.rows],h=[...r[0].cells].map(c=>c.innerText.trim()),i=n=>h.indexOf(n),a=r.slice(1).map(z=>{const c=[...z.cells].map(v=>v.innerText.trim());return[c[i('课程名称')],c[i('课程编号')],c[i('开课学期')],Number(c[i('学分')]),c[i('成绩')],Number(c[i('绩点')]),c[i('课程性质')],c[i('课程属性')]]}).filter(x=>x[0]),u=btoa(unescape(encodeURIComponent(JSON.stringify(a))));window.open('http://localhost:3000/?sdufe='+encodeURIComponent(u),'_blank')})()";
const QUALITATIVE_SCORES: Record<string, number> = { 优秀: 95, 良好: 85, 中等: 75, 及格: 65, 合格: 60 };
const courseKey = (course: Pick<Course, "semester" | "code" | "name">) => `${course.semester}-${course.code}-${course.name}`;
const classCourseKey = (course: Pick<ClassCourse, "studentId" | "studentName" | "semester" | "courseCode" | "courseName">) =>
  `${course.studentId || course.studentName}-${course.semester}-${course.courseCode || course.courseName}`;

function splitCsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function csvRows(text: string): string[][] {
  const rows: string[] = [];
  let current = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      current += character;
      if (quoted && source[index + 1] === '"') {
        current += source[index + 1];
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (current.trim()) rows.push(current);
      current = "";
      if (character === "\r" && source[index + 1] === "\n") index += 1;
    } else {
      current += character;
    }
  }
  if (current.trim()) rows.push(current);
  return rows.map(splitCsvRow);
}

function headerIndex(headers: string[], ...names: string[]) {
  const normalized = headers.map((header) => header.replace(/[\s_（）()]/g, "").toLowerCase());
  return normalized.findIndex((header) => names.some((name) => header === name.replace(/[\s_（）()]/g, "").toLowerCase()));
}

function semesterFrom(value: string | undefined, fallback: string): string {
  return value?.match(/\d{4}-\d{4}-[12]/)?.[0]
    || fallback.match(/\d{4}-\d{4}-[12]/)?.[0]
    || value?.trim()
    || fallback
    || "未分类学期";
}

function scoreFrom(value: string | undefined): number | undefined {
  const rawScore = value?.trim() || "";
  if (!rawScore) return undefined;
  const numericScore = Number(rawScore);
  if (Number.isFinite(numericScore)) return numericScore;
  return QUALITATIVE_SCORES[rawScore];
}

function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const hasGradeHeaders = (text: string) => text.includes("学号") && text.includes("姓名") && (text.includes("成绩") || text.includes("课程"));
  if (!utf8.includes("�") && hasGradeHeaders(utf8)) return utf8;
  for (const encoding of ["gb18030", "gbk"]) {
    try {
      const decoded = new TextDecoder(encoding).decode(buffer);
      if (hasGradeHeaders(decoded)) return decoded;
    } catch { /* try the next Windows-compatible encoding */ }
  }
  return utf8;
}

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
  const rows = csvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = {
    name: find("课程名称", "课程", "name"),
    code: find("课程代码", "代码", "code"),
    semester: find("学期", "semester"),
    credits: find("学分", "credits"),
    score: find("成绩", "分数", "score"),
    required: find("课程性质", "是否必修", "required"),
  };

  if (indexes.name < 0 || indexes.score < 0) return [];
  return rows.slice(1).map((cells, index) => {
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

function parseOfficialClassMatrix(rows: string[][], headerRowIndex: number, fallbackSemester: string): ClassCourse[] {
  const headers = rows[headerRowIndex];
  const summaryStart = headers.findIndex((header) => header.trim() === "不及格门数");
  const courseEnd = summaryStart > 3 ? summaryStart : headers.length;
  const courses = headers.slice(3, courseEnd).map((header, offset) => {
    const credits = Number(header.match(/学分\s*([\d.]+)/)?.[1]);
    return {
      column: offset + 3,
      name: header.split("，")[0]?.trim() || "",
      credits,
      required: /(?:^|，)必修(?:，|$)/.test(header),
      semester: semesterFrom(header, fallbackSemester),
    };
  }).filter((course) => course.name && Number.isFinite(course.credits) && course.credits > 0);

  return rows.slice(headerRowIndex + 1).flatMap((cells, rowIndex) => {
    const studentId = cells[0]?.trim() || "";
    const studentName = cells[1]?.trim() || "";
    if (!/^\d{6,}$/.test(studentId) || !studentName) return [];
    return courses.flatMap((course) => {
      const score = scoreFrom(cells[course.column]);
      if (score === undefined) return [];
      return [{
        id: `${studentId || studentName}-${course.semester}-${course.column}-${rowIndex}`,
        studentId,
        studentName: studentName || "未填写姓名",
        semester: course.semester,
        courseName: course.name,
        courseCode: `COL-${course.column}`,
        credits: course.credits,
        score,
        required: course.required,
      }];
    });
  });
}

function parsePairedClassMatrix(rows: string[][], fallbackSemester: string): ClassCourse[] {
  const headers = rows[0];
  const studentRows = rows.slice(1).filter((cells) => /^\d{6,}$/.test(cells[0]?.trim() || "") && Boolean(cells[1]?.trim()));
  const coursePairs = [] as Array<{ scoreColumn: number; creditColumn: number; name: string; required: boolean }>;
  for (let column = 3; column < headers.length - 1; column += 1) {
    const name = headers[column]?.trim();
    if (!name || headers[column + 1]?.trim() !== "学分") continue;
    const completed = studentRows.filter((cells) => scoreFrom(cells[column]) !== undefined).length;
    coursePairs.push({
      scoreColumn: column,
      creditColumn: column + 1,
      name,
      required: studentRows.length > 0 && completed / studentRows.length >= 0.75,
    });
    column += 1;
  }

  return studentRows.flatMap((cells, rowIndex) => {
    const studentId = cells[0]?.trim() || "";
    const studentName = cells[1]?.trim() || "未填写姓名";
    const semester = semesterFrom(cells[2], fallbackSemester);
    return coursePairs.flatMap((course) => {
      const score = scoreFrom(cells[course.scoreColumn]);
      const credits = Number(cells[course.creditColumn]);
      if (score === undefined || !Number.isFinite(credits) || credits <= 0) return [];
      return [{
        id: `${studentId || studentName}-${semester}-${course.scoreColumn}-${rowIndex}`,
        studentId,
        studentName,
        semester,
        courseName: course.name,
        courseCode: `COL-${course.scoreColumn}`,
        credits,
        score,
        required: course.required,
      }];
    });
  });
}

function parseClassCsv(text: string, fallbackSemester: string): ClassCourse[] {
  const rows = csvRows(text);
  if (rows.length < 2) return [];
  const officialHeaderRow = rows.findIndex((row) => row[0]?.trim() === "学号" && row[1]?.trim() === "姓名" && row[2]?.trim() === "课程门数");
  if (officialHeaderRow >= 0) return parseOfficialClassMatrix(rows, officialHeaderRow, fallbackSemester);
  const hasGenericScoreColumn = headerIndex(rows[0], "成绩", "分数", "总评成绩", "score", "grade") >= 0;
  if (!hasGenericScoreColumn && rows[0][0]?.trim() === "学号" && rows[0][1]?.trim() === "姓名" && rows[0][2]?.trim() === "学期" && rows[0].includes("学分")) {
    return parsePairedClassMatrix(rows, fallbackSemester);
  }
  const headers = rows[0];
  const indexes = {
    studentId: headerIndex(headers, "学号", "学生学号", "studentid", "id"),
    studentName: headerIndex(headers, "姓名", "学生姓名", "同学姓名", "name", "studentname"),
    semester: headerIndex(headers, "学期", "开课学期", "semester", "term"),
    courseName: headerIndex(headers, "课程名称", "课程", "科目", "coursename", "course"),
    courseCode: headerIndex(headers, "课程代码", "课程编号", "代码", "coursecode", "code"),
    credits: headerIndex(headers, "学分", "课程学分", "credits", "credit"),
    score: headerIndex(headers, "成绩", "分数", "总评成绩", "score", "grade"),
    required: headerIndex(headers, "课程性质", "课程属性", "是否必修", "性质", "required", "type"),
  };
  if ((indexes.studentId < 0 && indexes.studentName < 0) || indexes.courseName < 0 || indexes.score < 0 || indexes.credits < 0) return [];

  return rows.slice(1).flatMap((cells, index) => {
    const studentName = cells[indexes.studentName]?.trim() || "未填写姓名";
    const studentId = cells[indexes.studentId]?.trim() || "";
    const courseName = cells[indexes.courseName]?.trim() || "";
    const score = scoreFrom(cells[indexes.score]);
    const credits = Number(cells[indexes.credits]);
    if ((!studentId && studentName === "未填写姓名") || !courseName || score === undefined || !Number.isFinite(credits) || credits <= 0) return [];
    const semester = semesterFrom(cells[indexes.semester], fallbackSemester);
    const courseCode = cells[indexes.courseCode]?.trim() || "";
    const nature = cells[indexes.required]?.trim() || "";
    const course: ClassCourse = {
      id: `${Date.now()}-${index}`,
      studentId,
      studentName,
      semester,
      courseName,
      courseCode,
      credits,
      score,
      required: /必修|是|true|1/i.test(nature),
    };
    return [course];
  });
}

function buildRanking(courses: ClassCourse[], requiredOnly: boolean): RankingRow[] {
  const students = new Map<string, Omit<RankingRow, "average" | "rank"> & { weightedTotal: number }>();
  courses.filter((course) => !requiredOnly || course.required).forEach((course) => {
    const key = course.studentId || course.studentName;
    const current = students.get(key) || {
      studentId: course.studentId,
      studentName: course.studentName,
      credits: 0,
      courseCount: 0,
      weightedTotal: 0,
    };
    current.credits += course.credits;
    current.courseCount += 1;
    current.weightedTotal += course.score * course.credits;
    students.set(key, current);
  });
  const sorted = Array.from(students.values())
    .filter((student) => student.credits > 0)
    .map((student) => ({ ...student, average: student.weightedTotal / student.credits }))
    .sort((left, right) => right.average - left.average || left.studentId.localeCompare(right.studentId, "zh-CN"));
  let previousAverage = Number.NaN;
  let previousRank = 0;
  return sorted.map((student, index) => {
    const rank = Math.abs(student.average - previousAverage) < 0.000001 ? previousRank : index + 1;
    previousAverage = student.average;
    previousRank = rank;
    return {
      studentId: student.studentId,
      studentName: student.studentName,
      average: student.average,
      credits: student.credits,
      courseCount: student.courseCount,
      rank,
    };
  });
}

function RankingTable({ rows, emptyText }: { rows: RankingRow[]; emptyText: string }) {
  if (!rows.length) return <div className="ranking-empty">{emptyText}</div>;
  return (
    <div className="ranking-list" role="list">
      {rows.map((student) => (
        <div className={`ranking-row${student.rank <= 3 ? ` top-${student.rank}` : ""}`} role="listitem" key={student.studentId || student.studentName}>
          <span className="rank-number">{student.rank <= 3 ? ["🥇", "🥈", "🥉"][student.rank - 1] : student.rank}</span>
          <span className="rank-student"><strong>{student.studentName}</strong><small>{student.studentId || "未填写学号"}</small></span>
          <span className="rank-detail">{student.courseCount} 门 · {student.credits.toFixed(1)} 学分</span>
          <strong className="rank-score">{student.average.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  );
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
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [rankingSemester, setRankingSemester] = useState("全部学期");

  /* Loading browser-only saved data is intentionally performed once after hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
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
    const savedClassCourses = window.localStorage.getItem(CLASS_COURSES_KEY);
    if (savedClassCourses) {
      try { setClassCourses(JSON.parse(savedClassCourses)); } catch { /* ignore invalid class data */ }
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
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (viewMode === "owner") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses, viewMode]);

  useEffect(() => {
    window.localStorage.setItem(NEW_RESULTS_KEY, JSON.stringify(newCourses));
  }, [newCourses]);

  useEffect(() => {
    window.localStorage.setItem(CLASS_COURSES_KEY, JSON.stringify(classCourses));
  }, [classCourses]);

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
  const rankingSemesters = useMemo(
    () => ["全部学期", ...Array.from(new Set(classCourses.map((course) => course.semester))).sort((left, right) => right.localeCompare(left, "zh-CN"))],
    [classCourses],
  );
  const rankingCourses = classCourses.filter((course) => rankingSemester === "全部学期" || course.semester === rankingSemester);
  const weightedRanking = buildRanking(rankingCourses, false);
  const requiredRanking = buildRanking(rankingCourses, true);
  const classStudentCount = new Set(classCourses.map((course) => course.studentId || course.studentName)).size;

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

  async function importClassCsv(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const imported: ClassCourse[] = [];
    const failedFiles: string[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const text = decodeCsvBuffer(buffer);
      const fallbackSemester = file.name.replace(/\.csv$/i, "").trim();
      const parsed = parseClassCsv(text, fallbackSemester);
      if (parsed.length) imported.push(...parsed);
      else failedFiles.push(file.name);
    }
    if (!imported.length) {
      setNotice("没有识别到班级成绩。请使用教务系统导出的“成绩信息”横向表、“课程+学分”成对表，或通用明细表。");
      event.target.value = "";
      return;
    }
    setClassCourses((current) => {
      const merged = new Map<string, ClassCourse>();
      [...current, ...imported].forEach((course) => merged.set(classCourseKey(course), course));
      return Array.from(merged.values());
    });
    setNotice(`已导入 ${files.length - failedFiles.length} 个班级 CSV、${imported.length} 条成绩记录${failedFiles.length ? `；${failedFiles.length} 个文件未识别` : ""}，两个榜单已更新。`);
    event.target.value = "";
  }

  function clearClassRanking() {
    setClassCourses([]);
    setRankingSemester("全部学期");
    setNotice("班级榜单数据已清空，不影响你的个人成绩。");
  }

  function downloadClassTemplate() {
    const content = "\uFEFF学号,姓名,学期,课程代码,课程名称,学分,成绩,课程性质\n20260001,张三,2025-2026-1,MATH101,高等数学,4,92,必修\n20260002,李四,2025-2026-1,MATH101,高等数学,4,89,必修\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "班级成绩导入模板.csv";
    anchor.click();
    URL.revokeObjectURL(url);
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
          <a href="#ranking">班级排名</a>
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

      <section className="ranking-section" id="ranking">
        <div className="ranking-heading">
          <div>
            <p className="eyebrow">班级成绩排名</p>
            <h2>两个榜单，一眼看清班级位置</h2>
            <p className="ranking-copy">可直接导入教务系统的班级成绩 CSV，无需改成通用模板。支持“成绩信息”横向表和“课程成绩 + 学分”成对表，也可一次选择多个学期文件。</p>
          </div>
          <div className="ranking-actions">
            <label className="primary-button file-button">
              ＋ 导入班级 CSV
              <input type="file" accept=".csv,text/csv" multiple onChange={importClassCsv} />
            </label>
            <button className="secondary-button" type="button" onClick={downloadClassTemplate}>下载通用模板</button>
          </div>
        </div>

        <div className="ranking-toolbar">
          <div className="ranking-summary">
            <strong>{classStudentCount}</strong><span>名同学</span>
            <strong>{classCourses.length}</strong><span>条成绩</span>
          </div>
          <div className="ranking-filters">
            <label>排名范围
              <select value={rankingSemester} onChange={(event) => setRankingSemester(event.target.value)}>
                {rankingSemesters.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {classCourses.length > 0 && <button type="button" onClick={clearClassRanking}>清空榜单数据</button>}
          </div>
        </div>

        <div className="ranking-grid">
          <article className="ranking-card weighted-board">
            <div className="ranking-card-title"><span>01</span><div><h3>加权成绩榜</h3><p>全部课程按学分加权</p></div></div>
            <RankingTable rows={weightedRanking} emptyText="导入班级 CSV 后，这里会显示加权成绩排名。" />
          </article>
          <article className="ranking-card required-board">
            <div className="ranking-card-title"><span>02</span><div><h3>必修成绩榜</h3><p>只统计标记为必修的课程</p></div></div>
            <RankingTable rows={requiredRanking} emptyText={classCourses.length ? "当前范围内没有识别到必修课程，请检查“课程性质”列。" : "导入班级 CSV 后，这里会显示必修成绩排名。"} />
          </article>
        </div>
        <div className="ranking-requirements">
          <strong>导入要求</strong>
          <span>① 教务系统“成绩信息”横向表：保留原始前三行，课程表头需含学分、学期和课程性质。</span>
          <span>② “课程 + 学分”成对表：前三列为学号、姓名、学期，后面每门课程紧跟一列学分。</span>
          <span>③ 成对表没有课程性质时，成绩覆盖班级 75% 及以上同学的课程自动视为公共必修课。</span>
        </div>
        <p className="ranking-tip">支持 UTF-8 和常见 GBK/GB18030 编码；重复导入同一同学、同一学期、同一课程时，以最新记录为准。所有班级数据只保存在当前设备。</p>
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
            <p className="modal-copy">连接器只在你的电脑上运行。启用系统凭据自动登录后，刷新会在后台完成，不再弹出教务窗口；未设置自动登录时才会显示登录窗口。</p>
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

"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Handshake,
  Newspaper,
  Wallet,
  Settings,
  Menu,
  X,
  ArrowUpRight,
  Plus,
  Check,
  FileText,
  RefreshCw,
  Film,
  BookOpen,
  Upload,
} from "lucide-react";
import { api, exportCsv } from "@/lib/client-api";
import { useMember, LoadingMember } from "./session";
import { Badge, Dialog, Field, stages, roleNames } from "./controls";
import { RecordEditor, NewsEditor, type Doc } from "./editors";
import { PeoplePanel } from "./people";
import { FinancePanel } from "./finance";
import { AssetLibrary } from "./assets";
import { TeamDialog } from "./team";
import { DocumentDialog } from "./document";
import { AdminPanel } from "./admin";
const modules = [
  ["overview", "專案總覽與流程", LayoutDashboard],
  ["people", "活動與人員", Users],
  ["proposals", "提案與贊助", Handshake],
  ["media", "媒體與會刊", Newspaper],
  ["finance", "訂單與帳務", Wallet],
] as const;
export function Studio() {
  const { member, loading, error: loadError } = useMember(),
    [projects, setProjects] = useState<Doc[]>([]),
    [projectId, setProjectId] = useState(""),
    [workspace, setWorkspace] = useState<Doc | null>(null),
    [people, setPeople] = useState<Doc | null>(null),
    [finance, setFinance] = useState<Doc | null>(null),
    [module, setModule] = useState("overview"),
    [tab, setTab] = useState("news"),
    [stage, setStage] = useState("all"),
    [modal, setModal] = useState<Doc | null>(null),
    [team, setTeam] = useState(false),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [platformArticles, setPlatformArticles] = useState<Doc[]>([]);
  const loadProjects = useCallback(async () => {
    const d = await api("projects");
    setProjects(d.projects);
    setProjectId((prev) => {
      if (d.projects.some((p: Doc) => p.id === prev)) return prev;
      const requested = new URLSearchParams(location.search).get("project");
      return (
        d.projects.find((p: Doc) => p.id === requested)?.id ||
        d.projects[0]?.id ||
        ""
      );
    });
  }, []);
  useEffect(() => {
    if (member) loadProjects().catch((e) => setError(e.message));
  }, [member, loadProjects]);
  const load = useCallback(async () => {
    if (!projectId) return;
    const w = await api("workspace", undefined, { project: projectId });
    setWorkspace(w);
    const [p, f] = await Promise.all([
      w.role !== "finance"
        ? api("people", undefined, { project: projectId })
        : Promise.resolve(null),
      ["owner", "manager", "finance"].includes(w.role)
        ? api("finance", undefined, { project: projectId })
        : Promise.resolve(null),
    ]);
    setPeople(p);
    setFinance(f);
  }, [projectId]);
  useEffect(() => {
    setWorkspace(null);
    setError("");
    if (projectId) load().catch((e) => setError(e.message));
  }, [projectId, load]);
  useEffect(() => {
    if (workspace?.role === "judge" || workspace?.role === "checkin")
      setModule("people");
    else if (workspace?.role === "finance") setModule("finance");
  }, [workspace?.role]);
  const loadGlobal = async () => {
    const d = await api("platform-articles");
    setPlatformArticles(d.articles);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    await load();
    await loadProjects();
    if (tab === "global") await loadGlobal();
  };
  if (loading || !member) return <LoadingMember error={loadError} />;
  const project = projects.find((p) => p.id === projectId),
    role = workspace?.role || "viewer",
    canEdit = ["owner", "manager", "editor"].includes(role),
    canManage = ["owner", "manager"].includes(role),
    canReview = ["owner", "manager", "reviewer"].includes(role),
    owner = member.role === "owner";
  const items: Doc[] = workspace?.items || [],
    done = items.filter((i) => i.status === "done").length,
    percent = items.length ? Math.round((done / items.length) * 100) : 0;
  const edit = (type: string, initial: Doc) => setModal({ type, initial });
  const editNews = (a: Doc) =>
    run(async () => {
      const d = await api("article-get", undefined, { id: a.id });
      setModal({
        type: "news",
        initial: { ...d.article, versions: d.versions },
        global: !d.article.project_id,
      });
    });
  const taskRows = (rows: Doc[]) =>
    rows.length ? (
      rows.map((i) => (
        <button className="task-row" key={i.id} onClick={() => edit("item", i)}>
          <span className="task-icon">
            {i.status === "done" && <Check size={13} />}
          </span>
          <div>
            <h3>{i.title}</h3>
            <p>
              {stages.find(([s]) => s === i.stage)?.[1]} ·{" "}
              {i.payload?.company ||
                i.payload?.note?.slice(0, 80) ||
                "點選查看工作與交付內容"}
            </p>
          </div>
          {i.due_at && (
            <span className="due">
              {new Date(i.due_at).toLocaleDateString("zh-TW")}
            </span>
          )}
          <Badge status={i.status} />
        </button>
      ))
    ) : (
      <p className="muted">目前沒有這類工作項目。</p>
    );
  return (
    <div className="studio-shell">
      {mobile && (
        <button
          className="studio-shade"
          aria-label="關閉工作室選單"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"studio-sidebar " + (mobile ? "open" : "")}>
        <Link href="/" className="app-brand">
          SELF PAGEANT<small>THE EVENT STUDIO</small>
        </Link>
        <button
          className="icon-button studio-close"
          aria-label="關閉選單"
          onClick={() => setMobile(false)}
        >
          <X size={19} />
        </button>
        <label htmlFor="project-switch">YOUR PROJECT</label>
        <select
          id="project-switch"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setMobile(false);
            history.replaceState(null, "", "/studio?project=" + e.target.value);
          }}
        >
          {!projects.length && <option>尚無專案</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <nav aria-label="活動工作室">
          {modules
            .filter(([id]) =>
              role === "finance"
                ? id === "finance"
                : ["judge", "checkin"].includes(role)
                  ? id === "people"
                  : id === "finance"
                    ? canManage
                    : true,
            )
            .map(([id, label, Icon]) => (
              <button
                key={id}
                className={module === id ? "active" : ""}
                onClick={() => {
                  setModule(id);
                  setMobile(false);
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          {owner && (
            <button
              className={module === "admin" ? "active" : ""}
              onClick={() => {
                setModule("admin");
                setMobile(false);
              }}
            >
              <Settings size={18} />
              平台設定
            </button>
          )}
        </nav>
        <div className="sidebar-end">
          <span>
            {member.profile.display_name || "己美會員"} · {roleNames[role]}
          </span>
          <Link href="/create">
            <Plus size={15} />
            建立新專案
          </Link>
          <Link href="/account">
            <ArrowUpRight size={15} />
            會員中心
          </Link>
          <Link href="/">返回選美誌</Link>
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <button
            className="icon-button studio-menu-toggle"
            aria-label="開啟工作室選單"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <span>SELF PAGEANT ／ EVENT STUDIO</span>
          <Link href="/account">
            我的會員中心 <ArrowUpRight size={13} />
          </Link>
        </header>
        <div className="studio-content">
          <div className="studio-heading">
            <div>
              <span className="eyebrow">EVERY DETAIL MAKES A STAGE</span>
              <h1>
                {module === "admin"
                  ? "平台設定"
                  : project?.title || "您的活動工作室"}
              </h1>
              <p>
                {project && (
                  <>
                    {project.year} · {project.event_date || "日期待公告"} ·{" "}
                  </>
                )}
                {roleNames[role]}
              </p>
            </div>
            <div className="studio-toolbar">
              {project && (
                <Badge
                  status={
                    project.review_status === "approved"
                      ? project.status
                      : project.review_status
                  }
                />
              )}
              <button
                className="icon-button"
                aria-label="重新載入專案"
                disabled={busy}
                onClick={() => run(refresh)}
              >
                <RefreshCw size={17} />
              </button>
              {canManage && project && (
                <button className="small-button" onClick={() => setTeam(true)}>
                  團隊
                </button>
              )}
              {canManage && project && (
                <button
                  className="small-button"
                  onClick={() => edit("project", project)}
                >
                  專案設定
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {module === "admin" && owner ? (
            <AdminPanel onProjectChange={loadProjects} />
          ) : !project ? (
            <section className="panel">
              <h2>從自己的第一個舞台開始</h2>
              <p>建立活動草稿，或請主辦人寄送私人團隊邀請連結。</p>
              <Link href="/create" className="button dark">
                建立活動專案 <ArrowUpRight size={15} />
              </Link>
            </section>
          ) : !workspace ? (
            <section className="panel">
              <p>正在讀取專案資料…</p>
            </section>
          ) : (
            <>
              {module === "overview" && (
                <>
                  <section className="studio-summary">
                    <div>
                      <span className="eyebrow">PROJECT JOURNEY</span>
                      <h2>
                        {project.status === "archived"
                          ? "盛會已結案，讓每一份成果被珍藏。"
                          : "讓每一個想法，有一條清楚的執行路徑。"}
                      </h2>
                      <p>{project.summary}</p>
                      {canManage &&
                        ["draft", "rejected"].includes(
                          project.review_status,
                        ) && (
                          <button
                            className="small-button"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api("submit-project", { id: project.id });
                                await refresh();
                                setNotice("已送平台審核，通過後才會公開。");
                              })
                            }
                          >
                            送出專案公開審核
                          </button>
                        )}
                    </div>
                    <div className="big-number">
                      {percent}%
                      <small>
                        工作完成度 · {done}/{items.length}
                      </small>
                    </div>
                  </section>
                  <div className="studio-stats">
                    <div>
                      <span>子活動／課程</span>
                      <strong>{workspace.activities.length}</strong>
                    </div>
                    <div>
                      <span>贊助交付項目</span>
                      <strong>
                        {items.filter((i) => i.kind === "sponsor").length}
                      </strong>
                    </div>
                    <div>
                      <span>新聞文稿</span>
                      <strong>{workspace.articles.length}</strong>
                    </div>
                    <div>
                      <span>待處理／執行中</span>
                      <strong>
                        {
                          items.filter(
                            (i) => !["done", "cancelled"].includes(i.status),
                          ).length
                        }
                      </strong>
                    </div>
                  </div>
                  <div className="stage-grid">
                    {stages.map(([id, l], i) => {
                      const rows = items.filter((t) => t.stage === id),
                        count = rows.filter((t) => t.status === "done").length;
                      return (
                        <button
                          className="stage-card"
                          key={id}
                          onClick={() => setStage(id)}
                        >
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <ArrowUpRight size={17} />
                          <h3>{l}</h3>
                          <p>
                            {count} / {rows.length} 項工作完成
                          </p>
                          <div className="progress-track">
                            <i
                              style={{
                                width:
                                  (rows.length
                                    ? (count / rows.length) * 100
                                    : 0) + "%",
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <section className="panel">
                    <div className="panel-top">
                      <h2>
                        {stage === "all"
                          ? "專案工作清單"
                          : stages.find(([id]) => id === stage)?.[1]}
                      </h2>
                      <div className="studio-toolbar">
                        <select
                          className="plain-input"
                          value={stage}
                          onChange={(e) => setStage(e.target.value)}
                        >
                          <option value="all">全部階段</option>
                          {stages.map(([id, l]) => (
                            <option key={id} value={id}>
                              {l}
                            </option>
                          ))}
                        </select>
                        {canEdit && (
                          <button
                            className="small-button"
                            onClick={() =>
                              edit("item", {
                                title: "",
                                kind: "task",
                                stage: stage === "all" ? "planning" : stage,
                                status: "todo",
                                payload: {},
                              })
                            }
                          >
                            <Plus size={14} />
                            新增工作
                          </button>
                        )}
                        <button
                          className="small-button"
                          onClick={() =>
                            exportCsv(
                              "專案工作流程",
                              items.map((i) => ({
                                名稱: i.title,
                                階段: i.stage,
                                狀態: i.status,
                                期限: i.due_at,
                                說明: i.payload.note,
                              })),
                            )
                          }
                        >
                          匯出
                        </button>
                      </div>
                    </div>
                    {taskRows(
                      items.filter((i) => stage === "all" || i.stage === stage),
                    )}
                  </section>
                  <section className="panel">
                    <h2>最近操作紀錄</h2>
                    {workspace.audits.slice(0, 12).map((a: Doc) => (
                      <div className="list-row" key={a.id}>
                        <span>{a.action}</span>
                        <small>
                          {new Date(a.created_at).toLocaleString("zh-TW")}
                        </small>
                      </div>
                    ))}
                  </section>
                </>
              )}
              {module === "people" && (
                <PeoplePanel
                  key={projectId}
                  projectId={projectId}
                  role={role}
                  workspace={workspace}
                  people={people}
                  currentUser={member.user}
                  onSaved={load}
                />
              )}
              {module === "proposals" && (
                <>
                  <section className="panel">
                    <div className="panel-top">
                      <h2>提案、合作與結案文件</h2>
                      <div className="studio-toolbar">
                        {canEdit && (
                          <>
                            <button
                              className="button dark"
                              onClick={() =>
                                edit("proposal", {
                                  title: "",
                                  kind: "proposal",
                                  status: "draft",
                                  content: { body: "" },
                                })
                              }
                            >
                              <Plus size={15} />
                              新增文件
                            </button>
                            <button
                              className="small-button"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  const d = await api("build-report", {
                                    project_id: projectId,
                                  });
                                  await load();
                                  edit("proposal", d.proposal);
                                })
                              }
                            >
                              <FileText size={15} />
                              產生媒體結案草稿
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p>
                      企劃、贊助方案與結案各自保存版本；交付清單與真實報導連結一起歸檔。
                    </p>
                    {workspace.proposals.map((p: Doc) => (
                      <div className="list-row" key={p.id}>
                        <div>
                          <h3>{p.title}</h3>
                          <p>
                            {p.kind === "report"
                              ? "結案報告"
                              : p.kind === "sponsor"
                                ? "贊助方案"
                                : "活動企劃"}{" "}
                            · v{p.version}
                          </p>
                        </div>
                        <Badge status={p.status} />
                        <button
                          className="small-button"
                          onClick={() => edit("proposal", p)}
                        >
                          編輯／查看
                        </button>
                        <button
                          className="small-button"
                          onClick={() =>
                            setModal({
                              type: "document",
                              kind: "proposal",
                              initial: p,
                            })
                          }
                        >
                          預覽與版本
                        </button>
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <div className="panel-top">
                      <h2>贊助品牌與權益交付</h2>
                      {canEdit && (
                        <button
                          className="small-button"
                          onClick={() =>
                            edit("item", {
                              title: "",
                              kind: "sponsor",
                              stage: "sponsors",
                              status: "todo",
                              payload: {},
                            })
                          }
                        >
                          新增贊助紀錄
                        </button>
                      )}
                    </div>
                    {taskRows(items.filter((i) => i.kind === "sponsor"))}
                  </section>
                </>
              )}
              {module === "media" && (
                <>
                  <nav className="workspace-tabs">
                    {[
                      ["news", "專案新聞"],
                      ...(owner || ["editor", "reviewer"].includes(member.role)
                        ? [["global", "全球選美誌"]]
                        : []),
                      ["video", "BeautyTV"],
                      ["books", "電子會刊"],
                      ["assets", "圖片與素材"],
                    ].map(([id, l]) => (
                      <button
                        key={id}
                        className={tab === id ? "active" : ""}
                        onClick={() => {
                          setTab(id);
                          if (id === "global") run(loadGlobal);
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </nav>
                  {["news", "global"].includes(tab) && (
                    <section className="panel">
                      <div className="panel-top">
                        <h2>
                          {tab === "global"
                            ? "全球選美與時尚新聞"
                            : "官方新聞與人物專題"}
                        </h2>
                        {canEdit && (
                          <button
                            className="button dark"
                            onClick={() =>
                              setModal({
                                type: "news",
                                initial: { status: "draft", version: 1 },
                                global: tab === "global",
                              })
                            }
                          >
                            <Plus size={15} />
                            新增新聞
                          </button>
                        )}
                      </div>
                      <p>
                        每篇新聞獨立保存內文、圖片來源、審核、排程、公開版本與社群發布紀錄。
                      </p>
                      {(tab === "global"
                        ? platformArticles
                        : workspace.articles
                      ).map((a: Doc) => (
                        <div className="list-row" key={a.id}>
                          <div>
                            <h3>{a.title}</h3>
                            <p>
                              v{a.version} ·{" "}
                              {new Date(a.updated_at).toLocaleString("zh-TW")}
                            </p>
                          </div>
                          <Badge status={a.status} />
                          <button
                            className="small-button"
                            disabled={busy}
                            onClick={() => editNews(a)}
                          >
                            開啟新聞
                          </button>
                          <a
                            className="small-button"
                            href={"/news/" + a.slug}
                            target="_blank"
                            rel="noopener"
                          >
                            公開頁
                          </a>
                        </div>
                      ))}
                    </section>
                  )}
                  {tab === "video" && (
                    <>
                      <section className="panel">
                        <div className="panel-top">
                          <h2>BeautyTV 影片與紀錄</h2>
                          {canEdit && (
                            <div className="studio-toolbar">
                              <button
                                className="button dark"
                                onClick={() =>
                                  edit("media", {
                                    title: "",
                                    kind: "highlight",
                                    provider: "youtube",
                                    status: "draft",
                                    rights_confirmed: false,
                                  })
                                }
                              >
                                <Film size={15} />
                                加入授權影片
                              </button>
                              <button
                                className="small-button"
                                onClick={() =>
                                  setModal({ type: "upload-video" })
                                }
                              >
                                <Upload size={15} />
                                上傳自有影片
                              </button>
                            </div>
                          )}
                        </div>
                        {workspace.media.map((m: Doc) => (
                          <div className="list-row" key={m.id}>
                            <div>
                              <h3>{m.title}</h3>
                              <p>
                                {m.provider} · {m.processing_status}
                              </p>
                            </div>
                            <Badge status={m.status} />
                            <button
                              className="small-button"
                              onClick={() => edit("media", m)}
                            >
                              查看／編輯
                            </button>
                            {m.provider === "cloudflare" && canEdit && (
                              <button
                                className="small-button"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    await api("video-sync", { id: m.id });
                                    await load();
                                  })
                                }
                              >
                                更新轉檔狀態
                              </button>
                            )}
                            {canReview && (
                              <button
                                className="small-button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      m.status === "published"
                                        ? "確認下架此影片？"
                                        : "已確認影片內容、來源及授權，發布影片？",
                                    )
                                  )
                                    run(async () => {
                                      await api("review-media", {
                                        id: m.id,
                                        status:
                                          m.status === "published"
                                            ? "withdrawn"
                                            : "published",
                                      });
                                      await load();
                                    });
                                }}
                              >
                                {m.status === "published"
                                  ? "下架"
                                  : "審核並發布"}
                              </button>
                            )}
                          </div>
                        ))}
                      </section>
                    </>
                  )}
                  {tab === "books" && (
                    <section className="panel">
                      <div className="panel-top">
                        <h2>選美電子會刊</h2>
                        {canEdit && (
                          <button
                            className="button dark"
                            onClick={() =>
                              edit("publication", {
                                title: "",
                                slug: "",
                                description: "",
                                chapters: [],
                                status: "draft",
                              })
                            }
                          >
                            <BookOpen size={15} />
                            新增會刊
                          </button>
                        )}
                      </div>
                      {workspace.publications.map((p: Doc) => (
                        <div className="list-row" key={p.id}>
                          <div>
                            <h3>{p.title}</h3>
                            <p>
                              {p.chapters.length} 個章節 · v{p.version}
                            </p>
                          </div>
                          <Badge status={p.status} />
                          <button
                            className="small-button"
                            onClick={() => edit("publication", p)}
                          >
                            編輯／查看
                          </button>
                          <button
                            className="small-button"
                            onClick={() =>
                              setModal({
                                type: "document",
                                kind: "publication",
                                initial: p,
                              })
                            }
                          >
                            版本
                          </button>
                          {p.publication && (
                            <a
                              className="small-button"
                              href={"/publications/" + p.slug}
                              target="_blank"
                              rel="noopener"
                            >
                              閱讀／下載 PDF
                            </a>
                          )}
                          {canReview && (
                            <button
                              className="small-button"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    p.status === "published"
                                      ? "確認下架會刊？"
                                      : "我已確認章節僅含核准可公開的內容及圖片，並發布此版會刊？",
                                  )
                                )
                                  run(async () => {
                                    await api("review-publication", {
                                      id: p.id,
                                      version: p.version,
                                      status:
                                        p.status === "published"
                                          ? "withdrawn"
                                          : "published",
                                      content_confirmed: true,
                                    });
                                    await load();
                                  });
                              }}
                            >
                              {p.status === "published" ? "下架" : "確認並發布"}
                            </button>
                          )}
                        </div>
                      ))}
                    </section>
                  )}
                  {tab === "assets" && (
                    <AssetLibrary
                      projectId={projectId}
                      assets={workspace.assets}
                      canEdit={canEdit}
                      onSaved={load}
                    />
                  )}
                </>
              )}
              {module === "finance" && (
                <>
                  <FinancePanel
                    key={projectId}
                    project={project}
                    role={role}
                    globalRole={member.role}
                    data={finance}
                    assets={workspace.assets}
                    onSaved={load}
                  />
                  {role === "finance" && (
                    <AssetLibrary
                      projectId={projectId}
                      assets={workspace.assets}
                      canEdit
                      onSaved={load}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {team && (
        <TeamDialog
          projectId={projectId}
          currentUser={member.user.id}
          onClose={() => setTeam(false)}
        />
      )}
      {modal && modal.type === "news" ? (
        <NewsEditor
          initial={modal.initial}
          projectId={modal.global ? null : projectId}
          role={modal.global ? member.role : role}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      ) : modal?.type === "document" ? (
        <DocumentDialog
          record={modal.initial}
          kind={modal.kind}
          canEdit={canEdit}
          onSaved={load}
          onClose={() => setModal(null)}
        />
      ) : modal?.type === "upload-video" ? (
        <VideoUpload
          projectId={projectId}
          onSaved={load}
          onClose={() => setModal(null)}
        />
      ) : (
        modal && (
          <RecordEditor
            key={modal.initial?.id || modal.type}
            type={modal.type}
            initial={modal.initial}
            projectId={projectId}
            readonly={!canEdit}
            assets={workspace?.assets || []}
            items={workspace?.items || []}
            members={workspace?.members || []}
            onClose={() => setModal(null)}
            onSaved={refresh}
          />
        )
      )}
    </div>
  );
}
function VideoUpload({
  projectId,
  onSaved,
  onClose,
}: {
  projectId: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title="上傳已授權自有影片" onClose={onClose}>
      {error && <div className="alert">{error}</div>}
      <p>
        影片直接上傳 Cloudflare 並轉檔；完成後需人工確認內容，再發布至
        BeautyTV。
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget),
            file = fd.get("video") as File;
          setBusy(true);
          setError("");
          try {
            if (file.size > 200 * 1024 * 1024)
              throw Error("此上傳方式限200MB，請壓縮影片後再試。");
            const d = await api("video-upload-url", {
              project_id: projectId,
              title: fd.get("title"),
              kind: "highlight",
              rights_confirmed: true,
            });
            const upload = new FormData();
            upload.set("file", file);
            const r = await fetch(d.upload_url, {
              method: "POST",
              body: upload,
            });
            if (!r.ok) throw Error("影片上傳失敗，可重新上傳。");
            await api("video-sync", { id: d.media.id });
            await onSaved();
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="影片名稱">
          <input name="title" required />
        </Field>
        <Field label="影片檔案（200MB以內）">
          <input
            name="video"
            type="file"
            required
            accept="video/mp4,video/quicktime,video/webm"
          />
        </Field>
        <label className="checkbox-field">
          <input required type="checkbox" />
          已取得影片人物、影像與音樂的必要使用授權。
        </label>
        <button className="button dark" disabled={busy}>
          {busy ? "正在上傳與確認轉檔…" : "上傳影片"}
        </button>
      </form>
    </Dialog>
  );
}

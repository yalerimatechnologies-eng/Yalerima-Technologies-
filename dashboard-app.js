/* dashboard-app.js
   YALERIMA GROUP — SUPER ADMIN CONTROL CENTER
   Production application layer
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CONFIG = Object.freeze({
  SUPABASE_URL:
    window.__SUPABASE_URL__ ||
    "https://yisuubdanhisuzxkgufn.supabase.co",

  SUPABASE_ANON_KEY:
    window.__SUPABASE_ANON_KEY__ ||
    "sb_publishable_PWEvImisbMTuE2y64i75rg_WJeFwEKU",

  TABLES: {
    admins: "dashboard_admins",
    adminProfiles: "admin_profiles",
    messages: "contact_requests",
    clients: "clients",
    workers: "workers",
    audit: "dashboard_audit_logs",
    preferences: "dashboard_preferences"
  },

  FUNCTIONS: {
    admin: "get_current_admin",
    statistics: "dashboard_message_statistics",
    markRead: "mark_contact_request_read",
    changeStatus: "change_contact_request_status"
  },

  PAGE_SIZE: 8,

  STORAGE_THEME: "yalerima.dashboard.theme",

  LOGIN: "login.html",

  COMING_SOON: "coming.html",

  IMPLEMENTED: new Set(["dashboard.html"]),

  MESSAGE_TYPES: [
    "Project Request",
    "Hiring Yalerima",
    "Job Application",
    "Complaint",
    "Partnership",
    "General Inquiry"
  ],

  MESSAGE_STATUSES: [
    "new",
    "read",
    "replied",
    "archived"
  ]
});

const THEMES = Object.freeze({
  core: {
    label: "Yalerima Core",
    css: null
  },
  gold: {
    label: "Gold",
    css: "gold"
  },
  emerald: {
    label: "Emerald",
    css: "emerald"
  },
  violet: {
    label: "Violet",
    css: "violet"
  },
  silver: {
    label: "Silver",
    css: "silver"
  }
});

const STATUS_CLASS = Object.freeze({
  new: "status-new",
  read: "status-read",
  replied: "status-replied",
  archived: "status-archived"
});

const App = {
  supabase: null,

  dom: {},

  charts: {},

  subscriptions: {},

  timers: {},

  state: {
    session: null,
    user: null,
    admin: null,

    authenticated: false,
    authorized: false,

    database: "CHECKING",
    realtime: "OFFLINE",

    theme: "core",

    messages: [],
    messageCount: 0,

    clients: [],
    workers: [],

    filters: {
      search: "",
      type: "all",
      status: "all",
      date: "all"
    },

    page: 1,
    totalPages: 1,

    currentMessage: null,

    lastSync: null,

    pendingConfirm: null,

    loading: new Set()
  }
};

const $ = (id) => document.getElementById(id);

const text = (element, value, fallback = "—") => {
  if (!element) return;

  element.textContent =
    value === null ||
    value === undefined ||
    value === ""
      ? fallback
      : String(value);
};

const initials = (value = "") => {
  const result = String(value)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return result || "YG";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const debounce = (callback, delay = 380) => {
  let timer;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

const localStart = (date = new Date()) => {
  const value = new Date(date);

  value.setHours(0, 0, 0, 0);

  return value.toISOString();
};

const weekStart = (date = new Date()) => {
  const value = new Date(date);

  const day = value.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  value.setDate(value.getDate() + diff);

  value.setHours(0, 0, 0, 0);

  return value.toISOString();
};

const monthStart = (date = new Date()) => {
  const value = new Date(date);

  value.setDate(1);

  value.setHours(0, 0, 0, 0);

  return value.toISOString();
};

const yearStart = (date = new Date()) => {
  const value = new Date(date);

  value.setMonth(0, 1);

  value.setHours(0, 0, 0, 0);

  return value.toISOString();
};

function captureDOM() {
  const ids = [
    "mobileOverlay",
    "sidebar",
    "sidebarToggle",
    "sidebarSystemStatus",
    "pageTitle",
    "pageSubtitle",
    "commandButton",
    "commandInput",
    "notificationButton",
    "notificationDot",
    "profileAvatar",
    "profileInitials",
    "profileName",
    "profileRole",
    "logoutButton",
    "sessionStatus",
    "systemClock",
    "welcomeName",
    "statTotalMessages",
    "statMessageTrend",
    "statUnread",
    "statUnreadTrend",
    "statClients",
    "statWorkers",
    "statWorkerTrend",
    "refreshAnalyticsButton",
    "todayChart",
    "metricActiveWorkers",
    "metricActiveClients",
    "metricMessagesToday",
    "metricDatabase",
    "terminalLine1",
    "terminalLine2",
    "terminalLine3",
    "weekChart",
    "monthChart",
    "yearChart",
    "quickMessages",
    "quickExport",
    "quickClients",
    "quickAudit",
    "clientGrid",
    "refreshMessagesButton",
    "exportMessagesButton",
    "viewAllMessagesButton",
    "messageSearch",
    "messageTypeFilter",
    "messageStatusFilter",
    "messageDateFilter",
    "messageList",
    "messagePaginationInfo",
    "messagePrev",
    "messagePage",
    "messageNext",
    "activityFeed",
    "databaseMessages",
    "databaseClients",
    "databaseWorkers",
    "databaseSession",
    "databaseRealtime",
    "databaseLastSync",
    "messageModal",
    "messageModalTitle",
    "closeMessageModal",
    "detailAvatar",
    "detailName",
    "detailEmail",
    "detailStatus",
    "detailRequestType",
    "detailCompany",
    "detailPhone",
    "detailPreferred",
    "detailBudget",
    "detailTimeline",
    "detailCreatedAt",
    "detailSubject",
    "detailMessage",
    "detailAttachmentContainer",
    "detailAttachment",
    "replyRecipient",
    "replyMessage",
    "markReadButton",
    "deleteMessageButton",
    "sendReplyButton",
    "confirmModal",
    "confirmTitle",
    "closeConfirmModal",
    "confirmMessage",
    "cancelConfirmButton",
    "confirmActionButton",
    "commandPalette",
    "commandPaletteInput",
    "commandResults",
    "commandOpenInbox",
    "commandExportMessages",
    "toastContainer",
    "loadingOverlay",
    "loadingTerminal"
  ];

  for (const id of ids) {
    App.dom[id] = $(id);
  }
}

function toast(message, type = "info") {
  const host = App.dom.toastContainer;

  if (!host) return;

  const element = document.createElement("div");

  element.className = `toast ${type}`;

  element.setAttribute("role", "status");

  const icon = document.createElement("i");

  icon.className =
    type === "success"
      ? "fa-solid fa-circle-check"
      : type === "error"
        ? "fa-solid fa-circle-xmark"
        : type === "warning"
          ? "fa-solid fa-triangle-exclamation"
          : "fa-solid fa-circle-info";

  const messageElement = document.createElement("span");

  messageElement.textContent = message;

  element.append(icon, messageElement);

  host.appendChild(element);

  setTimeout(() => element.remove(), 4500);
}

function setLoading(key, value) {
  if (value) {
    App.state.loading.add(key);
  } else {
    App.state.loading.delete(key);
  }
}

function showLoading(message = "Secure operation in progress") {
  text(
    App.dom.loadingTerminal,
    `> ${message}`,
    ""
  );

  App.dom.loadingOverlay?.classList.add("show");
}

function hideLoading() {
  App.dom.loadingOverlay?.classList.remove("show");
}

function setTerminal(a, b, c) {
  text(App.dom.terminalLine1, a, "");
  text(App.dom.terminalLine2, b, "");
  text(App.dom.terminalLine3, c, "");
}

function friendlyError(error, fallback) {
  console.error("[Yalerima Dashboard]", error);

  const raw = String(error?.message || "");

  if (/jwt|session|auth|token|not authenticated/i.test(raw)) {
    toast("Your secure session is no longer valid.", "warning");
    return;
  }

  toast(fallback, "error");
}

function setDatabaseStatus(status) {
  App.state.database = status;

  text(App.dom.metricDatabase, status);

  const labels = {
    CONNECTED: "DATABASE CONNECTED",
    AUTHENTICATED: "AUTHENTICATED",
    DEGRADED: "DATABASE DEGRADED",
    OFFLINE: "DATABASE OFFLINE",
    ERROR: "DATABASE ERROR",
    CHECKING: "CHECKING"
  };

  text(
    App.dom.sidebarSystemStatus,
    labels[status] || status
  );
}

function setRealtimeStatus(status) {
  App.state.realtime = status;

  text(App.dom.databaseRealtime, status);

  if (status === "SUBSCRIBED") {
    text(App.dom.databaseRealtime, "LIVE");
  }
}

function setLastSync() {
  App.state.lastSync = new Date();

  text(
    App.dom.databaseLastSync,
    formatDate(App.state.lastSync)
  );
}

function initSupabase() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    throw new Error("Supabase configuration is missing.");
  }

  App.supabase = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  );
}

async function verifySession() {
  const { data, error } =
    await App.supabase.auth.getSession();

  if (error) throw error;

  App.state.session = data.session || null;
  App.state.user = data.session?.user || null;

  App.state.authenticated = Boolean(
    App.state.user
  );

  if (!App.state.user) {
    text(
      App.dom.sessionStatus,
      "No authenticated administrator session."
    );

    text(
      App.dom.databaseSession,
      "SIGNED OUT"
    );

    safeRedirect(CONFIG.LOGIN);

    return false;
  }

  text(
    App.dom.sessionStatus,
    "Authenticated session verified."
  );

  text(
    App.dom.databaseSession,
    "AUTHENTICATED"
  );

  return true;
}

async function verifyAdministrator() {
  const userId = App.state.user?.id;

  if (!userId) return false;

  let data = null;
  let error = null;

  /*
   * dashboard_admins is the compatibility view created
   * by the current backend SQL.
   */
  ({
    data,
    error
  } = await App.supabase
    .from(CONFIG.TABLES.admins)
    .select(
      "user_id,email,display_name,role,avatar_url,active"
    )
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle());

  /*
   * Fallback directly to admin_profiles if the compatibility
   * view has not refreshed yet.
   */
  if (error) {
    const fallback =
      await App.supabase
        .from(CONFIG.TABLES.adminProfiles)
        .select(
          "id,email,full_name,role,avatar_url,is_active"
        )
        .eq("id", userId)
        .eq("is_active", true)
        .maybeSingle();

    if (!fallback.error && fallback.data) {
      data = {
        user_id: fallback.data.id,
        email: fallback.data.email,
        display_name: fallback.data.full_name,
        role: fallback.data.role,
        avatar_url: fallback.data.avatar_url,
        active: fallback.data.is_active
      };

      error = null;
    }
  }

  if (error) {
    friendlyError(
      error,
      "Administrator authorization could not be verified."
    );

    text(
      App.dom.sessionStatus,
      "Administrator authorization unavailable."
    );

    return false;
  }

  if (!data) {
    App.state.authorized = false;

    text(
      App.dom.databaseSession,
      "DENIED"
    );

    text(
      App.dom.sessionStatus,
      "Authenticated account is not authorized."
    );

    toast(
      "This account does not have Super Admin access.",
      "warning"
    );

    return false;
  }

  App.state.admin = data;
  App.state.authorized = true;

  const displayName =
    data.display_name ||
    App.state.user.user_metadata?.full_name ||
    App.state.user.email?.split("@")[0] ||
    "Administrator";

  const role =
    data.role ||
    "super_admin";

  text(App.dom.profileName, displayName);
  text(App.dom.welcomeName, displayName.split(/\s+/)[0]);
  text(App.dom.profileRole, role.toUpperCase());

  text(App.dom.sidebarUserName, displayName);
  text(App.dom.sidebarUserRole, role.toUpperCase());

  text(App.dom.profileInitials, initials(displayName));
  text(App.dom.sidebarUserInitials, initials(displayName));

  text(
    App.dom.databaseSession,
    "AUTHORIZED"
  );

  text(
    App.dom.sessionStatus,
    "Super Admin secure session active."
  );

  if (data.avatar_url) {
    const makeAvatar = () => {
      const image = document.createElement("img");

      image.src = data.avatar_url;
      image.alt = `${displayName} avatar`;
      image.referrerPolicy = "no-referrer";

      return image;
    };

    App.dom.profileAvatar?.replaceChildren(makeAvatar());
    App.dom.sidebarUserAvatar?.replaceChildren(makeAvatar());
  }

  return true;
}

function applyTheme(theme, persist = true) {
  if (!THEMES[theme]) {
    theme = "core";
  }

  App.state.theme = theme;

  const cssTheme = THEMES[theme].css;

  if (cssTheme) {
    document.documentElement.dataset.theme =
      cssTheme;
  } else {
    delete document.documentElement.dataset.theme;
  }

  if (persist) {
    localStorage.setItem(
      CONFIG.STORAGE_THEME,
      theme
    );
  }

  document
    .querySelectorAll(".theme-button")
    .forEach((button) => {
      const active =
        button.dataset.themeValue === theme;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

  refreshChartsTheme();
}

async function saveThemeRemote(theme) {
  if (!App.state.user) return;

  try {
    await App.supabase
      .from(CONFIG.TABLES.preferences)
      .upsert(
        {
          user_id: App.state.user.id,
          theme,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id"
        }
      );
  } catch (error) {
    console.warn(
      "[Yalerima Theme]",
      error
    );
  }
}

async function restoreTheme() {
  const local =
    localStorage.getItem(
      CONFIG.STORAGE_THEME
    );

  applyTheme(
    THEMES[local]
      ? local
      : "core",
    false
  );

  if (!App.state.user) return;

  try {
    const { data } =
      await App.supabase
        .from(CONFIG.TABLES.preferences)
        .select("theme")
        .eq(
          "user_id",
          App.state.user.id
        )
        .maybeSingle();

    if (
      data?.theme &&
      THEMES[data.theme]
    ) {
      applyTheme(
        data.theme,
        true
      );
    }
  } catch {
    /* Local theme remains available. */
  }
}

function bindThemes() {
  document.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          ".theme-button"
        );

      if (!button) return;

      const theme =
        button.dataset.themeValue;

      if (!THEMES[theme]) return;

      applyTheme(theme);

      await saveThemeRemote(theme);

      toast(
        `${THEMES[theme].label} theme applied.`,
        "success"
      );
    }
  );
}

function chartColors() {
  const styles =
    getComputedStyle(
      document.documentElement
    );

  return {
    accent:
      styles
        .getPropertyValue("--accent")
        .trim(),

    accentSoft:
      styles
        .getPropertyValue("--accent-soft")
        .trim(),

    text:
      styles
        .getPropertyValue("--text-soft")
        .trim(),

    muted:
      styles
        .getPropertyValue("--text-muted")
        .trim(),

    line:
      styles
        .getPropertyValue("--line")
        .trim()
  };
}

function destroyCharts() {
  Object.values(App.charts)
    .forEach((chart) => {
      try {
        chart.destroy();
      } catch {}
    });

  App.charts = {};
}

function refreshChartsTheme() {
  const colors = chartColors();

  Object.values(App.charts)
    .forEach((chart) => {
      if (!chart) return;

      if (chart.options?.scales) {
        Object.values(
          chart.options.scales
        ).forEach((scale) => {
          if (scale.ticks) {
            scale.ticks.color =
              colors.muted;
          }

          if (scale.grid) {
            scale.grid.color =
              colors.line;
          }
        });
      }

      if (chart.options?.plugins?.legend) {
        chart.options.plugins.legend.labels.color =
          colors.text;
      }

      if (chart.options?.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor =
          "#101418";

        chart.options.plugins.tooltip.titleColor =
          colors.accent;

        chart.options.plugins.tooltip.bodyColor =
          colors.text;
      }

      if (chart.data?.datasets) {
        chart.data.datasets.forEach(
          (dataset) => {
            dataset.borderColor =
              colors.accent;

            dataset.backgroundColor =
              colors.accentSoft;
          }
        );
      }

      chart.update("none");
    });
}

function drawChart(
  id,
  labels,
  values,
  type,
  label
) {
  const canvas =
    App.dom[id];

  if (!canvas || !window.Chart) return;

  if (App.charts[id]) {
    try {
      App.charts[id].destroy();
    } catch {}
  }

  const colors = chartColors();

  App.charts[id] =
    new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            borderColor:
              colors.accent,
            backgroundColor:
              colors.accentSoft,
            borderWidth: 2,
            tension: .35,
            fill:
              type === "line",
            pointRadius:
              type === "line"
                ? 2
                : 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,

        animation: {
          duration: 450
        },

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            backgroundColor:
              "#101418",

            titleColor:
              colors.accent,

            bodyColor:
              colors.text,

            borderColor:
              colors.line,

            borderWidth: 1
          }
        },

        scales:
          type === "doughnut"
            ? {}
            : {
                x: {
                  ticks: {
                    color:
                      colors.muted
                  },
                  grid: {
                    color:
                      colors.line
                  }
                },

                y: {
                  beginAtZero: true,
                  precision: 0,
                  ticks: {
                    color:
                      colors.muted
                  },
                  grid: {
                    color:
                      colors.line
                  }
                }
              }
      }
    });
}

function aggregate(
  rows,
  start,
  end,
  bucket
) {
  const startDate =
    new Date(start);

  const endDate =
    new Date(end);

  const labels = [];
  const values = [];

  const cursor =
    new Date(startDate);

  if (bucket === "hour") {
    cursor.setMinutes(0, 0, 0);
  }

  while (
    cursor <= endDate
  ) {
    let label;

    if (bucket === "hour") {
      label =
        `${String(cursor.getHours()).padStart(2, "0")}:00`;
    } else if (bucket === "day") {
      label =
        cursor.toLocaleDateString(
          undefined,
          { weekday: "short" }
        );
    } else if (bucket === "week") {
      label =
        `W${Math.ceil(cursor.getDate() / 7)}`;
    } else {
      label =
        cursor.toLocaleDateString(
          undefined,
          { month: "short" }
        );
    }

    labels.push(label);
    values.push(0);

    if (bucket === "hour") {
      cursor.setHours(
        cursor.getHours() + 1
      );
    } else if (bucket === "day") {
      cursor.setDate(
        cursor.getDate() + 1
      );
    } else if (bucket === "week") {
      cursor.setDate(
        cursor.getDate() + 7
      );
    } else {
      cursor.setMonth(
        cursor.getMonth() + 1
      );
    }
  }

  for (const row of rows) {
    const date =
      new Date(row.created_at);

    if (
      Number.isNaN(date.getTime()) ||
      date < startDate ||
      date > endDate
    ) {
      continue;
    }

    let index = 0;

    if (bucket === "hour") {
      index = Math.floor(
        (date - startDate) /
        3600000
      );
    } else if (bucket === "day") {
      const a =
        new Date(date);

      const b =
        new Date(startDate);

      a.setHours(0, 0, 0, 0);
      b.setHours(0, 0, 0, 0);

      index =
        Math.floor(
          (a - b) /
          86400000
        );
    } else if (bucket === "week") {
      index =
        Math.floor(
          (date - startDate) /
          (7 * 86400000)
        );
    } else {
      index =
        date.getMonth() -
        startDate.getMonth() +
        12 *
          (date.getFullYear() -
            startDate.getFullYear());
    }

    if (
      index >= 0 &&
      index < values.length
    ) {
      values[index]++;
    }
  }

  return {
    labels,
    values
  };
}

async function loadAnalytics() {
  try {
    const now =
      new Date();

    const { data, error } =
      await App.supabase
        .from(CONFIG.TABLES.messages)
        .select("created_at")
        .gte(
          "created_at",
          yearStart(now)
        );

    if (error) throw error;

    const rows =
      data || [];

    const today =
      new Date();

    today.setHours(
      0, 0, 0, 0
    );

    const week =
      new Date(today);

    week.setDate(
      week.getDate() -
      ((week.getDay() + 6) % 7)
    );

    const month =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    const year =
      new Date(
        now.getFullYear(),
        0,
        1
      );

    const todayData =
      aggregate(
        rows,
        today,
        now,
        "hour"
      );

    const weekData =
      aggregate(
        rows,
        week,
        now,
        "day"
      );

    const monthData =
      aggregate(
        rows,
        month,
        now,
        "week"
      );

    const yearData =
      aggregate(
        rows,
        year,
        now,
        "month"
      );

    drawChart(
      "todayChart",
      todayData.labels,
      todayData.values,
      "line",
      "Contact Requests"
    );

    drawChart(
      "weekChart",
      weekData.labels,
      weekData.values,
      "bar",
      "Contact Requests"
    );

    drawChart(
      "monthChart",
      monthData.labels,
      monthData.values,
      "line",
      "Contact Requests"
    );

    drawChart(
      "yearChart",
      yearData.labels,
      yearData.values,
      "doughnut",
      "Contact Requests"
    );
  } catch (error) {
    friendlyError(
      error,
      "Analytics data is unavailable."
    );
  }
}

async function count(
  table,
  filter = {}
) {
  let query =
    App.supabase
      .from(table)
      .select("*", {
        count: "exact",
        head: true
      });

  if (filter.eq) {
    query =
      query.eq(
        filter.eq[0],
        filter.eq[1]
      );
  }

  if (filter.gte) {
    query =
      query.gte(
        filter.gte[0],
        filter.gte[1]
      );
  }

  const {
    count: total,
    error
  } = await query;

  if (error) throw error;

  return total || 0;
}

async function optionalCount(
  table,
  filter = {}
) {
  try {
    return await count(
      table,
      filter
    );
  } catch {
    return null;
  }
}

async function loadStatistics() {
  const today =
    localStart();

  const [
    total,
    unread,
    clients,
    workers,
    todayMessages,
    activeClients,
    activeWorkers
  ] = await Promise.all([
    optionalCount(
      CONFIG.TABLES.messages
    ),

    optionalCount(
      CONFIG.TABLES.messages,
      {
        eq: [
          "status",
          "new"
        ]
      }
    ),

    optionalCount(
      CONFIG.TABLES.clients
    ),

    optionalCount(
      CONFIG.TABLES.workers
    ),

    optionalCount(
      CONFIG.TABLES.messages,
      {
        gte: [
          "created_at",
          today
        ]
      }
    ),

    optionalCount(
      CONFIG.TABLES.clients,
      {
        eq: [
          "status",
          "active"
        ]
      }
    ),

    optionalCount(
      CONFIG.TABLES.workers,
      {
        eq: [
          "status",
          "active"
        ]
      }
    )
  ]);

  if (total !== null) {
    text(
      App.dom.statTotalMessages,
      total,
      "0"
    );

    text(
      App.dom.databaseMessages,
      total,
      "0"
    );
  }

  if (unread !== null) {
    text(
      App.dom.statUnread,
      unread,
      "0"
    );

    const percentage =
      total
        ? Math.round(
            (unread / total) *
              100
          )
        : 0;

    text(
      App.dom.statUnreadTrend,
      `${percentage}%`
    );

    App.dom.notificationDot.style.display =
      unread > 0
        ? "block"
        : "none";
  }

  if (clients !== null) {
    text(
      App.dom.statClients,
      clients
    );

    text(
      App.dom.databaseClients,
      clients
    );

    text(
      App.dom.metricActiveClients,
      activeClients ??
        clients
    );
  } else {
    text(
      App.dom.statClients,
      "—"
    );

    text(
      App.dom.databaseClients,
      "N/A"
    );

    text(
      App.dom.metricActiveClients,
      "N/A"
    );
  }

  if (workers !== null) {
    text(
      App.dom.statWorkers,
      workers
    );

    text(
      App.dom.databaseWorkers,
      workers
    );

    text(
      App.dom.metricActiveWorkers,
      activeWorkers ??
        workers
    );
  } else {
    text(
      App.dom.statWorkers,
      "—"
    );

    text(
      App.dom.databaseWorkers,
      "N/A"
    );

    text(
      App.dom.metricActiveWorkers,
      "N/A"
    );
  }

  if (
    todayMessages !== null
  ) {
    text(
      App.dom.metricMessagesToday,
      todayMessages
    );
  }

  setDatabaseStatus(
    App.state.authenticated
      ? "AUTHENTICATED"
      : "CONNECTED"
  );
}

function messageQuery() {
  let query =
    App.supabase
      .from(CONFIG.TABLES.messages)
      .select("*", {
        count: "exact"
      })
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  const {
    search,
    type,
    status,
    date
  } =
    App.state.filters;

  if (type !== "all") {
    query =
      query.eq(
        "request_type",
        type
      );
  }

  if (status !== "all") {
    query =
      query.eq(
        "status",
        status
      );
  }

  if (date === "today") {
    query =
      query.gte(
        "created_at",
        localStart()
      );
  }

  if (date === "week") {
    query =
      query.gte(
        "created_at",
        weekStart()
      );
  }

  if (date === "month") {
    query =
      query.gte(
        "created_at",
        monthStart()
      );
  }

  if (search.trim()) {
    const safe =
      search
        .trim()
        .replace(
          /[%(),]/g,
          " "
        )
        .slice(0, 100);

    query =
      query.or(
        [
          `fullname.ilike.%${safe}%`,
          `email.ilike.%${safe}%`,
          `company.ilike.%${safe}%`,
          `subject.ilike.%${safe}%`,
          `message.ilike.%${safe}%`
        ].join(",")
      );
  }

  return query;
}

function emptyState(
  host,
  title,
  description,
  icon = "fa-inbox"
) {
  if (!host) return;

  host.replaceChildren();

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "empty-state";

  const iconElement =
    document.createElement(
      "div"
    );

  iconElement.className =
    "empty-state-icon";

  const iconNode =
    document.createElement(
      "i"
    );

  iconNode.className =
    `fa-solid ${icon}`;

  iconElement.appendChild(
    iconNode
  );

  const heading =
    document.createElement(
      "h4"
    );

  heading.textContent =
    title;

  const paragraph =
    document.createElement(
      "p"
    );

  paragraph.textContent =
    description;

  wrapper.append(
    iconElement,
    heading,
    paragraph
  );

  host.appendChild(
    wrapper
  );
}

async function loadMessages() {
  setLoading(
    "messages",
    true
  );

  try {
    const from =
      (App.state.page - 1) *
      CONFIG.PAGE_SIZE;

    const to =
      from +
      CONFIG.PAGE_SIZE -
      1;

    const {
      data,
      error,
      count: total
    } =
      await messageQuery()
        .range(from, to);

    if (error) throw error;

    App.state.messages =
      data || [];

    App.state.messageCount =
      total || 0;

    App.state.totalPages =
      Math.max(
        1,
        Math.ceil(
          App.state.messageCount /
          CONFIG.PAGE_SIZE
        )
      );

    if (
      App.state.page >
      App.state.totalPages
    ) {
      App.state.page =
        App.state.totalPages;

      return loadMessages();
    }

    renderMessages();

    text(
      App.dom.databaseMessages,
      App.state.messageCount,
      "0"
    );

    setLastSync();

    return true;
  } catch (error) {
    friendlyError(
      error,
      "Unable to load contact requests."
    );

    emptyState(
      App.dom.messageList,
      "Unable to load messages",
      "Check your Supabase connection and administrator policy.",
      "fa-triangle-exclamation"
    );

    return false;
  } finally {
    setLoading(
      "messages",
      false
    );
  }
}

function renderMessages() {
  const host =
    App.dom.messageList;

  if (!host) return;

  host.replaceChildren();

  if (!App.state.messages.length) {
    emptyState(
      host,
      "No messages found",
      "No contact requests match the current filters."
    );

    text(
      App.dom.messagePaginationInfo,
      "No matching messages"
    );

    return;
  }

  for (const message of App.state.messages) {
    const row =
      document.createElement(
        "article"
      );

    row.className =
      "message-row";

    row.dataset.messageId =
      message.id || "";

    const avatar =
      document.createElement(
        "div"
      );

    avatar.className =
      "message-avatar";

    avatar.textContent =
      initials(
        message.fullname
      );

    const sender =
      document.createElement(
        "div"
      );

    sender.className =
      "message-sender";

    const senderName =
      document.createElement(
        "strong"
      );

    senderName.textContent =
      message.fullname ||
      "Unknown sender";

    const senderEmail =
      document.createElement(
        "span"
      );

    senderEmail.textContent =
      message.email ||
      "No email";

    sender.append(
      senderName,
      senderEmail
    );

    const preview =
      document.createElement(
        "div"
      );

    preview.className =
      "message-preview";

    const subject =
      document.createElement(
        "strong"
      );

    subject.className =
      "message-subject";

    subject.textContent =
      message.subject ||
      message.request_type ||
      "Contact Request";

    const body =
      document.createElement(
        "span"
      );

    body.className =
      "message-text";

    body.textContent =
      message.message ||
      "No message body";

    preview.append(
      subject,
      body
    );

    const time =
      document.createElement(
        "div"
      );

    time.className =
      "message-time";

    time.textContent =
      formatDate(
        message.created_at
      );

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "message-actions";

    const status =
      String(
        message.status ||
        "new"
      ).toLowerCase();

    const pill =
      document.createElement(
        "span"
      );

    pill.className =
      `status-pill ${
        STATUS_CLASS[status] ||
        "status-new"
      }`;

    pill.textContent =
      status;

    const open =
      document.createElement(
        "button"
      );

    open.type =
      "button";

    open.className =
      "icon-action";

    open.title =
      "Open message";

    open.setAttribute(
      "aria-label",
      `Open message from ${
        message.fullname ||
        "sender"
      }`
    );

    const openIcon =
      document.createElement(
        "i"
      );

    openIcon.className =
      "fa-solid fa-arrow-up-right-from-square";

    open.appendChild(
      openIcon
    );

    open.addEventListener(
      "click",
      () => openMessage(
        message.id
      )
    );

    actions.append(
      pill,
      open
    );

    row.append(
      avatar,
      sender,
      preview,
      time,
      actions
    );

    row.addEventListener(
      "dblclick",
      () => openMessage(
        message.id
      )
    );

    host.appendChild(
      row
    );
  }

  text(
    App.dom.messagePaginationInfo,
    `Page ${App.state.page} of ${App.state.totalPages} • ${App.state.messageCount} total`
  );

  text(
    App.dom.messagePage,
    App.state.page
  );

  App.dom.messagePrev.disabled =
    App.state.page <= 1;

  App.dom.messageNext.disabled =
    App.state.page >=
    App.state.totalPages;
}

async function loadClients() {
  try {
    const {
      data,
      error
    } =
      await App.supabase
        .from(CONFIG.TABLES.clients)
        .select("*")
        .order(
          "updated_at",
          {
            ascending: false,
            nullsFirst: false
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(6);

    if (error) throw error;

    App.state.clients =
      data || [];

    renderClients();

    const total =
      await optionalCount(
        CONFIG.TABLES.clients
      );

    text(
      App.dom.databaseClients,
      total ?? data?.length ?? 0
    );
  } catch (error) {
    App.state.clients = [];

    emptyState(
      App.dom.clientGrid,
      "Client module unavailable",
      "No readable clients table is currently exposed to this dashboard.",
      "fa-building-circle-exclamation"
    );
  }
}

function renderClients() {
  const host =
    App.dom.clientGrid;

  if (!host) return;

  host.replaceChildren();

  if (!App.state.clients.length) {
    emptyState(
      host,
      "No client records",
      "Client records will appear here when the clients module is connected.",
      "fa-building"
    );

    return;
  }

  for (const client of App.state.clients) {
    const name =
      client.name ||
      client.company_name ||
      client.company ||
      client.fullname ||
      "Unnamed Client";

    const status =
      String(
        client.status ||
        "active"
      ).toLowerCase();

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "client-card";

    const top =
      document.createElement(
        "div"
      );

    top.className =
      "client-card-top";

    const avatar =
      document.createElement(
        "div"
      );

    avatar.className =
      "client-avatar";

    if (
      client.logo_url ||
      client.avatar_url
    ) {
      const image =
        document.createElement(
          "img"
        );

      image.src =
        client.logo_url ||
        client.avatar_url;

      image.alt =
        `${name} logo`;

      image.referrerPolicy =
        "no-referrer";

      avatar.appendChild(
        image
      );
    } else {
      avatar.textContent =
        initials(name);
    }

    const statusElement =
      document.createElement(
        "span"
      );

    statusElement.className =
      `status-pill ${
        status === "active"
          ? "status-replied"
          : "status-archived"
      }`;

    statusElement.textContent =
      status;

    top.append(
      avatar,
      statusElement
    );

    const title =
      document.createElement(
        "strong"
      );

    title.textContent =
      name;

    const metadata =
      document.createElement(
        "span"
      );

    metadata.textContent =
      client.industry ||
      client.type ||
      client.email ||
      "Client record";

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "client-card-actions";

    if (client.email) {
      const contact =
        document.createElement(
          "a"
        );

      contact.className =
        "small-button";

      contact.href =
        `mailto:${client.email}`;

      contact.textContent =
        "Contact";

      actions.appendChild(
        contact
      );
    }

    card.append(
      top,
      title,
      metadata,
      actions
    );

    host.appendChild(
      card
    );
  }
}

async function loadActivity() {
  try {
    const {
      data,
      error
    } =
      await App.supabase
        .from(CONFIG.TABLES.audit)
        .select(
          "id,actor_id,action,entity_type,entity_id,metadata,created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(12);

    if (error) throw error;

    renderActivity(
      data || []
    );
  } catch {
    emptyState(
      App.dom.activityFeed,
      "Activity unavailable",
      "Administrative audit records are not currently readable.",
      "fa-shield"
    );
  }
}

function renderActivity(rows) {
  const host =
    App.dom.activityFeed;

  if (!host) return;

  host.replaceChildren();

  if (!rows.length) {
    emptyState(
      host,
      "No recent activity",
      "Administrative activity will appear here after dashboard operations.",
      "fa-clock-rotate-left"
    );

    return;
  }

  for (const row of rows) {
    const item =
      document.createElement(
        "div"
      );

    item.className =
      "activity-item";

    const dot =
      document.createElement(
        "div"
      );

    dot.className =
      "activity-dot";

    dot.innerHTML =
      '<i class="fa-solid fa-circle"></i>';

    const content =
      document.createElement(
        "div"
      );

    content.className =
      "activity-content";

    const title =
      document.createElement(
        "strong"
      );

    title.textContent =
      row.action ||
      "ADMINISTRATIVE ACTION";

    const description =
      document.createElement(
        "p"
      );

    description.textContent =
      [
        row.entity_type,
        row.entity_id
          ? `#${row.entity_id}`
          : ""
      ]
        .filter(Boolean)
        .join(" ");

    const time =
      document.createElement(
        "div"
      );

    time.className =
      "activity-time";

    time.textContent =
      formatDate(
        row.created_at
      );

    content.append(
      title,
      description,
      time
    );

    item.append(
      dot,
      content
    );

    host.appendChild(
      item
    );
  }
}

async function openMessage(id) {
  if (!id) return;

  try {
    const {
      data,
      error
    } =
      await App.supabase
        .from(CONFIG.TABLES.messages)
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    App.state.currentMessage =
      data;

    renderMessageDetail(
      data
    );

    App.dom.messageModal?.classList.add(
      "show"
    );

    if (
      String(
        data.status ||
        "new"
      ).toLowerCase() ===
      "new"
    ) {
      await markMessageRead(
        id,
        false
      );
    }

    await writeAudit(
      "MESSAGE_VIEWED",
      "contact_request",
      id
    );

    await loadStatistics();
    await loadMessages();
  } catch (error) {
    friendlyError(
      error,
      "Unable to open that contact request."
    );
  }
}

function renderMessageDetail(
  message
) {
  text(
    App.dom.detailAvatar,
    initials(message.fullname)
  );

  text(
    App.dom.detailName,
    message.fullname
  );

  text(
    App.dom.detailEmail,
    message.email
  );

  text(
    App.dom.detailRequestType,
    message.request_type
  );

  text(
    App.dom.detailCompany,
    message.company
  );

  text(
    App.dom.detailPhone,
    message.phone
  );

  text(
    App.dom.detailPreferred,
    message.preferred_contact
  );

  text(
    App.dom.detailBudget,
    message.budget
  );

  text(
    App.dom.detailTimeline,
    message.timeline
  );

  text(
    App.dom.detailCreatedAt,
    formatDate(
      message.created_at
    )
  );

  text(
    App.dom.detailSubject,
    message.subject ||
      message.request_type
  );

  text(
    App.dom.detailMessage,
    message.message
  );

  const status =
    String(
      message.status ||
      "new"
    ).toLowerCase();

  App.dom.detailStatus.className =
    `status-pill ${
      STATUS_CLASS[status] ||
      "status-new"
    }`;

  App.dom.detailStatus.textContent =
    status.toUpperCase();

  if (message.attachment) {
    App.dom.detailAttachmentContainer.style.display =
      "block";

    App.dom.detailAttachment.href =
      message.attachment;
  } else {
    App.dom.detailAttachmentContainer.style.display =
      "none";

    App.dom.detailAttachment.removeAttribute(
      "href"
    );
  }

  text(
    App.dom.replyRecipient,
    message.email
  );

  App.dom.replyMessage.value =
    "";

  App.dom.markReadButton.textContent =
    status === "new"
      ? "Mark Read"
      : "Mark Unread";
}

async function markMessageRead(
  id,
  notify = true
) {
  try {
    const {
      error
    } =
      await App.supabase.rpc(
        CONFIG.FUNCTIONS.markRead,
        {
          p_message_id: id
        }
      );

    if (error) {
      await fallbackMessageStatus(
        id,
        "read"
      );
    }

    if (notify) {
      toast(
        "Message marked as read.",
        "success"
      );
    }

    await refreshAfterMutation();
  } catch (error) {
    friendlyError(
      error,
      "Unable to update message status."
    );
  }
}

async function fallbackMessageStatus(
  id,
  status
) {
  const {
    error
  } =
    await App.supabase
      .from(CONFIG.TABLES.messages)
      .update({
        status,
        is_read:
          status !== "new",
        read_at:
          status === "new"
            ? null
            : new Date().toISOString(),
        updated_at:
          new Date().toISOString()
      })
      .eq("id", id);

  if (error) throw error;
}

async function changeMessageStatus(
  id,
  status
) {
  if (
    !CONFIG.MESSAGE_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid message status."
    );
  }

  try {
    const {
      error
    } =
      await App.supabase.rpc(
        CONFIG.FUNCTIONS.changeStatus,
        {
          p_message_id: id,
          p_status: status
        }
      );

    if (error) {
      await fallbackMessageStatus(
        id,
        status
      );
    }
  } catch (error) {
    throw error;
  }
}

async function deleteCurrentMessage() {
  const message =
    App.state.currentMessage;

  if (!message?.id) return;

  confirmAction(
    "Delete Contact Request",
    "This permanently deletes the contact request. Continue only if permanent deletion is authorized.",
    async () => {
      const {
        error
      } =
        await App.supabase
          .from(CONFIG.TABLES.messages)
          .delete()
          .eq(
            "id",
            message.id
          );

      if (error) throw error;

      await writeAudit(
        "MESSAGE_DELETED",
        "contact_request",
        message.id
      );

      App.dom.messageModal.classList.remove(
        "show"
      );

      App.state.currentMessage =
        null;

      toast(
        "Contact request deleted.",
        "success"
      );

      await refreshAfterMutation();
    }
  );
}

async function saveReply() {
  const message =
    App.state.currentMessage;

  if (!message?.id) return;

  const reply =
    App.dom.replyMessage.value.trim();

  if (!reply) {
    toast(
      "Enter a response before saving.",
      "warning"
    );

    return;
  }

  try {
    const {
      error
    } =
      await App.supabase
        .from(CONFIG.TABLES.messages)
        .update({
          status: "replied",
          is_read: true,
          replied_at:
            new Date().toISOString(),
          read_at:
            message.read_at ||
            new Date().toISOString(),
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          message.id
        );

    if (error) throw error;

    await writeAudit(
      "MESSAGE_STATUS_CHANGED",
      "contact_request",
      message.id,
      {
        status: "replied",
        response_saved: true
      }
    );

    toast(
      "Response saved and message marked replied.",
      "success"
    );

    await refreshAfterMutation();

    App.dom.messageModal.classList.remove(
      "show"
    );
  } catch (error) {
    friendlyError(
      error,
      "Unable to save the response."
    );
  }
}

async function writeAudit(
  action,
  entityType,
  entityId,
  metadata = {}
) {
  if (!App.state.user) return;

  try {
    const {
      error
    } =
      await App.supabase
        .from(CONFIG.TABLES.audit)
        .insert({
          actor_id:
            App.state.user.id,
          action,
          entity_type:
            entityType,
          entity_id:
            String(entityId || ""),
          metadata
        });

    if (error) {
      console.warn(
        "[Yalerima Audit]",
        error
      );
    }
  } catch (error) {
    console.warn(
      "[Yalerima Audit]",
      error
    );
  }
}

async function refreshAfterMutation() {
  await Promise.allSettled([
    loadStatistics(),
    loadMessages(),
    loadAnalytics(),
    loadActivity()
  ]);

  setLastSync();
}

function exportCSV() {
  if (!App.state.messages.length) {
    toast(
      "There are no visible messages to export.",
      "warning"
    );

    return;
  }

  const columns = [
    "id",
    "request_type",
    "fullname",
    "email",
    "phone",
    "company",
    "subject",
    "budget",
    "timeline",
    "preferred_contact",
    "message",
    "created_at",
    "status",
    "is_read"
  ];

  const escapeCSV = (
    value
  ) => {
    const normalized =
      value === null ||
      value === undefined
        ? ""
        : String(value);

    return `"${normalized
      .replaceAll('"', '""')
      .replace(/\r?\n/g, " ")
      }"`;
  };

  const rows = [
    columns,
    ...App.state.messages.map(
      (row) =>
        columns.map(
          (column) =>
            escapeCSV(
              row[column]
            )
        )
    )
  ];

  const csv =
    "\uFEFF" +
    rows
      .map(
        (row) =>
          row.join(",")
      )
      .join("\r\n");

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;

  anchor.download =
    `yalerima-contact-requests-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(
    url
  );

  writeAudit(
    "EXPORT_CREATED",
    "contact_request",
    "",
    {
      count:
        App.state.messages.length,
      filters:
        App.state.filters
    }
  );

  toast(
    "Current message view exported.",
    "success"
  );
}

function confirmAction(
  title,
  message,
  callback
) {
  App.state.pendingConfirm =
    callback;

  text(
    App.dom.confirmTitle,
    title
  );

  text(
    App.dom.confirmMessage,
    message
  );

  App.dom.confirmModal.classList.add(
    "show"
  );
}

function closeConfirm(
  execute = false
) {
  const callback =
    App.state.pendingConfirm;

  App.state.pendingConfirm =
    null;

  App.dom.confirmModal.classList.remove(
    "show"
  );

  if (
    execute &&
    typeof callback ===
      "function"
  ) {
    Promise.resolve()
      .then(callback)
      .catch((error) =>
        friendlyError(
          error,
          "The operation failed."
        )
      );
  }
}

function closeMessageModal() {
  App.dom.messageModal?.classList.remove(
    "show"
  );

  App.state.currentMessage =
    null;
}

function bindMessageCenter() {
  const search =
    App.dom.messageSearch;

  const executeSearch =
    debounce(
      () => {
        App.state.filters.search =
          search.value;

        App.state.page =
          1;

        loadMessages();
      },
      380
    );

  search?.addEventListener(
    "input",
    executeSearch
  );

  App.dom.messageTypeFilter?.addEventListener(
    "change",
    (event) => {
      App.state.filters.type =
        event.target.value;

      App.state.page =
        1;

      loadMessages();
    }
  );

  App.dom.messageStatusFilter?.addEventListener(
    "change",
    (event) => {
      App.state.filters.status =
        event.target.value;

      App.state.page =
        1;

      loadMessages();
    }
  );

  App.dom.messageDateFilter?.addEventListener(
    "change",
    (event) => {
      App.state.filters.date =
        event.target.value;

      App.state.page =
        1;

      loadMessages();
    }
  );

  App.dom.messagePrev?.addEventListener(
    "click",
    () => {
      if (
        App.state.page <= 1
      ) return;

      App.state.page--;

      loadMessages();
    }
  );

  App.dom.messageNext?.addEventListener(
    "click",
    () => {
      if (
        App.state.page >=
        App.state.totalPages
      ) return;

      App.state.page++;

      loadMessages();
    }
  );

  App.dom.refreshMessagesButton?.addEventListener(
    "click",
    async () => {
      await refreshAfterMutation();

      toast(
        "Message center synchronized.",
        "success"
      );
    }
  );

  App.dom.exportMessagesButton?.addEventListener(
    "click",
    exportCSV
  );

  App.dom.quickExport?.addEventListener(
    "click",
    exportCSV
  );

  App.dom.viewAllMessagesButton?.addEventListener(
    "click",
    () => {
      App.dom.messageCenterPanel?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  );

  App.dom.quickMessages?.addEventListener(
    "click",
    () => {
      App.dom.messageCenterPanel?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      setTimeout(
        () =>
          App.dom.messageSearch?.focus(),
        400
      );
    }
  );

  App.dom.markReadButton?.addEventListener(
    "click",
    async () => {
      const message =
        App.state.currentMessage;

      if (!message?.id) return;

      const current =
        String(
          message.status ||
          "new"
        ).toLowerCase();

      try {
        if (
          current === "new"
        ) {
          await markMessageRead(
            message.id,
            true
          );
        } else {
          await changeMessageStatus(
            message.id,
            "new"
          );

          await writeAudit(
            "MESSAGE_STATUS_CHANGED",
            "contact_request",
            message.id,
            {
              status: "new"
            }
          );

          toast(
            "Message marked unread.",
            "success"
          );

          await refreshAfterMutation();
        }

        const {
          data
        } =
          await App.supabase
            .from(CONFIG.TABLES.messages)
            .select("*")
            .eq(
              "id",
              message.id
            )
            .maybeSingle();

        if (data) {
          App.state.currentMessage =
            data;

          renderMessageDetail(
            data
          );
        }
      } catch (error) {
        friendlyError(
          error,
          "Unable to change message status."
        );
      }
    }
  );

  App.dom.deleteMessageButton?.addEventListener(
    "click",
    deleteCurrentMessage
  );

  App.dom.sendReplyButton?.addEventListener(
    "click",
    saveReply
  );
}

function bindModal() {
  App.dom.closeMessageModal?.addEventListener(
    "click",
    closeMessageModal
  );

  App.dom.messageModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        App.dom.messageModal
      ) {
        closeMessageModal();
      }
    }
  );

  App.dom.closeConfirmModal?.addEventListener(
    "click",
    () =>
      closeConfirm(false)
  );

  App.dom.cancelConfirmButton?.addEventListener(
    "click",
    () =>
      closeConfirm(false)
  );

  App.dom.confirmActionButton?.addEventListener(
    "click",
    () =>
      closeConfirm(true)
  );

  App.dom.confirmModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        App.dom.confirmModal
      ) {
        closeConfirm(false);
      }
    }
  );
}

function bindNavigation() {
  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach((link) => {
      link.addEventListener(
        "click",
        (event) => {
          const href =
            link.getAttribute(
              "href"
            );

          if (
            !href ||
            href ===
              "dashboard.html"
          ) {
            return;
          }

          if (
            !CONFIG.IMPLEMENTED.has(
              href
            )
          ) {
            event.preventDefault();

            window.location.href =
              CONFIG.COMING_SOON;
          }
        }
      );
    });
}

function bindSidebar() {
  const toggle =
    () => {
      App.dom.sidebar?.classList.toggle(
        "show"
      );

      App.dom.mobileOverlay?.classList.toggle(
        "show"
      );
    };

  App.dom.sidebarToggle?.addEventListener(
    "click",
    toggle
  );

  App.dom.mobileOverlay?.addEventListener(
    "click",
    toggle
  );
}

function bindQuickActions() {
  App.dom.quickClients?.addEventListener(
    "click",
    () => {
      window.location.href =
        "clients.html";
    }
  );

  App.dom.quickAudit?.addEventListener(
    "click",
    () => {
      window.location.href =
        "audit.html";
    }
  );

  App.dom.notificationButton?.addEventListener(
    "click",
    () => {
      App.dom.messageCenterPanel?.scrollIntoView({
        behavior: "smooth"
      });

      if (
        Number(
          App.dom.statUnread.textContent
        ) > 0
      ) {
        App.state.filters.status =
          "new";

        App.dom.messageStatusFilter.value =
          "new";

        App.state.page =
          1;

        loadMessages();
      }
    }
  );

  App.dom.refreshAnalyticsButton?.addEventListener(
    "click",
    async () => {
      const button =
        App.dom.refreshAnalyticsButton;

      button.disabled =
        true;

      try {
        await loadAnalytics();

        toast(
          "Analytics synchronized.",
          "success"
        );
      } catch (error) {
        friendlyError(
          error,
          "Analytics refresh failed."
        );
      } finally {
        button.disabled =
          false;
      }
    }
  );
}

const COMMANDS = [
  {
    label: "Open Inbox",
    description:
      "Review contact requests",
    icon:
      "fa-solid fa-inbox",
    action() {
      App.dom.commandPalette.classList.remove(
        "show"
      );

      App.dom.messageCenterPanel?.scrollIntoView({
        behavior: "smooth"
      });
    }
  },

  {
    label: "Export Messages",
    description:
      "Export current message view",
    icon:
      "fa-solid fa-file-export",
    action() {
      App.dom.commandPalette.classList.remove(
        "show"
      );

      exportCSV();
    }
  },

  {
    label: "Clients",
    description:
      "Open Client Management",
    icon:
      "fa-solid fa-building",
    action() {
      window.location.href =
        "clients.html";
    }
  },

  {
    label: "Audit Center",
    description:
      "Open System Audit Logs",
    icon:
      "fa-solid fa-shield",
    action() {
      window.location.href =
        "audit.html";
    }
  },

  {
    label: "Global Settings",
    description:
      "Open Global Settings",
    icon:
      "fa-solid fa-sliders",
    action() {
      window.location.href =
        "settings.html";
    }
  }
];

function renderCommands(
  search = ""
) {
  const host =
    App.dom.commandResults;

  if (!host) return;

  host.replaceChildren();

  const query =
    search
      .trim()
      .toLowerCase();

  const commands =
    COMMANDS.filter(
      (command) =>
        !query ||
        command.label
          .toLowerCase()
          .includes(query) ||
        command.description
          .toLowerCase()
          .includes(query)
    );

  for (const command of commands) {
    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "command-result";

    const icon =
      document.createElement(
        "i"
      );

    icon.className =
      command.icon;

    const body =
      document.createElement(
        "div"
      );

    const title =
      document.createElement(
        "strong"
      );

    title.textContent =
      command.label;

    const description =
      document.createElement(
        "span"
      );

    description.textContent =
      command.description;

    body.append(
      title,
      description
    );

    button.append(
      icon,
      body
    );

    button.addEventListener(
      "click",
      command.action
    );

    host.appendChild(
      button
    );
  }
}

function openCommandPalette() {
  App.dom.commandPalette.classList.add(
    "show"
  );

  App.dom.commandPaletteInput.value =
    "";

  renderCommands();

  setTimeout(
    () =>
      App.dom.commandPaletteInput?.focus(),
    20
  );
}

function closeCommandPalette() {
  App.dom.commandPalette?.classList.remove(
    "show"
  );
}

function bindCommands() {
  App.dom.commandButton?.addEventListener(
    "click",
    openCommandPalette
  );

  App.dom.commandInput?.addEventListener(
    "focus",
    openCommandPalette
  );

  App.dom.commandPaletteInput?.addEventListener(
    "input",
    (event) =>
      renderCommands(
        event.target.value
      )
  );

  App.dom.commandPalette?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        App.dom.commandPalette
      ) {
        closeCommandPalette();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "k"
      ) {
        event.preventDefault();

        openCommandPalette();
      }

      if (
        event.key ===
        "Escape"
      ) {
        closeCommandPalette();

        closeMessageModal();

        closeConfirm(false);
      }
    }
  );
}

function startClock() {
  const update =
    () => {
      const value =
        new Intl.DateTimeFormat(
          undefined,
          {
            dateStyle: "medium",
            timeStyle: "medium"
          }
        ).format(
          new Date()
        );

      const span =
        App.dom.systemClock?.querySelector(
          "span"
        );

      text(
        span,
        value,
        ""
      );
    };

  update();

  App.timers.clock =
    setInterval(
      update,
      1000
    );
}

function stopClock() {
  if (
    App.timers.clock
  ) {
    clearInterval(
      App.timers.clock
    );

    delete App.timers.clock;
  }
}

function setupRealtime() {
  if (
    App.subscriptions.messages
  ) {
    return;
  }

  setRealtimeStatus(
    "CONNECTING"
  );

  const channel =
    App.supabase
      .channel(
        "yalerima-dashboard-contact-requests"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            CONFIG.TABLES.messages
        },
        async () => {
          await refreshAfterMutation();

          toast(
            "Message center synchronized.",
            "info"
          );
        }
      )
      .subscribe(
        (status) => {
          if (
            status ===
            "SUBSCRIBED"
          ) {
            setRealtimeStatus(
              "SUBSCRIBED"
            );

            return;
          }

          if (
            status ===
            "CHANNEL_ERROR"
          ) {
            setRealtimeStatus(
              "ERROR"
            );

            return;
          }

          if (
            status ===
            "TIMED_OUT"
          ) {
            setRealtimeStatus(
              "TIMEOUT"
            );
          }
        }
      );

  App.subscriptions.messages =
    channel;
}

function setupAuditRealtime() {
  if (
    App.subscriptions.audit
  ) {
    return;
  }

  try {
    const channel =
      App.supabase
        .channel(
          "yalerima-dashboard-audit"
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              CONFIG.TABLES.audit
          },
          () => loadActivity()
        )
        .subscribe();

    App.subscriptions.audit =
      channel;
  } catch (error) {
    console.warn(
      "[Yalerima Audit Realtime]",
      error
    );
  }
}

function teardownRealtime() {
  Object.values(
    App.subscriptions
  ).forEach(
    (channel) => {
      try {
        App.supabase.removeChannel(
          channel
        );
      } catch {}
    }
  );

  App.subscriptions = {};

  setRealtimeStatus(
    "OFFLINE"
  );
}

async function pingDatabase() {
  try {
    const {
      error
    } =
      await App.supabase
        .from(CONFIG.TABLES.messages)
        .select("id", {
          head: true,
          count: "exact"
        });

    return !error;
  } catch {
    return false;
  }
}

function setupConnectivity() {
  window.addEventListener(
    "online",
    async () => {
      const ok =
        await pingDatabase();

      if (ok) {
        setDatabaseStatus(
          "CONNECTED"
        );

        await loadAll();

        teardownRealtime();
        setupRealtime();
        setupAuditRealtime();

        toast(
          "Database connection restored.",
          "success"
        );
      }
    }
  );

  window.addEventListener(
    "offline",
    () => {
      setDatabaseStatus(
        "OFFLINE"
      );

      setRealtimeStatus(
        "OFFLINE"
      );

      toast(
        "Connection unavailable. Loaded data has been preserved.",
        "warning"
      );
    }
  );

  App.timers.connectivity =
    setInterval(
      async () => {
        if (
          !navigator.onLine
        ) {
          setDatabaseStatus(
            "OFFLINE"
          );

          return;
        }

        const ok =
          await pingDatabase();

        if (!ok) {
          setDatabaseStatus(
            "DEGRADED"
          );

          return;
        }

        if (
          App.state.database ===
          "DEGRADED" ||
          App.state.database ===
          "OFFLINE"
        ) {
          await loadAll();

          teardownRealtime();
          setupRealtime();
          setupAuditRealtime();
        }

        setDatabaseStatus(
          App.state.authenticated
            ? "AUTHENTICATED"
            : "CONNECTED"
        );
      },
      30000
    );
}

async function loadAll() {
  setTerminal(
    "Secure session verified.",
    "Synchronizing institutional data...",
    "Rendering live command center..."
  );

  await Promise.allSettled([
    loadStatistics(),
    loadClients(),
    loadMessages(),
    loadActivity(),
    loadAnalytics()
  ]);

  setLastSync();

  setTerminal(
    "Secure session verified.",
    "Database synchronized.",
    "Dashboard ready."
  );
}

async function logout() {
  showLoading(
    "Closing secure administrator session..."
  );

  try {
    teardownRealtime();

    await writeAudit(
      "LOGOUT",
      "administrator",
      App.state.user?.id || ""
    );

    const {
      error
    } =
      await App.supabase.auth.signOut();

    if (error) throw error;

    App.state.session =
      null;

    App.state.user =
      null;

    App.state.admin =
      null;

    App.state.authenticated =
      false;

    App.state.authorized =
      false;

    safeRedirect(
      CONFIG.LOGIN
    );
  } catch (error) {
    hideLoading();

    friendlyError(
      error,
      "Unable to safely sign out."
    );
  }
}

function safeRedirect(
  destination
) {
  const current =
    location.pathname
      .split("/")
      .pop();

  if (
    current ===
    destination
  ) {
    return;
  }

  window.location.assign(
    destination
  );
}

async function bootstrap() {
  captureDOM();

  bindSidebar();
  bindThemes();
  bindModal();
  bindMessageCenter();
  bindNavigation();
  bindQuickActions();
  bindCommands();

  applyTheme(
    localStorage.getItem(
      CONFIG.STORAGE_THEME
    ) || "core",
    false
  );

  startClock();

  showLoading(
    "Initializing secure command center..."
  );

  setTerminal(
    "Initializing command center...",
    "Connecting to Supabase...",
    "Awaiting secure session..."
  );

  try {
    initSupabase();

    const authenticated =
      await verifySession();

    if (!authenticated) {
      hideLoading();
      return;
    }

    setDatabaseStatus(
      "AUTHENTICATED"
    );

    const authorized =
      await verifyAdministrator();

    if (!authorized) {
      hideLoading();
      return;
    }

    await restoreTheme();

    await writeAudit(
      "LOGIN",
      "administrator",
      App.state.user.id
    );

    await loadAll();

    setupRealtime();
    setupAuditRealtime();

    setupConnectivity();

    App.dom.logoutButton?.addEventListener(
      "click",
      logout
    );

    hideLoading();

    toast(
      "Yalerima command center ready.",
      "success"
    );
  } catch (error) {
    console.error(
      "[Yalerima Bootstrap]",
      error
    );

    setDatabaseStatus(
      "ERROR"
    );

    setTerminal(
      "Command center initialization failed.",
      "Database connection requires attention.",
      "Existing interface preserved."
    );

    friendlyError(
      error,
      "The dashboard could not complete initialization."
    );

    hideLoading();
  }
}

window.addEventListener(
  "beforeunload",
  () => {
    stopClock();

    if (
      App.timers.connectivity
    ) {
      clearInterval(
        App.timers.connectivity
      );
    }

    teardownRealtime();
  }
);

window.addEventListener(
  "pagehide",
  () => {
    stopClock();
    teardownRealtime();
  }
);

window.__YalerimaApp =
  App;

document.addEventListener(
  "DOMContentLoaded",
  bootstrap,
  {
    once: true
  }
);
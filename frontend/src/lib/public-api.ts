/**
 * Foydalanuvchi qismi uchun API yordamchilari.
 *
 * Admin `resource()` dan farqi: bu endpointlar `/api/...` ildizida turadi,
 * ko'pchiligi autentifikatsiyasiz ochiq va javob shakllari boshqacha
 * (masalan, `leaderboard` sahifalanmagan massiv qaytaradi).
 */

import { api, type Query } from "./api";
import type {
  AppNotification,
  AuthConfig,
  ContactTopic,
  ContestParticipantRow,
  ContestProblemDetail,
  ContestStandings,
  CurrentUser,
  FollowState,
  GroupMemberRow,
  JudgeStatus,
  LeaderboardRow,
  MyContestRow,
  PushConfig,
  PushDevice,
  PushSubscribePayload,
  MyProgress,
  MyRank,
  Paginated,
  PublicBookmark,
  PublicComment,
  PublicContest,
  PublicContestDetail,
  PublicContestProblem,
  PublicDailyChallenge,
  PublicDiscussion,
  PublicGroup,
  PublicProblemDetail,
  PublicProblemListItem,
  PublicProfile,
  PublicSubmission,
  RankGroup,
  RankTableRow,
  Region,
  PublicSubmissionFull,
  PublicSubmissionRow,
  ReportReason,
  RunResponse,
  SiteAnnouncement,
  SiteSearchResponse,
  SiteStats,
  Tag,
  TotpSetup,
  UserCard,
  UserSession,
} from "./types";

export const publicApi = {
  /* ----------------------------------------------------------- masalalar */
  problems: {
    list: (query?: Query) => api.get<Paginated<PublicProblemListItem>>("/problems/", query),
    retrieve: (slug: string) => api.get<PublicProblemDetail>(`/problems/${slug}/`),
    /** Shu masala bo'yicha o'z urinishlarim. */
    submissions: (slug: string) =>
      api.get<PublicSubmissionRow[]>(`/problems/${slug}/submissions/`),
    /** Bitta tugma bilan xatcho'pni yoqish/o'chirish. */
    toggleBookmark: (slug: string, note?: string) =>
      api.post<{ bookmarked: boolean; detail: string }>(`/problems/${slug}/bookmark/`, { note }),
    /** Masala ostidagi izohlar — tekis ro'yxat, daraxt frontendda yig'iladi. */
    comments: (slug: string) => api.get<PublicComment[]>(`/problems/${slug}/comments/`),
  },

  tags: () => api.get<Tag[]>("/tags/"),
  progress: () => api.get<MyProgress>("/progress/"),

  dailyChallenge: (days = 30) => api.get<PublicDailyChallenge>("/daily-challenge/", { days }),

  /* -------------------------------------------------------------- judge */
  submissions: {
    /** Yechim yuborish. 10 ta/daqiqa limiti bor (429 qaytishi mumkin). */
    create: (body: { problem_slug: string; language: string; code: string; contest?: string }) =>
      api.post<PublicSubmission>("/submissions/", body),
    retrieve: (id: string) => api.get<PublicSubmission>(`/submissions/${id}/`),
    full: (id: string) => api.get<PublicSubmissionFull>(`/submissions/${id}/`, { full: 1 }),
    list: (query?: Query) => api.get<Paginated<PublicSubmissionRow>>("/submissions/", query),
    /** Namuna testlarda sinab ko'rish — ball berilmaydi, natija saqlanmaydi. */
    run: (body: { problem_slug: string; language: string; code: string; stdin?: string }) =>
      api.post<RunResponse>("/submissions/run/", body),
  },

  /** Judge ishlayaptimi va qaysi tillar mavjud (muharrir shu javobga qaraydi). */
  judgeStatus: () => api.get<JudgeStatus>("/judge/status/"),

  /* ------------------------------------------------------------ reyting */
  leaderboard: (query?: {
    sort?: "points" | "rating";
    period?: "all" | "week" | "month";
    /** Username yoki to'liq ism bo'yicha qidiruv. */
    q?: string;
    page?: number;
    page_size?: number;
  }) => api.get<Paginated<LeaderboardRow>>("/leaderboard/", query as Query),
  myRank: (sort: "points" | "rating" = "points") => api.get<MyRank>("/leaderboard/me/", { sort }),

  profile: (username: string) => api.get<PublicProfile>(`/users/${username}/`),

  /* ------------------------------------------------------------- obunalar */
  follows: {
    follow: (username: string) => api.post<FollowState>(`/users/${username}/follow/`),
    unfollow: (username: string) => api.delete<FollowState>(`/users/${username}/follow/`),
    followers: (username: string, query?: Query) =>
      api.get<Paginated<UserCard>>(`/users/${username}/followers/`, query),
    following: (username: string, query?: Query) =>
      api.get<Paginated<UserCard>>(`/users/${username}/following/`, query),
    suggested: () => api.get<UserCard[]>("/users/suggested/"),
  },

  /* ------------------------------------------------------- daraja / hudud */
  ranks: () =>
    api.get<{ ranks: RankTableRow[]; groups: RankGroup[]; max_tier: number }>("/ranks/"),
  regions: () => api.get<{ regions: Region[] }>("/geo/regions/"),


  /* --------------------------------------------------------- musobaqalar */
  contests: {
    list: (query?: Query) => api.get<Paginated<PublicContest>>("/contests/", query),
    retrieve: (slug: string) => api.get<PublicContestDetail>(`/contests/${slug}/`),
    join: (slug: string, password?: string) =>
      api.post<ContestParticipantRow>(`/contests/${slug}/join/`, password ? { password } : {}),
    leave: (slug: string) => api.post<{ detail: string }>(`/contests/${slug}/leave/`),
    problems: (slug: string) =>
      api.get<{ problems: PublicContestProblem[] }>(`/contests/${slug}/problems/`),
    /** Musobaqa ichidagi masala — tahlil/muhokamasiz alohida ko'rinish. */
    problem: (slug: string, problemSlug: string) =>
      api.get<ContestProblemDetail>(`/contests/${slug}/problems/${problemSlug}/`),
    leaderboard: (slug: string) =>
      api.get<ContestStandings>(`/contests/${slug}/leaderboard/`),
    mine: () => api.get<MyContestRow[]>("/contests/mine/"),
  },

  /* ----------------------------------------------------------- xatcho'p */
  bookmarks: {
    list: (query?: Query) => api.get<Paginated<PublicBookmark>>("/bookmarks/", query),
    create: (body: { problem: string; note?: string }) =>
      api.post<PublicBookmark>("/bookmarks/", body),
    update: (id: string, body: { note: string }) =>
      api.patch<PublicBookmark>(`/bookmarks/${id}/`, body),
    remove: (id: string) => api.delete<void>(`/bookmarks/${id}/`),
  },

  /* --------------------------------------------------------- muhokamalar */
  discussions: {
    list: (query?: Query) => api.get<Paginated<PublicDiscussion>>("/discussions/", query),
    retrieve: (id: string) => api.get<PublicDiscussion>(`/discussions/${id}/`),
    create: (body: { title: string; body_md: string }) =>
      api.post<PublicDiscussion>("/discussions/", body),
    update: (id: string, body: { title?: string; body_md?: string }) =>
      api.patch<PublicDiscussion>(`/discussions/${id}/`, body),
    remove: (id: string) => api.delete<void>(`/discussions/${id}/`),
    vote: (id: string, value: 1 | -1 | 0) =>
      api.post<{ upvotes: number; my_vote: number }>(`/discussions/${id}/vote/`, { value }),
    comments: (id: string) => api.get<PublicComment[]>(`/discussions/${id}/comments/`),
  },

  comments: {
    /** `discussion` yoki `problem` — aynan bittasi berilishi kerak. */
    create: (body: {
      discussion?: string;
      problem?: string;
      body_md: string;
      parent?: string | null;
    }) => api.post<PublicComment>("/comments/", body),
    update: (id: string, body: { body_md: string }) =>
      api.patch<PublicComment>(`/comments/${id}/`, body),
    remove: (id: string) => api.delete<void>(`/comments/${id}/`),
    vote: (id: string, value: 1 | -1 | 0) =>
      api.post<{ upvotes: number; my_vote: number }>(`/comments/${id}/vote/`, { value }),
  },

  report: (body: {
    discussion?: string | null;
    comment?: string | null;
    reason: ReportReason;
    note?: string;
  }) => api.post<{ detail: string; id: string }>("/reports/", body),

  /* ------------------------------------------------------------- guruhlar */
  groups: {
    list: () => api.get<Paginated<PublicGroup>>("/groups/"),
    retrieve: (slug: string) => api.get<PublicGroup>(`/groups/${slug}/`),
    create: (body: { name: string; description?: string; is_private?: boolean }) =>
      api.post<PublicGroup>("/groups/", body),
    update: (slug: string, body: Partial<{ name: string; description: string; is_private: boolean }>) =>
      api.patch<PublicGroup>(`/groups/${slug}/`, body),
    remove: (slug: string) => api.delete<void>(`/groups/${slug}/`),
    join: (inviteCode: string) =>
      api.post<PublicGroup & { joined: boolean }>("/groups/join/", { invite_code: inviteCode }),
    leave: (slug: string) => api.post<{ detail: string }>(`/groups/${slug}/leave/`),
    regenerateCode: (slug: string) =>
      api.post<{ invite_code: string }>(`/groups/${slug}/regenerate-code/`),
    removeMember: (slug: string, memberId: string) =>
      api.post<{ detail: string }>(`/groups/${slug}/members/${memberId}/remove/`),
    leaderboard: (slug: string) => api.get<GroupMemberRow[]>(`/groups/${slug}/leaderboard/`),
  },

  /* ------------------------------------------------------- bildirishnoma */
  notifications: {
    list: (query?: Query) => api.get<Paginated<AppNotification>>("/notifications/", query),
    unreadCount: () => api.get<{ unread: number }>("/notifications/unread-count/"),
    markRead: (id: string) => api.post<AppNotification>(`/notifications/${id}/read/`),
    markAllRead: () => api.post<{ affected: number }>("/notifications/read-all/"),
    clearRead: () => api.post<{ affected: number }>("/notifications/clear/"),
    remove: (id: string) => api.delete<void>(`/notifications/${id}/`),
  },

  /* --------------------------------------------------- brauzer push xabari */
  push: {
    config: () => api.get<PushConfig>("/push/config/"),
    devices: () => api.get<PushDevice[]>("/push/devices/"),
    /** Brauzerning `subscription.toJSON()` natijasi shundayligicha yuboriladi */
    subscribe: (body: PushSubscribePayload) =>
      api.post<{ detail: string; created: boolean; device: PushDevice }>("/push/subscribe/", body),
    unsubscribe: (endpoint: string) =>
      api.post<{ detail: string; removed: boolean }>("/push/unsubscribe/", { endpoint }),
    test: () => api.post<{ detail: string; sent: number }>("/push/test/"),
  },

  /* ------------------------------------------------------------ sayt meta */
  site: {
    stats: () => api.get<SiteStats>("/site/stats/"),
    announcements: () => api.get<SiteAnnouncement[]>("/site/announcements/"),
    settings: () => api.get<Record<string, unknown>>("/site/settings/"),
  },

  search: (q: string, limit = 6) => api.get<SiteSearchResponse>("/search/", { q, limit }),

  /** «Bog'lanish» formasi — mehmon ham yubora oladi. */
  contact: (body: {
    name: string;
    email: string;
    topic: ContactTopic;
    subject: string;
    body: string;
  }) => api.post<{ detail: string; id: string }>("/contact/", body),
};

/* ==========================================================================
   Hisob (auth) oqimlari
   ========================================================================== */

export const authApi = {
  config: () => api.get<AuthConfig>("/auth/config/"),

  register: (body: {
    username: string;
    email: string;
    full_name?: string;
    region: string;
    district: string;
    education_place: string;
    password: string;
    password_confirm: string;
    accept_terms: boolean;
    locale?: string;
  }) => api.post<{ user: CurrentUser; verification_email_sent: boolean }>("/auth/register/", body),

  google: (credential: string) =>
    api.post<{ user: CurrentUser; created: boolean }>("/auth/google/", { credential }),

  verifyEmail: (token: string) =>
    api.post<{ detail: string; already?: boolean }>("/auth/verify-email/", { token }),
  resendVerification: () => api.post<{ detail: string; sent: boolean }>("/auth/resend-verification/"),

  forgotPassword: (email: string) => api.post<{ detail: string }>("/auth/forgot-password/", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ detail: string }>("/auth/reset-password/", { token, new_password: newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ detail: string }>("/auth/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  updateProfile: (body: Partial<{
    full_name: string;
    bio: string;
    avatar_url: string;
    country: string;
    region: string;
    district: string;
    education_place: string;
    github_url: string;
    website_url: string;
    locale: string;
    notify_email: boolean;
    notify_contest: boolean;
    notify_follower: boolean;
  }>) => api.patch<CurrentUser>("/auth/me/", body),

  /** Profil rasmini yuklash (multipart) va o'chirish. */
  avatar: {
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.upload<CurrentUser>("/auth/me/avatar/", form);
    },
    remove: () => api.delete<CurrentUser>("/auth/me/avatar/"),
  },

  twoFactor: {
    setup: () => api.post<TotpSetup>("/auth/2fa/setup/"),
    enable: (code: string) =>
      api.post<{ detail: string; recovery_codes: string[] }>("/auth/2fa/enable/", { code }),
    disable: (password: string) => api.post<{ detail: string }>("/auth/2fa/disable/", { password }),
  },

  sessions: {
    list: () => api.get<UserSession[]>("/auth/sessions/"),
    revoke: (id: string) => api.post<{ detail: string }>(`/auth/sessions/${id}/revoke/`),
    revokeOthers: () => api.post<{ detail: string; affected: number }>("/auth/sessions/revoke-others/"),
  },

  deactivate: (password: string) => api.post<{ detail: string }>("/auth/deactivate/", { password }),
};

/** Submission tugallangan holatlar — polling shu yerda to'xtaydi. */
export const TERMINAL_STATUSES = new Set([
  "ACCEPTED",
  "WRONG_ANSWER",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
  "SYSTEM_ERROR",
]);

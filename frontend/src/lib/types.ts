// ---------------------------------------------------------------- umumiy
export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: T[];
}

export type Locale = "uz" | "en";
export type Role = "user" | "moderator" | "admin";
export type Difficulty = "easy" | "medium" | "hard";
export type PublishState = "draft" | "published" | "archived";
export type Language = "python" | "javascript" | "cpp";

export type SubmissionStatus =
  | "PENDING"
  | "JUDGING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILE_ERROR"
  | "SYSTEM_ERROR";

// ------------------------------------------------------------------ rank
/** Nomli rank pog'onasi (backend `apps.core.ranks`). */
export interface RankInfo {
  tier: number;
  code: string;
  /** Rank guruhi: bronze | silver | gold | platinum | diamond | master | ... */
  group: string;
  name_uz: string;
  name_en: string;
  base_uz: string;
  base_en: string;
  division: string;
  color: string;
  color_soft: string;
  min_rating: number;
  next_rating: number | null;
  next_name_uz: string | null;
  progress: number;
  to_next: number;
  is_max: boolean;
}

export interface RankTableRow extends Omit<RankInfo, "next_rating" | "next_name_uz" | "progress" | "to_next" | "is_max"> {
  max_rating: number | null;
}

export interface RankGroup {
  key: string;
  name_uz: string;
  name_en: string;
  color: string;
  color_soft: string;
}

/** Ro'yxatdan o'tishdagi viloyat va uning tumanlari. */
export interface Region {
  name: string;
  districts: string[];
}

// ------------------------------------------------------------------ auth
export interface Permissions {
  is_admin: boolean;
  is_moderator: boolean;
  can_access_admin: boolean;
  can_manage_users: boolean;
  can_manage_problems: boolean;
  can_manage_settings: boolean;
  can_moderate_content: boolean;
  /** Granular ruxsat kodlari, masalan `problems.delete` */
  codes: string[];
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  country: string;
  github_url: string;
  website_url: string;
  role: Role;
  locale: Locale;
  rating: number;
  max_rating: number;
  total_points: number;
  problems_solved: number;
  current_streak: number;
  longest_streak: number;
  is_email_verified: boolean;
  is_banned: boolean;
  notify_email: boolean;
  notify_contest: boolean;
  notify_follower: boolean;
  is_2fa_enabled: boolean;
  followers_count: number;
  following_count: number;
  region: string;
  district: string;
  education_place: string;
  created_at: string;
  permissions: Permissions;
  rank: RankInfo;
}

// ----------------------------------------------------------------- users
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: Role;
  locale: Locale;
  rating: number;
  total_points: number;
  problems_solved: number;
  submissions_count: number;
  current_streak: number;
  is_active: boolean;
  is_banned: boolean;
  ban_active: boolean;
  is_email_verified: boolean;
  country: string;
  region: string;
  district: string;
  education_place: string;
  rank: RankInfo;
  created_at: string;
  last_login: string | null;
}

export interface AdminUserDetail extends AdminUser {
  bio: string;
  github_url: string;
  website_url: string;
  max_rating: number;
  contests_participated: number;
  longest_streak: number;
  last_solved_date: string | null;
  ban_reason: string;
  banned_until: string | null;
  banned_by_username: string | null;
  notify_email: boolean;
  notify_contest: boolean;
  is_2fa_enabled: boolean;
  extra_permissions: string[];
  denied_permissions: string[];
  effective_permissions: string[];
  last_login_ip: string | null;
  updated_at: string;
}

// -------------------------------------------------------------- problems
export interface Tag {
  id: number;
  name_uz: string;
  name_en: string;
  slug: string;
  color: string;
  description: string;
  problem_count: number;
  created_at: string;
}

export interface TestCase {
  id?: number;
  problem?: string;
  order: number;
  input: string;
  expected_output: string;
  is_sample: boolean;
  explanation_uz: string;
  explanation_en: string;
  time_limit_ms: number | null;
  memory_limit_kb: number | null;
  created_at?: string;
}

export interface ProblemListItem {
  id: string;
  slug: string;
  title_uz: string;
  title_en: string;
  difficulty: Difficulty;
  points: number;
  status: PublishState;
  tags: Tag[];
  is_premium: boolean;
  is_contest_only: boolean;
  total_submissions: number;
  accepted_submissions: number;
  acceptance_rate: number;
  test_case_count: number;
  author_username: string | null;
  published_at: string | null;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProblemDetail extends Omit<ProblemListItem, "test_case_count"> {
  description_uz: string;
  description_en: string;
  constraints_uz: string;
  constraints_en: string;
  hint_uz: string;
  hint_en: string;
  editorial_uz: string;
  editorial_en: string;
  /** Tahlil umuman bormi (yopiq bo'lsa ham `true`). */
  has_editorial?: boolean;
  /** Tahlil bor, lekin masala yechilmagani uchun yopiq. */
  editorial_locked?: boolean;
  starter_code_python: string;
  starter_code_javascript: string;
  starter_code_cpp: string;
  solution_code_python: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  cover_image_url: string;
  test_cases: TestCase[];
}

export interface DailyChallenge {
  id: number;
  problem: string;
  problem_title: string;
  problem_slug: string;
  problem_difficulty: Difficulty;
  date: string;
  bonus_points: number;
  note_uz: string;
  note_en: string;
  created_at: string;
}

// ----------------------------------------------------------- submissions
export interface SubmissionTestResult {
  id: number;
  order: number;
  status: SubmissionStatus;
  runtime_ms: number | null;
  memory_kb: number | null;
  stdout: string;
  stderr: string;
  is_sample: boolean;
}

export interface AdminSubmission {
  id: string;
  username: string;
  user_id: string;
  problem: string;
  problem_title: string;
  problem_slug: string;
  problem_difficulty: Difficulty;
  contest: string | null;
  contest_title: string | null;
  language: Language;
  status: SubmissionStatus;
  runtime_ms: number | null;
  memory_kb: number | null;
  score: number;
  passed_tests: number;
  total_tests: number;
  failed_test_index: number | null;
  code_length: number;
  is_practice: boolean;
  is_first_accepted: boolean;
  ip_address: string | null;
  created_at: string;
  judged_at: string | null;
}

export interface AdminSubmissionDetail extends AdminSubmission {
  code: string;
  error_message: string;
  compile_output: string;
  judge_tokens: string[];
  test_results: SubmissionTestResult[];
}

// -------------------------------------------------------------- contests
export type ContestState = "draft" | "scheduled" | "running" | "finished" | "cancelled";

export interface ContestProblemRow {
  id?: number;
  contest?: string;
  problem: string;
  problem_title?: string;
  problem_slug?: string;
  problem_difficulty?: Difficulty;
  order: number;
  label: string;
  points: number;
}

export interface Contest {
  id: string;
  slug: string;
  title_uz: string;
  title_en: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: ContestState;
  computed_status: ContestState;
  visibility: "public" | "private";
  is_rated: boolean;
  is_virtual_allowed: boolean;
  problem_count: number;
  participant_count: number;
  created_by_username: string | null;
  ratings_applied_at: string | null;
  plagiarism_checked_at: string | null;
  created_at: string;
}

export interface ContestDetail extends Contest {
  description_uz: string;
  description_en: string;
  access_password: string;
  max_participants: number | null;
  rating_k_new: number;
  rating_k_experienced: number;
  contest_problems: ContestProblemRow[];
  updated_at: string;
}

export interface ContestParticipant {
  id: number;
  contest: string;
  user: string;
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  /** Musobaqadagi o'rin. Foydalanuvchi rank pog'onasi — `user_rank`. */
  rank: number | null;
  user_rank: RankInfo;
  score: number;
  penalty: number;
  solved_count: number;
  rating_before: number | null;
  rating_after: number | null;
  rating_change: number;
  is_virtual: boolean;
  is_disqualified: boolean;
  disqualify_reason: string;
  started_at: string | null;
  created_at: string;
}

// --------------------------------------------------------------- content

export type ModerationState = "visible" | "hidden" | "flagged" | "deleted";

export interface Discussion {
  id: string;
  author: string | null;
  author_username: string | null;
  title: string;
  body_md: string;
  status: ModerationState;
  is_pinned: boolean;
  is_locked: boolean;
  upvotes: number;
  views: number;
  comment_count: number;
  flagged_count: number;
  moderation_note: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  /** Izoh mavzuga yoki masalaga tegishli — aynan bittasi to'ldirilgan. */
  discussion: string | null;
  discussion_title: string | null;
  problem: string | null;
  problem_title: string | null;
  problem_slug: string | null;
  parent: string | null;
  author: string | null;
  author_username: string | null;
  body_md: string;
  status: ModerationState;
  upvotes: number;
  flagged_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentReport {
  id: number;
  reporter: string | null;
  reporter_username: string | null;
  discussion: string | null;
  discussion_title: string | null;
  comment: string | null;
  comment_excerpt: string | null;
  reason: string;
  note: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ------------------------------------------------------------- community
export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string;
  owner: string | null;
  owner_username: string | null;
  invite_code: string;
  is_private: boolean;
  is_verified: boolean;
  member_count: number;
  live_member_count: number;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  group: string;
  user: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: "owner" | "moderator" | "member";
  total_points: number;
  rating: number;
  user_rank: RankInfo;
  problems_solved: number;
  joined_at: string;
  /** Guruh reytingidagi o'rin (leaderboard endpointida qo'shiladi). */
  position?: number;
}

// ------------------------------------------------------------ moderation
export type PlagiarismState = "pending" | "cleared" | "confirmed";

export interface PlagiarismPair {
  id: string;
  contest: string | null;
  contest_title: string | null;
  problem: string;
  problem_title: string;
  problem_slug: string;
  submission_a: string;
  submission_b: string;
  user_a: string | null;
  user_a_username: string | null;
  user_b: string | null;
  user_b_username: string | null;
  similarity: number;
  language: string;
  same_ip: boolean;
  time_delta_seconds: number | null;
  status: PlagiarismState;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
}

export interface PlagiarismPairDetail extends PlagiarismPair {
  matched_lines: { line_a: number; line_b: number; text: string }[];
  code_a: string;
  code_b: string;
  submitted_a_at: string;
  submitted_b_at: string;
  ip_a: string | null;
  ip_b: string | null;
}

export interface AuditLogRow {
  id: number;
  actor: string | null;
  actor_username: string | null;
  actor_role: Role | null;
  action: string;
  target_type: string;
  target_id: string;
  target_repr: string;
  changes: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
}

export interface SiteSetting {
  id: number;
  key: string;
  value: unknown;
  value_type: "string" | "number" | "boolean" | "json" | "text";
  group: "general" | "judge" | "security" | "content" | "rating";
  label_uz: string;
  label_en: string;
  description: string;
  is_public: boolean;
  updated_by_username: string | null;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title_uz: string;
  title_en: string;
  body_uz: string;
  body_en: string;
  level: "info" | "success" | "warning" | "danger";
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_pinned: boolean;
  is_dismissible: boolean;
  /** Hozir saytda ko'rinib turibdimi (faol + muddat ichida) */
  is_live: boolean;
  audience: "all" | "users" | "staff" | "contest" | "group";
  target_contest: string | null;
  target_contest_title: string | null;
  target_group: string | null;
  target_group_name: string | null;
  /** Auditoriyaga nechta foydalanuvchi kiradi */
  audience_size: number;
  action_url: string;
  action_label_uz: string;
  action_label_en: string;
  send_email: boolean;
  email_sent_at: string | null;
  email_recipients: number;
  send_notification: boolean;
  send_push: boolean;
  notified_at: string | null;
  notified_recipients: number;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
}

/** `GET /api/admin/announcements/:id/audience/` — yuborishdan oldingi ko'rinish */
export interface AnnouncementAudience {
  total: number;
  email_ready: number;
  sample: string[];
}

// ------------------------------------------------------------- dashboard
export interface DashboardStats {
  users: {
    total: number; active: number; banned: number; new_today: number;
    new_this_week: number; trend_percent: number; staff: number;
  };
  problems: { total: number; published: number; draft: number; without_tests: number };
  submissions: {
    total: number; today: number; this_week: number; trend_percent: number;
    pending: number; acceptance_rate: number;
  };
  contests: { total: number; running: number; upcoming: number };
  moderation: { plagiarism_pending: number; reports_open: number; flagged_discussions: number };
  content: { discussions: number; comments: number };
  generated_at: string;
}

export interface DashboardCharts {
  timeline: { date: string; submissions: number; accepted: number; new_users: number }[];
  submissions_by_status: { status: SubmissionStatus; count: number }[];
  submissions_by_language: { language: Language; count: number }[];
  problems_by_difficulty: { difficulty: Difficulty; count: number }[];
  users_by_locale: { locale: Locale; count: number }[];
  top_problems: {
    slug: string; title_uz: string; difficulty: Difficulty;
    total_submissions: number; accepted_submissions: number;
  }[];
  top_users: {
    username: string; full_name: string; avatar_url: string;
    total_points: number; rating: number; problems_solved: number; rank: RankInfo;
  }[];
}

export interface SystemHealth {
  judge0: {
    url: string;
    /** Umuman kod bajarish mumkinmi (Judge0 yoki lokal runner). */
    available: boolean;
    backend: "judge0" | "local" | "none";
    /** Aynan Judge0 javob berayaptimi. */
    judge0_available: boolean;
    languages: Partial<Record<Language, boolean>>;
  };
  queue: { pending: number; judging: number; stuck: number };
  daily_challenge_today: boolean;
  warnings: { level: "info" | "warning" | "danger"; message: string }[];
  checked_at: string;
}

export interface SearchResult {
  type: "problem" | "user" | "contest";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

// ------------------------------------------------------------ media/upload
export interface MediaFile {
  id: string;
  url: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  kind: "avatar" | "cover" | "logo" | "attachment";
  width: number | null;
  height: number | null;
  uploaded_by_username: string | null;
  created_at: string;
}

// ----------------------------------------------------------------- savatcha
export type TrashKind = "problem" | "contest" | "discussion" | "comment" | "group";

export interface TrashRow {
  kind: TrashKind;
  kind_label: string;
  id: string;
  label: string;
  deleted_at: string;
  deleted_by: string | null;
  expires_at: string;
  days_left: number;
}

export interface TrashResponse {
  results: TrashRow[];
  counts: Record<TrashKind, number>;
  total: number;
  retention_days: number;
}

// --------------------------------------------------------------- sessiyalar
export interface AdminSession {
  id: string;
  user: string;
  username: string;
  ip_address: string | null;
  browser: string;
  device: string;
  location: string;
  is_active: boolean;
  is_current: boolean;
  revoked_at: string | null;
  last_seen_at: string;
  created_at: string;
}

// -------------------------------------------------------------------- 2FA
export interface TotpSetup {
  secret: string;
  otpauth_url: string;
  digits: number;
  period: number;
}

// -------------------------------------------------------------- ruxsatlar
export interface PermissionEntry {
  code: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionEntry[];
}

export interface PermissionCatalog {
  groups: PermissionGroup[];
  all: string[];
  roles: Record<Role, string[]>;
}

// ----------------------------------------------------------------- backup
export interface BackupRecord {
  id: string;
  filename: string;
  size_bytes: number;
  size_mb: number;
  kind: "full" | "data";
  note: string;
  created_by_username: string | null;
  exists: boolean;
  created_at: string;
}

export interface BackupSummary {
  count: number;
  total_size_mb: number;
  keep_limit: number;
  backup_dir: string;
  disk_free_gb: number;
  restore_command: string;
}

// ----------------------------------------------------------- judge tillari
export interface JudgeLanguage {
  id: number;
  key: string;
  label: string;
  judge0_id: number;
  version: string;
  monaco_id: string;
  file_extension: string;
  starter_template: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------- realtime
export interface LiveMetrics {
  queue: { pending: number; judging: number };
  submissions_today: number;
  plagiarism_pending: number;
  reports_open: number;
  at: string;
}

// ------------------------------------------------------------------ import
export interface ImportResult {
  detail?: string;
  dry_run?: boolean;
  valid?: number;
  invalid?: number;
  preview?: string[];
  created?: { id: string; title: string; slug: string }[];
  errors?: { index: number; title?: string; error: string }[];
}

/* ==========================================================================
   PUBLIC (foydalanuvchi qismi) — `/api/...` endpointlari
   ========================================================================== */

/** Kirgan foydalanuvchi uchun har bir masalaga qo'shiladigan holat. */
export interface ProblemUserState {
  is_solved: boolean;
  is_attempted: boolean;
  is_bookmarked: boolean;
}

export interface PublicProblemListItem extends ProblemUserState {
  id: string;
  slug: string;
  title_uz: string;
  title_en: string;
  difficulty: Difficulty;
  points: number;
  tags: Tag[];
  is_premium: boolean;
  acceptance_rate: number;
  total_submissions: number;
}

export interface PublicSampleTest {
  input: string;
  expected_output: string;
  explanation_uz: string;
  explanation_en: string;
}

export interface PublicProblemDetail extends Omit<PublicProblemListItem, "is_premium"> {
  description_uz: string;
  description_en: string;
  constraints_uz: string;
  constraints_en: string;
  hint_uz: string;
  hint_en: string;
  /** Faqat masalani yechganlarga to'ldirilgan holda keladi. */
  editorial_uz: string;
  editorial_en: string;
  /** Tahlil umuman bormi (yopiq bo'lsa ham `true`). */
  has_editorial: boolean;
  /** Tahlil bor, lekin masala yechilmagani uchun matn berilmadi. */
  editorial_locked: boolean;
  starter_code_python: string;
  starter_code_javascript: string;
  starter_code_cpp: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  accepted_submissions: number;
  sample_test_cases: PublicSampleTest[];
}

export interface DailyCalendarDay {
  date: string;
  problem_slug: string;
  problem_title: string;
  difficulty: Difficulty;
  bonus_points: number;
  is_solved: boolean;
  is_today: boolean;
}

export interface PublicDailyChallenge {
  id?: string;
  problem?: string;
  problem_title?: string;
  problem_slug?: string;
  problem_difficulty?: Difficulty;
  date?: string;
  bonus_points?: number;
  note_uz?: string;
  note_en?: string;
  problem_detail?: PublicProblemDetail | null;
  is_solved?: boolean;
  detail?: string;
  calendar: DailyCalendarDay[];
  streak: {
    current: number;
    longest: number;
    last_solved_date: string | null;
  };
}

export interface PublicSubmissionTestResult {
  id: string;
  order: number;
  status: SubmissionStatus;
  runtime_ms: number | null;
  memory_kb: number | null;
  is_sample: boolean;
}

/** `POST /api/submissions/` javobi va `GET /api/submissions/:id/` polling natijasi. */
export interface PublicSubmission {
  id: string;
  status: SubmissionStatus;
  runtime_ms: number | null;
  memory_kb: number | null;
  passed_tests: number;
  total_tests: number;
  failed_test_index: number | null;
  error_message: string;
  compile_output: string;
  score: number;
  created_at: string;
  judged_at: string | null;
  sample_results?: PublicSubmissionTestResult[];
}

export interface LeaderboardRow {
  /** Ro'yxatdagi global o'rin (1, 2, 3...). Rank pog'onasi — `rank`. */
  position: number;
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  rating: number;
  rank: RankInfo;
  total_points: number;
  problems_solved: number;
}

export interface MyRank extends LeaderboardRow {
  total: number;
}

export interface ProfileSolvedProblem {
  slug: string;
  title_uz: string;
  title_en: string;
  difficulty: Difficulty;
  points: number;
  solved_at: string;
}

export interface ActivityDay {
  date: string;
  count: number;
  accepted: number;
}

export interface PublicProfile {
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  country: string;
  github_url: string;
  website_url: string;
  region: string;
  district: string;
  education_place: string;
  rating: number;
  max_rating: number;
  rank: RankInfo;
  max_rank: RankInfo;
  global_rank: number;
  total_points: number;
  problems_solved: number;
  contests_participated: number;
  current_streak: number;
  longest_streak: number;
  submissions: number;
  accepted_submissions: number;
  solved_by_difficulty: Partial<Record<Difficulty, number>>;
  totals_by_difficulty: Partial<Record<Difficulty, number>>;
  recent_solved: ProfileSolvedProblem[];
  activity: ActivityDay[];
  languages: { language: Language; count: number }[];
  joined_at: string;
  is_me: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

/** Obuna ro'yxatlaridagi qisqa foydalanuvchi kartasi. */
export interface UserCard {
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  rating: number;
  rank: RankInfo;
  total_points: number;
  problems_solved: number;
  followers_count: number;
  is_following: boolean;
  is_me: boolean;
}

export interface FollowState {
  username: string;
  is_following: boolean;
  followers_count: number;
  following_count: number;
}

/** Judge holati — muharrir qaysi tillarni taklif qilishini hal qiladi. */
export interface JudgeStatus {
  available: boolean;
  backend: "judge0" | "local" | "none";
  languages: Partial<Record<Language, boolean>>;
  judge0_url?: string;
  judge0_enabled?: boolean;
  judge0_available?: boolean;
  local_enabled?: boolean;
  local_runner_available?: boolean;
  local_fallback_allowed?: boolean;
  local_languages?: Partial<Record<Language, boolean>>;
}

export interface MyProgress {
  totals: Partial<Record<Difficulty, number>>;
  solved: Partial<Record<Difficulty, number>>;
  total_problems: number;
  total_solved: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  rating: number;
}

/** Public tomonda faqat hisoblangan holat ishlatiladi (draft/cancelled ko'rinmaydi). */
export type PublicContestState = "scheduled" | "running" | "finished";

export interface PublicContest {
  id: string;
  slug: string;
  title_uz: string;
  title_en: string;
  description_uz: string;
  description_en: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  computed_status: PublicContestState | string;
  is_rated: boolean;
  is_virtual_allowed: boolean;
  problem_count: number;
  participant_count: number;
}

export interface ContestParticipantRow {
  id: string;
  contest: string;
  user: string;
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  /** Musobaqadagi o'rin. Foydalanuvchi rank pog'onasi — `user_rank`. */
  rank: number | null;
  user_rank: RankInfo;
  score: number;
  penalty: number;
  solved_count: number;
  rating_before: number | null;
  rating_after: number | null;
  rating_change: number;
  is_virtual: boolean;
  is_disqualified: boolean;
  disqualify_reason: string;
  started_at: string | null;
  created_at: string;
}

export interface PublicContestDetail extends PublicContest {
  max_participants: number | null;
  ratings_applied_at: string | null;
  my_participation: ContestParticipantRow | null;
  can_see_problems: boolean;
  server_time: string;
  requires_password: boolean;
}

/** `GET /api/push/config/` — brauzer push xabarlari sozlanganmi. */
export interface PushConfig {
  /** Serverda VAPID kalitlari bormi; `false` bo'lsa obuna tugmasi ko'rsatilmaydi */
  enabled: boolean;
  public_key: string;
  /** Shu hisobda nechta qurilma obuna bo'lgan */
  devices: number;
}

/** Obuna bo'lgan bitta qurilma. */
export interface PushDevice {
  id: string;
  browser: string;
  device: string;
  last_sent_at: string | null;
  created_at: string;
}

/** Brauzerning `PushSubscription.toJSON()` natijasi. */
export interface PushSubscribePayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

/**
 * Natijalar jadvali. Bir xil shakl ikki manbadan keladi:
 * `GET /contests/<slug>/leaderboard/` va jonli SSE oqimi
 * (`GET /contests/<slug>/stream/`, `event: standings`).
 * Oqim faqat birinchi 50 o'rinni yuboradi, oddiy endpoint — 300 tagacha.
 */
export interface ContestStandings {
  results: ContestParticipantRow[];
  me: ContestParticipantRow | null;
  server_time: string;
  /** Faqat oqimda: musobaqaning hisoblangan holati va tugash vaqti */
  state?: string;
  end_time?: string;
  participant_count?: number;
}

/** Contest sahifasidagi masala qatori (admin `ContestProblemRow` dan farqli). */
export interface PublicContestProblem {
  id: string;
  label: string;
  order: number;
  points: number;
  problem_slug: string;
  title_uz: string;
  title_en: string;
  difficulty: Difficulty;
  is_solved: boolean;
  is_attempted: boolean;
}

export interface MyContestRow {
  contest_slug: string;
  title_uz: string;
  title_en: string;
  start_time: string;
  computed_status: PublicContestState | string;
  rank: number | null;
  score: number;
  solved_count: number;
  rating_change: number;
  is_virtual: boolean;
  is_disqualified: boolean;
}

export interface PublicBookmark {
  id: string;
  problem: string;
  problem_title: string;
  problem_slug: string;
  note: string;
  created_at: string;
}

/* --------------------------------------------------------------- bog'lanish */

export type ContactTopic = "general" | "bug" | "problem" | "partnership" | "other";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  topic_display: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_resolved: boolean;
  answer: string;
  answered_at: string | null;
  answered_by_username: string | null;
  user_username: string | null;
  ip_address: string | null;
  created_at: string;
}

/* ------------------------------------------------------ musobaqa (contest) */

/** Musobaqa ichidagi masala — tahlil va muhokamasiz. */
export interface ContestProblemDetail {
  contest_slug: string;
  contest_title_uz: string;
  contest_title_en: string;
  contest_end_time: string;
  contest_state: ContestState;
  label: string;
  points: number;
  slug: string;
  title_uz: string;
  title_en: string;
  difficulty: Difficulty;
  description_uz: string;
  description_en: string;
  constraints_uz: string;
  constraints_en: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  starter_code_python: string;
  starter_code_javascript: string;
  starter_code_cpp: string;
  samples: {
    input: string;
    expected_output: string;
    explanation_uz: string;
    explanation_en: string;
  }[];
  is_solved: boolean;
  attempts: number;
  my_submissions: {
    id: string;
    language: Language;
    status: SubmissionStatus;
    passed_tests: number;
    total_tests: number;
    runtime_ms: number | null;
    created_at: string;
  }[];
  server_time: string;
}

/** Jonli nazoratdagi katak ortidagi yechimlar (kod bilan). */
export interface ContestMonitorSubmissions {
  username: string;
  results: {
    id: string;
    language: Language;
    status: SubmissionStatus;
    code: string;
    passed_tests: number;
    total_tests: number;
    failed_test_index: number | null;
    runtime_ms: number | null;
    memory_kb: number | null;
    error_message: string;
    compile_output: string;
    ip_address: string | null;
    created_at: string;
  }[];
}

/** Admin jonli nazorat jadvali. */
export interface ContestMonitorCell {
  attempts: number;
  solved: boolean;
  last_at: string | null;
  first_solved_at: string | null;
}

export interface ContestMonitor {
  contest: Contest;
  state: ContestState;
  server_time: string;
  problems: {
    id: string;
    label: string;
    title_uz: string;
    slug: string;
    points: number;
    solved_count: number;
  }[];
  rows: {
    participant_id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    rank: number | null;
    score: number;
    penalty: number;
    solved_count: number;
    rating_change: number;
    rating_before: number | null;
    rating_after: number | null;
    is_disqualified: boolean;
    disqualify_reason: string;
    is_virtual: boolean;
    started_at: string | null;
    cells: ContestMonitorCell[];
  }[];
  recent_submissions: {
    id: string;
    username: string;
    problem_title: string;
    problem_slug: string;
    language: Language;
    status: SubmissionStatus;
    created_at: string;
  }[];
}

/* ---------------------------------------------------------- yechimlar tarixi */

export interface PublicSubmissionRow {
  id: string;
  problem_slug: string;
  problem_title_uz: string;
  problem_title_en: string;
  problem_difficulty: Difficulty;
  contest_slug: string | null;
  contest_title: string | null;
  language: Language;
  status: SubmissionStatus;
  runtime_ms: number | null;
  memory_kb: number | null;
  score: number;
  passed_tests: number;
  total_tests: number;
  failed_test_index: number | null;
  code_length: number;
  is_practice: boolean;
  is_first_accepted: boolean;
  created_at: string;
  judged_at: string | null;
}

export interface PublicSubmissionFull extends PublicSubmissionRow {
  code: string;
  error_message: string;
  compile_output: string;
  sample_results: PublicSubmissionTestResult[];
}

/** `POST /api/submissions/run/` — namuna testlarda sinov natijasi. */
export interface RunTestResult {
  order: number;
  status: SubmissionStatus | "EXECUTED";
  input: string;
  expected_output: string | null;
  stdout: string;
  stderr: string;
  compile_output: string;
  runtime_ms: number | null;
  memory_kb: number | null;
  is_custom: boolean;
}

export interface RunResponse {
  results: RunTestResult[];
  passed: number;
  total: number;
  all_passed: boolean;
}

/* --------------------------------------------------------- muhokama / izoh */

export interface PublicDiscussion {
  id: string;
  author_username: string | null;
  author_avatar: string | null;
  author_rank: RankInfo | null;
  title: string;
  body_md: string;
  is_pinned: boolean;
  is_locked: boolean;
  upvotes: number;
  views: number;
  comment_count: number;
  my_vote: number;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicComment {
  id: string;
  /** Izoh mavzuga yoki masalaga tegishli — aynan bittasi to'ldirilgan. */
  discussion: string | null;
  problem: string | null;
  parent: string | null;
  author_username: string | null;
  author_avatar: string | null;
  author_rank: RankInfo | null;
  body_md: string;
  upvotes: number;
  my_vote: number;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
}

export type ReportReason = "spam" | "abuse" | "solution_leak" | "offtopic" | "other";

/* ---------------------------------------------------------- bildirishnomalar */

export type NotificationKind =
  | "comment_reply"
  | "discussion_comment"
  | "submission_result"
  | "contest_soon"
  | "contest_result"
  | "achievement"
  | "group_invite"
  | "moderation"
  | "account"
  | "announcement";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  level: "info" | "success" | "warning" | "danger";
  title: string;
  body: string;
  url: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  actor_username: string | null;
  actor_avatar: string | null;
  actor_rank: RankInfo | null;
  created_at: string;
}

/* ------------------------------------------------------------- xavfsizlik */

export interface UserSession {
  id: string;
  ip_address: string | null;
  browser: string;
  device: string;
  location: string;
  is_current: boolean;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface TotpSetup {
  secret: string;
  otpauth_url: string;
  digits: number;
  period: number;
}

export interface AuthConfig {
  google_enabled: boolean;
  google_client_id: string;
  email_verification_required: boolean;
}

/* ---------------------------------------------------------------- jamiyat */

export interface PublicGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string;
  owner: string | null;
  owner_username: string | null;
  invite_code: string;
  is_private: boolean;
  is_verified: boolean;
  member_count: number;
  live_member_count: number;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRow {
  id: string;
  group: string;
  user: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: "owner" | "moderator" | "member";
  total_points: number;
  rating: number;
  user_rank: RankInfo;
  problems_solved: number;
  joined_at: string;
  /** Guruh reytingidagi o'rin (leaderboard endpointida qo'shiladi). */
  position?: number;
}

/* ------------------------------------------------------------- sayt meta */

export interface SiteStats {
  problems: number;
  problems_by_difficulty: Partial<Record<Difficulty, number>>;
  users: number;
  submissions: number;
  accepted_submissions: number;
  acceptance_rate: number;
  contests: number;
  running_contests: number;
  generated_at: string;
}

export interface SiteAnnouncement {
  id: string;
  title_uz: string;
  title_en: string;
  body_uz: string;
  body_en: string;
  level: "info" | "success" | "warning" | "danger";
  ends_at: string | null;
  /** Bannerdagi amal tugmasi — bo'sh bo'lsa tugma chizilmaydi */
  action_url: string;
  action_label_uz: string;
  action_label_en: string;
  /** Texnik ishlar kabi e'lonlarni yopib bo'lmaydi */
  is_dismissible: boolean;
  is_pinned: boolean;
}

export interface SiteSearchItem {
  type: "problem" | "contest" | "user";
  id: string;
  title: string;
  title_en: string;
  subtitle: string;
  url: string;
  difficulty?: Difficulty;
  avatar_url?: string;
  rank?: RankInfo;
}

export interface SiteSearchResponse {
  query: string;
  results: SiteSearchItem[];
  counts: Partial<Record<SiteSearchItem["type"], number>>;
}

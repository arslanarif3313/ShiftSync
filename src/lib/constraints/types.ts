export type ViolationCode =
  | "DOUBLE_BOOK"
  | "MIN_REST"
  | "MISSING_SKILL"
  | "NOT_CERTIFIED"
  | "UNAVAILABLE"
  | "DAILY_HOURS_HARD"
  | "SEVENTH_DAY_NEEDS_OVERRIDE"
  | "CUTOFF_PASSED"
  | "HEADCOUNT_FULL"
  | "VERSION_CONFLICT";

export type WarningCode =
  | "DAILY_HOURS_SOFT"
  | "WEEKLY_HOURS_APPROACHING"
  | "SIXTH_CONSECUTIVE_DAY"
  | "OVERTIME_COST";

export type Violation = {
  code: ViolationCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type Warning = {
  code: WarningCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type Suggestion = {
  userId: string;
  name: string;
  reason: string;
};

export type ConstraintResult =
  | { ok: true; warnings: Warning[]; suggestions?: Suggestion[] }
  | {
      ok: false;
      violations: Violation[];
      warnings: Warning[];
      suggestions: Suggestion[];
    };

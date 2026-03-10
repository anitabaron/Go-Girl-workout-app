"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, History, Loader2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

type ChatAction = {
  id: string;
  type:
    | "APPLY_LIGHT_VERSION"
    | "ADD_DELOAD_WEEK"
    | "ADD_RECOVERY_DAY"
    | "GENERATE_PROGRAM";
  label: string;
  description: string;
  requires_confirmation: boolean;
  payload: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
};

type ConversationHistoryItem = {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
};

type AIUsage = {
  limit: number;
  used: number;
  remaining: number;
};

type ChatAttachment = {
  type: "plan" | "program" | "date_range" | "session" | "metric_pack";
  value: Record<string, unknown>;
  label: string;
};

type AIContextEventDetail = {
  attachment?: {
    type: ChatAttachment["type"];
    value: Record<string, unknown>;
    label?: string;
  };
  suggestedMessage?: string;
};

type WeekdayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type ProgramMode = "existing_only" | "mix_existing_new" | "new_only";

// Program generation defaults (intentionally hardcoded for product consistency).
// You can change these values directly in code.
const DEFAULT_PROGRAM_MODE: ProgramMode = "mix_existing_new";
const DEFAULT_MIX_RATIO: 50 | 60 | 70 = 60;

const WEEKDAY_OPTIONS: ReadonlyArray<{ code: WeekdayCode; labelKey: string }> = [
  { code: "mon", labelKey: "weekdayMon" },
  { code: "tue", labelKey: "weekdayTue" },
  { code: "wed", labelKey: "weekdayWed" },
  { code: "thu", labelKey: "weekdayThu" },
  { code: "fri", labelKey: "weekdayFri" },
  { code: "sat", labelKey: "weekdaySat" },
  { code: "sun", labelKey: "weekdaySun" },
] as const;

function formatWeekdayLabels(
  weekdays: WeekdayCode[],
  t: (key: string) => string,
): string {
  const labels = WEEKDAY_OPTIONS.filter((item) => weekdays.includes(item.code)).map(
    (item) => t(item.labelKey),
  );
  return labels.join(", ");
}

function isActionConfirmationMessage(message: string): boolean {
  const text = message.toLowerCase();
  return (
    /\b(ok|okej|zgoda|jasne|super|dzialaj|działaj|wprowadz|wprowadź|zastosuj|zrob|zrób)\b/.test(
      text,
    ) ||
    text.includes("mozesz") ||
    text.includes("możesz")
  );
}

function pickSuggestedActionForConfirmation(
  message: string,
  actions: ChatAction[],
): ChatAction | null {
  const nonGenerate = actions.filter((action) => action.type !== "GENERATE_PROGRAM");
  if (nonGenerate.length === 0) return null;

  const text = message.toLowerCase();
  if (text.includes("deload")) {
    return nonGenerate.find((action) => action.type === "ADD_DELOAD_WEEK") ?? nonGenerate[0]!;
  }
  if (text.includes("regener")) {
    return (
      nonGenerate.find((action) => action.type === "ADD_RECOVERY_DAY") ?? nonGenerate[0]!
    );
  }
  if (
    text.includes("lze") ||
    text.includes("lżej") ||
    text.includes("zmec") ||
    text.includes("zmęc")
  ) {
    return (
      nonGenerate.find((action) => action.type === "APPLY_LIGHT_VERSION") ??
      nonGenerate[0]!
    );
  }

  return nonGenerate[0]!;
}

type AssistantPanelProps = {
  messages: ChatMessage[];
  conversationHistory: ConversationHistoryItem[];
  isHistoryOpen: boolean;
  usage: AIUsage | null;
  input: string;
  attachments: ChatAttachment[];
  isSending: boolean;
  isGeneratingProgram: boolean;
  deletingConversationId: string | null;
  onInputChange: (value: string) => void;
  onRemoveAttachment: (index: number) => void;
  onSend: () => Promise<void>;
  onToggleHistory: () => void;
  onSelectHistory: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onRequestDeleteConversation: (conversation: ConversationHistoryItem) => void;
  onQuickAction: (prompt: string) => Promise<void>;
  selectedDurationMonths: 1 | 2 | 3;
  selectedWeekdays: WeekdayCode[];
  onSelectDurationMonths: (value: 1 | 2 | 3) => void;
  onToggleWeekday: (value: WeekdayCode) => void;
  onGenerateProgramFromPreset: () => Promise<void>;
  onResetConversation: () => void;
  onActionClick: (action: ChatAction) => Promise<void>;
  onClose?: () => void;
  mobile?: boolean;
};

function AIAssistantPanel({
  messages,
  conversationHistory,
  isHistoryOpen,
  usage,
  input,
  attachments,
  isSending,
  isGeneratingProgram,
  deletingConversationId,
  onInputChange,
  onRemoveAttachment,
  onSend,
  onToggleHistory,
  onSelectHistory,
  onDeleteConversation,
  onRequestDeleteConversation,
  onQuickAction,
  selectedDurationMonths,
  selectedWeekdays,
  onSelectDurationMonths,
  onToggleWeekday,
  onGenerateProgramFromPreset,
  onResetConversation,
  onActionClick,
  onClose,
  mobile = false,
}: Readonly<AssistantPanelProps>) {
  const t = useTranslations("aiAssistant");

  const quickActions = useMemo(
    () => [
      {
        id: "plan-today",
        label: t("quickActionPlanToday"),
        prompt: t("quickActionPlanToday"),
      },
      {
        id: "program-kickoff",
        label: t("quickActionPlanWeek"),
        prompt: t("quickActionProgramKickoffPrompt"),
      },
      {
        id: "adjust-recovery",
        label: t("quickActionAdjustRecovery"),
        prompt: t("quickActionAdjustRecovery"),
      },
      {
        id: "review-goal",
        label: t("quickActionReviewGoal"),
        prompt: t("quickActionReviewGoal"),
      },
    ],
    [t],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">{t("title")}</h2>
          {usage ? (
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
              {t("remainingUsage").replace("{count}", String(usage.remaining))}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isHistoryOpen ? "outline" : "ghost"}
            size="icon-sm"
            aria-label={t("history")}
            onClick={onToggleHistory}
            className={isHistoryOpen ? "ai-history-active" : undefined}
          >
            <History className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("newChat")}
            onClick={onResetConversation}
          >
            <Plus className="size-4" />
          </Button>
          {mobile && onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("close")}
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {!isHistoryOpen ? (
          <section className="space-y-1">
            <p className="text-2xl font-semibold">{t("greeting")}</p>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </section>
        ) : null}

        {isHistoryOpen ? (
          <section className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("history")}
            </p>
            {conversationHistory.length > 0 ? (
              <div className="space-y-2">
                {conversationHistory.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:bg-accent"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      onClick={() => onSelectHistory(conversation.id)}
                    >
                      <p className="truncate text-base font-semibold">{conversation.title}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {conversation.preview}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        {new Date(conversation.updated_at).toLocaleString("pl-PL")}
                      </p>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mt-0.5 shrink-0"
                      aria-label={`Usuń konwersację ${conversation.title}`}
                      disabled={deletingConversationId === conversation.id}
                      onClick={() => onRequestDeleteConversation(conversation)}
                    >
                      {deletingConversationId === conversation.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <section className="space-y-2 rounded-xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
                <p>{t("emptyStateTitle")}</p>
                <p>{t("emptyStateDescription")}</p>
              </section>
            )}
          </section>
        ) : messages.length > 0 ? (
          <section className="space-y-2">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={[
                    "max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto border border-border bg-card text-foreground",
                  ].join(" ")}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && (message.actions?.length ?? 0) > 0 ? (
                  <div className="mr-auto grid max-w-[90%] grid-cols-1 gap-2">
                    {message.actions?.map((action) => {
                      const isGenerateProgramAction = action.type === "GENERATE_PROGRAM";
                      if (isGenerateProgramAction) {
                        return (
                          <section
                            key={`${message.id}-${action.id}`}
                            className="space-y-2 rounded-xl border border-border bg-card p-2.5"
                          >
                            <div className="space-y-2">
                              <div className="flex items-end gap-2">
                                <label className="space-y-1 text-[11px] text-muted-foreground">
                                  <span className="block">{t("programMonthsLabel")}</span>
                                  <select
                                    value={selectedDurationMonths}
                                    onChange={(event) =>
                                      onSelectDurationMonths(
                                        Number(event.target.value) as 1 | 2 | 3,
                                      )
                                    }
                                    disabled={
                                      isSending ||
                                      isGeneratingProgram ||
                                      (usage?.remaining ?? 1) <= 0
                                    }
                                    className="h-7 w-14 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                  </select>
                                </label>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <span className="block text-[11px] text-muted-foreground">
                                    {t("programDaysLabel")}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1">
                                    {WEEKDAY_OPTIONS.map((weekday) => {
                                      const checked = selectedWeekdays.includes(weekday.code);
                                      const weekdayLabel = t(weekday.labelKey);
                                      return (
                                        <label
                                          key={weekday.code}
                                          className="inline-flex cursor-pointer items-center gap-1"
                                          title={weekdayLabel}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => onToggleWeekday(weekday.code)}
                                            disabled={
                                              isSending ||
                                              isGeneratingProgram ||
                                              (usage?.remaining ?? 1) <= 0
                                            }
                                            className="sr-only"
                                          />
                                          <span
                                            className={[
                                              "inline-flex h-7 min-w-8 items-center justify-center rounded-md border px-1 text-[11px]",
                                              checked
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-input bg-background text-foreground",
                                            ].join(" ")}
                                          >
                                            {weekdayLabel}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={() => void onGenerateProgramFromPreset()}
                                size="sm"
                                className="h-8 w-full px-3 text-xs"
                                disabled={
                                  isSending ||
                                  isGeneratingProgram ||
                                  (usage?.remaining ?? 1) <= 0 ||
                                  selectedWeekdays.length === 0
                                }
                              >
                                {isGeneratingProgram ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="size-4 animate-spin" />
                                    {t("programGeneratingButton")}
                                  </span>
                                ) : (
                                  t("programGenerateButton")
                                )}
                              </Button>
                            </div>
                          </section>
                        );
                      }
                      return (
                        <button
                          key={`${message.id}-${action.id}`}
                          type="button"
                          className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                          onClick={() => void onActionClick(action)}
                          title={action.description}
                        >
                          <p className="font-semibold">{action.label}</p>
                          <p className="mt-0.5 text-muted-foreground">{action.description}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
            {isSending ? (
              <div className="mr-auto px-1 text-sm text-muted-foreground">
                {t("thinking")}
              </div>
            ) : null}
          </section>
        ) : null}

        {!isHistoryOpen ? (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("quickActions")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                  onClick={() => void onQuickAction(action.prompt)}
                  disabled={isSending || (usage?.remaining ?? 1) <= 0}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        
      </div>

      <div className="border-t border-border p-4">
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <span
                key={`${attachment.type}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
              >
                {attachment.type}: {attachment.label}
                <button
                  type="button"
                  className="rounded-full p-0.5 transition-colors hover:bg-accent"
                  onClick={() => onRemoveAttachment(index)}
                  aria-label={`Usuń kontekst: ${attachment.label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Textarea
            placeholder={t("inputPlaceholder")}
            aria-label={t("inputAria")}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            rows={2}
            className="max-h-40 min-h-10 resize-y"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            disabled={isSending || (usage?.remaining ?? 1) <= 0}
          />
          <Button
            type="button"
            size="icon-sm"
            aria-label={t("sendAria")}
            onClick={() => void onSend()}
            disabled={
              isSending || input.trim().length === 0 || (usage?.remaining ?? 1) <= 0
            }
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AIAssistantShell() {
  const t = useTranslations("aiAssistant");
  const pathname = usePathname();
  const router = useRouter();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistoryItem[]
  >([]);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [selectedDurationMonths, setSelectedDurationMonths] = useState<1 | 2 | 3>(2);
  const [selectedWeekdays, setSelectedWeekdays] = useState<WeekdayCode[]>([
    "thu",
    "sat",
  ]);
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingConversationDelete, setPendingConversationDelete] =
    useState<ConversationHistoryItem | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(
    null,
  );
  const [lastProgramContextId, setLastProgramContextId] = useState<string | null>(
    null,
  );
  const isWorkoutSessionActivePage = useMemo(
    () => /^\/workout-sessions\/[^/]+\/active\/?$/.test(pathname ?? ""),
    [pathname],
  );

  const fetchConversationHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/trainer/conversations", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversations?: ConversationHistoryItem[];
      };
      setConversationHistory(data.conversations ?? []);
    } catch (error) {
      console.error("[AIAssistantShell] Failed to fetch conversation history", error);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/trainer/usage", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { usage?: AIUsage };
      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (error) {
      console.error("[AIAssistantShell] Failed to fetch AI usage", error);
    }
  }, []);

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      if (deletingConversationId) return;
      setDeletingConversationId(conversationId);
      try {
        const response = await fetch(`/api/ai/trainer/conversations/${conversationId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(errorData.message ?? t("responseError"));
        }

        setConversationHistory((prev) =>
          prev.filter((conversation) => conversation.id !== conversationId),
        );

        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
          setMessages([]);
          setIsHistoryOpen(false);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("responseError"));
      } finally {
        setDeletingConversationId(null);
      }
    },
    [activeConversationId, deletingConversationId, t],
  );

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed || isSending) return;
      if ((usage?.remaining ?? 1) <= 0) {
        const dailyLimit = usage?.limit ?? 20;
        toast.error(
          `Wykorzystałaś dzienny limit Trenera AI (${dailyLimit}/${dailyLimit}).`,
        );
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const latestAssistantWithActions = [...messages]
        .reverse()
        .find(
          (message) =>
            message.role === "assistant" && (message.actions?.length ?? 0) > 0,
        );
      const confirmedAction =
        latestAssistantWithActions && isActionConfirmationMessage(trimmed)
          ? pickSuggestedActionForConfirmation(
              trimmed,
              latestAssistantWithActions.actions ?? [],
            )
          : null;
      const fallbackConfirmedAction: ChatAction | null =
        !confirmedAction &&
        isActionConfirmationMessage(trimmed) &&
        lastProgramContextId
          ? {
              id: `fallback-light-${Date.now()}`,
              type: "APPLY_LIGHT_VERSION",
              label: "Zastosuj lżejszą wersję planu",
              description: "Fallback: wdrożenie lżejszej wersji na podpiętym programie.",
              requires_confirmation: false,
              payload: {
                reduction_percent: 20,
                based_on: "confirmation_fallback",
                target_program_id: lastProgramContextId,
                apply_scope: "whole_program",
              },
            }
          : null;
      const actionToExecute = confirmedAction ?? fallbackConfirmedAction;

      if (actionToExecute) {
        setIsSending(true);
        try {
          const response = await fetch("/api/ai/trainer/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: actionToExecute.type,
              payload: actionToExecute.payload ?? {},
              conversation_id: activeConversationId,
            }),
          });

          if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as {
              message?: string;
              details?: string;
            };
            const baseMessage = errorData.message ?? t("responseError");
            throw new Error(
              errorData.details
                ? `${baseMessage}\nSzczegóły: ${errorData.details}`
                : baseMessage,
            );
          }

          const data = (await response.json()) as { message?: string };
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-action-${Date.now()}`,
              role: "assistant",
              content:
                data.message ??
                "Wdrożyłam zmianę w programie. Sprawdź szczegóły programu i kalendarz.",
              actions: [],
            },
          ]);
          router.refresh();
          return;
        } catch (error) {
          console.error("[AIAssistantShell] Failed to execute confirmed action", error);
          toast.error(error instanceof Error ? error.message : t("responseError"));
          return;
        } finally {
          setIsSending(false);
        }
      }

      const requestAttachments = attachments.map(({ type, value }) => ({ type, value }));
      setAttachments([]);
      setIsSending(true);

      try {
        const response = await fetch("/api/ai/trainer/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            conversation_id: activeConversationId,
            attachments: requestAttachments,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string;
            details?: string;
          };
          const baseMessage = errorData.message ?? t("responseError");
          throw new Error(
            errorData.details ? `${baseMessage}\nSzczegóły: ${errorData.details}` : baseMessage,
          );
        }

        const data = (await response.json()) as {
          conversation_id?: string;
          usage?: AIUsage;
          reply?: string;
          actions?: ChatAction[];
        };
        if (data.conversation_id) {
          setActiveConversationId(data.conversation_id);
        }
        if (data.usage) {
          setUsage(data.usage);
        } else {
          void fetchUsage();
        }
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? t("responseError"),
          actions: data.actions ?? [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        void fetchConversationHistory();
      } catch (error) {
        console.error("[AIAssistantShell] Failed to send chat message", error);
        toast.error(error instanceof Error ? error.message : t("responseError"));
      } finally {
        setIsSending(false);
      }
    },
    [
      activeConversationId,
      attachments,
      fetchConversationHistory,
      fetchUsage,
      isSending,
      lastProgramContextId,
      messages,
      router,
      t,
      usage?.remaining,
      usage?.limit,
    ],
  );

  useEffect(() => {
    void fetchConversationHistory();
    void fetchUsage();
  }, [fetchConversationHistory, fetchUsage]);

  useEffect(() => {
    const handleAddContext = (event: Event) => {
      const detail = (event as CustomEvent<AIContextEventDetail>).detail;
      if (!detail) return;

      if (detail.attachment) {
        if (detail.attachment.type === "program") {
          const rawProgramId =
            typeof detail.attachment.value.program_id === "string"
              ? detail.attachment.value.program_id
              : typeof detail.attachment.value.id === "string"
                ? detail.attachment.value.id
                : null;
          if (rawProgramId) {
            setLastProgramContextId(rawProgramId);
          }
        }

        const nextAttachment: ChatAttachment = {
          type: detail.attachment.type,
          value: detail.attachment.value,
          label:
            detail.attachment.label ??
            String(
              detail.attachment.value.program_name ??
                detail.attachment.value.plan_name ??
                detail.attachment.value.program_id ??
                detail.attachment.value.plan_id ??
                "Kontekst",
            ),
        };
        const signature = JSON.stringify({
          type: nextAttachment.type,
          value: nextAttachment.value,
        });
        setAttachments((prev) => {
          if (
            prev.some(
              (attachment) =>
                JSON.stringify({
                  type: attachment.type,
                  value: attachment.value,
                }) === signature,
            )
          ) {
            return prev;
          }
          return [...prev, nextAttachment];
        });
      }

      if (detail.suggestedMessage) {
        setInput((prev) => (prev.trim().length > 0 ? prev : detail.suggestedMessage ?? ""));
      }

      if (window.innerWidth < 1280) {
        setIsOpenMobile(true);
      }
    };

    window.addEventListener("ai:add-context", handleAddContext as EventListener);
    return () => {
      window.removeEventListener("ai:add-context", handleAddContext as EventListener);
    };
  }, []);

  const handleSend = useCallback(async () => sendMessage(input), [input, sendMessage]);
  const handleQuickAction = useCallback(
    async (prompt: string) => sendMessage(prompt),
    [sendMessage],
  );
  const handleResetConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setInput("");
    setAttachments([]);
    setIsHistoryOpen(false);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

  const handleRemoveAttachment = useCallback((indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleToggleWeekday = useCallback((weekday: WeekdayCode) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(weekday)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== weekday);
      }
      return WEEKDAY_OPTIONS.map((item) => item.code).filter((code) =>
        [...prev, weekday].includes(code),
      );
    });
  }, []);

  const withProgramPreset = useCallback(
    (action: ChatAction): ChatAction => {
      if (action.type !== "GENERATE_PROGRAM") return action;
      const sessionsPerWeek = Math.max(1, selectedWeekdays.length);
      const weekdaysText = formatWeekdayLabels(selectedWeekdays, t);
      return {
        ...action,
        label: t("programGenerateActionTitle"),
        description: t("programGenerateConfirmDescription")
          .replace("{months}", String(selectedDurationMonths))
          .replace("{days}", weekdaysText),
        payload: {
          ...action.payload,
          duration_months: selectedDurationMonths,
          sessions_per_week: sessionsPerWeek,
          weekdays: selectedWeekdays,
          program_mode: DEFAULT_PROGRAM_MODE,
          mix_ratio: DEFAULT_MIX_RATIO,
        },
      };
    },
    [selectedDurationMonths, selectedWeekdays, t],
  );

  const executeAction = useCallback(
    async (action: ChatAction) => {
      if (action.type !== "GENERATE_PROGRAM") {
        try {
          const response = await fetch("/api/ai/trainer/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: action.type,
              payload: action.payload ?? {},
              conversation_id: activeConversationId,
            }),
          });

          if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(errorData.message ?? t("responseError"));
          }

          const data = (await response.json()) as { message?: string };
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-action-${Date.now()}`,
              role: "assistant",
              content:
                data.message ??
                "Wdrożono zmianę w programie. Sprawdź kalendarz i szczegóły programu.",
              actions: [],
            },
          ]);
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : t("responseError"));
        }
        return;
      }

      try {
        setIsGeneratingProgram(true);
        const actionWeekdays = Array.isArray(action.payload.weekdays)
          ? (action.payload.weekdays.filter((day): day is WeekdayCode =>
              typeof day === "string" &&
              WEEKDAY_OPTIONS.some((option) => option.code === day),
            ) as WeekdayCode[])
          : [];
        const resolvedWeekdays =
          actionWeekdays.length > 0 ? actionWeekdays : selectedWeekdays;
        const resolvedSessionsPerWeek = Math.max(1, resolvedWeekdays.length);
        const goalFromPayload =
          typeof action.payload.goal_text === "string"
            ? action.payload.goal_text.trim()
            : "";
        const latestUserMessage = [...messages]
          .reverse()
          .find((message) => message.role === "user")
          ?.content?.trim();
        const resolvedGoalText =
          goalFromPayload ||
          (latestUserMessage && latestUserMessage.length > 0
            ? latestUserMessage
            : t("programDefaultGoalText"));
        const generateBody = {
          goal_text: resolvedGoalText,
          duration_months:
            typeof action.payload.duration_months === "number"
              ? action.payload.duration_months
              : 1,
          sessions_per_week:
            typeof action.payload.sessions_per_week === "number"
              ? action.payload.sessions_per_week
              : resolvedSessionsPerWeek,
          weekdays: resolvedWeekdays,
          program_mode:
            typeof action.payload.program_mode === "string"
              ? action.payload.program_mode
              : DEFAULT_PROGRAM_MODE,
          mix_ratio:
            typeof action.payload.mix_ratio === "number"
              ? action.payload.mix_ratio
              : DEFAULT_MIX_RATIO,
        };
        const sendGenerateRequest = async () =>
          await fetch("/api/ai/programs/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generateBody),
          });

        let response = await sendGenerateRequest();

        if (!response.ok) {
          const err = (await response.json().catch(() => ({}))) as { message?: string };
          const noPlansError = err.message?.includes("Brak planów treningowych");
          if (noPlansError) {
            const recoverResponse = await fetch(
              "/api/workout-plans/recover-from-sessions?recent=2",
              {
                method: "GET",
                cache: "no-store",
              },
            );
            if (recoverResponse.ok) {
              const recovered = (await recoverResponse.json()) as {
                restored?: Array<{ plan_id: string }>;
              };
              if ((recovered.restored?.length ?? 0) > 0) {
                response = await sendGenerateRequest();
              }
            }
          }
          if (!response.ok) {
            const retryErr = (await response.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(retryErr.message ?? err.message ?? t("responseError"));
          }
        }

        const data = (await response.json()) as {
          decision_log_id?: string | null;
          program?: {
            name?: string;
            goal_text?: string;
            duration_months?: number;
            sessions_per_week?: number;
            program_mode?: ProgramMode;
            mix_ratio?: number;
            source?: "ai" | "manual";
            status?: "draft" | "active" | "archived";
            coach_profile_snapshot?: Record<string, unknown> | null;
          };
          training_state?: {
            readiness_score?: number;
            readiness_drivers?: string[];
            external_workouts_last_7d?: number;
            external_duration_minutes_last_7d?: number;
            fatigue_notes_last_14d?: number;
          };
          planner_proposal?: {
            source?: string;
            rationale?: string[];
            assumptions?: string[];
          };
          validation?: {
            valid?: boolean;
            score?: number;
            violations?: Array<{
              severity?: "error" | "warning";
              message?: string;
            }>;
          };
          repair_log?: Array<{
            reason_text?: string;
          }>;
          realism?: {
            score?: number;
            summary?: string;
          };
          guardrail_events?: Array<{
            exercise_title: string;
            field:
              | "planned_sets"
              | "planned_reps"
              | "planned_duration_seconds"
              | "planned_rest_seconds";
            from: number;
            to: number;
            reason: string;
          }>;
          sessions?: Array<{
            workout_plan_id?: string;
            workout_plan_name: string;
            generated_plan?: Record<string, unknown>;
            scheduled_date: string;
            week_index: number;
            session_index: number;
            status: "planned" | "completed";
            progression_overrides?: Record<string, unknown>;
          }>;
        };

        const saveResponse = await fetch("/api/ai/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.program?.name ?? "Program AI",
            goal_text: data.program?.goal_text ?? "Program wygenerowany przez AI",
            duration_months: data.program?.duration_months ?? 1,
            sessions_per_week: data.program?.sessions_per_week ?? 2,
            source: data.program?.source ?? "ai",
            status: data.program?.status ?? "draft",
            decision_log_id: data.decision_log_id ?? null,
            coach_profile_snapshot: data.program?.coach_profile_snapshot ?? null,
            sessions: (data.sessions ?? []).map((session) => ({
              workout_plan_id: session.workout_plan_id,
              generated_plan: session.generated_plan ?? undefined,
              scheduled_date: session.scheduled_date,
              week_index: session.week_index,
              session_index: session.session_index,
              status: session.status,
              progression_overrides: session.progression_overrides ?? null,
            })),
          }),
        });

        if (!saveResponse.ok) {
          const saveErr = (await saveResponse.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(saveErr.message ?? "Nie udało się zapisać programu.");
        }

        const savedProgram = (await saveResponse.json()) as { id?: string; name?: string };

        const readinessDrivers = (data.training_state?.readiness_drivers ?? [])
          .slice(0, 2)
          .join(", ");

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-action-${Date.now()}`,
            role: "assistant",
            content: [
              "Wygenerowałam i zapisałam program treningowy.",
              `Nazwa: ${savedProgram.name ?? data.program?.name ?? "Program AI"}`,
              `Czas: ${data.program?.duration_months ?? 1} mies.`,
              `Treningi/tydz.: ${data.program?.sessions_per_week ?? 2}`,
              typeof data.training_state?.readiness_score === "number"
                ? `Gotowość startowa: ${data.training_state.readiness_score}/100`
                : "",
              readinessDrivers ? `Uwzględniono: ${readinessDrivers}` : "",
              (data.guardrail_events?.length ?? 0) > 0
                ? "Plan został automatycznie skorygowany do bezpiecznych i bardziej realistycznych zakresów."
                : "",
              "Program znajdziesz w zakładce „Programy”, a zaplanowane sesje w kalendarzu.",
            ]
              .filter(Boolean)
              .join("\n"),
            actions: [],
          },
        ]);

        if (pathname !== "/workout-plans") {
          router.push("/workout-plans?section=programs");
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("responseError"));
      } finally {
        setIsGeneratingProgram(false);
      }
    },
    [activeConversationId, messages, pathname, router, selectedWeekdays, t],
  );

  const handleActionClick = useCallback(
    async (action: ChatAction) => {
      const resolvedAction = withProgramPreset(action);
      if (!resolvedAction.requires_confirmation) {
        await executeAction(resolvedAction);
        return;
      }
      setPendingAction(resolvedAction);
      setIsConfirmOpen(true);
    },
    [executeAction, withProgramPreset],
  );

  const handleGenerateProgramFromPreset = useCallback(async () => {
    const sessionsPerWeek = Math.max(1, selectedWeekdays.length);
    const weekdaysText = formatWeekdayLabels(selectedWeekdays, t);
    const presetAction: ChatAction = {
      id: `generate-program-preset-${Date.now()}`,
      type: "GENERATE_PROGRAM",
      label: t("programGenerateActionTitle"),
      description: t("programGenerateConfirmDescription")
        .replace("{months}", String(selectedDurationMonths))
        .replace("{days}", weekdaysText),
      requires_confirmation: true,
      payload: {
        duration_months: selectedDurationMonths,
        sessions_per_week: sessionsPerWeek,
        weekdays: selectedWeekdays,
        program_mode: DEFAULT_PROGRAM_MODE,
        mix_ratio: DEFAULT_MIX_RATIO,
      },
    };
    setPendingAction(presetAction);
    setIsConfirmOpen(true);
  }, [selectedDurationMonths, selectedWeekdays, t]);

  const handleSelectHistory = useCallback(
    async (conversationId: string) => {
      try {
        const response = await fetch(`/api/ai/trainer/conversations/${conversationId}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          toast.error(t("responseError"));
          return;
        }

        const data = (await response.json()) as {
          id: string;
          messages: Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
          }>;
        };

        setActiveConversationId(data.id);
        setMessages(
          (data.messages ?? []).map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            actions: [],
          })),
        );
        setIsHistoryOpen(false);
      } catch (error) {
        console.error("[AIAssistantShell] Failed to load conversation", error);
        toast.error(t("responseError"));
      }
    },
    [t],
  );

  if (isWorkoutSessionActivePage) return null;

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[420px] border-l border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 xl:block">
        <AIAssistantPanel
          messages={messages}
          conversationHistory={conversationHistory}
          isHistoryOpen={isHistoryOpen}
          usage={usage}
          input={input}
          attachments={attachments}
          isSending={isSending}
          isGeneratingProgram={isGeneratingProgram}
          deletingConversationId={deletingConversationId}
          onInputChange={setInput}
          onRemoveAttachment={handleRemoveAttachment}
          onSend={handleSend}
          onToggleHistory={handleToggleHistory}
          onSelectHistory={handleSelectHistory}
          onDeleteConversation={handleDeleteConversation}
          onRequestDeleteConversation={setPendingConversationDelete}
          onQuickAction={handleQuickAction}
          selectedDurationMonths={selectedDurationMonths}
          selectedWeekdays={selectedWeekdays}
          onSelectDurationMonths={setSelectedDurationMonths}
          onToggleWeekday={handleToggleWeekday}
          onGenerateProgramFromPreset={handleGenerateProgramFromPreset}
          onResetConversation={handleResetConversation}
          onActionClick={handleActionClick}
        />
      </aside>

      <div className="fixed bottom-[calc(var(--m3-mobile-nav-height)+1rem)] right-4 z-50 xl:hidden">
        <Button
          type="button"
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setIsOpenMobile(true)}
          aria-label={t("openMobileAria")}
        >
          <Sparkles className="size-4" />
          {t("openMobile")}
        </Button>
      </div>

      <Sheet open={isOpenMobile} onOpenChange={setIsOpenMobile}>
        <SheetContent
          side="right"
          className="h-dvh w-[92vw] max-w-[420px] overflow-hidden p-0 sm:w-[420px] sm:max-w-[420px] [&>button]:hidden"
        >
          <div className="sr-only">
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
          </div>
          <AIAssistantPanel
            messages={messages}
            conversationHistory={conversationHistory}
            isHistoryOpen={isHistoryOpen}
            usage={usage}
            input={input}
            attachments={attachments}
            isSending={isSending}
            isGeneratingProgram={isGeneratingProgram}
            deletingConversationId={deletingConversationId}
            onInputChange={setInput}
            onRemoveAttachment={handleRemoveAttachment}
            onSend={handleSend}
            onToggleHistory={handleToggleHistory}
            onSelectHistory={handleSelectHistory}
            onDeleteConversation={handleDeleteConversation}
            onRequestDeleteConversation={setPendingConversationDelete}
            onQuickAction={handleQuickAction}
            selectedDurationMonths={selectedDurationMonths}
            selectedWeekdays={selectedWeekdays}
            onSelectDurationMonths={setSelectedDurationMonths}
            onToggleWeekday={handleToggleWeekday}
            onGenerateProgramFromPreset={handleGenerateProgramFromPreset}
            onResetConversation={handleResetConversation}
            onActionClick={handleActionClick}
            mobile
            onClose={() => setIsOpenMobile(false)}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.label ?? "Potwierdź akcję"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.description ?? "Czy na pewno chcesz kontynuować?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingAction) return;
                void executeAction(pendingAction);
              }}
            >
              Kontynuuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingConversationDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingConversationDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno usunąć?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConversationDelete
                ? `Ta operacja usunie całą konwersację „${pendingConversationDelete.title}” wraz z wiadomościami.`
                : "Ta operacja usunie całą konwersację wraz z wiadomościami."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingConversationDelete) return;
                void handleDeleteConversation(pendingConversationDelete.id);
                setPendingConversationDelete(null);
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

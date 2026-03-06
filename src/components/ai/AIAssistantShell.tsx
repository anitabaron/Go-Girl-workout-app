"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, History, Plus, Send, Sparkles, X } from "lucide-react";
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

type AssistantPanelProps = {
  messages: ChatMessage[];
  conversationHistory: ConversationHistoryItem[];
  isHistoryOpen: boolean;
  usage: AIUsage | null;
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => Promise<void>;
  onToggleHistory: () => void;
  onSelectHistory: (conversationId: string) => void;
  onQuickAction: (prompt: string) => Promise<void>;
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
  isSending,
  onInputChange,
  onSend,
  onToggleHistory,
  onSelectHistory,
  onQuickAction,
  onResetConversation,
  onActionClick,
  onClose,
  mobile = false,
}: Readonly<AssistantPanelProps>) {
  const t = useTranslations("aiAssistant");

  const quickActions = useMemo(
    () => [
      t("quickActionPlanToday"),
      t("quickActionPlanWeek"),
      t("quickActionAdjustRecovery"),
      t("quickActionReviewGoal"),
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
              {t("remainingToday").replace("{count}", String(usage.remaining))}
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
                  <button
                    key={conversation.id}
                    type="button"
                    className="w-full cursor-pointer rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-accent"
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
                    {message.actions?.map((action) => (
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
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isSending ? (
              <div className="mr-auto rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {t("thinking")}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="space-y-2 rounded-xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
            <p>{t("emptyStateTitle")}</p>
            <p>{t("emptyStateDescription")}</p>
          </section>
        )}

        {!isHistoryOpen ? (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("quickActions")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => void onQuickAction(action)}
                  disabled={isSending || (usage?.remaining ?? 1) <= 0}
                >
                  {action}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="border-t border-border p-4">
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
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistoryItem[]
  >([]);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
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
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(errorData.message ?? t("responseError"));
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
      fetchConversationHistory,
      fetchUsage,
      isSending,
      t,
      usage?.remaining,
      usage?.limit,
    ],
  );

  useEffect(() => {
    void fetchConversationHistory();
    void fetchUsage();
  }, [fetchConversationHistory, fetchUsage]);

  const handleSend = useCallback(async () => sendMessage(input), [input, sendMessage]);
  const handleQuickAction = useCallback(
    async (prompt: string) => sendMessage(prompt),
    [sendMessage],
  );
  const handleResetConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setInput("");
    setIsHistoryOpen(false);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

  const executeAction = useCallback(
    async (action: ChatAction) => {
      if (action.type !== "GENERATE_PROGRAM") {
        toast.info(
          "Akcja wymaga podpięcia endpointu wykonawczego. Na tym etapie pozostaje sugestią z potwierdzeniem.",
        );
        return;
      }

      try {
        const response = await fetch("/api/ai/programs/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal_text: "Program ogólnorozwojowy",
            duration_months:
              typeof action.payload.duration_months === "number"
                ? action.payload.duration_months
                : 1,
            sessions_per_week:
              typeof action.payload.sessions_per_week === "number"
                ? action.payload.sessions_per_week
                : 2,
          }),
        });

        if (!response.ok) {
          const err = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(err.message ?? t("responseError"));
        }

        const data = (await response.json()) as {
          program?: {
            name?: string;
            goal_text?: string;
            duration_months?: number;
            sessions_per_week?: number;
            source?: "ai" | "manual";
            status?: "draft" | "active" | "archived";
            coach_profile_snapshot?: Record<string, unknown> | null;
          };
          sessions?: Array<{
            workout_plan_id: string;
            workout_plan_name: string;
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
            coach_profile_snapshot: data.program?.coach_profile_snapshot ?? null,
            sessions: (data.sessions ?? []).map((session) => ({
              workout_plan_id: session.workout_plan_id,
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

        const preview = (data.sessions ?? [])
          .slice(0, 3)
          .map((session) => `${session.scheduled_date}: ${session.workout_plan_name}`)
          .join("\n");

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
              savedProgram.id ? `ID programu: ${savedProgram.id}` : "",
              preview ? `Podgląd sesji:\n${preview}` : "",
              "Program znajdziesz w zakładce „Programy” i sesje planned w kalendarzu.",
            ]
              .filter(Boolean)
              .join("\n"),
            actions: [],
          },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("responseError"));
      }
    },
    [t],
  );

  const handleActionClick = useCallback(
    async (action: ChatAction) => {
      if (!action.requires_confirmation) {
        await executeAction(action);
        return;
      }
      setPendingAction(action);
      setIsConfirmOpen(true);
    },
    [executeAction],
  );

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
          isSending={isSending}
          onInputChange={setInput}
          onSend={handleSend}
          onToggleHistory={handleToggleHistory}
          onSelectHistory={handleSelectHistory}
          onQuickAction={handleQuickAction}
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
            isSending={isSending}
            onInputChange={setInput}
            onSend={handleSend}
            onToggleHistory={handleToggleHistory}
            onSelectHistory={handleSelectHistory}
            onQuickAction={handleQuickAction}
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
    </>
  );
}

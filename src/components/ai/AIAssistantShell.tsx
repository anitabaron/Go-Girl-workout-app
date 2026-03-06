"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, History, Plus, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

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
  onClose?: () => void;
  mobile?: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
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
            className={
              isHistoryOpen
                ? "ai-history-active"
                : undefined
            }
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
              <div
                key={message.id}
                className={[
                  "max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto border border-border bg-card text-foreground",
                ].join(" ")}
              >
                {message.content}
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
            disabled={isSending || input.trim().length === 0 || (usage?.remaining ?? 1) <= 0}
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
    [activeConversationId, fetchConversationHistory, fetchUsage, isSending, t, usage?.remaining],
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
            mobile
            onClose={() => setIsOpenMobile(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

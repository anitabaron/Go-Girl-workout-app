"use client";

import { useCallback, useMemo, useState } from "react";
import { Bot, History, Plus, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AssistantPanelProps = {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => Promise<void>;
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

function AIAssistantPanel({
  messages,
  input,
  isSending,
  onInputChange,
  onSend,
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
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("history")}>
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
        <section className="space-y-1">
          <p className="text-2xl font-semibold">{t("greeting")}</p>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </section>

        {messages.length > 0 ? (
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

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("quickActions")}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-xl border border-border bg-card px-3 py-4 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => void onQuickAction(action)}
                disabled={isSending}
              >
                {action}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("inputPlaceholder")}
            aria-label={t("inputAria")}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            disabled={isSending}
          />
          <Button
            type="button"
            size="icon-sm"
            aria-label={t("sendAria")}
            onClick={() => void onSend()}
            disabled={isSending || input.trim().length === 0}
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
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed || isSending) return;

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
          body: JSON.stringify({ message: trimmed }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(errorData.message ?? t("responseError"));
        }

        const data = (await response.json()) as { reply?: string };
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? t("responseError"),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("[AIAssistantShell] Failed to send chat message", error);
        toast.error(error instanceof Error ? error.message : t("responseError"));
      } finally {
        setIsSending(false);
      }
    },
    [isSending, t],
  );

  const handleSend = useCallback(async () => sendMessage(input), [input, sendMessage]);
  const handleQuickAction = useCallback(
    async (prompt: string) => sendMessage(prompt),
    [sendMessage],
  );
  const handleResetConversation = useCallback(() => setMessages([]), []);

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[420px] border-l border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 xl:block">
        <AIAssistantPanel
          messages={messages}
          input={input}
          isSending={isSending}
          onInputChange={setInput}
          onSend={handleSend}
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

      <Dialog open={isOpenMobile} onOpenChange={setIsOpenMobile}>
        <DialogContent
          className="h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          <AIAssistantPanel
            messages={messages}
            input={input}
            isSending={isSending}
            onInputChange={setInput}
            onSend={handleSend}
            onQuickAction={handleQuickAction}
            onResetConversation={handleResetConversation}
            mobile
            onClose={() => setIsOpenMobile(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Check,
  ClipboardCheck,
  Copy,
  FileText,
  ListChecks,
  MessageSquareText,
  Minus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { PracinhaAvatar, type PracinhaState } from "@/components/app/PracinhaAvatar";
import { PlanPanel } from "@/components/app/PlanPanel";
import { PagePanel } from "@/components/app/PagePanel";
import { interviewProgress } from "@/lib/interview-progress";
import type { WorkspacePage } from "@/lib/article.functions";

const QUICK = ["Pular", "Não se aplica", "Ainda não sei", "Quero responder depois"];

type DockTab = "chat" | "plan" | "pages";

/**
 * Chat compacto que fica num canto sem esconder a folha A4. Reúne a entrevista, o
 * plano e os controles de produção em abas, para o documento continuar sendo o
 * centro da experiência. Durante a entrevista, as mensagens ao vivo são repassadas
 * ao documento para a folha ser preenchida enquanto o pesquisador responde.
 */
export function ChatDock({
  articleId,
  initialMessages,
  plan,
  title,
  phase,
  currentPage,
  currentNumber,
  isVirtualNext,
  autoBuild,
  onActivity,
  onLiveMessages,
  onBusyChange,
  onRequestPlan,
  onPlanChanged,
  onPlanApproved,
  onPageChanged,
  onPageApproved,
}: {
  articleId: string;
  initialMessages: UIMessage[];
  plan: string | null;
  title: string;
  phase: string;
  currentPage: WorkspacePage | null;
  currentNumber: number;
  isVirtualNext: boolean;
  autoBuild: boolean;
  onActivity: () => void;
  onLiveMessages?: (messages: UIMessage[]) => void;
  onBusyChange?: (busy: boolean) => void;
  onRequestPlan: () => void;
  onPlanChanged: () => void;
  onPlanApproved: () => void;
  onPageChanged: () => void;
  onPageApproved: (pageNumber: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<DockTab>(phase === "interview" ? "chat" : "pages");
  const [unread, setUnread] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { articleId } }),
    [articleId],
  );
  const { messages, sendMessage, status, stop } = useChat({
    id: articleId,
    messages: initialMessages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      toast.error(
        m.includes("429")
          ? "Muitas requisições. Aguarde um pouco."
          : m.includes("402")
            ? "Créditos de IA esgotados."
            : "Não foi possível enviar. Tente de novo.",
      );
    },
    onFinish: () => onActivity(),
  });
  const busy = status === "submitted" || status === "streaming";
  const planApproved = phase === "writing" || phase === "done";

  const progress = useMemo(() => interviewProgress(messages), [messages]);
  const avatarState: PracinhaState = busy
    ? status === "streaming"
      ? "writing"
      : "thinking"
    : planApproved
      ? "done"
      : "idle";

  // Repassa as mensagens ao vivo para o documento preencher a folha durante a entrevista.
  useEffect(() => {
    onLiveMessages?.(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    onBusyChange?.(busy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(() => {
    if (busy) wasBusy.current = true;
    else if (wasBusy.current) {
      wasBusy.current = false;
      if (!open) setUnread((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(() => {
    if (!busy && open && tab === "chat") inputRef.current?.focus();
  }, [busy, open, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setUnread(0);
        }}
        className="dock-enter fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary py-2 pl-1.5 pr-4 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <PracinhaAvatar state={avatarState} size={28} />
        Pracinha
        {unread > 0 && (
          <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-[11px] font-bold text-primary">
            {unread}
          </span>
        )}
      </button>
    );
  }

  const tabs: { id: DockTab; label: string; icon: typeof MessageSquareText }[] = [
    { id: "chat", label: "Chat", icon: MessageSquareText },
    { id: "plan", label: "Plano", icon: ListChecks },
    { id: "pages", label: "Produção", icon: FileText },
  ];

  return (
    <aside className="dock-enter fixed bottom-4 right-4 z-40 flex h-[min(72vh,600px)] w-[min(94vw,400px)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
      <header className="flex items-center gap-2 border-b bg-gradient-to-r from-accent/50 to-transparent px-3 py-2">
        <PracinhaAvatar state={avatarState} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-sm font-semibold leading-tight">Pracinha</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {busy
              ? status === "streaming"
                ? "escrevendo…"
                : "pensando…"
              : progress.stage
                ? `Etapa: ${progress.stage}`
                : "assistente da ScienceChat"}
          </p>
        </div>
        {!planApproved && progress.asked > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-secondary-foreground">
            {progress.answered}/{progress.asked}
          </span>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setOpen(false)}
          aria-label="Minimizar chat"
        >
          <Minus className="size-4" />
        </Button>
      </header>

      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <Conversation className="dock-scroll min-h-0 flex-1">
            <ConversationContent className="w-full gap-3 px-3 py-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <PracinhaAvatar state="idle" size={52} />
                  <p className="text-sm text-muted-foreground">
                    Vou fazer perguntas, uma de cada vez. Você pode pular qualquer uma — e o
                    documento à esquerda vai sendo preenchido ao vivo.
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => send("Olá! Quero começar meu artigo científico.")}
                  >
                    <Sparkles className="size-4" />
                    Começar entrevista
                  </Button>
                </div>
              ) : (
                messages.map((m) => (
                  <Message key={m.id} from={m.role} className="group max-w-full">
                    <MessageContent
                      className={m.role === "user" ? "bg-primary text-primary-foreground" : ""}
                    >
                      {m.parts.map((p, i) =>
                        p.type === "text" ? (
                          <MessageResponse key={i}>{p.text}</MessageResponse>
                        ) : null,
                      )}
                    </MessageContent>
                    {m.role === "assistant" && (
                      <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageAction
                          tooltip="Copiar"
                          onClick={() =>
                            void copyMessage(
                              m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" "),
                            )
                          }
                        >
                          <Copy className="size-3.5" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Message>
                ))
              )}
              {busy && (
                <div className="flex items-center gap-2">
                  <PracinhaAvatar state={avatarState} size={24} />
                  <Shimmer className="text-xs">
                    {status === "streaming" ? "Escrevendo…" : "Pensando na próxima pergunta…"}
                  </Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="space-y-1.5 border-t p-2">
            {messages.length > 0 && !planApproved && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full gap-1.5"
                onClick={onRequestPlan}
              >
                <ClipboardCheck className="size-4" />
                Concluir entrevista e montar o plano
              </Button>
            )}
            {messages.length > 0 && !planApproved && (
              <div className="flex flex-wrap gap-1">
                {QUICK.map((q) => (
                  <Button
                    key={q}
                    size="sm"
                    variant="outline"
                    className="h-6 rounded-full px-2 text-[11px]"
                    disabled={busy}
                    onClick={() => send(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            )}
            {planApproved && (
              <div className="flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1.5 text-[11px] text-success">
                <Check className="size-3.5" />
                Entrevista concluída. A produção acontece na aba Produção.
              </div>
            )}
            <PromptInput onSubmit={(msg: PromptInputMessage) => send(msg.text)}>
              <PromptInputTextarea ref={inputRef} placeholder="Escreva sua resposta..." />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}

      {tab === "plan" && (
        <div className="dock-scroll min-h-0 flex-1 overflow-y-auto">
          <PlanPanel
            articleId={articleId}
            plan={plan}
            currentTitle={title}
            autoBuild={autoBuild}
            onChanged={onPlanChanged}
            onApproved={onPlanApproved}
          />
        </div>
      )}

      {tab === "pages" && (
        <div className="dock-scroll min-h-0 flex-1 overflow-y-auto">
          <PagePanel
            articleId={articleId}
            page={currentPage}
            pageNumber={currentNumber}
            isVirtualNext={isVirtualNext}
            onChanged={onPageChanged}
            onApproved={onPageApproved}
          />
        </div>
      )}
    </aside>
  );
}

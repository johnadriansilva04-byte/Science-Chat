import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ClipboardCheck, FileText, ListChecks, MessageSquareText, Minus } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { PlanPanel } from "@/components/app/PlanPanel";
import { PagePanel } from "@/components/app/PagePanel";
import type { WorkspacePage } from "@/lib/article.functions";

const QUICK = ["Pular", "Não se aplica", "Ainda não sei", "Quero responder depois"];

type DockTab = "chat" | "plan" | "pages";

/**
 * Chat compacto que fica num canto sem esconder a folha A4. Reúne a entrevista, o
 * plano e os controles de produção em abas, para o documento continuar sendo o
 * centro da experiência.
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
  onRequestPlan: () => void;
  onPlanChanged: () => void;
  onPlanApproved: () => void;
  onPageChanged: () => void;
  onPageApproved: (pageNumber: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<DockTab>(phase === "interview" ? "chat" : "pages");
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (!busy && open && tab === "chat") inputRef.current?.focus();
  }, [busy, open, tab]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <MessageSquareText className="size-4" />
        Pracinha
      </button>
    );
  }

  const tabs: { id: DockTab; label: string; icon: typeof MessageSquareText }[] = [
    { id: "chat", label: "Chat", icon: MessageSquareText },
    { id: "plan", label: "Plano", icon: ListChecks },
    { id: "pages", label: "Produção", icon: FileText },
  ];

  return (
    <aside className="fixed bottom-4 right-4 z-40 flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <header className="flex items-center gap-1 border-b px-2 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
              tab === t.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto size-6"
          onClick={() => setOpen(false)}
          aria-label="Minimizar chat"
        >
          <Minus className="size-4" />
        </Button>
      </header>

      {tab === "chat" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="w-full px-3 py-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Vou fazer perguntas, uma de cada vez. Você pode pular qualquer uma.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => send("Olá! Quero começar meu artigo científico.")}
                  >
                    Começar entrevista
                  </Button>
                </div>
              ) : (
                messages.map((m) => (
                  <Message key={m.id} from={m.role} className="max-w-full">
                    <MessageContent
                      className={m.role === "user" ? "bg-primary text-primary-foreground" : ""}
                    >
                      {m.parts.map((p, i) =>
                        p.type === "text" ? (
                          <MessageResponse key={i}>{p.text}</MessageResponse>
                        ) : null,
                      )}
                    </MessageContent>
                  </Message>
                ))
              )}
              {status === "submitted" && (
                <Shimmer className="text-xs">Pensando na próxima pergunta...</Shimmer>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="space-y-1.5 border-t p-2">
            {messages.length > 0 && !planApproved && (
              <Button size="sm" variant="secondary" className="w-full" onClick={onRequestPlan}>
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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

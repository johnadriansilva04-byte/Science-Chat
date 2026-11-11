import { useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
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
import logo from "@/assets/sciencechat-logo.png";

const QUICK = ["Pular", "Não se aplica", "Ainda não sei", "Quero responder depois"];

export function InterviewChat({
  articleId,
  initialMessages,
  planApproved,
  onActivity,
  onRequestPlan,
}: {
  articleId: string;
  initialMessages: UIMessage[];
  planApproved: boolean;
  onActivity?: () => void;
  onRequestPlan?: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { articleId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
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
    onFinish: () => onActivity?.(),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={logo} alt="" width={56} height={56} />}
              title="Vamos conhecer a sua pesquisa"
              description="Vou fazer perguntas, uma de cada vez. Você pode pular qualquer uma."
            >
              <div className="flex flex-col items-center gap-3">
                <img src={logo} alt="" width={56} height={56} />
                <h3 className="font-serif text-xl font-semibold">Vamos conhecer a sua pesquisa</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Vou fazer perguntas, uma de cada vez. Você pode pular qualquer uma.
                </p>
                <Button onClick={() => send("Olá! Quero começar meu artigo científico.")}>
                  Começar entrevista
                </Button>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent
                  className={m.role === "user" ? "bg-primary text-primary-foreground" : ""}
                >
                  {m.parts.map((p, i) =>
                    p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Shimmer className="text-sm">Pensando na próxima pergunta...</Shimmer>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-2xl space-y-2 p-3">
        {messages.length > 0 && !planApproved && (
          <Button variant="secondary" className="w-full" onClick={onRequestPlan}>
            <ClipboardCheck />
            Concluir entrevista e montar o plano
          </Button>
        )}
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                className="h-7 rounded-full text-xs"
                disabled={busy}
                onClick={() => send(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        )}
        <PromptInput onSubmit={(msg: PromptInputMessage) => send(msg.text)}>
          <PromptInputTextarea
            ref={inputRef}
            placeholder="Explique com suas próprias palavras..."
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

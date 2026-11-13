import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Check,
  ClipboardCheck,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Minus,
  PanelRight,
  Search,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wrench,
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
import { interviewProgress } from "@/lib/interview-progress";
import { useVoice } from "@/hooks/useVoice";

const QUICK = ["Pular", "Não se aplica", "Ainda não sei", "Quero responder depois"];

/** Nomes amigáveis das ferramentas que o Pracinha pode executar sobre o artigo. */
const TOOL_LABELS: Record<string, string> = {
  pesquisar_bases: "pesquisando bases científicas",
  atualizar_titulo: "alterando o título",
  editar_pagina: "reescrevendo uma página",
  acrescentar_na_pagina: "acrescentando ao documento",
};

/**
 * Dock do Pracinha: SÓ diálogo. Reúne a entrevista e, na produção, as dúvidas do
 * pesquisador. O plano e a produção página por página ficam no painel do documento.
 * As mensagens ao vivo são repassadas ao documento para a folha A4 ser preenchida
 * enquanto o pesquisador responde. O dock fica à ESQUERDA para não cobrir o texto.
 */
export function ChatDock({
  articleId,
  initialMessages,
  phase,
  onActivity,
  onLiveMessages,
  onBusyChange,
  onRequestPlan,
  isMobile = false,
  mobileVisible = true,
  onMobileClose,
}: {
  articleId: string;
  initialMessages: UIMessage[];
  phase: string;
  onActivity: () => void;
  onLiveMessages?: (messages: UIMessage[]) => void;
  onBusyChange?: (busy: boolean) => void;
  onRequestPlan: () => void;
  /** No celular o chat vira uma tela cheia, alternável com o documento. */
  isMobile?: boolean;
  mobileVisible?: boolean;
  onMobileClose?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(false);
  const voice = useVoice("pt-BR");
  const visible = isMobile ? mobileVisible : open;

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

  // Ferramentas mudam o documento: recarrega a folha assim que o assistente termina.
  const lastMessage = messages.at(-1);
  useEffect(() => {
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (lastMessage.parts.some((p) => p.type.startsWith("tool-"))) onActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  useEffect(() => {
    if (!busy && open) inputRef.current?.focus();
  }, [busy, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lê em voz alta a última resposta do assistente quando o modo de áudio está ligado.
  const lastAssistantText = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return "";
    return last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
  }, [messages]);
  useEffect(() => {
    if (!autoSpeak || busy) return;
    if (lastAssistantText) voice.speak(lastAssistantText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, busy, lastAssistantText]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    voice.stopSpeaking();
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

  const messageText = (m: UIMessage) =>
    m.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();

  if (!visible) {
    if (isMobile) return null;
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setUnread(0);
        }}
        className="dock-enter fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-primary py-2 pl-1.5 pr-4 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
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

  return (
    <aside
      className={
        isMobile
          ? "dock-enter fixed inset-0 z-40 flex flex-col overflow-hidden bg-card"
          : "dock-enter fixed bottom-4 left-4 z-40 flex h-[min(72vh,600px)] w-[min(92vw,344px)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
      }
    >
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
        {voice.ttsSupported && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => {
              if (autoSpeak) voice.stopSpeaking();
              setAutoSpeak((v) => !v);
            }}
            title={autoSpeak ? "Desligar voz do Pracinha" : "Ligar voz do Pracinha"}
            aria-label={autoSpeak ? "Desligar voz do Pracinha" : "Ligar voz do Pracinha"}
          >
            {autoSpeak ? (
              <Volume2 className="size-4 text-primary" />
            ) : (
              <VolumeX className="size-4" />
            )}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => (isMobile ? onMobileClose?.() : setOpen(false))}
          aria-label={isMobile ? "Ver o documento" : "Minimizar chat"}
          title={isMobile ? "Ver o documento" : "Minimizar chat"}
        >
          {isMobile ? <PanelRight className="size-4" /> : <Minus className="size-4" />}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation className="dock-scroll min-h-0 flex-1">
          <ConversationContent className="w-full gap-3 px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <PracinhaAvatar state="idle" size={52} />
                <p className="text-sm text-muted-foreground">
                  Vou fazer perguntas, uma de cada vez. Você pode pular qualquer uma — e o documento
                  à direita vai sendo preenchido ao vivo. Também pode conversar livremente ou pedir
                  que eu pesquise referências.
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
                    {m.parts.map((p, i) => {
                      if (p.type === "text")
                        return <MessageResponse key={i}>{p.text}</MessageResponse>;
                      if (p.type === "tool-pesquisar_bases") {
                        return (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 text-xs italic text-muted-foreground"
                          >
                            <Search className="size-3.5" />
                            pesquisando bases científicas…
                          </span>
                        );
                      }
                      if (p.type.startsWith("tool-")) {
                        const name = p.type.replace("tool-", "");
                        return (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 text-xs italic text-muted-foreground"
                          >
                            <Wrench className="size-3.5" />
                            {TOOL_LABELS[name] ?? "alterando o documento"}…
                          </span>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                  {m.role === "assistant" && (
                    <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                      <MessageAction
                        tooltip="Copiar"
                        onClick={() => void copyMessage(messageText(m))}
                      >
                        <Copy className="size-3.5" />
                      </MessageAction>
                      {voice.ttsSupported && (
                        <MessageAction
                          tooltip="Ouvir"
                          onClick={() => {
                            if (voice.speaking) voice.stopSpeaking();
                            else voice.speak(messageText(m));
                          }}
                        >
                          <Volume2 className="size-3.5" />
                        </MessageAction>
                      )}
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
              Entrevista concluída. Peça alterações aqui e eu aplico no documento.
            </div>
          )}
          <PromptInput onSubmit={(msg: PromptInputMessage) => send(msg.text)}>
            <PromptInputTextarea
              ref={inputRef}
              placeholder={
                voice.listening ? "Ouvindo… fale sua resposta" : "Escreva sua resposta..."
              }
            />
            <PromptInputFooter className="justify-between">
              <div className="flex items-center gap-1">
                {voice.sttSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant={voice.listening ? "default" : "ghost"}
                    className="size-8"
                    title={voice.listening ? "Parar de gravar" : "Falar por voz"}
                    aria-label={voice.listening ? "Parar de gravar" : "Falar por voz"}
                    onClick={() => {
                      if (voice.listening) {
                        voice.stopListening();
                      } else {
                        voice.startListening((text) => {
                          if (inputRef.current) inputRef.current.value = text;
                          send(text);
                        });
                      }
                    }}
                  >
                    {voice.listening ? (
                      <MicOff className="size-4 animate-pulse" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </Button>
                )}
                {voice.speaking && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    title="Parar de falar"
                    aria-label="Parar de falar"
                    onClick={() => voice.stopSpeaking()}
                  >
                    <Square className="size-3.5" />
                  </Button>
                )}
                {busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              </div>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </aside>
  );
}

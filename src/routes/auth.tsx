import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, IdCard, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signIn, signUp } from "@/lib/auth.functions";
import { isValidOrcid, normalizeOrcid } from "@/lib/front-matter";
import { ONBOARDING_FAQS, ONBOARDING_MAIN, faqSeed, setPendingQuestion } from "@/lib/onboarding";
import { ScienceAccessCard } from "@/components/app/ScienceAccessCard";
import { ORCID_REGISTER_URL } from "@/lib/science-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PracinhaAvatar } from "@/components/app/PracinhaAvatar";
import { createArticle } from "@/components/app/ArticlesMenu";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ScienceChat" },
      {
        name: "description",
        content: "Entre para construir e acompanhar seus artigos científicos.",
      },
      { property: "og:title", content: "Entrar — ScienceChat" },
      {
        property: "og:description",
        content: "Entre para construir e acompanhar seus artigos científicos.",
      },
    ],
  }),
  component: AuthPage,
});

/** Coluna de boas-vindas: o Pracinha explica o essencial antes de começar. */
function PracinhaIntro({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <aside className="onboarding-panel hidden lg:block">
      <div className="flex items-center gap-3">
        <PracinhaAvatar state="idle" size={44} />
        <div>
          <p className="font-serif text-lg font-semibold leading-tight">Oi, eu sou o Pracinha</p>
          <p className="text-[0.78rem] text-muted-foreground">
            Seu parceiro de pesquisa. Deixa eu tirar duas ou três dúvidas antes.
          </p>
        </div>
      </div>

      {/* Pergunta principal: sempre visível. */}
      <div className="onboarding-main mt-4">
        <span className="onboarding-main__kicker">
          <Sparkles className="size-3.5" /> Pergunta mais comum
        </span>
        <p className="mt-1 font-serif text-[1.05rem] font-semibold leading-snug">
          {ONBOARDING_MAIN.question}
        </p>
        <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--ci-soft)]">
          {ONBOARDING_MAIN.answer}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAsk(ONBOARDING_MAIN.question)}
            className="onboarding-ask"
          >
            <Sparkles className="size-3.5" />
            Perguntar ao Pracinha
          </button>
          <a
            href={ORCID_REGISTER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-[var(--ci-accent)] hover:underline"
          >
            <IdCard className="size-3.5" />
            Criar meu ORCID (grátis, 3 min)
          </a>
        </div>
      </div>

      {/* Demais perguntas: ocultas até querer ver. Clicar manda para o chat. */}
      <Accordion type="single" collapsible className="mt-3">
        {ONBOARDING_FAQS.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id} className="border-b-0">
            <AccordionTrigger className="onboarding-faq__trigger gap-2 py-2 text-left text-[0.82rem] font-medium hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <p className="text-[0.8rem] leading-relaxed text-muted-foreground">{faq.answer}</p>
              <button
                type="button"
                onClick={() => onAsk(faq.question)}
                className="onboarding-ask mt-2"
              >
                <Sparkles className="size-3.5" />
                Perguntar ao Pracinha
              </button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="mt-2 flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
        <BadgeCheck className="size-3.5 text-[var(--color-success)]" />A ciência não depende de uma
        carteira universitária para existir.
      </p>
    </aside>
  );
}

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orcid, setOrcid] = useState("");
  const [busy, setBusy] = useState(false);
  // O toast some em segundos — numa tela de login no celular, com o teclado
  // aberto, isso é fácil de perder. O erro fica no formulário até nova tentativa.
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  useEffect(() => {
    setFormError("");
  }, [mode]);

  const orcidNormalized = useMemo(() => normalizeOrcid(orcid), [orcid]);
  const orcidValid = isValidOrcid(orcidNormalized);
  const orcidIncomplete = (orcidNormalized?.replace(/-/g, "").length ?? 0) === 16 && !orcidValid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (mode === "in") {
        await signIn({ data: { email, password } });
      } else {
        if (orcid.trim() && !orcidValid) {
          const message = "ORCID inválido — confira os 16 dígitos (ex.: 0000-0002-1825-0097).";
          setFormError(message);
          toast.error(message);
          return;
        }
        await signUp({
          data: {
            email,
            password,
            displayName: name,
            ...(orcidValid && orcidNormalized ? { orcid: orcidNormalized } : {}),
          },
        });
      }
      navigate({ to: "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível entrar";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  // Clicar numa pergunta do Pracinha vira uma mensagem pré-escrita no chat. Sem
  // conta, guardamos a pergunta e pedimos o cadastro; a home a retoma ao entrar.
  function ask(question: string) {
    if (user) {
      void createArticle(navigate, faqSeed(question));
      return;
    }
    setPendingQuestion(question);
    if (mode === "in") setMode("up");
    toast.info("Crie sua conta e o Pracinha responde essa pergunta pra você.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl items-start gap-8 lg:grid-cols-[1fr_1.05fr]">
        {/* Formulário */}
        <div className="w-full">
          <div className="mb-6 text-center lg:text-left">
            <img src={logo} alt="" width={56} height={56} className="mx-auto mb-4 lg:mx-0" />
            <h1 className="font-serif text-3xl font-semibold">ScienceChat</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A ciência não depende de uma carteira universitária para existir.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-paper">
            <div
              className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
              role="tablist"
              aria-label="Entrar ou criar conta"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "in"}
                onClick={() => setMode("in")}
                className={
                  "min-h-11 rounded-md text-sm font-medium transition-colors " +
                  (mode === "in"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "up"}
                onClick={() => setMode("up")}
                className={
                  "min-h-11 rounded-md text-sm font-medium transition-colors " +
                  (mode === "up"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Criar conta
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome (opcional)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como quer ser chamado"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Senha</Label>
                <Input
                  id="pw"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="orcid">
                    ORCID <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="orcid"
                      value={orcid}
                      onChange={(e) => setOrcid(e.target.value)}
                      inputMode="text"
                      autoComplete="off"
                      placeholder="0000-0000-0000-0000"
                      className="pr-9 font-mono tracking-wide"
                    />
                    {orcidValid && (
                      <BadgeCheck className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-success)]" />
                    )}
                  </div>
                  {orcidIncomplete ? (
                    <p className="text-[0.72rem] text-destructive">
                      Não passou na checagem do dígito — confira o número.
                    </p>
                  ) : (
                    <p className="text-[0.72rem] text-muted-foreground">
                      Identidade científica que não depende de instituição. Não tem?{" "}
                      <a
                        href={ORCID_REGISTER_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
                      >
                        criar em orcid.org (grátis)
                      </a>
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}

              <Button type="submit" className="min-h-11 w-full" disabled={busy}>
                {mode === "in" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
          </div>
        </div>

        {/* Porta única para o guia nesta tela: aqui chega quem ainda duvida se
            pode publicar, e /auth não tem cabeçalho com navegação. */}
        <ScienceAccessCard variant="compact" />

        {/* Boas-vindas do Pracinha (some no celular para não empurrar o formulário) */}
        <PracinhaIntro onAsk={ask} />
      </div>
    </div>
  );
}

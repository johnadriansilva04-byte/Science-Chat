import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  HelpCircle,
  IdCard,
  Landmark,
  Lightbulb,
  ShieldCheck,
  Target,
  XCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COVER_LETTER_TEMPLATE,
  COUNTRY_PATHS,
  DIRECT_ANSWER_POINTS,
  NOT_REQUIRED,
  NOT_REQUIRED_CAVEAT,
  ORCID_REGISTER_URL,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
} from "@/lib/science-access";
import { SCIENCE_BITES } from "@/lib/science-flow";
import { cn } from "@/lib/utils";

type TopicId = "posso" | "caminho" | "orcid" | "revista" | "paises" | "fontes" | "carta";

const TOPICS: { id: TopicId; label: string; hint: string; icon: typeof HelpCircle }[] = [
  {
    id: "posso",
    label: "Posso publicar sem vínculo?",
    hint: "As dúvidas mais comuns — com prova e fonte em cada uma.",
    icon: HelpCircle,
  },
  {
    id: "caminho",
    label: "O caminho, passo a passo",
    hint: "Do zero ao artigo aceito, com o porquê de cada etapa.",
    icon: BookOpenCheck,
  },
  {
    id: "orcid",
    label: "ORCID: sua assinatura",
    hint: "Identidade de pesquisador sem depender de instituição.",
    icon: IdCard,
  },
  {
    id: "revista",
    label: "Escolher a revista certa",
    hint: "Como não perder meses no lugar errado — e como checar se é séria.",
    icon: Target,
  },
  {
    id: "paises",
    label: "Brasil e Uruguai",
    hint: "O que existe em cada país e o que é exigido de verdade.",
    icon: Globe2,
  },
  {
    id: "fontes",
    label: "Fontes oficiais",
    hint: "Nada aqui é norma inventada: confira na fonte.",
    icon: ShieldCheck,
  },
  {
    id: "carta",
    label: "Carta ao editor",
    hint: "Modelo pronto, com afiliação honesta já resolvida.",
    icon: FileText,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="min-h-11 gap-1.5 sm:min-h-8"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const area = document.createElement("textarea");
          area.value = text;
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
      {copied ? "Copiado!" : "Copiar modelo"}
    </Button>
  );
}

/** Atalho discreto para criar o ORCID — repetido onde a dúvida aparece. */
function OrcidChip({
  label = "Criar meu ORCID (grátis)",
  href = ORCID_REGISTER_URL,
}: {
  label?: string;
  href?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="ciencia-orcid-chip">
      <IdCard className="size-3.5 shrink-0" aria-hidden />
      {label}
      <ExternalLink className="size-3 opacity-60" aria-hidden />
    </a>
  );
}

/** Prova recolhida: dúvida à vista, resposta curta e fonte sob demanda. */
function Proof({ point }: { point: (typeof DIRECT_ANSWER_POINTS)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <li
      className="ciencia-proof px-3.5 py-3"
      data-open={open}
      data-featured={point.featured ? "true" : undefined}
    >
      <span className="ciencia-proof__bar" aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full cursor-pointer items-start gap-2.5 text-left"
      >
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-[var(--ci-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.85rem] font-semibold leading-snug">{point.question}</span>
          <span className="mt-0.5 block text-[0.8rem] leading-snug text-[var(--ci-soft)]">
            {point.answer}
          </span>
        </span>
        <ChevronDown className="ciencia-proof__chev mt-0.5 size-4 shrink-0 text-[var(--ci-soft)]" />
      </button>
      {point.cta && (
        <div className="pl-6">
          <OrcidChip label={point.cta.label} href={point.cta.url} />
        </div>
      )}
      <div className="ciencia-acc" data-open={open}>
        <div className="ciencia-acc__inner">
          <p className="pt-2 text-[0.8rem] leading-relaxed text-[var(--ci-soft)]">{point.proof}</p>
          <a
            href={point.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex min-h-9 items-center gap-1 text-[0.76rem] font-semibold text-[var(--ci-accent)] hover:underline"
          >
            Fonte: {point.source}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </li>
  );
}

function TopicPosso() {
  return (
    <div>
      <p className="ciencia-lede">
        Não há crachá de entrada. O critério de autoria é o que você <strong>fez e assinou</strong>{" "}
        — não a instituição em que trabalha. Abaixo, cada dúvida com a prova e a fonte.
      </p>
      <ul className="mt-4 space-y-2.5">
        {DIRECT_ANSWER_POINTS.map((p) => (
          <Proof key={p.question} point={p} />
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-destructive/35 bg-destructive/8 p-3.5">
          <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-destructive">
            <XCircle className="size-4" />O que NÃO é exigido
          </p>
          <ul className="mt-2 space-y-1.5">
            {NOT_REQUIRED.map((item) => (
              <li key={item} className="flex gap-1.5 text-[0.8rem] text-foreground/80">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive/70" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-destructive/25 pt-2 text-[0.72rem] leading-snug text-foreground/70">
            {NOT_REQUIRED_CAVEAT}
          </p>
        </div>
        <div className="rounded-2xl border border-success/35 bg-success/8 p-3.5">
          <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-success">
            <BadgeCheck className="size-4" />O que realmente conta
          </p>
          <ul className="mt-2 space-y-1.5">
            {WHAT_COUNTS.map((item) => (
              <li key={item} className="flex gap-1.5 text-[0.8rem] text-foreground/80">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-success/70" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TopicCaminho() {
  return (
    <div>
      <p className="ciencia-lede">
        {`O essencial em ${SCIENCE_BITES.length} etapas — e, logo abaixo, o caminho completo em ${SCIENCE_STEPS.length}. Em cada uma: o que fazer e `}
        <strong>por que</strong> importa.
      </p>
      <ol className="ciencia-rail mt-4">
        {SCIENCE_BITES.map((bite) => (
          <li key={bite.n} className="ciencia-step">
            <span className="ciencia-step__dot" aria-hidden>
              {bite.n}
            </span>
            <p className="text-[0.9rem] font-semibold leading-snug">{bite.title}</p>
            <p className="text-[0.82rem] text-foreground/85">{bite.what}</p>
            <p className="ciencia-step__why text-[0.78rem] italic text-[var(--ci-soft)]">
              Por quê: {bite.why}
            </p>
            <p className="mt-1 flex gap-1.5 text-[0.78rem] text-[var(--ci-soft)]">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[var(--ci-accent)]" />
              {bite.whatFor}
            </p>
            {bite.n === 3 && <OrcidChip />}
          </li>
        ))}
      </ol>
      <details className="mt-4 rounded-xl border border-[var(--ci-rule)] bg-[var(--ci-surface-2)] p-3">
        <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 text-[0.8rem] font-semibold">
          <ChevronDown className="size-4" />
          Ver o passo a passo completo ({SCIENCE_STEPS.length} etapas)
        </summary>
        <ol className="mt-2 space-y-2">
          {SCIENCE_STEPS.map((step) => (
            <li key={step.n} className="text-[0.8rem]">
              <span className="font-semibold">
                {step.n}. {step.title}
              </span>
              <span className="text-[var(--ci-soft)]"> — {step.do}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function TopicOrcid() {
  return (
    <div>
      <p className="ciencia-lede">
        O ORCID é o seu <strong>nome permanente na ciência</strong>. É gratuito, é seu, e não pede
        instituição.
      </p>
      <ul className="mt-4 space-y-2 text-[0.82rem] text-foreground/85">
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--ci-accent)]" />
          Formato 0000-0000-0000-0000 — único e permanente.
        </li>
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--ci-accent)]" />
          Separa você de homônimos: dois “Silva” não viram a mesma pessoa.
        </li>
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--ci-accent)]" />
          Aceito por revistas e universidades; independe de vínculo.
        </li>
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--ci-accent)]" />
          Leva uns três minutos, só com nome e e-mail.
        </li>
      </ul>
      <OrcidChip />
    </div>
  );
}

function TopicRevista() {
  const bite = SCIENCE_BITES[3]!;
  return (
    <div>
      <p className="ciencia-lede">
        Escolha pelo <strong>escopo</strong>, não pela grife. Revista errada é o caminho mais rápido
        para uma recusa sem revisão.
      </p>
      <div className="mt-4 space-y-3 text-[0.82rem] text-foreground/85">
        <p>{bite.why}</p>
        <p className="flex gap-2">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--ci-accent)]" />
          {bite.whatFor}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-[var(--ci-rule)] bg-[var(--ci-surface-2)] p-3">
        <p className="text-[0.8rem] font-semibold">Antes de submeter, confira:</p>
        <ul className="mt-2 space-y-1.5 text-[0.8rem] text-[var(--ci-soft)]">
          <li>· As “instruções aos autores” — formato, limite e idioma.</li>
          <li>· Se o tema do seu artigo cabe no escopo declarado.</li>
          <li>· Se a revista consta no DOAJ (acesso aberto e revisão por pares).</li>
          <li>· Se há taxa e quem a cobra — legítimo, desde que transparente.</li>
        </ul>
      </div>
    </div>
  );
}

function TopicPaises() {
  return (
    <div>
      <p className="ciencia-lede">
        Os caminhos mudam de país, mas a permissão é a mesma:{" "}
        <strong>o trabalho fala por você</strong>.
      </p>
      <div className="mt-4 space-y-4">
        {COUNTRY_PATHS.map((path) => (
          <section key={path.id}>
            <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
              <Globe2 className="size-4 text-[var(--ci-accent)]" />
              {path.label}
            </h3>
            <ul className="mt-2 space-y-2">
              {path.highlights.map((h) => (
                <li key={h} className="ciencia-path-item text-[0.8rem]">
                  <span className="min-w-0">{h}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h3 className="flex items-center gap-2 font-serif text-[0.95rem] font-semibold">
            <Globe2 className="size-4 text-[var(--ci-accent)]" />
            Internacional
          </h3>
          <ul className="mt-2 space-y-2">
            {referencesByRegion("internacional").map((r) => (
              <li key={r.url} className="ciencia-path-item text-[0.8rem]">
                <span className="min-w-0">
                  <span className="font-semibold">{r.label}</span> — {r.note}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function TopicFontes() {
  return (
    <div>
      <p className="ciencia-lede">
        Nada aqui é norma inventada. Cada fonte abre no site oficial — confira sempre a versão da
        revista de destino.
      </p>
      <ul className="mt-4 space-y-2">
        {SCIENCE_REFERENCES.map((ref) => (
          <li key={ref.url} className="ciencia-src px-3 py-2.5">
            <a
              href={ref.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 text-[0.82rem] font-semibold hover:text-[var(--ci-accent)] hover:underline"
            >
              {ref.label}
              <ExternalLink className="size-3 opacity-60" />
            </a>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-[var(--ci-soft)]">{ref.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopicCarta() {
  return (
    <div>
      <p className="ciencia-lede">
        Muitas revistas pedem uma carta ao editor. Não é exigência de vínculo — é documento de
        autoria.
      </p>
      <p className="mt-2 text-[0.78rem] text-[var(--ci-soft)]">
        Preencha os campos entre [ ]. A afiliação já vem como “Pesquisador(a) independente”, que é
        legítima.
      </p>
      <div className="mt-2 text-[0.78rem] text-[var(--ci-soft)]">
        <p>A carta pede o ORCID no rodapé. É o mesmo identificador gratuito, criado em minutos:</p>
        <OrcidChip />
      </div>
      <div className="mt-3 rounded-2xl border border-[var(--ci-rule)] bg-[var(--ci-surface-2)] p-3.5">
        <pre className="ciencia-letter max-h-80 overflow-auto whitespace-pre-wrap break-words text-[0.78rem] leading-relaxed">
          {COVER_LETTER_TEMPLATE}
        </pre>
        <div className="mt-3">
          <CopyButton text={COVER_LETTER_TEMPLATE} />
        </div>
      </div>
    </div>
  );
}

const PANELS: Record<TopicId, () => React.ReactElement> = {
  posso: TopicPosso,
  caminho: TopicCaminho,
  orcid: TopicOrcid,
  revista: TopicRevista,
  paises: TopicPaises,
  fontes: TopicFontes,
  carta: TopicCarta,
};

/**
 * O atlas "Ciência sem crachá".
 *
 * Um assunto por vez, escolhido à esquerda. A pergunta que trouxe a pessoa
 * ("posso publicar sem vínculo?") vem aberta; o resto fica a um toque. Assim
 * ninguém encara um manual para achar uma resposta.
 */
export function ScienceAtlas({ initial = "posso" }: { initial?: TopicId }) {
  const [topic, setTopic] = useState<TopicId>(initial);
  const current = TOPICS.find((t) => t.id === topic) ?? TOPICS[0]!;
  const Panel = useMemo(() => PANELS[current.id], [current.id]);

  return (
    <div className="ciencia-atlas">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ci-accent)] text-[oklch(0.18_0.03_285)]">
          <GraduationCap className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="ciencia-kicker">
            <Landmark className="size-3.5" /> Boletim do pesquisador independente
          </span>
          <h1 className="ciencia-title mt-1 text-[1.6rem] sm:text-[2rem]">Ciência sem crachá</h1>
          <p className="mt-2 text-[0.85rem] text-[var(--ci-soft)]">
            Escolha o que quer saber. Cada assunto abre só o que importa, com a fonte ao lado.
          </p>
        </div>
      </header>

      <div className="atlas-grid mt-5">
        <nav
          className="atlas-nav"
          role="tablist"
          aria-label="Assuntos do guia"
          onKeyDown={(event) => {
            // Roving tabindex + setas: a aba ativa é a única parada de tabulação.
            const dir =
              event.key === "ArrowDown" || event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowUp" || event.key === "ArrowLeft"
                  ? -1
                  : 0;
            if (!dir) return;
            event.preventDefault();
            const index = TOPICS.findIndex((t) => t.id === topic);
            const next = TOPICS[(index + dir + TOPICS.length) % TOPICS.length]!;
            setTopic(next.id);
            event.currentTarget
              .querySelector<HTMLButtonElement>(`[data-topic="${next.id}"]`)
              ?.focus();
          }}
        >
          {TOPICS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`atlas-tab-${id}`}
              aria-selected={topic === id}
              aria-controls="atlas-panel"
              tabIndex={topic === id ? 0 : -1}
              data-topic={id}
              onClick={() => setTopic(id)}
              className="atlas-nav__item"
            >
              <Icon className="size-4 shrink-0" />
              {label}
              {id === "orcid" && (
                <span className="atlas-nav__flag" aria-hidden>
                  grátis
                </span>
              )}
            </button>
          ))}
        </nav>

        <section
          className="atlas-panel"
          role="tabpanel"
          id="atlas-panel"
          aria-labelledby={`atlas-tab-${current.id}`}
          tabIndex={0}
          key={current.id}
        >
          <h2 className="atlas-panel__title">{current.label}</h2>
          <p className="mb-3 text-[0.78rem] text-[var(--ci-soft)]">{current.hint}</p>
          <Panel />
        </section>
      </div>
    </div>
  );
}

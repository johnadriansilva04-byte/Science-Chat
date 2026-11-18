/**
 * Sugestões de resposta para o chat: em vez de quatro botões fixos, o ScienceChat
 * lê a última pergunta do Pracinha e oferece atalhos que fazem sentido ali —
 * responder "É teórica", "Sugira 3 títulos", "Pesquise referências". Sempre
 * mantém as saídas de emergência ("Não se aplica", "Ainda não sei", "Pular"),
 * para ninguém ficar preso. É uma heurística transparente, não uma verdade.
 */

const ESCAPE_HATCHES = ["Não se aplica", "Ainda não sei", "Pular"];

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

type Rule = { test: RegExp; options: string[] };

// A ordem importa: a primeira regra que casar define as opções contextuais.
const RULES: Rule[] = [
  {
    test: /natureza da pesquisa|teorica|empirica|ensaio|estudo de caso|documental|bibliografic/,
    options: ["É teórica", "É empírica", "As duas coisas"],
  },
  {
    test: /titulo/,
    options: ["Sugira 3 títulos", "Vou escolher depois"],
  },
  {
    test: /palavras?.?chave|etiqueta/,
    options: ["Ver exemplos", "Vou escolher depois"],
  },
  {
    test: /estrutura|sumario|secoes|partes|esqueleto/,
    options: ["Aprovar estrutura", "Quero ajustar"],
  },
  {
    test: /recapitul|entendi sua pesquisa|esta certo|confirma/,
    options: ["Sim, é isso", "Quase — quero corrigir"],
  },
  {
    test: /orcid|identificador|curriculo/,
    options: ["Tenho ORCID — vou informar", "Não tenho — como crio?", "Pular por agora"],
  },
  {
    test: /referencia|literatura|autores|fontes|o que existe|bibliografia/,
    options: ["Pesquise referências", "Tenho fontes próprias"],
  },
  {
    test: /amostra|metod|instrumento|variave|coleta|experiment|questionari/,
    options: ["Vou detalhar agora", "Ainda não defini"],
  },
  {
    test: /resultado|achado|conclu|evidencia/,
    options: ["Tenho os resultados", "Ainda estou analisando"],
  },
  {
    test: /destino|revista|editorial|norma|abnt|udelar/,
    options: ["Revista nacional", "Periódico internacional", "Ainda não sei"],
  },
  // Perguntas sim/não. Sem o "e" solto: como `normalize` remove acentos, "e"
  // casaria a conjunção ("E agora, qual a tese?") e ofereceria Sim/Não para
  // qualquer pergunta iniciada por "E". A pergunta "É teórica?" já é atendida
  // pela regra de natureza acima.
  {
    test: /^(voce|ja|tem|ha|existe|posso|quer|gostaria|pretende|consegue|deseja|foi)\b/,
    options: ["Sim", "Não"],
  },
];

/**
 * Opções de resposta rápida para a pergunta atual. Quando não há pergunta, ou
 * nenhuma regra casa, devolve apenas as saídas de emergência.
 */
export function suggestReplies(question: string | null | undefined): string[] {
  const q = normalize(question ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const contextual: string[] = [];
  if (q) {
    for (const rule of RULES) {
      if (rule.test.test(q)) {
        contextual.push(...rule.options);
        break;
      }
    }
  }
  const seen = new Set<string>();
  return [...contextual, ...ESCAPE_HATCHES]
    .filter((option) => (seen.has(option) ? false : (seen.add(option), true)))
    .slice(0, 4);
}

/**
 * O Pracinha está pedindo o ORCID? Serve para o chat abrir o card de identidade
 * (onde o pesquisador cola ou cria o número) em vez de só sugerir botões.
 * Exige uma pergunta ("?") ou um pedido explícito — assim o card não reabre
 * depois que o número já foi informado e a IA só o menciona na confirmação.
 */
export function asksForOrcid(question: string | null | undefined): boolean {
  const q = normalize(question ?? "");
  const mentions = /\borcid\b/.test(q) || /identificador (de |do )?pesquisador/.test(q);
  if (!mentions) return false;
  if (q.includes("?")) return true;
  return /(me passe|me diga|me informe|informe|envie|cole|qual( é| e)? o? seu|você tem|voce tem|já tem|ja tem)/.test(
    q,
  );
}

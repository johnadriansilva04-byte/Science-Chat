/**
 * A história da campanha: cada fase é um duelo contra um oponente nomeado, e o
 * esquadrão dele cresce conforme o campeonato avança (1 contra 1, depois 3, 4,
 * 5, 6 e por fim 10). Tudo aqui é ficção de jogo — nenhuma regra de pontuação
 * depende disso, para que o placar continue comparável entre sessões.
 */
import { STOP_LEVELS, type StopCampaignId, type StopLevel } from "./stop";

export type StopRival = {
  /** Nome de ringue. */
  name: string;
  /** Como o mundo o conhece. */
  epithet: string;
  /** Facção: quem manda o oponente. */
  faction: string;
  /** Provocação antes da rodada. */
  taunt: string;
  /** Fala do derrotado quando você vence. */
  defeat: string;
  /** Fala de quem venceu quando você perde. */
  gloat: string;
};

export type StopAct = { campaign: StopCampaignId; act: string; title: string; hook: string };

export const STOP_SAGA_STAKE = "Em disputa: o direito de continuar sendo lido.";

export const STOP_ACTS: readonly StopAct[] = [
  {
    campaign: "classico",
    act: "Ato I",
    title: "A Liga de Bairro",
    hook: "O torneio começa no quintal de casa. Quem perde volta para casa — só que a casa já foi apagada do mapa.",
  },
  {
    campaign: "brasil",
    act: "Ato II",
    title: "O Trópico em Chamas",
    hook: "Agora é o país inteiro na arquibancada, e ninguém perdoa sotaque errado.",
  },
  {
    campaign: "pop",
    act: "Ato III",
    title: "O Circo de Streaming",
    hook: "As câmeras transmitem para o mundo. Quem falha vira meme — e meme é definitivo.",
  },
  {
    campaign: "esportes",
    act: "Ato IV",
    title: "O Estádio Suspenso",
    hook: "A arena flutua sobre o continente. Quem cai, cai para sempre.",
  },
  {
    campaign: "bancada",
    act: "Ato V",
    title: "O Último Experimento",
    hook: "No laboratório final a banca decide se o mundo ainda merece continuar falando.",
  },
];

const RIVALS: Record<string, StopRival> = {
  "cla-1": {
    name: "Vex, o Fracionador",
    epithet: "especialista em travar letras fáceis",
    faction: "Consórcio do Silêncio",
    taunt: "M? Meio mundo trava no M. Você também vai travar.",
    defeat: "…eu não devia ter apostado no medo.",
    gloat: "Travou no M. Igual a todo mundo.",
  },
  "cla-2": {
    name: "Dona Sônia Sete-Léguas",
    epithet: "fala antes do cronômetro",
    faction: "Clube das Vizinhas",
    taunt: "S de sogra, samba e silêncio. Você não aguenta os três.",
    defeat: "A vizinhança inteira viu. Que vergonha.",
    gloat: "Rápido é quem já sabia. Volte depois do café.",
  },
  "cla-3": {
    name: "Hugo Hiena",
    epithet: "ri da sua letra antes da sua resposta",
    faction: "Bando da Gargalhada",
    taunt: "H é letra de quem ri por último. Adivinha quem é.",
    defeat: "…essa risada não era para mim.",
    gloat: "Hahahaha. H de humilhação.",
  },
  "bra-1": {
    name: "Capitão Caju",
    epithet: "joga em casa e sabe disso",
    faction: "Frente Tropical",
    taunt: "C de cidade, comida e camisa. Aqui é casa.",
    defeat: "O trópico reconhece o dono. Passa.",
    gloat: "Sotaque errado, resposta errada. Simples.",
  },
  "bra-2": {
    name: "Gringa Ginga",
    epithet: "entra dançando e sai rindo",
    faction: "Escola de Samba 404",
    taunt: "G de ginga. Quem não tem, cai.",
    defeat: "…tu tens ginga. Odeio isso.",
    gloat: "Gingou errado e caiu no samba.",
  },
  "bra-3": {
    name: "Juba Jejum",
    epithet: "comanda a fome de palavras",
    faction: "Comando do Jejum",
    taunt: "J de jejum: você vai passar fome de palavra.",
    defeat: "Já posso comer? Perdi.",
    gloat: "Jejum de novo. Sente a fome.",
  },
  "pop-1": {
    name: "Bebel Buffer",
    epithet: "trava a própria resposta de propósito",
    faction: "Streaming Livre",
    taunt: "B de buffering. Sua resposta vai travar no meio.",
    defeat: "Carregando derrota… 99%.",
    gloat: "Buffer cheio, resposta vazia. Clássico.",
  },
  "pop-2": {
    name: "Rex Repeat",
    epithet: "vive em reprise",
    faction: "Reprise Eterna",
    taunt: "R de replay. Não me canso de te ver repetir o erro.",
    defeat: "Repete comigo: eu perdi.",
    gloat: "De novo? Isso é replay da sua derrota.",
  },
  "pop-3": {
    name: "K-Kay Cult",
    epithet: "coleciona o que ninguém lembra",
    faction: "Selo Cult",
    taunt: "K é raridade. Você é comum.",
    defeat: "Ok. Cult é quem reconhece o raro. Venceu.",
    gloat: "K de quem conhece. Não era você.",
  },
  "esp-1": {
    name: "Fera do F",
    epithet: "corre os 90 segundos inteiros",
    faction: "Seleção de Ferro",
    taunt: "F de falta, força e fôlego. Você tem os três?",
    defeat: "Faltou fôlego pra mim.",
    gloat: "Faltou fôlego. F de falha.",
  },
  "esp-2": {
    name: "Vitória Vendaval",
    epithet: "já venceu antes de começar",
    faction: "Tempestade FC",
    taunt: "V de vitória. Já está no meu nome, não precisa tentar.",
    defeat: "Ventou contra. Aceito o resultado.",
    gloat: "V de vitória. De novo. Sempre.",
  },
  "esp-3": {
    name: "Wilder W",
    epithet: "sabe as palavras que ninguém usa",
    faction: "Clube do Wildcard",
    taunt: "W separa curioso de dicionário ambulante. Você é qual?",
    defeat: "W de… wow. Foi justo.",
    gloat: "W: wildcard, welter, wasabi. Você não sabia de nenhum.",
  },
  "ban-1": {
    name: "Doutor A. Mostra",
    epithet: "exige revisão por pares até no Stop",
    faction: "Bancada de Ferro",
    taunt: "A de amostra, argônio e Arquimedes. Vamos ver se sabes o básico.",
    defeat: "Hipótese rejeitada. O senhor venceu.",
    gloat: "Amostra insuficiente. Volte depois da revisão por pares.",
  },
  "ban-2": {
    name: "Madame Mol",
    epithet: "conta adversários em mol",
    faction: "Laboratório Mol",
    taunt: "M de mol. Meia dúzia de moles de você não fazem um mol de mim.",
    defeat: "Composição estável. Eu cedi.",
    gloat: "Reação incompleta. Produto: sua derrota.",
  },
  "ban-3": {
    name: "Zeta Zero",
    epithet: "o último verbo do alfabeto",
    faction: "Consórcio do Silêncio",
    taunt: "Z é o fim do alfabeto. É aqui que a sua campanha termina.",
    defeat: "…então o último verbo é teu. O mundo continua falando.",
    gloat: "Z de zero. Zero respostas boas o bastante.",
  },
};

/** Quantos oponentes entram na rodada: o esquadrão cresce a cada fase. */
export function squadSize(level: StopLevel): number {
  const index = STOP_LEVELS.findIndex((entry) => entry.id === level.id);
  const table = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10, 10];
  return table[index] ?? 1;
}

export type StopDuel = {
  rival: StopRival;
  squad: number;
  /** Pontuação que o esquadrão exige para a fase ser vencida. */
  target: number;
  act: StopAct;
};

const FALLBACK_ACT: StopAct = {
  campaign: "classico",
  act: "Ato I",
  title: "A Liga de Bairro",
  hook: "O torneio começa no quintal de casa.",
};

export function actOfCampaign(campaign: StopCampaignId): StopAct {
  return STOP_ACTS.find((act) => act.campaign === campaign) ?? FALLBACK_ACT;
}

export function duelForLevel(level: StopLevel): StopDuel {
  return {
    rival: RIVALS[level.id] ?? {
      name: "Oponente Sem Nome",
      epithet: "apareceu na chave",
      faction: "Consórcio do Silêncio",
      taunt: "Bora.",
      defeat: "Perdi.",
      gloat: "Perdeu.",
    },
    squad: squadSize(level),
    target: level.meta,
    act: actOfCampaign(level.campaign),
  };
}

/** Vencer é conquistar a primeira estrela — a mesma regra que abre a fase seguinte. */
export function duelWon(stars: number): boolean {
  return stars >= 1;
}

export function squadLabel(squad: number): string {
  return squad === 1 ? "1 contra 1" : `1 contra ${squad}`;
}

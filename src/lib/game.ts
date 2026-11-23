/**
 * Identidade do Stop científico na home e nas telas de espera.
 *
 * O jogo agora mora na própria plataforma (`/stop`): este arquivo só guarda o
 * nome, a chamada e as categorias que o card anuncia. A definição real das
 * categorias e das fases fica em `src/lib/stop.ts`, para não haver duas listas.
 */

import { STOP_CATEGORY_LIST } from "@/lib/stop";

export const GAME_NAME = "Stop científico";

export const GAME_TAGLINE =
  "O Stop de sempre, com categorias de ciência — agora em campanha de 12 fases.";

/** Rota interna da campanha. */
export const GAME_PATH = "/stop";

/** Categorias do Stop. Curtas de propósito: cabem na largura de um celular. */
export const STOP_CATEGORIES = STOP_CATEGORY_LIST.map((category) => category.label);

/**
 * Realce de sintaxe (Shiki) para os blocos de código do chat e do documento.
 *
 * Substitui o `@streamdown/code`, que registra TODAS as ~346 linguagens do
 * Shiki (~8 MB no bundle do Worker). Aqui carregamos só um conjunto curado de
 * linguagens — suficiente para código científico e web — usando o bundle
 * "fine-grained" do Shiki. O objeto devolvido implementa a interface
 * `CodeHighlighterPlugin` do Streamdown.
 */
import { createHighlighterCoreSync, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { CodeHighlighterPlugin } from "streamdown";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

import bash from "shiki/langs/bash.mjs";
import c from "shiki/langs/c.mjs";
import cpp from "shiki/langs/cpp.mjs";
import csharp from "shiki/langs/csharp.mjs";
import css from "shiki/langs/css.mjs";
import go from "shiki/langs/go.mjs";
import html from "shiki/langs/html.mjs";
import java from "shiki/langs/java.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import julia from "shiki/langs/julia.mjs";
import latex from "shiki/langs/latex.mjs";
import markdown from "shiki/langs/markdown.mjs";
import python from "shiki/langs/python.mjs";
import r from "shiki/langs/r.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import typescript from "shiki/langs/typescript.mjs";
import xml from "shiki/langs/xml.mjs";
import yaml from "shiki/langs/yaml.mjs";

const THEMES = ["github-light", "github-dark"] as const;
type ThemeName = (typeof THEMES)[number];

const highlighter: HighlighterCore = createHighlighterCoreSync({
  themes: [githubLight, githubDark],
  langs: [
    bash,
    c,
    cpp,
    csharp,
    css,
    go,
    html,
    java,
    javascript,
    json,
    julia,
    latex,
    markdown,
    python,
    r,
    rust,
    sql,
    typescript,
    xml,
    yaml,
  ],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
});

const SUPPORTED = new Set(highlighter.getLoadedLanguages());

function themeName(input: unknown): ThemeName {
  const name = typeof input === "string" ? input : ((input as { name?: string })?.name ?? "");
  return (THEMES as readonly string[]).includes(name) ? (name as ThemeName) : "github-light";
}

export const syntaxHighlight: CodeHighlighterPlugin = {
  name: "shiki",
  type: "code-highlighter",
  supportsLanguage: (language) => SUPPORTED.has(language),
  getSupportedLanguages: () => [...SUPPORTED],
  getThemes: (): [ThemeName, ThemeName] => [THEMES[0], THEMES[1]],
  highlight({ code, language, themes }, callback) {
    const lang = SUPPORTED.has(language) ? language : "text";
    const light = themeName(themes?.[0]);
    const dark = themeName(themes?.[1]);
    const result = highlighter.codeToTokens(code, {
      lang: lang as never,
      themes: { light, dark },
    });
    const shaped = {
      bg: result.bg ?? "",
      fg: result.fg ?? "",
      tokens: result.tokens,
    };
    callback?.(shaped);
    return shaped;
  },
};

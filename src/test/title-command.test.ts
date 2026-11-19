/**
 * O pesquisador escreveu "arrume o titulo para O Autodidata e seus Métodos" e o
 * título NUNCA mudou: o modelo narrava a ação ("Vou arrumar o título para você")
 * em vez de chamar a ferramenta, e ainda afirmava depois que tinha atualizado.
 * Estes testes cobrem o reconhecimento determinístico do pedido.
 */
import { describe, expect, it } from "vitest";
import { parseTitleCommand } from "@/lib/ai/page-command";

describe("parseTitleCommand", () => {
  it("reconhece o pedido real que falhou no chat", () => {
    expect(parseTitleCommand("arrume o titulo para O Autodidata e seus Métodos")).toBe(
      "O Autodidata e seus Métodos",
    );
  });

  it("aceita as variações comuns de verbo e conector", () => {
    expect(parseTitleCommand("mude o título para A mente sob pressão")).toBe("A mente sob pressão");
    expect(parseTitleCommand("troque o título por Outro nome")).toBe("Outro nome");
    expect(parseTitleCommand("atualize o titulo: Ciência sem crachá")).toBe("Ciência sem crachá");
    expect(parseTitleCommand('defina o título como "O gênio sem lousa"')).toBe("O gênio sem lousa");
    expect(parseTitleCommand("corrija o título para Hiper-responsabilidade")).toBe(
      "Hiper-responsabilidade",
    );
    expect(parseTitleCommand("coloque o título para Adaptação cognitiva")).toBe(
      "Adaptação cognitiva",
    );
  });

  it("aceita o pedido invertido (título depois do verbo)", () => {
    expect(parseTitleCommand("para o título, use O Autodidata e seus Métodos")).toBe(
      "O Autodidata e seus Métodos",
    );
  });

  it("não dispara sem um título concreto", () => {
    expect(parseTitleCommand("qual é o título do artigo?")).toBeNull();
    expect(parseTitleCommand("arrume o título")).toBeNull();
    expect(parseTitleCommand("arrume o titulo para <novo título>")).toBeNull();
    expect(parseTitleCommand("mude o título para o próximo passo")).toBeNull();
    expect(parseTitleCommand("")).toBeNull();
  });

  it("não confunde conversa comum com comando", () => {
    expect(parseTitleCommand("achei o título muito longo, o que acha?")).toBeNull();
    expect(
      parseTitleCommand(
        "Estudo de caso exploratório, autobiográfico e documental, com revisão interdisciplinar da literatura.",
      ),
    ).toBeNull();
  });

  it("remove pontuação final que não faz parte do título", () => {
    expect(parseTitleCommand("arrume o título para Ciência aberta.")).toBe("Ciência aberta");
  });
});

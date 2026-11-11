import { useMemo } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageResponse } from "@/components/ai-elements/message";
import { stripMarkers } from "@/lib/article-marker";
import {
  ARTICLE_SIGNATURE,
  assembleMarkdown,
  downloadFile,
  markdownToPlainText,
  slugify,
  startsWithTitleHeading,
  type ExportPage,
} from "@/lib/article-export";

export function DocumentPanel({ title, pages }: { title: string; pages: ExportPage[] }) {
  const approved = useMemo(
    () =>
      pages.filter((p) => p.status === "approved").sort((a, b) => a.page_number - b.page_number),
    [pages],
  );
  const markdown = useMemo(() => assembleMarkdown(title, approved), [title, approved]);
  const filename = slugify(title);
  // A primeira página costuma trazer o H1 com o título; só exibimos o cabeçalho
  // quando nenhuma página aprovada já o contém, para não duplicar o título.
  const firstPage = approved[0];
  const showTitleHeading =
    firstPage !== undefined && !startsWithTitleHeading(stripMarkers(firstPage.content));

  function printPdf() {
    window.print();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Documento mestre</CardTitle>
          <CardDescription>
            Reúne automaticamente todas as páginas aprovadas, na ordem correta. A montagem não
            reescreve o conteúdo aprovado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                downloadFile(`${filename}.md`, markdown, "text/markdown;charset=utf-8")
              }
              disabled={approved.length === 0}
            >
              <Download />
              Markdown (.md)
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadFile(`${filename}.txt`, markdownToPlainText(markdown))}
              disabled={approved.length === 0}
            >
              <FileDown />
              Texto (.txt)
            </Button>
            <Button variant="outline" onClick={printPdf} disabled={approved.length === 0}>
              <Printer />
              PDF / imprimir
            </Button>
          </div>

          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma página aprovada ainda. Aprove as páginas na aba Produção para montar o
              documento.
            </p>
          ) : (
            <div className="paper-sheet rounded-lg border" id="documento-mestre">
              {showTitleHeading ? <h1>{title}</h1> : null}
              {approved.map((p) => (
                <section key={p.page_number}>
                  <MessageResponse>{stripMarkers(p.content)}</MessageResponse>
                </section>
              ))}
              <p className="variant-signature">{ARTICLE_SIGNATURE}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

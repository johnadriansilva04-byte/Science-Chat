import { ARTICLE_SIGNATURE } from "@/lib/article-export";

/** Marca da Variant exibida no rodapé da interface e dos artigos. */
export const VARIANT_CEO = "John Adrian";

export function BrandFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t py-6 text-center text-xs text-muted-foreground ${className}`}>
      <p>
        Uma criação <span className="font-serif font-semibold text-foreground">Variant</span>
      </p>
      <p className="mt-1">CEO {VARIANT_CEO}</p>
    </footer>
  );
}

/** Assinatura da Variant impressa ao final de cada artigo gerado. */
export function ArticleFooter() {
  return <p className="variant-signature">{ARTICLE_SIGNATURE}</p>;
}

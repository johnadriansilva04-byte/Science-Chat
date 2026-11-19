import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/AppHeader";
import { BrandFooter } from "@/components/app/BrandFooter";
import { ScienceAtlas } from "@/components/app/ScienceAtlas";

export const Route = createFileRoute("/ciencia")({
  head: () => ({
    meta: [
      { title: "Ciência sem crachá — ScienceChat" },
      {
        name: "description",
        content:
          "Publicar um artigo científico não exige universidade, diploma ou orientador. Escolha o assunto que quer entender: autoria, ORCID, revistas, Brasil, Uruguai e fontes oficiais.",
      },
      { property: "og:title", content: "Ciência sem crachá — ScienceChat" },
      {
        property: "og:description",
        content:
          "O caminho de quem publica sem vínculo institucional, explicado por assunto e com fontes oficiais.",
      },
    ],
  }),
  component: CienciaPage,
});

function CienciaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <ScienceAtlas />
      </main>
      <BrandFooter />
    </div>
  );
}

import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("Article workspace routing", () => {
  it("matches /a/:articleId instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/a/123e4567-e89b-12d3-a456-426614174000");

    expect(matches.at(-1)?.routeId).toBe("/a/$articleId");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("still matches the home route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

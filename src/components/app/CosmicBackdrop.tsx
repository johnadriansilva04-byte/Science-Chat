import { useEffect, useRef } from "react";

/**
 * Fundo de galáxia desenhado em canvas, atrás de todo o conteúdo.
 *
 * Tudo é procedural: nada é baixado. As galáxias e o buraco negro são pintados
 * uma vez em canvas fora de tela e depois só giram devagar; as estrelas são
 * pontos recalculados a cada quadro. O movimento é lento de propósito — a
 * rotação completa da galáxia leva ~9 minutos.
 *
 * Custo: ~30 quadros por segundo, pausa quando a aba está oculta e um único
 * quadro estático quando o usuário pede menos movimento.
 */

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Galáxia espiral de quatro braços, com poeira escura entre eles. */
function makeGalaxySprite(size: number, seed: number, palette: [string, string, string]) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const rand = seeded(seed);
  const [core, mid, edge] = palette;
  const R = size * 0.45;
  const arms = 4;
  const TWIST = 5;
  const T_MIN = 0.14;
  const JITTER = 0.3;

  // Um ponto sobre a espiral logarítmica, com dispersão perpendicular ao braço.
  // Quatro braços com volta de 5 rad: dois braços ficam longe demais um do outro
  // e o vão vira vazio; quatro preenchem o disco e ainda mostram a espiral.
  const spiralPoint = (t: number, arm: number, scatter: number, offset = 0) => {
    const theta = t * TWIST + (arm * Math.PI * 2) / arms + offset + (rand() - 0.5) * JITTER;
    const r = t * R;
    const nx = Math.cos(theta);
    const ny = Math.sin(theta);
    const spread = scatter * (rand() - 0.5) * 2;
    return { x: cx + nx * r - ny * spread, y: cy + ny * r + nx * spread, t };
  };

  // 0) Halo do disco: um clarão largo sob os braços. Sem ele a galáxia fica
  //    escura demais e some no fundo — os braços precisam de uma base.
  g.globalCompositeOperation = "lighter";
  const diskHalo = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.05);
  diskHalo.addColorStop(0, "rgba(255, 244, 215, 0.3)");
  diskHalo.addColorStop(0.3, "rgba(150, 200, 255, 0.15)");
  diskHalo.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = diskHalo;
  g.beginPath();
  g.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "source-over";

  // 1) Estrelas: o que dá textura e cor ao disco.
  for (let i = 0; i < 18000; i++) {
    const t = T_MIN + Math.pow(rand(), 0.75) * (1 - T_MIN);
    const p = spiralPoint(t, i % arms, 0.5 + (1 - t) * size * 0.016);
    g.fillStyle = t < 0.2 ? core : t < 0.6 ? mid : edge;
    g.globalAlpha = Math.min(1, (0.55 + rand() * 0.45) * 2.4);
    const dot = 0.6 + rand() * 1.4;
    g.fillRect(p.x, p.y, dot, dot);
  }

  // 2) Gás: manchas largas e fracas, só sobre os braços. Sem isso o disco
  //    fica granulado demais e perde a sensação de nuvem.
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3600; i++) {
    const t = T_MIN + Math.pow(rand(), 0.75) * (1 - T_MIN);
    const p = spiralPoint(t, i % arms, 0.5 + (1 - t) * size * 0.016);
    const radius = size * (0.012 + (1 - t) * 0.02);
    const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    grad.addColorStop(0, t < 0.35 ? core : mid);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = grad;
    g.globalAlpha = (0.05 + rand() * 0.05) * 7;
    g.beginPath();
    g.arc(p.x, p.y, radius, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";

  // 3) Bojo: núcleo compacto de estrelas velhas.
  g.globalAlpha = 1;
  const bulgeR = size * 0.09;
  const bulge = g.createRadialGradient(cx, cy, 0, cx, cy, bulgeR);
  bulge.addColorStop(0, "rgba(255, 253, 246, 1)");
  bulge.addColorStop(0.2, "rgba(255, 240, 205, 0.9)");
  bulge.addColorStop(0.5, "rgba(255, 205, 150, 0.28)");
  bulge.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = bulge;
  g.beginPath();
  g.arc(cx, cy, bulgeR, 0, Math.PI * 2);
  g.fill();

  // 4) Poeira: faixas escuras na borda interna de cada braço — é o que separa
  //    um braço do vizinho. O fillStyle PRECISA ser opaco: com um gradiente de
  //    alpha zero aqui, destination-out apaga nada e a poeira não aparece.
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "rgba(0, 0, 0, 1)";
  for (let i = 0; i < 1800; i++) {
    const t = T_MIN + rand() * 0.85;
    const p = spiralPoint(t, i % arms, 0.5 + (1 - t) * size * 0.01, 0.42);
    const radius = size * (0.008 + (1 - t) * 0.018) * (0.6 + rand() * 0.8);
    g.globalAlpha = Math.min(1, (0.1 + rand() * 0.18) * 1.5);
    g.beginPath();
    g.arc(p.x, p.y, radius, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;

  return canvas;
}

/** Buraco negro: horizonte de eventos, anel de fótons e disco de acreção. */
function makeBlackHoleSprite(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.13;

  // Disco de acreção: elipse bem achatada, quente na borda interna. Desenhado
  // antes do horizonte para que o buraco "morda" a parte de trás do disco.
  g.save();
  g.translate(cx, cy);
  g.scale(1, 0.2);
  const disk = g.createRadialGradient(0, 0, r * 1.1, 0, 0, r * 4.4);
  disk.addColorStop(0, "rgba(255, 250, 235, 0.95)");
  disk.addColorStop(0.12, "rgba(255, 214, 150, 0.8)");
  disk.addColorStop(0.3, "rgba(255, 150, 90, 0.42)");
  disk.addColorStop(0.58, "rgba(210, 110, 120, 0.18)");
  disk.addColorStop(0.8, "rgba(140, 110, 255, 0.08)");
  disk.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = disk;
  g.beginPath();
  g.arc(0, 0, r * 4.4, 0, Math.PI * 2);
  g.fill();

  // Filamentos do disco: dão a impressão de matéria em órbita.
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = r * (1.15 + Math.random() * 3.1);
    g.globalAlpha = 0.05 + Math.random() * 0.12;
    g.fillStyle = Math.random() < 0.5 ? "rgba(255, 220, 170, 1)" : "rgba(255, 150, 120, 1)";
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1 + Math.random() * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Anel de fótons: luz que orbitou o buraco antes de escapar. É o traço mais
  // reconhecível da imagem — sem ele o objeto vira uma bolha escura.
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = 1;
  const ringGrad = g.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.35);
  ringGrad.addColorStop(0, "rgba(255, 238, 200, 0)");
  ringGrad.addColorStop(0.45, "rgba(255, 244, 220, 0.9)");
  ringGrad.addColorStop(0.7, "rgba(255, 200, 150, 0.35)");
  ringGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = ringGrad;
  g.beginPath();
  g.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
  g.fill();

  // Halo azulado muito fraco em volta.
  const halo = g.createRadialGradient(cx, cy, r * 1.3, cx, cy, r * 4);
  halo.addColorStop(0, "rgba(140, 190, 255, 0.1)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(cx, cy, r * 4, 0, Math.PI * 2);
  g.fill();

  // Horizonte de eventos: preto absoluto. Nada escapa, nem a luz.
  g.globalCompositeOperation = "source-over";
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.04);
  core.addColorStop(0, "rgba(0, 0, 0, 1)");
  core.addColorStop(0.86, "rgba(0, 0, 0, 1)");
  core.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = core;
  g.beginPath();
  g.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
  g.fill();

  return canvas;
}

type Star = { x: number; y: number; r: number; alpha: number; phase: number; speed: number };

export function CosmicBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let nebula: HTMLCanvasElement | null = null;
    let galaxy: HTMLCanvasElement;
    let blackHole: HTMLCanvasElement;
    let dwarfs: HTMLCanvasElement[] = [];
    // Reconstruir os sprites custa ~180ms (18k estrelas). Em telas parecidas,
    // reaproveita o que já existe — girar o celular não pode travar a página.
    let galaxyCache: { size: number; sprite: HTMLCanvasElement } | null = null;
    let blackHoleCache: { size: number; sprite: HTMLCanvasElement } | null = null;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let running = true;

    const paintNebula = () => {
      const layer = document.createElement("canvas");
      layer.width = Math.max(1, Math.floor(width * dpr));
      layer.height = Math.max(1, Math.floor(height * dpr));
      const g = layer.getContext("2d");
      if (!g) return layer;
      g.scale(dpr, dpr);

      const blobs: [number, number, number, string][] = [
        [width * 0.78, height * 0.12, Math.max(width, height) * 0.55, "rgba(56, 189, 248, 0.16)"],
        [width * 0.1, height * 0.28, Math.max(width, height) * 0.5, "rgba(167, 139, 250, 0.15)"],
        [width * 0.5, height * 0.95, Math.max(width, height) * 0.5, "rgba(251, 191, 36, 0.06)"],
        [width * 0.3, height * 0.6, Math.max(width, height) * 0.7, "rgba(99, 102, 241, 0.1)"],
      ];
      for (const [x, y, r, color] of blobs) {
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, width, height);
      }
      return layer;
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width || window.innerWidth);
      height = Math.max(1, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nebula = paintNebula();

      const galaxySize = Math.round(Math.min(Math.max(width, height) * 1.15, 1400));
      if (!galaxyCache || Math.abs(galaxyCache.size - galaxySize) > galaxySize * 0.15) {
        galaxyCache = {
          size: galaxySize,
          sprite: makeGalaxySprite(galaxySize, 20261118, [
            "rgba(255, 246, 214, 1)",
            "rgba(170, 222, 255, 1)",
            "rgba(196, 170, 255, 1)",
          ]),
        };
      }
      galaxy = galaxyCache.sprite;

      const bhSize = Math.round(Math.min(width, height) * 0.95);
      if (!blackHoleCache || Math.abs(blackHoleCache.size - bhSize) > bhSize * 0.15) {
        blackHoleCache = { size: bhSize, sprite: makeBlackHoleSprite(bhSize) };
      }
      blackHole = blackHoleCache.sprite;

      dwarfs = [
        makeGalaxySprite(320, 77, [
          "rgba(255, 245, 220, 0.8)",
          "rgba(255, 214, 170, 0.6)",
          "rgba(255, 190, 160, 0.45)",
        ]),
        makeGalaxySprite(260, 412, [
          "rgba(235, 250, 255, 0.8)",
          "rgba(170, 225, 255, 0.6)",
          "rgba(150, 190, 255, 0.45)",
        ]),
        makeGalaxySprite(200, 913, [
          "rgba(255, 250, 240, 0.75)",
          "rgba(220, 210, 255, 0.55)",
          "rgba(190, 175, 255, 0.4)",
        ]),
      ];

      const count = Math.round(Math.min(340, (width * height) / 3200));
      const rand = seeded(4242);
      stars = Array.from({ length: count }, () => ({
        x: rand() * width,
        y: rand() * height,
        r: 0.35 + rand() * 1.15,
        alpha: 0.25 + rand() * 0.6,
        phase: rand() * Math.PI * 2,
        speed: 0.15 + rand() * 0.5,
      }));
    };

    const paintStars = (t: number) => {
      for (const s of stars) {
        // Deriva vertical quase imperceptível: 0,6 px por segundo.
        const y = (s.y + t * 0.6) % height;
        const twinkle = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(t * s.speed + s.phase);
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      if (nebula) ctx.drawImage(nebula, 0, 0, width, height);

      const unit = Math.min(width, height);
      // Tela alta (celular): a galáxia precisa caber na largura e ficar no
      // terço de cima, longe do conteúdo. Tela larga: cabe folgada.
      const tall = height > width * 1.2;

      // Galáxias anãs: pequenas, apagadas, girando ainda mais devagar. Ficam
      // longe da principal para não competir com ela.
      const dwarfSpots: [number, number, number, number, number][] = [
        [0.2, 0.1, 0.34, 0.004, 0.42],
        [0.86, 0.7, 0.26, -0.003, 0.5],
        [0.44, 0.9, 0.2, 0.0035, 0.6],
      ];
      dwarfSpots.forEach(([px, py, scale, spin, squash], i) => {
        const sprite = dwarfs[i];
        if (!sprite) return;
        const s = unit * scale;
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.translate(width * px, height * py);
        ctx.scale(1, squash);
        ctx.rotate(t * spin);
        ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      });

      // Galáxia principal: inteira dentro da tela, inclinada como um disco
      // visto de lado. Uma volta completa leva ~9 minutos.
      const gs = tall ? width * 0.92 : unit * 0.86;
      ctx.save();
      ctx.globalAlpha = tall ? 0.8 : 0.85;
      ctx.translate(width * (tall ? 0.5 : 0.68), height * (tall ? 0.14 : 0.2));
      ctx.scale(1, tall ? 0.55 : 0.62);
      ctx.rotate(t * 0.0116);
      ctx.drawImage(galaxy, -gs / 2, -gs / 2, gs, gs);
      ctx.restore();

      // Buraco negro: o disco gira, o horizonte fica parado. No celular fica
      // abaixo da galáxia, no vão entre os cartões.
      const bh = tall ? width * 0.6 : unit * 0.5;
      ctx.save();
      ctx.globalAlpha = tall ? 0.72 : 0.85;
      ctx.translate(width * (tall ? 0.22 : 0.18), height * (tall ? 0.62 : 0.76));
      ctx.rotate(t * 0.018);
      ctx.drawImage(blackHole, -bh / 2, -bh / 2, bh, bh);
      ctx.restore();

      paintStars(t);
    };

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!last) last = now;
      const delta = now - last;
      // ~30 quadros por segundo: suficiente para o movimento lento e metade da bateria.
      if (delta < 33) return;
      last = now;
      elapsed += delta / 1000;
      draw(elapsed);
    };

    build();
    if (reduceMotion) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    let resizeTimer = 0;
    const onResize = () => {
      // Girar o celular dispara dezenas de eventos; só o último interessa.
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        if (reduceMotion) draw(elapsed);
      }, 150);
    };
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="cosmic-backdrop" aria-hidden />;
}

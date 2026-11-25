<script lang="ts">
  import { onMount } from "svelte";
  import { drawIcon, parseIcon } from "../cube-icon";

  let {
    svg,
    active = false,
    spin = 1,
  }: { svg: string; active?: boolean; spin?: number } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);

  const VERTS = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const FOCAL = 6.5;
  const CAM_Z = 6.5;
  const FACE_MAX = 0.38;

  onMount(() => {
    if (!canvas) return;
    const el: HTMLCanvasElement = canvas;
    const context = el.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;

    const phase = Math.random() * Math.PI * 2;
    let icon = parseIcon(svg);
    let iconSource = svg;

    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let mouseX = NaN;
    let mouseY = NaN;
    let faceX = 0;
    let faceY = 0;
    let lift = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
    }

    function draw(dt: number) {
      if (svg !== iconSource) {
        icon = parseIcon(svg);
        iconSource = svg;
      }

      const rect = el.getBoundingClientRect();
      const cx = width / 2;
      const cy = height / 2;
      const half = Math.min(width, height) * 0.27;

      const reach = Math.max(window.innerWidth * 0.4, 360);
      const hasMouse = !Number.isNaN(mouseX);
      const yaw = hasMouse
        ? Math.max(-1, Math.min(1, (mouseX - (rect.left + cx)) / reach)) *
          FACE_MAX
        : 0;
      const pitch = hasMouse
        ? -Math.max(-1, Math.min(1, (mouseY - (rect.top + cy)) / reach)) *
          FACE_MAX
        : 0;
      const follow = 1 - Math.exp(-dt * 6);
      faceX += (yaw - faceX) * follow;
      faceY += (pitch - faceY) * follow;
      lift += ((active ? 1 : 0) - lift) * (1 - Math.exp(-dt * 8));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const ang = elapsed * 0.5 * spin + phase;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const tip = 0.35;
      const cb = Math.cos(tip);
      const sb = Math.sin(tip);
      const pts = VERTS.map(([x, y, z]) => {
        const rx = x * ca + z * sa;
        const rz = -x * sa + z * ca;
        const ry = y * cb - rz * sb;
        const rz2 = y * sb + rz * cb;
        const s = FOCAL / (CAM_Z - rz2);
        return { x: cx + rx * half * s, y: cy + ry * half * s, z: rz2 };
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(222, 231, 255, ${(0.5 + 0.35 * lift).toFixed(3)})`;

      const stroke = (back: boolean) => {
        ctx.beginPath();
        for (const [a, b] of EDGES) {
          if (pts[a].z + pts[b].z < 0 !== back) continue;
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
        }
        ctx.stroke();
      };

      stroke(true);
      drawIcon(
        ctx,
        dpr,
        icon,
        cx,
        cy,
        half * 0.82,
        half * 0.17,
        faceX,
        faceY,
        0.88,
        lift,
      );
      stroke(false);
    }

    function tick(now: number) {
      if (last === 0) last = now;
      const dt = Math.min(now - last, 48) / 1000;
      last = now;
      elapsed += dt;
      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reduced || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    }

    function onPointerMove(event: PointerEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    }

    function onMotionChange() {
      reduced = motion.matches;
      if (reduced) {
        cancelAnimationFrame(raf);
        draw(0);
      } else {
        start();
      }
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(0);
    });
    ro.observe(el);

    resize();
    draw(0);
    start();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotionChange);
    };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>

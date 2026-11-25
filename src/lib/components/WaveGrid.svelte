<script lang="ts">
  import { onMount } from "svelte";

  let canvas = $state<HTMLCanvasElement | null>(null);

  onMount(() => {
    if (!canvas) return;
    const el: HTMLCanvasElement = canvas;

    const context = el.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const CELL = 128; // grid spacing in px
    const AMP = 8; // wave displacement in px
    const STEP = CELL / 6; // sample distance along each line
    const DRIFT_X = 6; // horizontal scroll speed in px/s
    const DRIFT_Y = 10; // vertical scroll speed in px/s

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let elapsed = 0;
    let last = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function warp(x: number, y: number, t: number) {
      const dx =
        AMP * Math.sin(y * 0.0135 + t * 0.5) +
        AMP * 0.5 * Math.sin((x + y * 0.5) * 0.021 - t * 0.32);
      const dy =
        AMP * Math.sin(x * 0.0115 - t * 0.42) +
        AMP * 0.5 * Math.cos((x * 0.5 - y) * 0.019 + t * 0.27);
      return [x + dx, y + dy] as const;
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";

      const margin = AMP * 3 + CELL;
      const left = -margin;
      const right = width + margin;
      const top = -margin;
      const bottom = height + margin;

      const offsetY = (t * DRIFT_Y) % CELL;
      const offsetX = (t * DRIFT_X) % CELL;

      for (let y = top + offsetY; y <= bottom; y += CELL) {
        ctx.beginPath();
        for (let x = left; x <= right + STEP; x += STEP) {
          const [px, py] = warp(x, y, t);
          if (x === left) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      for (let x = left + offsetX; x <= right; x += CELL) {
        ctx.beginPath();
        for (let y = top; y <= bottom + STEP; y += STEP) {
          const [px, py] = warp(x, y, t);
          if (y === top) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    function tick(now: number) {
      if (last === 0) last = now;
      elapsed += Math.min(now - last, 50);
      last = now;
      draw(elapsed / 1000);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (reduced || document.hidden) return;
      cancelAnimationFrame(raf);
      last = 0;
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function onResize() {
      resize();
      if (reduced) draw(elapsed / 1000);
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    function onMotionChange() {
      reduced = motion.matches;
      if (reduced) {
        stop();
        draw(elapsed / 1000);
      } else {
        start();
      }
    }

    resize();
    if (reduced) draw(0);
    else start();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotionChange);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotionChange);
    };
  });
</script>

<div class="wave-grid" aria-hidden="true">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .wave-grid {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    overflow: hidden;
    pointer-events: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>

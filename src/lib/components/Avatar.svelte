<script lang="ts">
  import { onMount } from "svelte";

  let { src, pixels = 128 }: { src: string; pixels?: number } = $props();

  const FACE_MAX = 0.38;

  let wrap: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();

  onMount(() => {
    if (!wrap || !canvas) return;
    const el = wrap;
    const cv = canvas;

    const image = new Image();
    image.onload = () => {
      const small = document.createElement("canvas");
      small.width = small.height = pixels;
      const sctx = small.getContext("2d");
      const ctx = cv.getContext("2d");
      if (!sctx || !ctx) return;
      sctx.imageSmoothingQuality = "high";
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      sctx.drawImage(image, sx, sy, side, side, 0, 0, pixels, pixels);
      cv.width = cv.height = pixels;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0);
    };
    image.src = src;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mouseX = NaN;
    let mouseY = NaN;
    let yaw = 0;
    let pitch = 0;
    let last = 0;
    let raf = 0;

    function frame(now: number) {
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      const rect = el.getBoundingClientRect();
      const reach = Math.max(window.innerWidth * 0.4, 360);
      const has = !Number.isNaN(mouseX) && !motion.matches;
      const ty = has
        ? Math.max(
            -1,
            Math.min(1, (mouseX - (rect.left + rect.width / 2)) / reach),
          ) * FACE_MAX
        : 0;
      const tx = has
        ? -Math.max(
            -1,
            Math.min(1, (mouseY - (rect.top + rect.height / 2)) / reach),
          ) * FACE_MAX
        : 0;
      const follow = 1 - Math.exp(-dt * 6);
      yaw += (ty - yaw) * follow;
      pitch += (tx - pitch) * follow;
      el.style.transform = `perspective(700px) rotateX(${pitch}rad) rotateY(${yaw}rad)`;
      raf = requestAnimationFrame(frame);
    }

    function onMove(event: PointerEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  });
</script>

<div class="avatar" bind:this={wrap} role="img" aria-label="img">
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
  .avatar {
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid rgba(255, 255, 255, 0.18);
    will-change: transform;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
</style>

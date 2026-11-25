<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import SiteNav from "#lib/components/SiteNav.svelte";
  import NowPlaying from "#lib/components/NowPlaying.svelte";
  import { hasEntered, onEntered } from "../lib/intro-state";

  let navVisible = $state(false);
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  onMount(() => {
    if (hasEntered()) {
      if (reducedMotion()) {
        navVisible = true;
        return;
      }

      revealTimer = setTimeout(() => (navVisible = true), 1200);
      return;
    }

    unsubscribe = onEntered(() => {
      if (reducedMotion()) {
        navVisible = true;
        return;
      }

      revealTimer = setTimeout(() => (navVisible = true), 800);
    });
  });

  onDestroy(() => {
    clearTimeout(revealTimer);
    unsubscribe?.();
  });
</script>

<svelte:head>
  <title>xenon.zone</title>
</svelte:head>

<SiteNav visible={navVisible} />

<div class="now-playing-slot" class:visible={navVisible}>
  <NowPlaying />
</div>

<style>
  .now-playing-slot {
    position: fixed;
    top: clamp(1.25rem, 4vw, 3rem);
    left: clamp(1.25rem, 4vw, 3rem);
    max-width: min(18rem, calc(100vw - 2.5rem));
    font-family: "Terminus", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: clamp(0.64rem, 1.2vw, 0.74rem);
    opacity: 0;
    pointer-events: none;
    transition: opacity 900ms cubic-bezier(0.25, 0, 0.1, 1);
  }

  .now-playing-slot.visible {
    opacity: 1;
  }

  .now-playing-slot :global(.now-playing) {
    margin-top: 0;
  }
</style>

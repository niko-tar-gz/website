<script lang="ts">
  import "./layout.css";
  import favicon from "#lib/assets/favicon.png";
  import WaveGrid from "#lib/components/WaveGrid.svelte";
  import Intro from "#lib/components/Intro.svelte";
  import { fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { page } from "$app/state";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();

  const showGrid = $derived(page.url.pathname !== "/");
</script>

<svelte:head>
  <link rel="icon" type="image/png" href={favicon} />
</svelte:head>

{#if showGrid}
  <div
    class="grid"
    in:fade={{ duration: 1800, easing: quintOut }}
    out:fade={{ duration: 400, easing: quintOut }}
  >
    <WaveGrid />
  </div>
{/if}

<div class="content">
  {@render children()}
</div>

<Intro />

<style>
  .grid {
    position: relative;
    z-index: 1;
  }

  .content {
    position: relative;
    z-index: 2;
  }
</style>

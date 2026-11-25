<script lang="ts">
  import { onMount } from "svelte";
  import { startAmbient } from "../lib/sfx";
  import nohoverImage from "#lib/assets/niko_nohover.png";
  import hoverImage from "#lib/assets/niko_hover.png";

  let hovered = $state(false);

  onMount(startAmbient);
</script>

<svelte:head>
  <title>xenon.zone</title>
</svelte:head>

<div class="void">
  <div
    class="mascot"
    role="img"
    aria-label="Niko"
    onpointerenter={() => (hovered = true)}
    onpointerleave={() => (hovered = false)}
  >
    <img src={nohoverImage} alt="" class:shown={!hovered} />
    <img src={hoverImage} alt="" class:shown={hovered} />
  </div>
</div>

<style>
  .void {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #000;
  }

  .mascot {
    position: absolute;
    left: clamp(1.25rem, 4vw, 3rem);
    bottom: clamp(1.25rem, 4vw, 3rem);
    display: grid;
  }

  img {
    grid-area: 1 / 1;
    max-width: 80vw;
    height: auto;
    opacity: 0;
  }

  img.shown {
    opacity: 1;
  }
</style>

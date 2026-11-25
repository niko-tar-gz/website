<script lang="ts">
  import type { Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import { playBack, playHover } from "../sfx";

  let {
    title,
    wide = false,
    children,
  }: { title: string; wide?: boolean; children?: Snippet } = $props();

  let leaving = $state(false);

  function back(event: MouseEvent) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    if (leaving) return;
    leaving = true;
    playBack();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void goto("/");
      return;
    }

    setTimeout(() => {
      void goto("/").catch(() => {
        leaving = false;
      });
    }, 260);
  }

  function hover(event: PointerEvent) {
    if (event.pointerType === "mouse") playHover();
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<main class="page" class:leaving>
  <a class="back" href="/" onclick={back} onpointerenter={hover}>home</a>
  <h1>{title}</h1>
  {#if children}
    <div class="body" class:wide>
      {@render children()}
    </div>
  {/if}
</main>

<style>
  .page {
    box-sizing: border-box;
    min-height: 100dvh;
    padding: clamp(1.25rem, 4vw, 3rem);
    padding-block: clamp(3.5rem, 8vh, 5rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: "Terminus", ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #fff;
    animation: page-in 1300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .page.leaving {
    animation: page-out 260ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
  }

  @keyframes page-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes page-out {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(6px) scale(0.985);
    }
  }

  .back {
    position: absolute;
    top: clamp(1.25rem, 4vw, 3rem);
    left: clamp(1.25rem, 4vw, 3rem);
    display: inline-block;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    font-size: clamp(0.64rem, 1.2vw, 0.74rem);
    letter-spacing: 0.16em;
    transition: color 160ms ease;
  }

  .back::before {
    content: "← ";
  }

  .back:hover,
  .back:focus-visible {
    color: #fff;
  }

  .back:focus-visible {
    outline: 1px solid rgba(255, 255, 255, 0.5);
    outline-offset: 4px;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.8rem, 6vw, 4rem);
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1;
  }

  .body {
    margin-top: 2rem;
    width: 100%;
    max-width: 56ch;
    font-size: clamp(0.8rem, 1.5vw, 0.95rem);
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
  }

  .body.wide {
    max-width: 64rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .page,
    .page.leaving {
      animation: none;
    }

    .back {
      transition: none;
    }
  }
</style>

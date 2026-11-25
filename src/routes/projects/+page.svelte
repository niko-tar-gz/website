<script lang="ts">
  import CubeIcon from "#lib/components/CubeIcon.svelte";
  import PageShell from "#lib/components/PageShell.svelte";
  import { projects } from "../../lib/projects";
  import { onMount } from "svelte";
  import { playClick, playHover, playLink, playPage } from "../../lib/sfx";

  onMount(playPage);

  let selected = $state(0);
  const project = $derived(projects[selected]);

  function choose(index: number) {
    if (index === selected) return;
    selected = index;
    playClick();
  }

  function hover(event: PointerEvent) {
    if (event.pointerType === "mouse") playHover();
  }
</script>

<PageShell title="PROJECTS" wide>
  <div class="projects">
    <ul class="grid" aria-label="Projects">
      {#each projects as item, i (item.id)}
        <li>
          <button
            type="button"
            class="cell"
            class:selected={i === selected}
            aria-label={item.title}
            aria-pressed={i === selected}
            onclick={() => choose(i)}
            onpointerenter={hover}
          >
            <CubeIcon svg={item.icon} active={i === selected} />
          </button>
        </li>
      {/each}
    </ul>

    <section class="detail" aria-live="polite">
      <div class="big">
        <CubeIcon svg={project.icon} active />
      </div>

      {#key project.id}
        <div class="info">
          <h2>{project.title}</h2>
          <p>{project.description}</p>
          {#if project.source || project.visit}
            <div class="links">
              {#if project.source}
                <a
                  href={project.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  onpointerenter={hover}
                  onclick={playLink}
                >
                  source
                </a>
              {/if}
              {#if project.visit}
                <a
                  href={project.visit}
                  target="_blank"
                  rel="noopener noreferrer"
                  onpointerenter={hover}
                  onclick={playLink}
                >
                  visit
                </a>
              {/if}
            </div>
          {/if}
        </div>
      {/key}
    </section>
  </div>
</PageShell>

<style>
  .projects {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    gap: clamp(1.5rem, 5vw, 4rem);
    align-items: center;
    text-align: left;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(0.4rem, 1.2vw, 0.9rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cell {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition:
      border-color 400ms cubic-bezier(0.25, 0, 0.1, 1),
      background-color 400ms cubic-bezier(0.25, 0, 0.1, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .cell:hover,
  .cell:focus-visible {
    border-color: rgba(255, 255, 255, 0.28);
  }

  .cell.selected {
    border-color: rgba(238, 242, 255, 0.55);
    background: rgba(255, 255, 255, 0.06);
  }

  .cell:focus-visible {
    outline: 1px solid rgba(238, 242, 255, 0.6);
    outline-offset: 2px;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;
  }

  .big {
    width: 100%;
    max-width: min(28rem, 44vh);
    aspect-ratio: 1;
  }

  .info {
    animation: info-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.1rem, 2.6vw, 1.5rem);
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #fff;
  }

  p {
    margin: 0.9rem 0 0;
    max-width: 46ch;
    color: rgba(255, 255, 255, 0.7);
  }

  .links {
    display: flex;
    gap: 1.5rem;
    margin-top: 1.4rem;
  }

  .links a {
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    letter-spacing: 0.16em;
    transition: color 200ms ease;
  }

  .links a::before {
    content: "↗ ";
  }

  .links a:hover,
  .links a:focus-visible {
    color: #fff;
  }

  .links a:focus-visible {
    outline: 1px solid rgba(255, 255, 255, 0.5);
    outline-offset: 4px;
  }

  @keyframes info-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 720px) {
    .projects {
      grid-template-columns: minmax(0, 1fr);
    }

    .big {
      max-width: 22rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .info {
      animation: none;
    }

    .cell,
    .links a {
      transition: none;
    }
  }
</style>

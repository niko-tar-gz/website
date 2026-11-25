<script lang="ts">
  import { onMount } from "svelte";

  type Track = {
    artist: string;
    track: string;
    album: string;
    image: string;
    now_playing: boolean;
  };

  const ENDPOINT = "https://nowplaying.xenon.zone";
  const REFRESH_MS = 15000;

  let track = $state<Track | null>(null);

  onMount(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    async function refresh() {
      try {
        const response = await fetch(ENDPOINT);
        if (response.ok) track = await response.json();
      } catch {}
      if (!stopped) timer = setTimeout(refresh, REFRESH_MS);
    }

    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  });
</script>

{#if track}
  <div class="now-playing">
    {#if track.image}
      <img src={track.image} alt="" width="48" height="48" />
    {/if}
    <div class="meta">
      <span class="label"
        >{track.now_playing ? "now playing" : "last played"}</span
      >
      <span class="title">{track.track}</span>
      <span class="artist">{track.artist}</span>
    </div>
  </div>
{/if}

<style>
  .now-playing {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin-top: 1.5rem;
    animation: fade-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  img {
    flex: none;
    width: 3rem;
    height: 3rem;
    border: 1px solid rgba(255, 255, 255, 0.18);
    image-rendering: pixelated;
  }

  .meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.4;
  }

  .label {
    font-size: 0.75em;
    letter-spacing: 0.16em;
    color: rgba(255, 255, 255, 0.45);
  }

  .title {
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .artist {
    color: rgba(255, 255, 255, 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .now-playing {
      animation: none;
    }
  }
</style>

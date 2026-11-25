<script lang="ts">
  import PageShell from "#lib/components/PageShell.svelte";
  import NowPlaying from "#lib/components/NowPlaying.svelte";
  import Avatar from "#lib/components/Avatar.svelte";
  import nikoImage from "#lib/assets/niko.jpg";
  import { onMount } from "svelte";
  import { playPage } from "../../lib/sfx";

  const DATE_OF_BIRTH = new Date("2011-03-24T00:00:00");

  const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

  function currentAge() {
    return (Date.now() - DATE_OF_BIRTH.getTime()) / YEAR_MS;
  }

  let age = $state("00.00000000000000");

  onMount(() => {
    playPage();
    age = currentAge().toFixed(14);
    let frame = requestAnimationFrame(function tick() {
      age = currentAge().toFixed(14);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<PageShell title="ABOUT ME" wide>
  <div class="about">
    <div class="pfp"><Avatar src={nikoImage} /></div>
    <div class="text">
      <p class="lead">hey, i'm niko!</p>
      <p>
        i'm a <span class="age">{age}</span> year old self-taught programmer from
        poland
      </p>
      <p>i mainly do things related to vr, but i do make other stuff too.</p>
      <p>i also live in scotland, i guess</p>
      <NowPlaying />
    </div>
  </div>
</PageShell>

<style>
  .about {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(1.25rem, 4vw, 2.5rem);
    text-align: left;
  }

  .pfp {
    flex: none;
    width: clamp(6rem, 18vw, 10rem);
  }

  .text {
    max-width: 44ch;
    min-width: 0;
  }

  @media (max-width: 560px) {
    .about {
      flex-direction: column;
    }
  }

  .about p {
    margin: 0 0 1rem;
  }

  .lead {
    color: #fff;
    font-size: 1.15em;
  }

  .age {
    display: inline-block;
    color: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }
</style>

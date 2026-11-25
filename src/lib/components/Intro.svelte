<script lang="ts">
  import { onMount } from "svelte";
  import loadUrl from "#lib/assets/audio/load.wav";
  import { page } from "$app/state";
  import { markEntered } from "../intro-state";
  import { setWarpHandler } from "../scene-transition";
  import {
    isMuted,
    onMuteChange,
    playBoot,
    playClick,
    playHover,
    toggleMuted,
    unlockAudio,
  } from "../sfx";
  import discordSvg from "../assets/svg/discord.svg?raw";
  import githubSvg from "../assets/svg/github.svg?raw";
  import steamSvg from "../assets/svg/steam.svg?raw";
  import { drawIcon as drawSlab, parseIcon } from "../cube-icon";
  import mutedSvg from "../assets/svg/muted.svg?raw";
  import unmutedSvg from "../assets/svg/unmuted.svg?raw";

  type CornerItem = { key: string; label: string; href?: string; svg: string };

  const LINKS: CornerItem[] = [
    {
      key: "discord",
      label: "Discord",
      href: "https://discord.com/users/1147914900086206572",
      svg: discordSvg,
    },
    {
      key: "github",
      label: "GitHub",
      href: "https://github.com/niko-tar-gz",
      svg: githubSvg,
    },
    {
      key: "steam",
      label: "Steam",
      href: "https://steamcommunity.com/id/-talons-/",
      svg: steamSvg,
    },
    { key: "mute", label: "Mute sound", svg: mutedSvg },
  ];

  let soundMuted = $state(false);

  onMount(() => {
    soundMuted = isMuted();
    return onMuteChange(() => (soundMuted = isMuted()));
  });

  function toggleSound() {
    // Click blip plays when muting (before it goes silent) and when unmuting (after).
    const wasMuted = isMuted();
    if (!wasMuted) playClick();
    toggleMuted();
    if (wasMuted) playClick();
  }

  let linkEls = $state<HTMLElement[]>([]);
  let setLinkHover: ((index: number, on: boolean) => void) | null = null;

  function linkHover(index: number, on: boolean, event?: Event) {
    setLinkHover?.(index, on);
    if (on && (!event || (event as PointerEvent).pointerType === "mouse"))
      playHover();
  }

  // This lives in the root layout so the cubes persist across pages: the welcome
  // overlay only matters on the home page, while the canvas keeps running everywhere.
  let canvas = $state<HTMLCanvasElement | null>(null);
  let entered = $state(false);
  // Landing straight on a subpage skips the welcome screen.
  // svelte-ignore state_referenced_locally
  let leaving = $state(page.url.pathname !== "/");

  type Vec3 = [number, number, number];

  let startLeave: (() => void) | null = null;
  let setRoute: ((home: boolean, instant?: boolean) => void) | null = null;

  $effect(() => {
    const home = page.url.pathname === "/";
    setRoute?.(home);
  });

  onMount(() => {
    if (!canvas) return;
    const el: HTMLCanvasElement = canvas;
    const context = el.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;

    const FOCAL = 6.5;
    const CAM_Z = 6.5;
    const CENTER_SIZE = 0.24;
    const TAU = Math.PI * 2;
    const LEAVE_MS = 2200;
    const WARP_MS = 1500;
    // How far the camera flies forward (scene units) during the page transition.
    const TRAVEL = 5.2;
    const SCENE_Y = 0.46;
    const OMEGA = 2.4;

    // Third-order critically damped spring: eases in gently from rest, then glides to
    // a stop with a long, soft tail.
    function glide(x: number, omega: number) {
      const a = omega * Math.max(x, 0);
      return 1 - (1 + a + (a * a) / 2) * Math.exp(-a);
    }

    function spring(u: number) {
      return glide(u, OMEGA);
    }

    // Same curve squeezed into 0..1 so it lands exactly on 1 (used for the camera flight).
    const WARP_OMEGA = 7;
    const WARP_NORM = glide(1, WARP_OMEGA);
    function warpEase(u: number) {
      return Math.min(glide(u, WARP_OMEGA) / WARP_NORM, 1);
    }

    // Seeded RNG so the dust cloud is the same on every load.
    let seed = 0x9e3779b9;
    function rand() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    const CUBE_VERTS: Vec3[] = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];
    const CUBE_EDGES: [number, number][] = [
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

    const DUST_COUNT = 46;

    type Dust = {
      nx: number;
      ny: number;
      // depthg
      z: number;
      driftX: number;
      driftY: number;
      driftZ: number;
      driftSpeedX: number;
      driftSpeedY: number;
      driftSpeedZ: number;
      floatPhase: number;
      size: number;
      alpha: number;
      spin: number;
      spinOffset: number;
      axis: number;
      survivor: boolean;
      cornerX: number;
      cornerY: number;
      bigSize: number;
      bigAlpha: number;
      // orbit around the intro cube
      radius: number;
      theta0: number;
      dir: number;
      orbitSpeed: number;
      tiltK: number;
      roll: number;
      // mouse push
      offX: number;
      offY: number;
      velX: number;
      velY: number;
      // corner cube clump thing with links
      linkIndex: number;
      faceX: number;
      faceY: number;
      hover: boolean;
      hoverAmt: number;
      iconX: number;
      iconY: number;
    };

    const dust: Dust[] = Array.from({ length: DUST_COUNT }, () => {
      const z = -3 + rand() * 5.5;
      const depth = (z + 3) / 5.5;

      return {
        nx: rand() * 2 - 1,
        ny: rand() * 2 - 1,
        z,
        driftX: 0.08 + rand() * 0.22,
        driftY: 0.08 + rand() * 0.22,
        driftZ: 0.04 + rand() * 0.12,
        driftSpeedX: 0.08 + rand() * 0.22,
        driftSpeedY: 0.07 + rand() * 0.2,
        driftSpeedZ: 0.05 + rand() * 0.15,
        floatPhase: rand() * TAU,
        size: 0.04 + depth * 0.08 + rand() * 0.02,
        alpha: 0.16 + depth * 0.32 + rand() * 0.08,
        spin: (0.2 + rand() * 0.5) * (rand() < 0.5 ? -1 : 1),
        spinOffset: rand() * TAU,
        axis: (rand() - 0.5) * 0.8,
        survivor: false,
        cornerX: 0,
        cornerY: 0,
        bigSize: 0,
        bigAlpha: 0,
        radius: 1.2 + rand() * 0.9,
        theta0: rand() * TAU,
        dir: rand() < 0.5 ? -1 : 1,
        orbitSpeed: 0.1 + rand() * 0.12,
        tiltK: rand() * 2 - 1,
        roll: rand() * TAU,
        offX: 0,
        offY: 0,
        velX: 0,
        velY: 0,
        linkIndex: -1,
        faceX: 0,
        faceY: 0,
        hover: false,
        hoverAmt: 0,
        iconX: 0,
        iconY: 0,
      };
    });

    const survivorCount = LINKS.length;
    const order = Array.from({ length: DUST_COUNT }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    for (let i = 0; i < survivorCount; i++) {
      const d = dust[order[i]];
      d.survivor = true;
      d.cornerX = 0.11 + (rand() - 0.5) * 0.1;
      d.cornerY = 0.85 + (rand() - 0.5) * 0.12;
      d.bigSize = 0.34 + rand() * 0.04;
      d.bigAlpha = 0.6 + rand() * 0.16;
      d.floatPhase = rand() * TAU;
      d.linkIndex = i;
    }

    const icons = LINKS.map((link) => parseIcon(link.svg));
    const mutedIcon = parseIcon(mutedSvg);
    const unmutedIcon = parseIcon(unmutedSvg);

    function iconFor(index: number) {
      return LINKS[index].key === "mute"
        ? isMuted()
          ? mutedIcon
          : unmutedIcon
        : icons[index];
    }

    let width = 0;
    let height = 0;
    let unit = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    let elapsed = 0;
    let last = 0;
    let leaveStart = 0;
    let warpFrom = 0;
    let warpTarget = 0;
    let warpT0 = 0;

    function currentWarp(now: number) {
      if (!warpT0) return warpTarget;
      const u = Math.min((now - warpT0) / WARP_MS, 1);
      return warpFrom + (warpTarget - warpFrom) * warpEase(u);
    }

    const px = new Float64Array(8);
    const py = new Float64Array(8);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = width / 2;
      cy = height * SCENE_Y;
      unit = Math.min(width * 0.78, height * 0.54, 520) * 0.185;
      computeOpenLayout();
    }

    let camZ = CAM_Z;
    let camX = 0;
    let camY = 0;
    let aimX = 0;
    let aimY = 0;
    function pickAim() {
      const a = rand() * TAU;
      const r = 0.5 + rand() * 0.6;
      aimX = Math.cos(a) * r;
      aimY = Math.sin(a) * r;
    }
    let centerFade = 1;
    const NEAR = 0.12;
    const vis = new Uint8Array(8);
    const pz = new Float64Array(8);

    function project(x: number, y: number, z: number): [number, number] {
      const s = FOCAL / Math.max(camZ - z, NEAR);
      return [cx + (x - camX) * unit * s, cy + (y - camY) * unit * s];
    }

    function strokeEdges(only?: "back" | "front") {
      ctx.beginPath();
      for (const [i0, i1] of CUBE_EDGES) {
        if (!vis[i0] || !vis[i1]) continue;
        if (only) {
          const isBack = pz[i0] + pz[i1] < 0;
          if (isBack !== (only === "back")) continue;
        }
        ctx.moveTo(px[i0], py[i0]);
        ctx.lineTo(px[i1], py[i1]);
      }
      ctx.stroke();
    }

    function orbitPos(d: Dust, t: number): Vec3 {
      const phi =
        d.theta0 +
        (d.dir * d.orbitSpeed * t) / Math.sqrt(Math.max(d.radius, 1));
      const x = d.radius * Math.cos(phi);
      const y = d.radius * Math.sin(phi);
      const tilt =
        d.tiltK * Math.asin(Math.min(1, 2.2 / Math.max(d.radius, 0.01)));
      const yt = y * Math.cos(tilt);
      const z = y * Math.sin(tilt);
      const cr = Math.cos(d.roll);
      const sr = Math.sin(d.roll);
      return [x * cr - yt * sr, x * sr + yt * cr, z];
    }

    const FACE_MAX = 0.38;
    function clamp(v: number, lo: number, hi: number) {
      return Math.min(Math.max(v, lo), hi);
    }

    let homeRoute = page.url.pathname === "/";
    let warpNow = 0;

    const PUSH = 0.035;
    const DRAG = 1.6;
    const SPRING = 0.64;
    let lastPointerX = NaN;
    let lastPointerY = NaN;

    const openLayout = new Map<Dust, [number, number]>();

    function computeOpenLayout() {
      const group = dust
        .filter((d) => d.survivor)
        .sort((a, b) => a.linkIndex - b.linkIndex);
      const minDist = Math.min(
        Math.max(Math.min(width, height) * 0.24, 120),
        200,
      );
      const margin = minDist * 0.6;
      const cols = Math.ceil(Math.sqrt(group.length));
      const rows = Math.ceil(group.length / cols);
      const span = [(cols - 1) * minDist, (rows - 1) * minDist];
      const originX = Math.min(
        Math.max(width * 0.11 - span[0] / 2, margin),
        Math.max(width - margin - span[0], margin),
      );
      const originY = Math.min(
        Math.max(height * 0.85 - span[1] / 2, margin),
        Math.max(height - margin - span[1], margin),
      );

      group.forEach((d, i) => {
        openLayout.set(d, [
          originX + (i % cols) * minDist,
          originY + Math.floor(i / cols) * minDist,
        ]);
      });
    }

    let mouseX = -1e5;
    let mouseY = -1e5;
    let spread = 0;

    function stepSpread(dt: number) {
      const cX = width * 0.11;
      const cY = height * 0.85;
      const reach = Math.min(width, height) * 0.5;
      const dist = Math.hypot(mouseX - cX, mouseY - cY);
      const near = Math.max(0, 1 - dist / reach);
      const target = near * near * (3 - 2 * near);
      spread += (target - spread) * (1 - Math.exp(-dt * 2.2));
    }

    function onPointerMove(event: PointerEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (reduced) return;
      if (!Number.isNaN(lastPointerX)) {
        const mx = event.clientX - lastPointerX;
        const my = event.clientY - lastPointerY;
        for (const d of dust) {
          const k = (PUSH * (0.5 + (d.z + 3) / 5.5)) / unit;
          d.velX += mx * k;
          d.velY += my * k;
        }
      }
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    }

    function stepPush(dt: number) {
      stepSpread(dt);
      const damp = Math.exp(-DRAG * dt);
      for (const d of dust) {
        d.velX = (d.velX - d.offX * SPRING * dt) * damp;
        d.velY = (d.velY - d.offY * SPRING * dt) * damp;
        d.offX += d.velX * dt;
        d.offY += d.velY * dt;

        if (d.linkIndex >= 0) {
          const reachPx = Math.max(Math.min(width, height) * 0.6, 300);
          const hasMouse = mouseX > -1e4;
          const yaw = hasMouse
            ? clamp((mouseX - d.iconX) / reachPx, -1, 1) * FACE_MAX
            : 0;
          const pitch = hasMouse
            ? -clamp((mouseY - d.iconY) / reachPx, -1, 1) * FACE_MAX
            : 0;
          const follow = 1 - Math.exp(-dt * 6);
          d.faceX += (yaw - d.faceX) * follow;
          d.faceY += (pitch - d.faceY) * follow;
          d.hoverAmt +=
            ((d.hover ? 1 : 0) - d.hoverAmt) * (1 - Math.exp(-dt * 8));
        }
      }
    }

    function drawDust(t: number, scatter: number) {
      for (const d of dust) {
        if (d.survivor) {
          drawSurvivor(d, t, scatter);
          continue;
        }

        const [ox, oy, oz] = orbitPos(d, t);

        const s = FOCAL / (CAM_Z - d.z);
        const baseX = ((d.nx * 0.5 + 0.5) * width - cx) / (unit * s);
        const baseY = ((d.ny * 0.5 + 0.5) * height - cy) / (unit * s);
        const tx =
          baseX + Math.sin(t * d.driftSpeedX + d.floatPhase) * d.driftX;
        const ty =
          baseY + Math.cos(t * d.driftSpeedY + d.floatPhase * 1.3) * d.driftY;
        const tz =
          d.z + Math.sin(t * d.driftSpeedZ + d.floatPhase * 0.7) * d.driftZ;

        const e = Math.min(scatter, 1);
        const wx = ox + (tx - ox) * e + d.offX;
        const wy = oy + (ty - oy) * e + d.offY;
        const wz = oz + (tz - oz) * e;

        const ang = t * d.spin + d.spinOffset;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const cb = Math.cos(d.axis);
        const sb = Math.sin(d.axis);

        for (let i = 0; i < 8; i++) {
          const v = CUBE_VERTS[i];
          const lx = v[0] * d.size;
          const ly = v[1] * d.size;
          const lz = v[2] * d.size;

          const rx = lx * ca + lz * sa;
          const rz = -lx * sa + lz * ca;
          const ry = ly * cb - rz * sb;
          const rz2 = ly * sb + rz * cb;

          const [sx, sy] = project(wx + rx, wy + ry, wz + rz2);
          px[i] = sx;
          py[i] = sy;
          vis[i] = camZ - (wz + rz2) > NEAR ? 1 : 0;
        }

        ctx.strokeStyle = `rgba(222, 231, 255, ${d.alpha.toFixed(3)})`;
        strokeEdges();
      }
    }

    function drawSurvivor(d: Dust, t: number, scatter: number) {
      const eased = Math.min(scatter, 1);

      const [baseX, baseY, baseZ] = orbitPos(d, t);

      const floatX = Math.sin(t * 0.24 + d.floatPhase) * 16;
      const floatY = Math.cos(t * 0.19 + d.floatPhase * 1.4) * 12;
      const homeX = width * d.cornerX;
      const homeY = height * d.cornerY;
      const open = openLayout.get(d) ?? [homeX, homeY];
      const bloom = spread * eased;
      const targetX = homeX + floatX + (open[0] - homeX) * bloom;
      const targetY = homeY + floatY + (open[1] - homeY) * bloom;

      const s0 = FOCAL / (CAM_Z - baseZ);
      const worldX =
        baseX + ((targetX - cx) / (unit * s0) - baseX) * eased + d.offX;
      const worldY =
        baseY + ((targetY - cy) / (unit * s0) - baseY) * eased + d.offY;
      const size = d.size + (d.bigSize - d.size) * eased;

      const ang = t * d.spin + d.spinOffset;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const cb = Math.cos(d.axis);
      const sb = Math.sin(d.axis);

      for (let i = 0; i < 8; i++) {
        const v = CUBE_VERTS[i];
        const lx = v[0] * size;
        const ly = v[1] * size;
        const lz = v[2] * size;

        const rx = lx * ca + lz * sa;
        const rz = -lx * sa + lz * ca;
        const ry = ly * cb - rz * sb;
        const rz2 = ly * sb + rz * cb;

        const [sx, sy] = project(worldX + rx, worldY + ry, baseZ + rz2);
        px[i] = sx;
        py[i] = sy;
        vis[i] = camZ - (baseZ + rz2) > NEAR ? 1 : 0;
        pz[i] = rz2;
      }

      ctx.strokeStyle = `rgba(222, 231, 255, ${(d.alpha + (d.bigAlpha - d.alpha) * eased + 0.2 * d.hoverAmt).toFixed(3)})`;
      // the cube's far edges go behind the icon...
      strokeEdges("back");

      const depthZ = camZ - baseZ;
      const behind = depthZ <= NEAR;
      const scaleAt = FOCAL / Math.max(depthZ, NEAR);
      const [ccx, ccy] = project(worldX, worldY, baseZ);
      const cubeHalf = size * unit * scaleAt;
      d.iconX = ccx;
      d.iconY = ccy;

      if (d.linkIndex >= 0 && !behind) {
        const iconAlpha = Math.max(0, (eased - 0.35) / 0.65);
        if (iconAlpha > 0) {
          const grow = 1 + 0.16 * d.hoverAmt;
          drawSlab(
            ctx,
            el.width / width,
            iconFor(d.linkIndex),
            ccx,
            ccy,
            cubeHalf * 0.82 * grow,
            cubeHalf * 0.17 * grow,
            d.faceX,
            d.faceY,
            iconAlpha * 0.88,
            d.hoverAmt,
          );
        }
      }

      updateLink(d, ccx, ccy, cubeHalf, eased, behind);

      strokeEdges("front");
    }

    function updateLink(
      d: Dust,
      x: number,
      y: number,
      cubeHalf: number,
      eased: number,
      behind: boolean,
    ) {
      const anchor = linkEls[d.linkIndex];
      if (!anchor) return;
      const live = homeRoute && warpNow < 0.02 && eased > 0.9 && !behind;
      if (!live) {
        if (anchor.style.display !== "none") anchor.style.display = "none";
        return;
      }
      const size = cubeHalf * 2.3;
      anchor.style.display = "block";
      anchor.style.width = `${size}px`;
      anchor.style.height = `${size}px`;
      anchor.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
    }

    function drawCenterCube(t: number, scatter: number) {
      const ax = t * 0.42 + 0.6;
      const ay = t * 0.31 + 1.2;
      const az = t * 0.19 + 2.1;
      const cax = Math.cos(ax);
      const sax = Math.sin(ax);
      const cay = Math.cos(ay);
      const say = Math.sin(ay);
      const caz = Math.cos(az);
      const saz = Math.sin(az);

      const scale = 1 + scatter * 6;
      const shiftX = width * 0.27 * scatter;
      const shiftY = -height * 0.02 * scatter;

      const floatX = Math.sin(t * 0.18) * 6;
      const floatY = Math.cos(t * 0.14) * 5;

      for (let i = 0; i < 8; i++) {
        const v = CUBE_VERTS[i];
        const vx = v[0] * CENTER_SIZE;
        const vy = v[1] * CENTER_SIZE;
        const vz = v[2] * CENTER_SIZE;

        const y1 = vy * cax - vz * sax;
        const z1 = vy * sax + vz * cax;
        const x2 = vx * cay + z1 * say;
        const z2 = -vx * say + z1 * cay;
        const x3 = x2 * caz - y1 * saz;
        const y3 = x2 * saz + y1 * caz;

        const [sx, sy] = project(x3, y3, z2);
        px[i] = cx + (sx - cx) * scale + shiftX + floatX;
        py[i] = cy + (sy - cy) * scale + shiftY + floatY;
        vis[i] = camZ - z2 > NEAR ? 1 : 0;
      }

      if (centerFade <= 0) return;
      ctx.save();
      ctx.globalAlpha *= centerFade;
      ctx.shadowColor = "rgba(190, 214, 255, 0.55)";
      ctx.shadowBlur = 11 + scatter * 46;
      ctx.lineWidth = 1.4 + scatter * 0.8;
      ctx.strokeStyle = "rgba(238, 244, 255, 0.92)";
      strokeEdges();
      ctx.restore();
    }

    function draw(t: number) {
      const now = performance.now();
      const leaveElapsed = leaveStart ? (now - leaveStart) / 1000 : 0;
      const scatter = leaveStart ? spring(leaveElapsed) : 0;

      const warp = currentWarp(now);
      warpNow = warp;
      camZ = CAM_Z - TRAVEL * warp;
      camX = aimX * warp;
      camY = aimY * warp;
      centerFade = 1 - Math.min(warp / 0.55, 1);
      const warpAlpha = 1;

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.save();
      ctx.globalAlpha = warpAlpha;

      drawDust(t, scatter);
      drawCenterCube(t, scatter);
      ctx.restore();
    }

    function tick(now: number) {
      if (last === 0) last = now;
      const dtMs = Math.min(now - last, 48);
      elapsed += dtMs;
      last = now;
      stepPush(dtMs / 1000);
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
      draw(elapsed / 1000);
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

    startLeave = () => {
      if (leaveStart) return;
      leaveStart = performance.now() - (reduced ? LEAVE_MS * 4 : 0);
      draw(elapsed / 1000);
      if (!reduced) start();
    };

    function setWarpTarget(target: number, instant = false) {
      if (target === warpTarget) return;
      const now = performance.now();
      warpFrom = currentWarp(now);
      warpTarget = target;
      warpT0 = instant || reduced ? 0 : now;
      if (target === 1) pickAim();
      draw(elapsed / 1000);
      start();
    }

    setLinkHover = (index, on) => {
      for (const d of dust) if (d.linkIndex === index) d.hover = on;
    };

    setRoute = (home, instant = false) => {
      homeRoute = home;
      if (!home) {
        if (!leaveStart) leaveStart = performance.now() - LEAVE_MS * 4;
        if (!leaving) {
          leaving = true;
          markEntered();
        }
      }
      setWarpTarget(home ? 0 : 1, instant);
    };

    function warpForward() {
      if (reduced || warpTarget === 1) return Promise.resolve();
      setWarpTarget(1);
      return new Promise<void>((resolve) => {
        setTimeout(resolve, WARP_MS + 80);
      });
    }

    const unregisterWarp = setWarpHandler(warpForward);

    resize();
    setRoute(page.url.pathname === "/", true);
    draw(elapsed / 1000);
    start();

    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotionChange);

    return () => {
      unregisterWarp();
      stop();
      startLeave = null;
      setRoute = null;
      setLinkHover = null;
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotionChange);
    };
  });

  function proceed() {
    if (leaving) return;
    unlockAudio();
    markEntered();
    playBoot(loadUrl, 0.5);
    leaving = true;
    if (startLeave) startLeave();
    else entered = true;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      proceed();
    }
  }
</script>

{#if !entered}
  <div
    class="intro"
    class:leaving
    class:behind={page.url.pathname !== "/"}
    role="button"
    tabindex={leaving ? -1 : 0}
    aria-hidden={leaving || undefined}
    aria-label={leaving ? undefined : "Enter"}
    onclick={proceed}
    onkeydown={onKeydown}
  >
    <div class="scene">
      <canvas bind:this={canvas} aria-hidden="true"></canvas>
    </div>
    <div class="caption">
      <p class="greeting">welcome, traveller</p>
      <p class="hint">click to enter</p>
    </div>
  </div>
{/if}

<div class="links">
  {#each LINKS as link, i (link.key)}
    {#if link.href}
      <a
        bind:this={linkEls[i]}
        class="cube-link"
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.label}
        onpointerenter={(e) => linkHover(i, true, e)}
        onpointerleave={() => linkHover(i, false)}
        onfocus={() => linkHover(i, true)}
        onblur={() => linkHover(i, false)}
        onclick={playClick}
      ></a>
    {:else}
      <button
        bind:this={linkEls[i]}
        class="cube-link"
        type="button"
        aria-label={soundMuted ? "Unmute sound" : "Mute sound"}
        aria-pressed={soundMuted}
        onpointerenter={(e) => linkHover(i, true, e)}
        onpointerleave={() => linkHover(i, false)}
        onfocus={() => linkHover(i, true)}
        onblur={() => linkHover(i, false)}
        onclick={toggleSound}
      ></button>
    {/if}
  {/each}
</div>

<style>
  .links {
    position: fixed;
    inset: 0;
    z-index: 25;
    pointer-events: none;
  }

  .cube-link {
    position: absolute;
    top: 0;
    left: 0;
    display: none;
    padding: 0;
    border: 0;
    background: none;
    border-radius: 50%;
    pointer-events: auto;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .cube-link:focus-visible {
    outline: 1px solid rgba(238, 242, 255, 0.6);
    outline-offset: 2px;
  }

  .intro {
    --scene: min(78vw, 54vh, 520px);
    position: fixed;
    inset: 0;
    z-index: 20;
    background: #000;
    font-family: "Terminus", ui-monospace, SFMono-Regular, Menlo, monospace;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition: background-color 2400ms cubic-bezier(0.45, 0, 0.1, 1);
  }

  .intro.behind {
    z-index: 0;
  }

  .intro.leaving {
    background-color: transparent;
    pointer-events: none;
    cursor: default;
  }

  .scene {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .caption {
    position: absolute;
    left: 50%;
    top: calc(46% + var(--scene) * 0.5 + 2rem);
    width: max-content;
    max-width: 100%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    padding: 0 1.5rem;
    text-align: center;
    transition:
      opacity 1000ms cubic-bezier(0.25, 0, 0.1, 1),
      transform 1000ms cubic-bezier(0.25, 0, 0.1, 1);
  }

  .intro.leaving .caption {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }

  .greeting {
    margin: 0;
    font-size: clamp(1.05rem, 2.8vmin, 1.45rem);
    font-weight: 700;
    letter-spacing: 0.16em;
    color: rgba(238, 242, 255, 0.92);
  }

  .hint {
    margin: 0;
    font-size: clamp(0.75rem, 1.9vmin, 0.92rem);
    letter-spacing: 0.22em;
    color: rgba(238, 242, 255, 0.34);
    transition: color 300ms ease;
    animation: breathe 5s ease-in-out infinite alternate;
  }

  .intro:hover .hint,
  .intro:focus-visible .hint {
    color: rgba(238, 242, 255, 0.62);
  }

  .intro:focus-visible {
    outline: 1px solid rgba(238, 242, 255, 0.45);
    outline-offset: -10px;
  }

  @keyframes breathe {
    from {
      opacity: 0.55;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hint {
      animation: none;
    }

    .intro,
    .caption {
      transition: none;
    }
  }
</style>

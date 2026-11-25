import hoverUrl from '#lib/assets/audio/hover1.wav';
import enterUrl from '#lib/assets/audio/enter.wav';
import enter1Url from '#lib/assets/audio/enter1.wav';
import backUrl from '#lib/assets/audio/back1.wav';
import pageUrl from '#lib/assets/audio/page.wav';
import ambient01Url from '#lib/assets/audio/ambient/ambient01.wav';
import ambient02Url from '#lib/assets/audio/ambient/ambient02.wav';

let context: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();

const MUTE_KEY = 'muted';
const muteListeners = new Set<() => void>();
let muted = readMuted();

function readMuted() {
	if (typeof window === 'undefined') return false;
	try {
		return window.localStorage.getItem(MUTE_KEY) === '1';
	} catch {
		return false;
	}
}

export function isMuted() {
	return muted;
}

export function setMuted(value: boolean) {
	if (value === muted) return;
	muted = value;
	try {
		window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
	} catch {
		console.log("fuck")
	}
	applyAmbient();
	for (const listener of muteListeners) listener();
}

export function toggleMuted() {
	setMuted(!muted);
}

export function onMuteChange(listener: () => void) {
	muteListeners.add(listener);
	return () => {
		muteListeners.delete(listener);
	};
}


const AMBIENT_URLS = [ambient01Url, ambient02Url];
const AMBIENT_VOLUME = 0.35;
const AMBIENT_FADE_MS = 3000;

let ambient: HTMLAudioElement | null = null;
let ambientStarted = false;
let ambientLevel = 0;

function applyAmbient() {
	if (!ambient) return;
	ambient.muted = muted;
	ambient.volume = ambientLevel;
}

function fadeInAmbient() {
	const began = performance.now();
	const timer = setInterval(() => {
		const progress = Math.min((performance.now() - began) / AMBIENT_FADE_MS, 1);
		ambientLevel = AMBIENT_VOLUME * progress;
		applyAmbient();
		if (progress >= 1) clearInterval(timer);
	}, 100);
}

function playNextAmbient() {
	const url = AMBIENT_URLS[Math.floor(Math.random() * AMBIENT_URLS.length)];
	const next = new Audio(url);
	next.addEventListener('ended', playNextAmbient);
	ambient = next;
	applyAmbient();
	next.play().catch(() => {
		// blocked until the visitor interacts
		// this shouldnt happen because of the lil intro
		// thing that requires u to click but
		ambientStarted = false;
		armAmbientGesture();
	});
}

export function startAmbient() {
	if (typeof window === 'undefined' || ambientStarted) return;
	ambientStarted = true;
	disarmAmbientGesture();
	ambientLevel = 0;
	fadeInAmbient();
	playNextAmbient();
}

function onAmbientGesture() {
	startAmbient();
}

function armAmbientGesture() {
	window.addEventListener('pointerdown', onAmbientGesture);
	window.addEventListener('keydown', onAmbientGesture);
}

function disarmAmbientGesture() {
	window.removeEventListener('pointerdown', onAmbientGesture);
	window.removeEventListener('keydown', onAmbientGesture);
}

function getContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!context) {
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		context = new Ctor();
	}
	return context;
}

async function resumeContext(): Promise<AudioContext | null> {
	const ac = getContext();
	if (!ac) return null;
	if (ac.state === 'suspended') {
		try {
			await ac.resume();
		} catch {
			return null;
		}
	}
	return ac;
}

async function load(url: string): Promise<AudioBuffer | null> {
	const ac = getContext();
	if (!ac) return null;

	const cached = buffers.get(url);
	if (cached) return cached;

	const existing = pending.get(url);
	if (existing) return existing;

	const promise = fetch(url)
		.then((response) => response.arrayBuffer())
		.then((data) => ac.decodeAudioData(data))
		.then((buffer) => {
			buffers.set(url, buffer);
			return buffer;
		})
		.catch(() => null);

	pending.set(url, promise);
	return promise;
}

async function play(
	url: string,
	volume: number,
	pitchVariation: number,
	pitchDownOnly = false
) {
	if (muted) return;

	const ac = await resumeContext();
	if (!ac || ac.state !== 'running') return;

	const buffer = await load(url);
	if (!buffer) return;

	const source = ac.createBufferSource();
	const gain = ac.createGain();

	source.buffer = buffer;
	const offset = pitchDownOnly
		? -(0.01 + Math.random() * Math.max(0, pitchVariation - 0.01))
		: (Math.random() * 2 - 1) * pitchVariation;
	source.playbackRate.value = 1 + offset;
	gain.gain.value = volume;

	source.connect(gain);
	gain.connect(ac.destination);
	source.start();
}

export function playBoot(url: string, volume: number) {
	if (muted) {
		startAmbient();
		return;
	}
	const sound = new Audio(url);
	sound.volume = volume;
	sound.addEventListener('ended', startAmbient, { once: true });
	sound.addEventListener('error', startAmbient, { once: true });
	sound.play().catch(startAmbient);
}

export function unlockAudio() {
	void resumeContext().then(() => {
		void load(hoverUrl);
		void load(enterUrl);
		void load(backUrl);
		void load(pageUrl);
	});
}

export function playPage() {
	void play(pageUrl, 0.34, 0);
}

export function playHover() {
	void play(hoverUrl, 0.18, 0.06, true);
}

export function playClick() {
	void play(enterUrl, 0.34, 0);
}

export function playLink() {
	void play(enter1Url, 0.34, 0);
}

export function playBack() {
	void play(backUrl, 0.34, 0.05);
}

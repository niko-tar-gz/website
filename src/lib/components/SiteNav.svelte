<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { warpScene } from '../scene-transition';
	import { playClick, playHover } from '../sfx';

	let { visible = true }: { visible?: boolean } = $props();

	let mounted = $state(false);
	let navigating = $state(false);

	onMount(() => {
		mounted = true;
	});

	async function follow(event: MouseEvent, href: string) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
			return;
		}

		event.preventDefault();
		if (navigating) return;
		navigating = true;

		playClick();

		try {
			await warpScene();
			await goto(href);
		} catch {
			navigating = false;
		}
	}

	function hover(event: PointerEvent) {
		if (event.pointerType === 'mouse') playHover();
	}
</script>

<nav
	class="site-nav"
	class:visible={visible && mounted}
	class:navigating
	aria-label="Site"
	aria-hidden={!visible || !mounted || navigating ? true : undefined}
	inert={!visible || !mounted || navigating}
>
	<a
		href="/about"
		aria-current={page.url.pathname === '/about' ? 'page' : undefined}
		onclick={(event) => follow(event, '/about')}
		onpointerenter={hover}
	>
		<span class="mark" aria-hidden="true">&gt;</span><span>ABOUT ME</span>
	</a>
	<a
		href="/projects"
		aria-current={page.url.pathname === '/projects' ? 'page' : undefined}
		onclick={(event) => follow(event, '/projects')}
		onpointerenter={hover}
	>
		<span class="mark" aria-hidden="true">&gt;</span><span>PROJECTS</span>
	</a>
</nav>

<style>
	.site-nav {
		position: fixed;
		right: clamp(1.5rem, 3.75vw, 3rem);
		bottom: clamp(1.75rem, 6vh, 2.5rem);
		z-index: 40;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.4rem;
		font-family: 'Terminus', ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: clamp(0.8rem, 1.6vw, 1rem);
		letter-spacing: 0.14em;
		line-height: 1;
		opacity: 0;
		pointer-events: none;
		transition: opacity 900ms cubic-bezier(0.25, 0, 0.1, 1);
	}

	.site-nav.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.site-nav.navigating {
		opacity: 0;
		pointer-events: none;
		transition-duration: 220ms;
	}

	.site-nav a {
		display: inline-flex;
		align-items: center;
		min-height: 34px;
		padding: 0.25rem 0;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		text-decoration: none;
		transition: color 160ms ease;
	}

	.mark {
		margin-right: 0.6em;
		color: rgba(255, 255, 255, 0.26);
		transition: color 160ms ease;
	}

	.site-nav a:hover,
	.site-nav a:focus-visible {
		color: #fff;
	}

	.site-nav a:hover .mark,
	.site-nav a:focus-visible .mark,
	.site-nav a[aria-current='page'] .mark {
		color: rgba(255, 255, 255, 0.65);
	}

	.site-nav a[aria-current='page'] {
		color: #fff;
	}

	.site-nav a:focus-visible {
		outline: 1px solid rgba(255, 255, 255, 0.5);
		outline-offset: 4px;
	}

	@media (hover: none) {
		.site-nav {
			right: max(1.5rem, env(safe-area-inset-right));
			bottom: max(1.75rem, env(safe-area-inset-bottom));
		}

		.site-nav a {
			min-height: 44px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.site-nav {
			transition: none;
		}

		.site-nav a,
		.mark {
			transition: none;
		}
	}
</style>

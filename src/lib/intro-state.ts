let entered = false;
const listeners = new Set<() => void>();

export function hasEntered() {
	return entered;
}

export function markEntered() {
	if (entered) return;
	entered = true;
	for (const listener of listeners) listener();
}

export function onEntered(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

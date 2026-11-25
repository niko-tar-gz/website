type WarpHandler = () => Promise<void>;

let handler: WarpHandler | null = null;

export function setWarpHandler(fn: WarpHandler) {
	handler = fn;
	return () => {
		if (handler === fn) handler = null;
	};
}

export function hasWarp() {
	return handler !== null;
}

export function warpScene() {
	return handler ? handler() : Promise.resolve();
}

type IconPart = {
	path: Path2D;
	rule: CanvasFillRule;
	fill: boolean;
	stroke: number;
	cap: CanvasLineCap;
	join: CanvasLineJoin;
};

export type Icon = {
	parts: IconPart[];
	vbX: number;
	vbY: number;
	vbW: number;
	vbH: number;
};

export function parseIcon(raw: string): Icon {
	const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
	const root = doc.documentElement;
	const vb = (root.getAttribute('viewBox') ?? '0 0 24 24').trim().split(/[\s,]+/).map(Number);
	const attr = (p: Element, name: string) => p.getAttribute(name) ?? root.getAttribute(name);

	const parts: IconPart[] = [];
	for (const p of Array.from(doc.querySelectorAll('path'))) {
		const d = p.getAttribute('d');
		if (!d) continue;
		const scale = /scale\(\s*([-\d.e]+)/.exec(p.getAttribute('transform') ?? '');
		const path = new Path2D();
		path.addPath(new Path2D(d), scale ? new DOMMatrix().scale(Number(scale[1])) : undefined);

		const stroke = attr(p, 'stroke');
		parts.push({
			path,
			rule: p.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero',
			fill: attr(p, 'fill') !== 'none',
			stroke: stroke && stroke !== 'none' ? Number(attr(p, 'stroke-width') ?? 1) : 0,
			cap: (attr(p, 'stroke-linecap') as CanvasLineCap | null) ?? 'butt',
			join: (attr(p, 'stroke-linejoin') as CanvasLineJoin | null) ?? 'miter'
		});
	}
	return { parts, vbX: vb[0], vbY: vb[1], vbW: vb[2], vbH: vb[3] };
}

const ICON_SLICES = 10;

export function drawIcon(
	ctx: CanvasRenderingContext2D,
	dpr: number,
	icon: Icon,
	x: number,
	y: number,
	half: number,
	depthHalf: number,
	yaw: number,
	pitch: number,
	alpha: number,
	lift: number
) {
	const cyaw = Math.cos(yaw);
	const syaw = Math.sin(yaw);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	const r00 = cyaw;
	const r01 = 0;
	const r02 = syaw;
	const r10 = sp * syaw;
	const r11 = cp;
	const r12 = -sp * cyaw;

	const k = (half * 2) / Math.max(icon.vbW, icon.vbH);
	const cxv = icon.vbX + icon.vbW / 2;
	const cyv = icon.vbY + icon.vbH / 2;
	const baseE = x - k * (cxv * r00 + cyv * r01);
	const baseF = y - k * (cxv * r10 + cyv * r11);

	ctx.save();
	ctx.globalAlpha *= alpha;
	for (let i = 0; i < ICON_SLICES; i++) {
		const f = i / (ICON_SLICES - 1);
		const w = (f * 2 - 1) * depthHalf;
		const g = Math.min(255, Math.round(70 + 130 * f + 45 * lift));
		ctx.fillStyle = `rgb(${g}, ${g}, ${g})`;
		ctx.strokeStyle = ctx.fillStyle;
		ctx.setTransform(
			k * r00 * dpr,
			k * r10 * dpr,
			k * r01 * dpr,
			k * r11 * dpr,
			(baseE + r02 * w) * dpr,
			(baseF + r12 * w) * dpr
		);
		for (const part of icon.parts) {
			if (part.fill) ctx.fill(part.path, part.rule);
			if (part.stroke > 0) {
				ctx.lineWidth = part.stroke;
				ctx.lineCap = part.cap;
				ctx.lineJoin = part.join;
				ctx.stroke(part.path);
			}
		}
	}
	ctx.restore();
}

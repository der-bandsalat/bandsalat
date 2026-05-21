/**
 * Svelte-Action: blendet ein Element beim ersten Sichtbarwerden ein
 * (per Intersection Observer). Funktioniert mit der `.reveal`-Klasse
 * aus app.css — diese Action triggert das Hinzufügen von `reveal-in`,
 * sobald das Element in den Viewport eintritt.
 *
 *   <div class="reveal" use:reveal>...</div>
 *   <div class="reveal" use:reveal={{ delay: 200 }}>...</div>
 */
type RevealParams = { delay?: number; threshold?: number };

export function reveal(node: HTMLElement, params: RevealParams = {}) {
	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('reveal-in');
		return {};
	}
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					if (params.delay) {
						setTimeout(() => node.classList.add('reveal-in'), params.delay);
					} else {
						node.classList.add('reveal-in');
					}
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: params.threshold ?? 0.1, rootMargin: '0px 0px -10% 0px' }
	);
	observer.observe(node);
	return {
		destroy() {
			observer.disconnect();
		}
	};
}

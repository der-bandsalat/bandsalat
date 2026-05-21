export function formatEur(cents: number | null | undefined): string {
	if (cents === null || cents === undefined) return '—';
	return (cents / 100).toLocaleString('de-DE', {
		style: 'currency',
		currency: 'EUR'
	});
}

export function formatEurInput(cents: number | null | undefined): string {
	if (cents === null || cents === undefined) return '';
	return (cents / 100).toFixed(2).replace('.', ',');
}

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('de-DE');
}

export function formatRelative(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	const diff = (Date.now() - d.getTime()) / 1000;
	if (diff < 60) return 'gerade eben';
	if (diff < 3600) return `vor ${Math.floor(diff / 60)} min`;
	if (diff < 86400) return `vor ${Math.floor(diff / 3600)} h`;
	if (diff < 30 * 86400) return `vor ${Math.floor(diff / 86400)} Tag(en)`;
	return formatDate(iso);
}

/**
 * Klappentext-Extraktion aus Discogs Release-Notes. Discogs erlaubt
 * Markdown-ish Formatierung in `release.notes` — wir strippen sie auf
 * Plaintext und filtern offensichtliche Nicht-Klappentexte (reine
 * Tracklisten, Credits, technische Notizen).
 */
import { getRelease } from '../discogs';

export interface SynopsisResult {
	text: string;
	sourceUrl: string;
}

function looksLikeTracklist(s: string): boolean {
	// Mehr als die Hälfte der Zeilen sieht nach "01. Track Name" aus.
	const lines = s.split(/\n+/).filter((l) => l.trim().length > 0);
	if (lines.length < 3) return false;
	const trackLines = lines.filter((l) => /^\s*\d{1,2}[.):\-]\s/.test(l));
	return trackLines.length / lines.length > 0.5;
}

function stripDiscogsMarkup(s: string): string {
	return (
		s
			// [b]bold[/b] etc.
			.replace(/\[\/?[a-z]+\]/gi, '')
			// [l=...] / [a=...] / [m=...] Discogs-Refs
			.replace(/\[(?:[lam])=[^\]]*\]/gi, '')
			// Trailing whitespace pro Zeile
			.replace(/[ \t]+\n/g, '\n')
			// Mehrfache Leerzeilen
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}

export async function extractSynopsisFromReleaseId(
	releaseId: number
): Promise<SynopsisResult | null> {
	const release = await getRelease(releaseId);
	if (!release.notes) return null;
	const text = stripDiscogsMarkup(release.notes);
	if (text.length < 30) return null;
	if (looksLikeTracklist(text)) return null;
	return {
		text,
		sourceUrl: `https://www.discogs.com/release/${releaseId}`
	};
}

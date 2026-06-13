import { Marked } from 'marked';
import handbuchMd from '$lib/content/handbuch.md?raw';
import type { PageServerLoad } from './$types';

// GitHub-kompatibler Anker-Slug, damit das Inhaltsverzeichnis (#…-Links)
// auf die Überschriften zeigt. marked vergibt sonst keine IDs.
// Unicode-bewusst (\p{L}\p{N}) — sonst fallen Umlaute raus und Anker wie
// "#hör-log" / "#discogs--ki-schlüssel" zeigen ins Leere.
const slug = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s/g, '-');

const md = new Marked({ gfm: true });
md.use({
	renderer: {
		heading(token) {
			const text = this.parser.parseInline(token.tokens);
			return `<h${token.depth} id="${slug(token.text)}">${text}</h${token.depth}>\n`;
		}
	}
});

// Statischer, vertrauenswürdiger Inhalt (eigenes Handbuch, kein User-Input) →
// einmal beim Modul-Load rendern, {@html} ist hier sicher.
const html = md.parse(handbuchMd) as string;

export const load: PageServerLoad = () => {
	return { html };
};

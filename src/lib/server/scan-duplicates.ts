import { findPotentialDuplicates } from '$lib/server/db/cassettes';
import { getCachedPrices, priceForGrade } from '$lib/server/discogs/prices';
import { coverThumbUrl } from '$lib/util/cover';
import type { Cassette, MediaGrade } from '$lib/server/db/schema';

/**
 * Dubletten-Kandidaten fürs Scan-Modal — gemeinsam genutzt vom Scan-Endpoint
 * (erster Durchlauf mit den KI-Daten) und vom Re-Check-Endpoint, wenn der
 * Nutzer die erkannten Felder oder den Discogs-Treffer im Scanner korrigiert.
 */
export interface DuplicatePayload {
	id: string;
	serie: string;
	folgeNr: number | null;
	folgeNrLabel: string | null;
	titel: string;
	label: string | null;
	jahr: number | null;
	auflageVariante: string | null;
	zustandMc: string | null;
	zustandHuelle: string | null;
	originalhuelle: boolean;
	vollstaendig: boolean;
	kaufpreisCent: number | null;
	marktwertCent: number | null;
	marktwertCurrency: string | null;
	thumbUrl: string | null;
	reason: 'exact' | 'release';
}

function toDuplicatePayload(c: Cassette, reason: 'exact' | 'release'): DuplicatePayload {
	const cached = c.discogsReleaseId ? getCachedPrices(c.discogsReleaseId) : null;
	const priced = cached ? priceForGrade(cached.data, c.zustandMc as MediaGrade | null) : null;
	return {
		id: c.id,
		serie: c.serie,
		folgeNr: c.folgeNr,
		folgeNrLabel: c.folgeNrLabel,
		titel: c.titel,
		label: c.label,
		jahr: c.jahr,
		auflageVariante: c.auflageVariante,
		zustandMc: c.zustandMc,
		zustandHuelle: c.zustandHuelle,
		originalhuelle: c.originalhuelle,
		vollstaendig: c.vollstaendig,
		kaufpreisCent: c.kaufpreisCent,
		marktwertCent: priced?.cents ?? null,
		marktwertCurrency: priced?.currency ?? cached?.currency ?? null,
		thumbUrl: coverThumbUrl(c),
		reason
	};
}

export function duplicatePayloads(query: {
	serie?: string | null;
	folgeNr?: number | null;
	releaseIds?: readonly number[];
}): DuplicatePayload[] {
	return findPotentialDuplicates(query).map((m) => toDuplicatePayload(m.cassette, m.reason));
}

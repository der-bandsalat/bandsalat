import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicKey, getScanModel } from '../settings';

let cached: { client: Anthropic; key: string } | null = null;

export function getAnthropic(): Anthropic {
	const key = getAnthropicKey();
	if (!key) throw new Error('ANTHROPIC_API_KEY ist nicht gesetzt.');
	// Cache-Bust bei Key-Wechsel, damit ein UI-Update sofort greift.
	if (!cached || cached.key !== key) {
		cached = { client: new Anthropic({ apiKey: key }), key };
	}
	return cached.client;
}

export function hasAnthropic(): boolean {
	return Boolean(getAnthropicKey());
}

export function scanModel(): string {
	return getScanModel();
}

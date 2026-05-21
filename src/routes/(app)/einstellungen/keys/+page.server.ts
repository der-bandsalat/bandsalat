import { fail, redirect } from '@sveltejs/kit';
import {
	getSettingsStates,
	setAnthropicKey,
	setDiscogsToken,
	setDiscogsUsername,
	setScanModel
} from '$lib/server/settings';
import { discogs, DiscogsError } from '$lib/server/discogs/client';
import { hasAnthropic, getAnthropic, scanModel } from '$lib/server/ai/anthropic';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { states: getSettingsStates() };
};

function trimOrNull(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const t = value.trim();
	return t.length > 0 ? t : null;
}

export const actions: Actions = {
	saveDiscogs: async ({ request }) => {
		const form = await request.formData();
		const token = trimOrNull(form.get('discogs_token'));
		const username = trimOrNull(form.get('discogs_username'));
		setDiscogsToken(token);
		setDiscogsUsername(username);
		throw redirect(303, '/einstellungen/keys?saved=discogs');
	},

	clearDiscogs: async () => {
		setDiscogsToken(null);
		setDiscogsUsername(null);
		throw redirect(303, '/einstellungen/keys?saved=cleared');
	},

	testDiscogs: async () => {
		try {
			const me = await discogs.get<{ username?: string; id?: number }>('/oauth/identity');
			if (!me?.username) {
				return fail(400, {
					testResult: { ok: false, message: 'Antwort enthielt keinen Username.' }
				});
			}
			return {
				testResult: {
					ok: true,
					message: `Verbunden als „${me.username}" (Discogs-ID ${me.id ?? '?'}).`
				}
			};
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					testResult: {
						ok: false,
						message: `Discogs: ${e.message}${e.detail ? ` (${e.detail})` : ''}`
					}
				});
			}
			return fail(500, {
				testResult: {
					ok: false,
					message: e instanceof Error ? e.message : 'Unbekannter Fehler.'
				}
			});
		}
	},

	saveAnthropic: async ({ request }) => {
		const form = await request.formData();
		const key = trimOrNull(form.get('anthropic_key'));
		const model = trimOrNull(form.get('scan_model'));
		setAnthropicKey(key);
		setScanModel(model);
		throw redirect(303, '/einstellungen/keys?saved=anthropic');
	},

	clearAnthropic: async () => {
		setAnthropicKey(null);
		setScanModel(null);
		throw redirect(303, '/einstellungen/keys?saved=cleared');
	},

	testAnthropic: async () => {
		if (!hasAnthropic()) {
			return fail(400, { testResult: { ok: false, message: 'ANTHROPIC_API_KEY nicht gesetzt.' } });
		}
		try {
			const client = getAnthropic();
			const model = scanModel();
			const start = Date.now();
			const resp = await client.messages.create({
				model,
				max_tokens: 8,
				messages: [{ role: 'user', content: 'ping' }]
			});
			const ms = Date.now() - start;
			const text =
				resp.content
					.filter((b) => b.type === 'text')
					.map((b) => (b as { text: string }).text)
					.join('') || '(ohne Text)';
			return {
				testResult: {
					ok: true,
					message: `Modell „${resp.model}" antwortete in ${ms} ms: ${text.slice(0, 60)}`
				}
			};
		} catch (e) {
			return fail(500, {
				testResult: {
					ok: false,
					message: e instanceof Error ? e.message : 'Unbekannter Fehler.'
				}
			});
		}
	}
};

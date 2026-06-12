import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			out: 'build'
		}),
		// Erkennt neue Deploys im laufenden Client: SvelteKit pollt _app/version.json
		// und macht bei Versionswechsel die nächste Navigation zum Full-Reload.
		// Verhindert "alte App-Shell + neue Assets"-Mischzustände nach Updates.
		version: {
			pollInterval: 60_000
		}
	}
};

export default config;

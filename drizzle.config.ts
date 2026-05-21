import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

const dataDir = process.env.DATA_DIR ?? './data';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: resolve(dataDir, 'bandsalat.sqlite')
	},
	strict: true,
	verbose: true
});

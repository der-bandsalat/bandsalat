type Job = () => Promise<void>;

export class RateLimitQueue {
	private last = 0;
	private queue: Job[] = [];
	private running = false;

	constructor(private minIntervalMs: number) {}

	get pending(): number {
		return this.queue.length + (this.running ? 1 : 0);
	}

	async run<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push(async () => {
				const wait = this.minIntervalMs - (Date.now() - this.last);
				if (wait > 0) await sleep(wait);
				this.last = Date.now();
				try {
					resolve(await fn());
				} catch (err) {
					reject(err);
				}
			});
			void this.drain();
		});
	}

	private async drain() {
		if (this.running) return;
		this.running = true;
		while (this.queue.length > 0) {
			const job = this.queue.shift()!;
			await job();
		}
		this.running = false;
	}
}

export function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	message: string;
	tone: ToastTone;
}

let nextId = 0;

class ToastStore {
	items = $state<ToastItem[]>([]);

	push(message: string, opts: { tone?: ToastTone; timeoutMs?: number } = {}): number {
		const id = ++nextId;
		const item: ToastItem = { id, message, tone: opts.tone ?? 'success' };
		this.items.push(item);
		const timeout = opts.timeoutMs ?? 2500;
		setTimeout(() => this.dismiss(id), timeout);
		return id;
	}

	dismiss(id: number) {
		const idx = this.items.findIndex((t) => t.id === id);
		if (idx >= 0) this.items.splice(idx, 1);
	}
}

export const toast = new ToastStore();

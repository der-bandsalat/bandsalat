export interface SearchResult {
	id: number;
	title: string;
	year?: string | number;
	label?: string[];
	catno?: string;
	country?: string;
	format?: string[];
	thumb?: string;
	cover_image?: string;
	resource_url?: string;
	uri?: string;
}

export interface SearchResponse {
	results: SearchResult[];
	pagination?: { items: number; page: number; pages: number };
}

export interface ReleaseDetails {
	id: number;
	title: string;
	year?: number;
	master_id?: number;
	master_url?: string;
	labels?: { name: string; catno?: string }[];
	formats?: { name: string; descriptions?: string[]; qty?: string }[];
	country?: string;
	thumb?: string;
	images?: { type: 'primary' | 'secondary'; uri: string; uri150?: string }[];
	uri?: string;
	notes?: string;
	released?: string;
}

export interface CollectionField {
	id: number;
	name: string;
	type: 'dropdown' | 'textarea' | string;
	position?: number;
	public?: boolean;
	options?: string[];
}

export interface CollectionFolder {
	id: number;
	name: string;
	count: number;
	resource_url?: string;
}

export interface CollectionInstance {
	instance_id: number;
	folder_id: number;
	rating?: number;
	notes?: { field_id: number; value: string }[];
}

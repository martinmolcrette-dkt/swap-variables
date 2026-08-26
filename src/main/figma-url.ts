export function slugifyFileName(name: string): string {
	return (
		String(name || '')
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^A-Za-z0-9._-]/g, '') || 'file'
	);
}

export type FigmaUrlKeys = {
	/** Branch key when the URL is a branch URL, otherwise null. */
	branchKey: string | null;
	/** The main (top-level) file key. */
	mainFileKey: string;
};

/**
 * Parse a Figma URL and return both the main file key and the branch key (if any).
 * Returns null if the URL is invalid.
 */
export function parseFigmaUrlKeys(input: string | null | undefined): FigmaUrlKeys | null {
	if (input == null) return null;

	const trimmed = String(input).trim();
	if (!trimmed) return null;

	const match = trimmed.match(
		/figma\.com\/(?:design|file|board|slides|proto)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?/i,
	);

	if (match) {
		const mainFileKey = match[1];
		const branchKey = match[2] ?? null;
		return { mainFileKey, branchKey };
	}

	if (/^[A-Za-z0-9]{16,128}$/.test(trimmed)) {
		return { mainFileKey: trimmed, branchKey: null };
	}

	return null;
}

export function parseFigmaFileKey(input: string | null | undefined): string | null {
	if (input == null) {
		return null;
	}

	const trimmed = String(input).trim();

	if (!trimmed) {
		return null;
	}

	const match = trimmed.match(
		/figma\.com\/(?:design|file|board|slides|proto)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?/i,
	);

	if (match) {
		return match[2] || match[1];
	}

	if (/^[A-Za-z0-9]{16,128}$/.test(trimmed)) {
		return trimmed;
	}

	return null;
}

export function buildFigmaFileUrl(fileKey: string, fileName: string): string {
	const slug = slugifyFileName(fileName);
	return `https://www.figma.com/design/${fileKey}/${slug}?m=auto`;
}

export function getCurrentFileUrl(): string | null {
	const fileKey = figma.fileKey;

	if (!fileKey) {
		return null;
	}

	return buildFigmaFileUrl(fileKey, figma.root.name);
}

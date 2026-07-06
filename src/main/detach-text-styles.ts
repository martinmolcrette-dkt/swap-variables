import { buildTeamLibraryIndex } from './team-libraries';
import { collectDescendants } from './variable-bindings';

type TextStyleNode = TextNode | TextPathNode;

async function loadFontsForTextNode(node: TextStyleNode): Promise<void> {
	if (node.fontName !== figma.mixed) {
		await figma.loadFontAsync(node.fontName);
		return;
	}

	const segments = node.getStyledTextSegments(['fontName']);
	const loaded = new Set<string>();

	for (const segment of segments) {
		const key = `${segment.fontName.family}::${segment.fontName.style}`;

		if (loaded.has(key)) {
			continue;
		}

		loaded.add(key);
		await figma.loadFontAsync(segment.fontName);
	}
}

function shouldDetachTextStyle(
	style: TextStyle,
	allowedStyleKeys: Set<string>,
): boolean {
	if (!style.remote) {
		return true;
	}

	return !allowedStyleKeys.has(style.key);
}

async function getTextStyle(
	styleId: string,
	styleCache: Map<string, TextStyle | null>,
): Promise<TextStyle | null> {
	let style = styleCache.get(styleId);

	if (style !== undefined) {
		return style;
	}

	const fetched = await figma.getStyleByIdAsync(styleId);
	style = fetched?.type === 'TEXT' ? fetched : null;
	styleCache.set(styleId, style);

	return style;
}

async function detachTextStylesFromNode(
	node: TextStyleNode,
	allowedStyleKeys: Set<string>,
	styleCache: Map<string, TextStyle | null>,
): Promise<number> {
	await loadFontsForTextNode(node);

	let detachedCount = 0;

	if (node.textStyleId === figma.mixed) {
		const segments = node.getStyledTextSegments(['textStyleId']);

		for (const segment of segments) {
			if (!segment.textStyleId) {
				continue;
			}

			const style = await getTextStyle(segment.textStyleId, styleCache);

			if (!style || !shouldDetachTextStyle(style, allowedStyleKeys)) {
				continue;
			}

			await node.setRangeTextStyleIdAsync(segment.start, segment.end, '');
			detachedCount += 1;
		}

		return detachedCount;
	}

	if (!node.textStyleId) {
		return 0;
	}

	const style = await getTextStyle(node.textStyleId, styleCache);

	if (!style || !shouldDetachTextStyle(style, allowedStyleKeys)) {
		return 0;
	}

	await node.setTextStyleIdAsync('');
	return 1;
}

export async function detachNonTeamTextStyles(): Promise<{
	detachedStyleCount: number;
	affectedNodeIds: string[];
}> {
	const teamLibraryIndex = await buildTeamLibraryIndex();
	const selection = figma.currentPage.selection;
	const nodes = collectDescendants(selection);
	const styleCache = new Map<string, TextStyle | null>();
	let detachedStyleCount = 0;
	const affectedNodes = new Set<string>();

	for (const node of nodes) {
		if (node.type !== 'TEXT' && node.type !== 'TEXT_PATH') {
			continue;
		}

		const detached = await detachTextStylesFromNode(
			node,
			teamLibraryIndex.allowedStyleKeys,
			styleCache,
		);

		if (detached > 0) {
			detachedStyleCount += detached;
			affectedNodes.add(node.id);
		}
	}

	return {
		detachedStyleCount,
		affectedNodeIds: Array.from(affectedNodes),
	};
}

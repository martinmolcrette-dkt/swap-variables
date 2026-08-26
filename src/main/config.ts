/**
 * Team Figma: https://www.figma.com/files/915304380642007909/team/1252649412192496862
 *
 * Librairies autorisées (source: Figma MCP `get_libraries` sur le fichier
 * Vitamin Play - Web UI kit). Seules les variables provenant de ces librairies
 * sont considérées comme valides.
 */
export const TEAM_ID = '1252649412192496862';

export const ALLOWED_LIBRARY_NAMES = [
	'Vitamin Play - Web UI kit',
	'Vitamin Play - Wonder Assets',
	'Vitamin Play - Design Tokens',
	'Vitamin Play - Foundations',
	'Vitamin Play - Helper Components',
	'Vitamin Play - Wonder Icons',
] as const;

export const REFERENCE_TOKENS_FILE_URL =
	'https://www.figma.com/design/UO22GM2qa5xsi9B8RB6PR0/Vitamin-Play---Design-Tokens?m=auto';

export const TARGET_TOKENS_FILE_URL =
	'https://www.figma.com/design/UO22GM2qa5xsi9B8RB6PR0/Vitamin-Play---Design-Tokens?m=auto&node-id=1-126&t=yOXWEfMMYwDC2HHN-1&view=variables';

export const REFERENCE_COLLECTION_NAME = 'Vitamin Play Web';

export const TARGET_LIBRARY_NAME = 'Vitamin Play - Design Tokens';

export const TOKEN_GRAMMAR_PREFIX = 'vp/web/component';

export const TARGET_COLLECTION_NAME = 'Vitamin Play Web';

/** Remote text style keys from allowed team libraries (Figma Plugin API has no style listing). */
export const ALLOWED_TEXT_STYLE_KEYS: readonly string[] = [];

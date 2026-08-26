export const TARGET_TOKENS_FILE_URL =
	'https://www.figma.com/design/UO22GM2qa5xsi9B8RB6PR0/Vitamin-Play---Design-Tokens?m=auto&node-id=1-126&t=yOXWEfMMYwDC2HHN-1&view=variables';

export const TARGET_COLLECTION_NAME = 'Vitamin Play Web';

export const SWAP_COLLECTIONS = [
	{
		sourceCollectionName: '[temp] Vitamin Play Web',
		targetCollectionName: 'Vitamin Play Web',
	},
	{
		sourceCollectionName: '[temp] Vitamin Play Android',
		targetCollectionName: 'Vitamin Play Android',
	},
	{
		sourceCollectionName: '[temp] Vitamin Play Apple',
		targetCollectionName: 'Vitamin Play App',
	},
	{
		sourceCollectionName: '[temp] Core',
		targetCollectionName: 'Core',
	},
	{
		sourceCollectionName: '[temp] Theme',
		targetCollectionName: 'Theme',
	},
] as const;

export type SwapCollectionSourceName =
	(typeof SWAP_COLLECTIONS)[number]['sourceCollectionName'];

export const DEFAULT_SWAP_SOURCE_COLLECTION_NAME: SwapCollectionSourceName =
	SWAP_COLLECTIONS[0].sourceCollectionName;

export function getSwapTargetCollectionName(
	sourceCollectionName: string,
): string {
	const match = SWAP_COLLECTIONS.find(
		(collection) => collection.sourceCollectionName === sourceCollectionName,
	);

	return match?.targetCollectionName ?? TARGET_COLLECTION_NAME;
}

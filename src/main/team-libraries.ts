import {
	ALLOWED_LIBRARY_NAMES,
	ALLOWED_TEXT_STYLE_KEYS,
	FOUNDATION_LIBRARY_NAME,
} from './config';

export type TeamLibraryIndex = {
	allowedKeys: Set<string>;
	allowedStyleKeys: Set<string>;
	libraryNames: string[];
	variableSources: Map<string, { libraryName: string; collectionName: string }>;
};

export function isFoundationVariable(
	variable: Variable,
	teamLibraryIndex: TeamLibraryIndex,
): boolean {
	return (
		variable.remote &&
		teamLibraryIndex.variableSources.get(variable.key)?.libraryName ===
			FOUNDATION_LIBRARY_NAME
	);
}

export async function buildTeamLibraryIndex(): Promise<TeamLibraryIndex> {
	const collections =
		await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

	const filteredCollections = collections.filter((collection) => {
		if (ALLOWED_LIBRARY_NAMES.length === 0) {
			return true;
		}

		return ALLOWED_LIBRARY_NAMES.includes(collection.libraryName);
	});

	const allowedKeys = new Set<string>();
	const allowedStyleKeys = new Set<string>(ALLOWED_TEXT_STYLE_KEYS);
	const variableSources = new Map<
		string,
		{ libraryName: string; collectionName: string }
	>();

	for (const collection of filteredCollections) {
		const variables =
			await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
				collection.key,
			);

		for (const variable of variables) {
			allowedKeys.add(variable.key);
			variableSources.set(variable.key, {
				libraryName: collection.libraryName,
				collectionName: collection.name,
			});
		}
	}

	return {
		allowedKeys,
		allowedStyleKeys,
		libraryNames: Array.from(new Set(filteredCollections.map((c) => c.libraryName))),
		variableSources,
	};
}

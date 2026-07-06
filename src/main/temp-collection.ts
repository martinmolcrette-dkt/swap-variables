import { TEMP_COLLECTION_NAME } from './config';

export type TempCollectionState = {
	exists: boolean;
	variableCount: number;
	collectionId?: string;
};

export async function getTempCollectionState(): Promise<TempCollectionState> {
	const collections = await figma.variables.getLocalVariableCollectionsAsync();
	const tempCollection = collections.find((collection) => collection.name === TEMP_COLLECTION_NAME);

	if (!tempCollection) {
		return { exists: false, variableCount: 0 };
	}

	return {
		exists: true,
		variableCount: tempCollection.variableIds.length,
		collectionId: tempCollection.id,
	};
}

export type TempVariableInfo = {
	id: string;
	name: string;
	resolvedType: VariableResolvedDataType;
};

export async function getTempCollectionVariables(): Promise<TempVariableInfo[]> {
	const tempCollection = await findLocalCollectionByName(TEMP_COLLECTION_NAME);

	if (!tempCollection) {
		return [];
	}

	const variables: TempVariableInfo[] = [];

	for (const variableId of tempCollection.variableIds) {
		const variable = await figma.variables.getVariableByIdAsync(variableId);

		if (!variable) {
			continue;
		}

		variables.push({
			id: variable.id,
			name: variable.name,
			resolvedType: variable.resolvedType,
		});
	}

	return variables.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findLocalCollectionByName(
	name: string,
): Promise<VariableCollection | null> {
	const collections = await figma.variables.getLocalVariableCollectionsAsync();
	return collections.find((collection) => collection.name === name) ?? null;
}

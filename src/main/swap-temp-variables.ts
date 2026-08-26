import { bindBinding } from './bind-variables';
import { TARGET_LIBRARY_NAME } from './config';
import { findLocalCollectionByName } from './temp-collection';
import { collectDescendants, extractBindings } from './variable-bindings';

export type SwapTempResult = {
	success: boolean;
	swappedCount: number;
	skippedCount: number;
	message: string;
	errors: string[];
};

type TargetVariableIndex = {
	localByName: Map<string, Variable>;
	libraryKeyByName: Map<string, string>;
};

async function getSourceVariableIds(
	sourceCollectionName: string,
): Promise<Set<string>> {
	const sourceCollection = await findLocalCollectionByName(sourceCollectionName);

	if (!sourceCollection) {
		return new Set();
	}

	return new Set(sourceCollection.variableIds);
}

async function findVariableByKey(key: string): Promise<Variable | null> {
	try {
		return await figma.variables.importVariableByKeyAsync(key);
	} catch {
		const collections = await figma.variables.getLocalVariableCollectionsAsync();

		for (const collection of collections) {
			for (const variableId of collection.variableIds) {
				const variable = await figma.variables.getVariableByIdAsync(variableId);

				if (variable?.key === key) {
					return variable;
				}
			}
		}
	}

	return null;
}

async function buildTargetVariableIndex(
	targetCollectionName: string,
): Promise<TargetVariableIndex> {
	const localByName = new Map<string, Variable>();
	const libraryKeyByName = new Map<string, string>();

	const localCollection = await findLocalCollectionByName(targetCollectionName);

	if (localCollection) {
		for (const variableId of localCollection.variableIds) {
			const variable = await figma.variables.getVariableByIdAsync(variableId);

			if (variable) {
				localByName.set(variable.name, variable);
			}
		}
	}

	const libraryCollections =
		await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

	const targetLibraryCollection = libraryCollections.find(
		(collection) =>
			collection.name === targetCollectionName &&
			collection.libraryName === TARGET_LIBRARY_NAME,
	);

	if (targetLibraryCollection) {
		const libraryVariables =
			await figma.teamLibrary.getVariablesInLibraryCollectionAsync(
				targetLibraryCollection.key,
			);

		for (const libraryVariable of libraryVariables) {
			if (!libraryKeyByName.has(libraryVariable.name)) {
				libraryKeyByName.set(libraryVariable.name, libraryVariable.key);
			}
		}
	}

	return { localByName, libraryKeyByName };
}

async function resolveTargetVariable(
	name: string,
	index: TargetVariableIndex,
	cache: Map<string, Variable | null>,
): Promise<Variable | null> {
	if (cache.has(name)) {
		return cache.get(name) ?? null;
	}

	const localVariable = index.localByName.get(name);

	if (localVariable) {
		cache.set(name, localVariable);
		return localVariable;
	}

	const libraryKey = index.libraryKeyByName.get(name);

	if (!libraryKey) {
		cache.set(name, null);
		return null;
	}

	const importedVariable = await findVariableByKey(libraryKey);
	cache.set(name, importedVariable);
	return importedVariable;
}

export async function swapTempVariables(
	sourceCollectionName: string,
	targetCollectionName: string,
): Promise<SwapTempResult> {
	const selection = figma.currentPage.selection;

	if (selection.length === 0) {
		return {
			success: false,
			swappedCount: 0,
			skippedCount: 0,
			message: 'Select components to swap their variable bindings.',
			errors: [],
		};
	}

	const tempVariableIds = await getSourceVariableIds(sourceCollectionName);

	if (tempVariableIds.size === 0) {
		const sourceCollection = await findLocalCollectionByName(sourceCollectionName);

		return {
			success: false,
			swappedCount: 0,
			skippedCount: 0,
			message: sourceCollection
				? `Collection "${sourceCollectionName}" has no variables to swap.`
				: `Collection "${sourceCollectionName}" was not found in this file.`,
			errors: [],
		};
	}

	const targetIndex = await buildTargetVariableIndex(targetCollectionName);

	if (targetIndex.localByName.size === 0 && targetIndex.libraryKeyByName.size === 0) {
		return {
			success: false,
			swappedCount: 0,
			skippedCount: 0,
			message: `No variables found in "${targetCollectionName}" from "${TARGET_LIBRARY_NAME}". Enable the Design Tokens library in this file.`,
			errors: [],
		};
	}

	const nodes = collectDescendants(selection);
	const variableCache = new Map<string, Variable | null>();
	const targetCache = new Map<string, Variable | null>();
	const processedBindings = new Set<string>();
	let swappedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];

	for (const node of nodes) {
		for (const binding of extractBindings(node)) {
			const bindingKey = `${node.id}:${binding.field}:${binding.index ?? ''}`;

			if (processedBindings.has(bindingKey)) {
				continue;
			}

			let sourceVariable = variableCache.get(binding.variableId);

			if (sourceVariable === undefined) {
				sourceVariable = await figma.variables.getVariableByIdAsync(binding.variableId);
				variableCache.set(binding.variableId, sourceVariable);
			}

			if (!sourceVariable || !tempVariableIds.has(sourceVariable.id)) {
				continue;
			}

			const targetVariable = await resolveTargetVariable(
				sourceVariable.name,
				targetIndex,
				targetCache,
			);

			if (!targetVariable) {
				skippedCount += 1;
				errors.push(
					`No "${targetCollectionName}" variable named "${sourceVariable.name}" for ${node.name}.`,
				);
				continue;
			}

			if (targetVariable.resolvedType !== sourceVariable.resolvedType) {
				skippedCount += 1;
				errors.push(
					`Type mismatch for "${sourceVariable.name}" on ${node.name} (${sourceVariable.resolvedType} → ${targetVariable.resolvedType}).`,
				);
				continue;
			}

			if (bindBinding(node, binding, targetVariable)) {
				processedBindings.add(bindingKey);
				swappedCount += 1;
				console.log('[swap]', {
					variable: sourceVariable.name,
					from: {
						id: sourceVariable.id,
						collection: sourceCollectionName,
						type: sourceVariable.resolvedType,
					},
					to: {
						id: targetVariable.id,
						key: targetVariable.key,
						collection: targetCollectionName,
						type: targetVariable.resolvedType,
						remote: targetVariable.remote,
					},
					node: { id: node.id, name: node.name },
					property: binding.field,
					index: binding.index,
				});
			} else {
				skippedCount += 1;
				errors.push(
					`Failed to swap "${sourceVariable.name}" on ${node.name} (${binding.field}).`,
				);
			}
		}
	}

	const success = swappedCount > 0;
	const message = success
		? `Swapped ${swappedCount} binding${swappedCount === 1 ? '' : 's'} from "${sourceCollectionName}" to "${targetCollectionName}".${skippedCount > 0 ? ` Skipped ${skippedCount}.` : ''}`
		: `No bindings from "${sourceCollectionName}" were swapped in the selection.${skippedCount > 0 ? ` Skipped ${skippedCount}.` : ''}`;

	console.log('[swap] done', { swappedCount, skippedCount, success, errors });

	return {
		success,
		swappedCount,
		skippedCount,
		message,
		errors,
	};
}

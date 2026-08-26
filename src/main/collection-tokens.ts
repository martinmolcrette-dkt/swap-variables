type SerializedColor = {
	r: number;
	g: number;
	b: number;
	a: number;
};

type SerializedAlias = {
	type: 'VARIABLE_ALIAS';
	name: string;
	key?: string;
};

type SerializedValue = boolean | number | string | SerializedColor | SerializedAlias;

type SerializedVariable = {
	name: string;
	resolvedType: VariableResolvedDataType;
	valuesByMode: Record<string, SerializedValue>;
};

export type CollectionTokens = {
	version: 1;
	collection: {
		name: string;
		modes: string[];
	};
	variables: SerializedVariable[];
};

export type ImportCollectionTokensResult = {
	createdCount: number;
	skippedCount: number;
	message: string;
};

export type LocalVariableCollectionInfo = {
	id: string;
	name: string;
};

export async function getLocalVariableCollections(): Promise<
	LocalVariableCollectionInfo[]
> {
	const collections = await figma.variables.getLocalVariableCollectionsAsync();

	return collections
		.map((collection) => ({ id: collection.id, name: collection.name }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function isColor(value: unknown): value is SerializedColor {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const color = value as Partial<SerializedColor>;
	return (
		typeof color.r === 'number' &&
		typeof color.g === 'number' &&
		typeof color.b === 'number' &&
		typeof color.a === 'number'
	);
}

function isAlias(value: unknown): value is SerializedAlias {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const alias = value as Partial<SerializedAlias>;
	return (
		alias.type === 'VARIABLE_ALIAS' &&
		typeof alias.name === 'string' &&
		(alias.key === undefined || typeof alias.key === 'string')
	);
}

function isSerializedValue(value: unknown): value is SerializedValue {
	return (
		typeof value === 'boolean' ||
		typeof value === 'number' ||
		typeof value === 'string' ||
		isColor(value) ||
		isAlias(value)
	);
}

function isValueCompatibleWithType(
	value: SerializedValue,
	resolvedType: VariableResolvedDataType,
): boolean {
	if (isAlias(value)) {
		return true;
	}

	switch (resolvedType) {
		case 'BOOLEAN':
			return typeof value === 'boolean';
		case 'COLOR':
			return isColor(value);
		case 'FLOAT':
			return typeof value === 'number';
		case 'STRING':
			return typeof value === 'string';
	}
}

function isResolvedType(value: unknown): value is VariableResolvedDataType {
	return (
		value === 'BOOLEAN' ||
		value === 'COLOR' ||
		value === 'FLOAT' ||
		value === 'STRING'
	);
}

function validateCollectionTokens(value: unknown): CollectionTokens {
	if (!value || typeof value !== 'object') {
		throw new Error('The JSON must contain a design tokens object.');
	}

	const tokens = value as Partial<CollectionTokens>;

	if (
		tokens.version !== 1 ||
		!tokens.collection ||
		typeof tokens.collection.name !== 'string' ||
		!Array.isArray(tokens.collection.modes) ||
		!tokens.collection.modes.every((mode) => typeof mode === 'string') ||
		!Array.isArray(tokens.variables)
	) {
		throw new Error('Unsupported design tokens JSON format.');
	}

	const variableNames = new Set<string>();

	for (const variable of tokens.variables) {
		if (
			!variable ||
			typeof variable.name !== 'string' ||
			!variable.name ||
			!isResolvedType(variable.resolvedType) ||
			!variable.valuesByMode ||
			typeof variable.valuesByMode !== 'object' ||
			Array.isArray(variable.valuesByMode) ||
			Object.values(variable.valuesByMode).some(
				(valueByMode) =>
					!isSerializedValue(valueByMode) ||
					!isValueCompatibleWithType(
						valueByMode,
						variable.resolvedType,
					),
			)
		) {
			throw new Error('The JSON contains an invalid design token.');
		}

		if (variableNames.has(variable.name)) {
			throw new Error(`The JSON contains duplicate token "${variable.name}".`);
		}

		variableNames.add(variable.name);
	}

	return tokens as CollectionTokens;
}

async function serializeValue(
	value: VariableValue,
	sourceVariableIds: Set<string>,
): Promise<SerializedValue> {
	if (
		typeof value !== 'object' ||
		value === null ||
		!('type' in value) ||
		value.type !== 'VARIABLE_ALIAS'
	) {
		return value;
	}

	const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);

	if (!aliasedVariable) {
		throw new Error('Unable to resolve a variable alias during export.');
	}

	if (aliasedVariable.remote) {
		return {
			type: 'VARIABLE_ALIAS',
			name: aliasedVariable.name,
			key: aliasedVariable.key,
		};
	}

	if (!sourceVariableIds.has(aliasedVariable.id)) {
		throw new Error(
			'Export only supports local aliases in the selected collection.',
		);
	}

	return { type: 'VARIABLE_ALIAS', name: aliasedVariable.name };
}

export async function exportCollectionTokens(
	collectionId: string,
): Promise<CollectionTokens> {
	const collections = await figma.variables.getLocalVariableCollectionsAsync();
	const collection = collections.find((candidate) => candidate.id === collectionId);

	if (!collection) {
		throw new Error('The selected collection was not found in this file.');
	}

	const sourceVariableIds = new Set(collection.variableIds);
	const variables: SerializedVariable[] = [];

	for (const variableId of collection.variableIds) {
		const variable = await figma.variables.getVariableByIdAsync(variableId);

		if (!variable) {
			continue;
		}

		const valuesByMode: Record<string, SerializedValue> = {};

		for (const mode of collection.modes) {
			const value = variable.valuesByMode[mode.modeId];

			if (value !== undefined) {
				valuesByMode[mode.name] = await serializeValue(value, sourceVariableIds);
			}
		}

		variables.push({
			name: variable.name,
			resolvedType: variable.resolvedType,
			valuesByMode,
		});
	}

	return {
		version: 1,
		collection: {
			name: collection.name,
			modes: collection.modes.map((mode) => mode.name),
		},
		variables: variables.sort((left, right) => left.name.localeCompare(right.name)),
	};
}

export async function importCollectionTokens(
	targetCollectionId: string,
	json: string,
): Promise<ImportCollectionTokensResult> {
	let parsed: unknown;

	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error('The pasted content is not valid JSON.');
	}

	const tokens = validateCollectionTokens(parsed);
	const collections = await figma.variables.getLocalVariableCollectionsAsync();
	const collection = collections.find(
		(candidate) => candidate.id === targetCollectionId,
	);

	if (!collection) {
		throw new Error('The selected collection was not found in this file.');
	}

	const targetModeIdByName = new Map(
		collection.modes.map((mode) => [mode.name, mode.modeId]),
	);
	const sourceModeToTargetModeId = new Map<string, string>();
	const sourceModesMatchTarget = tokens.collection.modes.every((modeName) =>
		targetModeIdByName.has(modeName),
	);

	if (sourceModesMatchTarget) {
		for (const modeName of tokens.collection.modes) {
			const modeId = targetModeIdByName.get(modeName);

			if (modeId) {
				sourceModeToTargetModeId.set(modeName, modeId);
			}
		}
	} else if (tokens.collection.modes.length === 1 && collection.modes.length === 1) {
		sourceModeToTargetModeId.set(
			tokens.collection.modes[0],
			collection.defaultModeId,
		);
	} else {
		throw new Error(
			`The source modes do not match the modes in "${collection.name}". No modes were created.`,
		);
	}

	const variableByName = new Map<string, Variable>();

	for (const variableId of collection.variableIds) {
		const variable = await figma.variables.getVariableByIdAsync(variableId);

		if (variable) {
			variableByName.set(variable.name, variable);
		}
	}

	const newTokens = tokens.variables.filter(
		(token) => !variableByName.has(token.name),
	);
	const skippedCount = tokens.variables.length - newTokens.length;

	for (const token of newTokens) {
		const variable = figma.variables.createVariable(
			token.name,
			collection,
			token.resolvedType,
		);
		variableByName.set(variable.name, variable);
	}

	for (const token of newTokens) {
		const variable = variableByName.get(token.name);

		if (!variable) {
			throw new Error(`Unable to create token "${token.name}".`);
		}

		for (const [modeName, value] of Object.entries(token.valuesByMode)) {
			const modeId = sourceModeToTargetModeId.get(modeName);

			if (!modeId) {
				throw new Error(`Mode "${modeName}" does not exist in the target collection.`);
			}

			if (isAlias(value)) {
				let aliasedVariable = value.key
					? await figma.variables.importVariableByKeyAsync(value.key)
					: variableByName.get(value.name);

				if (!aliasedVariable) {
					throw new Error(
						`Alias "${value.name}" for "${token.name}" is unavailable in this file.`,
					);
				}

				if (aliasedVariable.resolvedType !== variable.resolvedType) {
					throw new Error(
						`Alias "${value.name}" does not match the type of "${token.name}".`,
					);
				}

				variable.setValueForMode(modeId, {
					type: 'VARIABLE_ALIAS',
					id: aliasedVariable.id,
				});
				continue;
			}

			variable.setValueForMode(modeId, value);
		}
	}

	const message =
		`Added ${newTokens.length} token${newTokens.length === 1 ? '' : 's'} to "${collection.name}".` +
		(skippedCount > 0
			? ` Kept ${skippedCount} existing token${skippedCount === 1 ? '' : 's'} unchanged.`
			: '');

	return {
		createdCount: newTokens.length,
		skippedCount,
		message,
	};
}

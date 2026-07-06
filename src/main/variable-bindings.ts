export type Binding = {
	field: string;
	variableId: string;
	index?: number;
};

function isVariableAlias(value: unknown): value is VariableAlias {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		(value as VariableAlias).type === 'VARIABLE_ALIAS'
	);
}

export function extractBindings(node: SceneNode): Binding[] {
	if (!('boundVariables' in node) || !node.boundVariables) {
		return [];
	}

	const bindings: Binding[] = [];
	const boundVariables = node.boundVariables;

	for (const [field, value] of Object.entries(boundVariables)) {
		if (!value) {
			continue;
		}

		if (Array.isArray(value)) {
			value.forEach((alias, index) => {
				if (isVariableAlias(alias)) {
					bindings.push({ field, variableId: alias.id, index });
				}
			});
			continue;
		}

		if (isVariableAlias(value)) {
			bindings.push({ field, variableId: value.id });
			continue;
		}

		for (const [propertyName, alias] of Object.entries(value)) {
			if (isVariableAlias(alias)) {
				bindings.push({
					field: `${field}.${propertyName}`,
					variableId: alias.id,
				});
			}
		}
	}

	return bindings;
}

export function collectDescendants(nodes: readonly SceneNode[]): SceneNode[] {
	const collected: SceneNode[] = [];

	for (const node of nodes) {
		collected.push(node);

		if ('children' in node) {
			collected.push(...collectDescendants(node.children));
		}
	}

	return collected;
}

export function getSelectedComponents(): Array<ComponentNode | ComponentSetNode> {
	return figma.currentPage.selection.filter(
		(node): node is ComponentNode | ComponentSetNode =>
			node.type === 'COMPONENT' || node.type === 'COMPONENT_SET',
	);
}

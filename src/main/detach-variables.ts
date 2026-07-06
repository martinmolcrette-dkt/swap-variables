import { buildTeamLibraryIndex } from './team-libraries';
import { detachNonTeamTextStyles } from './detach-text-styles';
import {
	collectDescendants,
	extractBindings,
	type Binding,
} from './variable-bindings';

const PAINT_FIELDS = new Set(['fills', 'strokes', 'textRangeFills']);
const EFFECT_FIELDS = new Set(['effects']);
const LAYOUT_GRID_FIELDS = new Set(['layoutGrids']);

function getTopLevelField(field: string): string {
	return field.split('.')[0] ?? field;
}

function unbindPaintField(node: SceneNode, field: string, index: number): boolean {
	if (!('fills' in node) && field === 'fills') {
		return false;
	}
	if (!('strokes' in node) && field === 'strokes') {
		return false;
	}

	if (field === 'fills' && 'fills' in node && Array.isArray(node.fills)) {
		const paint = node.fills[index];

		if (paint?.type !== 'SOLID') {
			return false;
		}

		const updated = figma.variables.setBoundVariableForPaint(paint, 'color', null);
		const fills = [...node.fills];
		fills[index] = updated;
		node.fills = fills;
		return true;
	}

	if (field === 'strokes' && 'strokes' in node && Array.isArray(node.strokes)) {
		const paint = node.strokes[index];

		if (paint?.type !== 'SOLID') {
			return false;
		}

		const updated = figma.variables.setBoundVariableForPaint(paint, 'color', null);
		const strokes = [...node.strokes];
		strokes[index] = updated;
		node.strokes = strokes;
		return true;
	}

	if (
		field === 'textRangeFills' &&
		node.type === 'TEXT' &&
		Array.isArray(node.textRangeFills)
	) {
		const paint = node.textRangeFills[index];

		if (paint?.type !== 'SOLID') {
			return false;
		}

		const updated = figma.variables.setBoundVariableForPaint(paint, 'color', null);
		const textRangeFills = [...node.textRangeFills];
		textRangeFills[index] = updated;
		node.textRangeFills = textRangeFills;
		return true;
	}

	return false;
}

function unbindEffectField(node: SceneNode, index: number): boolean {
	if (!('effects' in node) || !Array.isArray(node.effects)) {
		return false;
	}

	const effect = node.effects[index];

	if (!effect) {
		return false;
	}

	const bindableFields: Array<'color' | 'radius' | 'spread' | 'offsetX' | 'offsetY'> = [
		'color',
		'radius',
		'spread',
		'offsetX',
		'offsetY',
	];

	let changed = false;
	let updatedEffect = effect;

	for (const bindableField of bindableFields) {
		try {
			const next = figma.variables.setBoundVariableForEffect(
				updatedEffect,
				bindableField,
				null,
			);

			if (next !== updatedEffect) {
				updatedEffect = next;
				changed = true;
			}
		} catch {
			// Field may not apply to this effect type.
		}
	}

	if (changed) {
		const effects = [...node.effects];
		effects[index] = updatedEffect;
		node.effects = effects;
	}

	return changed;
}

function unbindLayoutGridField(node: SceneNode, index: number): boolean {
	if (!('layoutGrids' in node) || !Array.isArray(node.layoutGrids)) {
		return false;
	}

	const grid = node.layoutGrids[index];

	if (!grid) {
		return false;
	}

	const bindableFields: Array<'sectionSize' | 'count' | 'offset' | 'gutterSize'> = [
		'sectionSize',
		'count',
		'offset',
		'gutterSize',
	];

	let changed = false;
	let updatedGrid = grid;

	for (const bindableField of bindableFields) {
		try {
			const next = figma.variables.setBoundVariableForLayoutGrid(
				updatedGrid,
				bindableField,
				null,
			);

			if (next !== updatedGrid) {
				updatedGrid = next;
				changed = true;
			}
		} catch {
			// Field may not apply to this grid type.
		}
	}

	if (changed) {
		const layoutGrids = [...node.layoutGrids];
		layoutGrids[index] = updatedGrid;
		node.layoutGrids = layoutGrids;
	}

	return changed;
}

function unbindBinding(node: SceneNode, binding: Binding): boolean {
	const topLevelField = getTopLevelField(binding.field);

	if (PAINT_FIELDS.has(topLevelField) && binding.index !== undefined) {
		return unbindPaintField(node, topLevelField, binding.index);
	}

	if (EFFECT_FIELDS.has(topLevelField) && binding.index !== undefined) {
		return unbindEffectField(node, binding.index);
	}

	if (LAYOUT_GRID_FIELDS.has(topLevelField) && binding.index !== undefined) {
		return unbindLayoutGridField(node, binding.index);
	}

	if (!('setBoundVariable' in node)) {
		return false;
	}

	const bindableNode = node as SceneNode & {
		setBoundVariable: (
			field: VariableBindableNodeField | VariableBindableTextField,
			variable: Variable | null,
		) => void;
	};

	try {
		bindableNode.setBoundVariable(
			binding.field as VariableBindableNodeField | VariableBindableTextField,
			null,
		);
		return true;
	} catch {
		return false;
	}
}

export async function detachNonTeamVariables(): Promise<{
	detachedCount: number;
	detachedStyleCount: number;
	nodeCount: number;
}> {
	const selection = figma.currentPage.selection;
	const nodes = collectDescendants(selection);
	const teamLibraryIndex = await buildTeamLibraryIndex();
	const variableCache = new Map<string, Variable | null>();
	const processedBindings = new Set<string>();
	let detachedCount = 0;
	const affectedNodes = new Set<string>();

	for (const node of nodes) {
		for (const binding of extractBindings(node)) {
			let variable = variableCache.get(binding.variableId);

			if (variable === undefined) {
				variable = await figma.variables.getVariableByIdAsync(binding.variableId);
				variableCache.set(binding.variableId, variable);
			}

			if (!variable) {
				continue;
			}

			const isNonTeam =
				!variable.remote || !teamLibraryIndex.allowedKeys.has(variable.key);

			if (!isNonTeam) {
				continue;
			}

			const bindingKey = `${node.id}:${binding.field}:${binding.index ?? ''}`;

			if (processedBindings.has(bindingKey)) {
				continue;
			}

			if (unbindBinding(node, binding)) {
				processedBindings.add(bindingKey);
				detachedCount += 1;
				affectedNodes.add(node.id);
			}
		}
	}

	const textStyleResult = await detachNonTeamTextStyles();

	for (const nodeId of textStyleResult.affectedNodeIds) {
		affectedNodes.add(nodeId);
	}

	return {
		detachedCount,
		detachedStyleCount: textStyleResult.detachedStyleCount,
		nodeCount: affectedNodes.size,
	};
}

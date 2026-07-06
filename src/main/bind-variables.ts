import type { Binding } from './variable-bindings';

const PAINT_FIELDS = new Set(['fills', 'strokes', 'textRangeFills']);
const EFFECT_FIELDS = new Set(['effects']);
const LAYOUT_GRID_FIELDS = new Set(['layoutGrids']);

function getTopLevelField(field: string): string {
	return field.split('.')[0] ?? field;
}

function bindPaintField(
	node: SceneNode,
	field: string,
	index: number,
	variable: Variable,
): boolean {
	if (field === 'fills' && 'fills' in node && Array.isArray(node.fills)) {
		const paint = node.fills[index];

		if (paint?.type !== 'SOLID') {
			return false;
		}

		const updated = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
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

		const updated = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
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

		const updated = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
		const textRangeFills = [...node.textRangeFills];
		textRangeFills[index] = updated;
		node.textRangeFills = textRangeFills;
		return true;
	}

	return false;
}

function bindEffectField(node: SceneNode, index: number, variable: Variable): boolean {
	if (!('effects' in node) || !Array.isArray(node.effects)) {
		return false;
	}

	const effect = node.effects[index];

	if (!effect) {
		return false;
	}

	const fields: Array<'color' | 'radius' | 'spread' | 'offsetX' | 'offsetY'> =
		variable.resolvedType === 'COLOR'
			? ['color']
			: ['radius', 'spread', 'offsetX', 'offsetY'];

	for (const field of fields) {
		try {
			const updated = figma.variables.setBoundVariableForEffect(effect, field, variable);
			const effects = [...node.effects];
			effects[index] = updated;
			node.effects = effects;
			return true;
		} catch {
			// Try the next bindable field.
		}
	}

	return false;
}

function bindLayoutGridField(node: SceneNode, index: number, variable: Variable): boolean {
	if (!('layoutGrids' in node) || !Array.isArray(node.layoutGrids)) {
		return false;
	}

	const grid = node.layoutGrids[index];

	if (!grid) {
		return false;
	}

	const fields: Array<'sectionSize' | 'count' | 'offset' | 'gutterSize'> =
		variable.resolvedType === 'COLOR' ? [] : ['sectionSize', 'count', 'offset', 'gutterSize'];

	for (const field of fields) {
		try {
			const updated = figma.variables.setBoundVariableForLayoutGrid(grid, field, variable);
			const layoutGrids = [...node.layoutGrids];
			layoutGrids[index] = updated;
			node.layoutGrids = layoutGrids;
			return true;
		} catch {
			// Try the next bindable field.
		}
	}

	return false;
}

export function bindBinding(node: SceneNode, binding: Binding, variable: Variable): boolean {
	const topLevelField = getTopLevelField(binding.field);

	if (PAINT_FIELDS.has(topLevelField) && binding.index !== undefined) {
		return bindPaintField(node, topLevelField, binding.index, variable);
	}

	if (EFFECT_FIELDS.has(topLevelField) && binding.index !== undefined) {
		return bindEffectField(node, binding.index, variable);
	}

	if (LAYOUT_GRID_FIELDS.has(topLevelField) && binding.index !== undefined) {
		return bindLayoutGridField(node, binding.index, variable);
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
			variable,
		);
		return true;
	} catch {
		return false;
	}
}

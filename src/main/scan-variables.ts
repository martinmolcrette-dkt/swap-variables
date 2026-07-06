import type {
	LintIssue,
	LintOccurrence,
	ScanResult,
	VariableCategory,
	ViolationType,
} from '../shared/types';
import { buildTeamLibraryIndex } from './team-libraries';
import { collectDescendants, extractBindings } from './variable-bindings';

const PROPERTY_LABELS: Record<string, string> = {
	width: 'Width',
	height: 'Height',
	minWidth: 'Min width',
	maxWidth: 'Max width',
	minHeight: 'Min height',
	maxHeight: 'Max height',
	itemSpacing: 'Item spacing',
	counterAxisSpacing: 'Counter axis spacing',
	paddingLeft: 'Padding left',
	paddingRight: 'Padding right',
	paddingTop: 'Padding top',
	paddingBottom: 'Padding bottom',
	gridRowGap: 'Row gap',
	gridColumnGap: 'Column gap',
	cornerRadius: 'Corner radius',
	topLeftRadius: 'Top left radius',
	topRightRadius: 'Top right radius',
	bottomLeftRadius: 'Bottom left radius',
	bottomRightRadius: 'Bottom right radius',
	fills: 'Fill',
	strokes: 'Stroke',
	effects: 'Effect',
	layoutGrids: 'Layout grid',
	fontFamily: 'Font family',
	fontSize: 'Font size',
	fontStyle: 'Font style',
	fontWeight: 'Font weight',
	letterSpacing: 'Letter spacing',
	lineHeight: 'Line height',
	paragraphSpacing: 'Paragraph spacing',
	paragraphIndent: 'Paragraph indent',
	opacity: 'Opacity',
	strokeWeight: 'Stroke weight',
	visible: 'Visibility',
	characters: 'Content',
};

const COLOR_FIELDS = new Set(['fills', 'strokes', 'effects', 'layoutGrids', 'textRangeFills']);
const SPACING_FIELDS = new Set([
	'itemSpacing',
	'counterAxisSpacing',
	'paddingLeft',
	'paddingRight',
	'paddingTop',
	'paddingBottom',
	'gridRowGap',
	'gridColumnGap',
	'paragraphSpacing',
	'paragraphIndent',
]);
const SIZING_FIELDS = new Set([
	'width',
	'height',
	'minWidth',
	'maxWidth',
	'minHeight',
	'maxHeight',
]);
const RADIUS_FIELDS = new Set([
	'cornerRadius',
	'topLeftRadius',
	'topRightRadius',
	'bottomLeftRadius',
	'bottomRightRadius',
]);
const TYPOGRAPHY_FIELDS = new Set([
	'fontFamily',
	'fontSize',
	'fontStyle',
	'fontWeight',
	'letterSpacing',
	'lineHeight',
	'paragraphSpacing',
	'paragraphIndent',
	'characters',
]);

function getPropertyLabel(field: string, index?: number): string {
	const base = PROPERTY_LABELS[field] ?? field;
	if (index === undefined) {
		return base;
	}

	return `${base} #${index + 1}`;
}

function getCategory(field: string, resolvedType: VariableResolvedDataType): VariableCategory {
	if (resolvedType === 'COLOR' || COLOR_FIELDS.has(field)) {
		return 'color';
	}

	if (SPACING_FIELDS.has(field)) {
		return 'spacing';
	}

	if (SIZING_FIELDS.has(field)) {
		return 'sizing';
	}

	if (RADIUS_FIELDS.has(field)) {
		return 'radius';
	}

	if (TYPOGRAPHY_FIELDS.has(field)) {
		return 'typography';
	}

	return 'other';
}

function getViolationType(
	variable: Variable,
	allowedKeys: Set<string>,
): ViolationType | null {
	if (!variable.remote) {
		return 'local';
	}

	if (!allowedKeys.has(variable.key)) {
		return 'foreign';
	}

	return null;
}

export async function scanSelection(): Promise<ScanResult> {
	const selection = figma.currentPage.selection;
	const nodes = collectDescendants(selection);
	const teamLibraryIndex = await buildTeamLibraryIndex();

	const issueMap = new Map<string, LintIssue>();
	const variableCache = new Map<string, Variable | null>();

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

			const violation = getViolationType(variable, teamLibraryIndex.allowedKeys);

			if (!violation) {
				continue;
			}

			const source = teamLibraryIndex.variableSources.get(variable.key);
			const collection = await figma.variables.getVariableCollectionByIdAsync(
				variable.variableCollectionId,
			);
			const issueKey = `${variable.id}:${binding.field}:${violation}`;
			const occurrence: LintOccurrence = {
				nodeId: node.id,
				nodeName: node.name,
				property: binding.field,
				propertyLabel: getPropertyLabel(binding.field, binding.index),
			};

			const existing = issueMap.get(issueKey);

			if (existing) {
				existing.occurrences.push(occurrence);
				continue;
			}

			issueMap.set(issueKey, {
				id: issueKey,
				variableId: variable.id,
				variableName: variable.name,
				variableType: variable.resolvedType,
				category: getCategory(binding.field, variable.resolvedType),
				violation,
				libraryName: source?.libraryName ?? (variable.remote ? 'Unknown library' : undefined),
				collectionName: source?.collectionName ?? collection?.name,
				occurrences: [occurrence],
			});
		}
	}

	const issues = Array.from(issueMap.values()).sort((a, b) => {
		const categoryOrder = ['color', 'spacing', 'sizing', 'radius', 'typography', 'other'];
		const categoryDiff =
			categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);

		if (categoryDiff !== 0) {
			return categoryDiff;
		}

		return a.variableName.localeCompare(b.variableName);
	});

	return {
		issues,
		teamLibraries: teamLibraryIndex.libraryNames,
		selectionCount: selection.length,
		scannedNodeCount: nodes.length,
	};
}

export async function focusNode(nodeId: string): Promise<void> {
	const node = await figma.getNodeByIdAsync(nodeId);

	if (!node || !('visible' in node)) {
		return;
	}

	const sceneNode = node as SceneNode;
	figma.currentPage.selection = [sceneNode];
	figma.viewport.scrollAndZoomIntoView([sceneNode]);
}

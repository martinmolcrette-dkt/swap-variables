import {
	REFERENCE_COLLECTION_NAME,
	REFERENCE_TOKENS_FILE_URL,
	TOKEN_GRAMMAR_PREFIX,
} from './config';
import { getCurrentFileUrl } from './figma-url';
import { getTempCollectionVariables } from './temp-collection';
import { getSelectedComponents } from './variable-bindings';

function formatNodeId(nodeId: string): string {
	return nodeId.replace(/:/g, '-');
}

function buildComponentList(): string {
	const components = getSelectedComponents();

	if (components.length === 0) {
		return '(No components selected — select COMPONENT or COMPONENT_SET nodes)';
	}

	return components
		.map((component) => {
			const nodeId = formatNodeId(component.id);
			const keyPart = 'key' in component && component.key ? `, key=${component.key}` : '';
			return `- ${component.name} (node-id=${nodeId}${keyPart})`;
		})
		.join('\n');
}

function buildFileSection(): { fileSection: string; hasFileKey: boolean } {
	const currentFileUrl = getCurrentFileUrl();

	return {
		fileSection: currentFileUrl
			? currentFileUrl
			: '(File URL unavailable — enable private plugin API or paste the file URL manually)',
		hasFileKey: currentFileUrl !== null,
	};
}

export function buildCreateMcpPrompt(): { prompt: string; hasFileKey: boolean } {
	const { fileSection, hasFileKey } = buildFileSection();
	const componentList = buildComponentList();

	const prompt = `/token-grammar-figma, create a temp collection in this file:
${fileSection}

In this collection, create component tokens for the selected components:
${componentList}

Follow the token grammar`;

	return { prompt, hasFileKey };
}

export async function buildMapTokensMcpPrompt(): Promise<string | null> {
	const tempVariables = await getTempCollectionVariables();

	if (tempVariables.length === 0) {
		return null;
	}

	const { fileSection } = buildFileSection();
	const componentList = buildComponentList();
	const variableList = tempVariables
		.map((variable) => `- ${variable.name} (${variable.resolvedType.toLowerCase()})`)
		.join('\n');

	return `Using Figma MCP, in this file:
${fileSection}

Map the variables from the temp collection to the selected components by binding each token to the matching properties (fills, strokes, spacing, sizing, radius, typography, etc.):

Selected components:
${componentList}

Available "temp" tokens:
${variableList}

For each component, inspect its layer properties and bind the corresponding "temp" variable. Match tokens using the "${TOKEN_GRAMMAR_PREFIX}/..." naming convention derived from the component name.`;
}

export async function buildMcpPrompts(): Promise<{
	createPrompt: string;
	mapPrompt: string | null;
	hasFileKey: boolean;
}> {
	const { prompt: createPrompt, hasFileKey } = buildCreateMcpPrompt();
	const mapPrompt = await buildMapTokensMcpPrompt();

	return {
		createPrompt,
		mapPrompt,
		hasFileKey,
	};
}

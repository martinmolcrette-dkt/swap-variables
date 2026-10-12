import type { MainToUiMessage, UiToMainMessage } from '../shared/types';
import { getSwapTargetCollectionName } from '../shared/constants';
import { detachFoundationVariables } from './detach-variables';
import { buildMcpPrompts } from './prompt-builder';
import { focusNode, scanSelection } from './scan-variables';
import { swapTempVariables } from './swap-temp-variables';
import { getTempCollectionState } from './temp-collection';
import {
	exportCollectionTokens,
	getLocalVariableCollections,
	importCollectionTokens,
} from './collection-tokens';

function postToUi(message: MainToUiMessage) {
	figma.ui.postMessage(message);
}

async function runScan() {
	try {
		const result = await scanSelection();
		postToUi({ type: 'scan-result', result });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Scan failed';

		postToUi({ type: 'scan-error', message });
	}
}

async function runPromptState() {
	const { createPrompt, mapPrompt, hasFileKey } = await buildMcpPrompts();
	const tempCollection = await getTempCollectionState();

	postToUi({
		type: 'prompt-state',
		state: {
			createPrompt,
			mapPrompt,
			hasFileKey,
			tempCollection: {
				exists: tempCollection.exists,
				variableCount: tempCollection.variableCount,
			},
		},
	});
}

async function runDetachAll() {
	try {
		const result = await detachFoundationVariables();
		postToUi({
			type: 'detach-result',
			detachedCount: result.detachedCount,
			nodeCount: result.nodeCount,
		});
		await runScan();
		await runPromptState();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Detach failed';
		postToUi({ type: 'scan-error', message });
	}
}

async function runSwapTemp(sourceCollectionName: string) {
	const targetCollectionName = getSwapTargetCollectionName(sourceCollectionName);

	figma.notify(`Swapping ${sourceCollectionName} variables…`, { timeout: 2_000 });

	try {
		const result = await swapTempVariables(
			sourceCollectionName,
			targetCollectionName,
		);

		postToUi({
			type: 'swap-result',
			success: result.success,
			swappedCount: result.swappedCount,
			skippedCount: result.skippedCount,
			message: result.message,
			errors: result.errors,
		});

		figma.notify(result.message, {
			error: !result.success,
			timeout: result.success ? 3_000 : 5_000,
		});

		await runScan();
		await runPromptState();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Swap failed';

		postToUi({
			type: 'swap-result',
			success: false,
			swappedCount: 0,
			skippedCount: 0,
			message,
			errors: [],
		});

		figma.notify(message, { error: true });
	}
}

async function runExportSwapCollectionTokens(collectionId: string) {
	try {
		const tokens = await exportCollectionTokens(collectionId);
		const tokensJson = JSON.stringify(tokens, null, 2);

		postToUi({
			type: 'swap-collection-tokens',
			success: true,
			collectionId,
			tokensJson,
			message: `Exported ${tokens.variables.length} token${tokens.variables.length === 1 ? '' : 's'} from "${tokens.collection.name}".`,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Design tokens export failed.';

		postToUi({
			type: 'swap-collection-tokens',
			success: false,
			collectionId,
			tokensJson: '',
			message,
		});
	}
}

async function runImportSwapCollectionTokens(
	targetCollectionId: string,
	tokensJson: string,
) {
	try {
		const result = await importCollectionTokens(targetCollectionId, tokensJson);

		postToUi({
			type: 'swap-collection-import-result',
			success: true,
			message: result.message,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Design tokens import failed.';

		postToUi({
			type: 'swap-collection-import-result',
			success: false,
			message,
		});
	}
}

async function runLocalVariableCollections() {
	const collections = await getLocalVariableCollections();
	postToUi({ type: 'local-variable-collections', collections });
}

async function refreshState() {
	await runScan();
	await runPromptState();
}

export default function () {
	figma.showUI(__html__, {
		width: 480,
		height: 580,
		themeColors: true,
	});

	figma.on('selectionchange', () => {
		void refreshState();
	});

	figma.ui.onmessage = (message: UiToMainMessage) => {
		if (message.type === 'scan' || message.type === 'rescan') {
			void refreshState();
			return;
		}

		if (message.type === 'focus-node') {
			void focusNode(message.nodeId);
			return;
		}

		if (message.type === 'detach-all') {
			void runDetachAll();
			return;
		}

		if (message.type === 'get-prompt-state') {
			void runPromptState();
			return;
		}

		if (message.type === 'swap-temp') {
			void runSwapTemp(message.sourceCollectionName);
			return;
		}

		if (message.type === 'get-swap-collection-tokens') {
			void runExportSwapCollectionTokens(message.collectionId);
			return;
		}

		if (message.type === 'get-local-variable-collections') {
			void runLocalVariableCollections();
			return;
		}

		if (message.type === 'import-swap-collection-tokens') {
			void runImportSwapCollectionTokens(
				message.targetCollectionId,
				message.tokensJson,
			);
		}
	};

	void refreshState();
}

import type { MainToUiMessage, UiToMainMessage } from '../shared/types';
import { getSwapTargetCollectionName } from '../shared/constants';
import { detachNonTeamVariables } from './detach-variables';
import { buildMcpPrompts } from './prompt-builder';
import { focusNode, scanSelection } from './scan-variables';
import { swapTempVariables } from './swap-temp-variables';
import { getTempCollectionState } from './temp-collection';

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
		const result = await detachNonTeamVariables();
		postToUi({
			type: 'detach-result',
			detachedCount: result.detachedCount,
			detachedStyleCount: result.detachedStyleCount,
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
		}
	};

	void refreshState();
}

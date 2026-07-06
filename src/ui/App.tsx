import { Container, VerticalSpace } from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
	TARGET_COLLECTION_NAME,
	TARGET_TOKENS_FILE_URL,
} from '../shared/constants';
import type {
	MainToUiMessage,
	PromptState,
	ScanResult,
	UiToMainMessage,
} from '../shared/types';
import { LintTab } from './tabs/LintTab';
import { PromptTab } from './tabs/PromptTab';
import { SwapTab } from './tabs/SwapTab';

type MainTab = 'lint' | 'prompt' | 'swap';

const MAIN_TABS: Array<{ value: MainTab; label: string }> = [
	{ value: 'lint', label: 'Lint' },
	{ value: 'prompt', label: 'MCP' },
	{ value: 'swap', label: 'Swap' },
];

function postToMain(message: UiToMainMessage) {
	parent.postMessage({ pluginMessage: message }, '*');
}

export function App() {
	const [activeMainTab, setActiveMainTab] = useState<MainTab>('lint');
	const [result, setResult] = useState<ScanResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [promptState, setPromptState] = useState<PromptState | null>(null);
	const [detaching, setDetaching] = useState(false);
	const [detachMessage, setDetachMessage] = useState<string | null>(null);
	const [swapping, setSwapping] = useState(false);
	const [swapMessage, setSwapMessage] = useState<string | null>(null);
	const [swapSuccess, setSwapSuccess] = useState<boolean | null>(null);
	const [swapErrors, setSwapErrors] = useState<string[]>([]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data.pluginMessage as MainToUiMessage | undefined;

			if (!message) {
				return;
			}

			if (message.type === 'scan-result') {
				setResult(message.result);
				setError(null);
				setLoading(false);
				return;
			}

			if (message.type === 'prompt-state') {
				setPromptState(message.state);
				return;
			}

			if (message.type === 'scan-error') {
				setError(message.message);
				setLoading(false);
				setDetaching(false);
				setSwapping(false);
				return;
			}

			if (message.type === 'detach-result') {
				setDetaching(false);
				const parts = [
					`${message.detachedCount} variable binding${message.detachedCount === 1 ? '' : 's'}`,
					`${message.detachedStyleCount} text style${message.detachedStyleCount === 1 ? '' : 's'}`,
				];
				setDetachMessage(
					`Detached ${parts.join(' and ')} across ${message.nodeCount} node${message.nodeCount === 1 ? '' : 's'}.`,
				);
				return;
			}

			if (message.type === 'swap-result') {
				setSwapping(false);
				setSwapMessage(message.message);
				setSwapSuccess(message.success);
				setSwapErrors(message.errors);
			}
		};

		window.addEventListener('message', handleMessage);
		postToMain({ type: 'scan' });

		return () => window.removeEventListener('message', handleMessage);
	}, []);

	const handleRescan = useCallback(() => {
		setLoading(true);
		setDetachMessage(null);
		postToMain({ type: 'rescan' });
	}, []);

	const handleDetachAll = useCallback(() => {
		setDetaching(true);
		setDetachMessage(null);
		postToMain({ type: 'detach-all' });
	}, []);

	const handleSwap = useCallback(() => {
		setSwapping(true);
		setSwapMessage(null);
		setSwapSuccess(null);
		setSwapErrors([]);
		postToMain({ type: 'swap-temp' });
	}, []);

	return (
		<Container space="medium">
			<div class="plugin-shell">
				<nav class="linter-main-tabs" aria-label="Plugin sections">
					{MAIN_TABS.map((tab) => (
						<button
							key={tab.value}
							type="button"
							class={`linter-main-tab${activeMainTab === tab.value ? ' linter-main-tab--active' : ''}`}
							onClick={() => setActiveMainTab(tab.value)}
						>
							{tab.label}
						</button>
					))}
				</nav>

				<div class="plugin-content">
					<VerticalSpace space="small" />

					{activeMainTab === 'lint' && (
						<LintTab
							result={result}
							error={error}
							loading={loading}
							detaching={detaching}
							detachMessage={detachMessage}
							onRescan={handleRescan}
							onDetachAll={handleDetachAll}
						/>
					)}

					{activeMainTab === 'prompt' && (
						<PromptTab promptState={promptState} loading={loading} />
					)}

					{activeMainTab === 'swap' && (
						<SwapTab
							swapping={swapping}
							swapMessage={swapMessage}
							swapSuccess={swapSuccess}
							swapErrors={swapErrors}
							tokensFileUrl={TARGET_TOKENS_FILE_URL}
							targetCollectionName={TARGET_COLLECTION_NAME}
							onSwap={handleSwap}
						/>
					)}

					<VerticalSpace space="small" />
				</div>
			</div>
		</Container>
	);
}

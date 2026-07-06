import {
	Banner,
	Button,
	Muted,
	Stack,
	Text,
	TextboxMultiline,
	VerticalSpace,
} from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import type { PromptState } from '../../shared/types';
import { copyTextToClipboard } from '../utils/copy-to-clipboard';

type PromptTabProps = {
	promptState: PromptState | null;
	loading: boolean;
};

type CopyState = 'idle' | 'copied' | 'failed';

function PromptBlock({
	title,
	description,
	value,
	copyLabel,
}: {
	title: string;
	description: string;
	value: string;
	copyLabel: string;
}) {
	const [copyState, setCopyState] = useState<CopyState>('idle');

	const handleCopy = useCallback(async () => {
		if (!value) {
			return;
		}

		const copied = await copyTextToClipboard(value);
		setCopyState(copied ? 'copied' : 'failed');
		window.setTimeout(() => setCopyState('idle'), 2000);
	}, [value]);

	return (
		<Stack space="small">
			<Text>
				<strong>{title}</strong>
			</Text>
			<Muted>{description}</Muted>
			<TextboxMultiline
				class="linter-prompt"
				rows={10}
				value={value}
				onFocus={(event) => event.currentTarget.select()}
				readonly
			/>
			<Button fullWidth onClick={handleCopy} disabled={!value}>
				{copyState === 'copied'
					? 'Copied!'
					: copyState === 'failed'
						? 'Copy failed — select text manually'
						: copyLabel}
			</Button>
		</Stack>
	);
}

export function PromptTab({ promptState, loading }: PromptTabProps) {
	const tempStatus = promptState?.tempCollection.exists
		? `Collection _temp detected (${promptState.tempCollection.variableCount} variable${promptState.tempCollection.variableCount === 1 ? '' : 's'}).`
		: 'Collection _temp not found in this file.';

	return (
		<Stack space="small">
			{loading && <Muted>Updating prompts…</Muted>}

			{!loading && !promptState?.hasFileKey && (
				<Banner variant="warning">
					File URL unavailable. Enable the private plugin API or paste the file URL manually
					into the prompts.
				</Banner>
			)}

			<PromptBlock
				title="1. Create tokens"
				description="Copy this prompt and run it with Figma MCP to create component tokens in _temp."
				value={promptState?.createPrompt ?? ''}
				copyLabel="Copy create prompt"
			/>

			{promptState?.mapPrompt && (
				<>
					<VerticalSpace space="small" />
					<PromptBlock
						title="2. Map tokens to components"
						description="Copy this prompt and run it with Figma MCP to bind _temp variables to the selected components."
						value={promptState.mapPrompt}
						copyLabel="Copy map prompt"
					/>
				</>
			)}

			<Muted class={promptState?.tempCollection.exists ? 'linter-status--ok' : 'linter-status--warn'}>
				{tempStatus}
			</Muted>
		</Stack>
	);
}

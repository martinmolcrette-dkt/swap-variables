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
				description="Copy this prompt and run it with Figma Agent to create component tokens in [temp] collection."
				value={promptState?.createPrompt ?? ''}
				copyLabel="Copy create prompt"
			/>

			{promptState?.mapPrompt && (
				<>
					<VerticalSpace space="small" />
					<PromptBlock
						title="2. Map tokens to components"
						description="Copy this prompt and run it with Figma Agent to bind [temp] variables to the selected components. First call /token-grammar-figma skill"
						value={promptState.mapPrompt}
						copyLabel="Copy map prompt"
					/>
				</>
			)}

		</Stack>
	);
}

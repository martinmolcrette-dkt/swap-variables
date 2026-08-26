import { Banner, Button, Muted, Stack, Text, VerticalSpace } from '@create-figma-plugin/ui';
import { h } from 'preact';
import type { SwapCollectionSourceName } from '../../shared/constants';

type SwapTabProps = {
	swapping: boolean;
	swapMessage: string | null;
	swapSuccess: boolean | null;
	swapErrors: string[];
	sourceCollectionName: SwapCollectionSourceName;
	sourceOptions: Array<{ value: SwapCollectionSourceName; label: string }>;
	tokensFileUrl: string;
	targetCollectionName: string;
	onSourceCollectionChange: (value: SwapCollectionSourceName) => void;
	onSwap: () => void;
};

export function SwapTab({
	swapping,
	swapMessage,
	swapSuccess,
	swapErrors,
	sourceCollectionName,
	sourceOptions,
	tokensFileUrl,
	targetCollectionName,
	onSourceCollectionChange,
	onSwap,
}: SwapTabProps) {
	return (
		<Stack space="small">
			<Text>
				<strong>Swap {sourceCollectionName} → {targetCollectionName}</strong>
			</Text>
			<Muted>
				Rebind variables from the selected source collection to matching tokens from{' '}
				{targetCollectionName} in the Design Tokens library.
			</Muted>

			<Muted class="linter-swap-note">
				Transfer collection to branch is now manual: copy and paste variables first,
				then run swap.
			</Muted>

			<label class="linter-swap-select-label" for="swap-source-collection">
				Source collection
			</label>
			<select
				id="swap-source-collection"
				class="linter-swap-select"
				value={sourceCollectionName}
				onChange={(event) =>
					onSourceCollectionChange(
						(event.currentTarget as HTMLSelectElement)
							.value as SwapCollectionSourceName,
					)
				}
			>
				{sourceOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>

			<VerticalSpace space="extraSmall" />

			<Muted class="linter-swap-link">
				Target:{' '}
				<a href={tokensFileUrl} target="_blank" rel="noreferrer">
					{tokensFileUrl}
				</a>
			</Muted>

			<Button fullWidth disabled={swapping} onClick={onSwap}>
				{swapping ? 'Swapping…' : 'Swap variables'}
			</Button>

			{swapping && (
				<Muted>Looking for bindings and matching Design Tokens variables…</Muted>
			)}

			{swapMessage && (
				<Banner variant={swapSuccess ? 'success' : 'warning'}>{swapMessage}</Banner>
			)}

			{swapErrors.length > 0 && (
				<Stack space="extraSmall">
					{swapErrors.map((error) => (
						<Muted key={error}>{error}</Muted>
					))}
				</Stack>
			)}
		</Stack>
	);
}

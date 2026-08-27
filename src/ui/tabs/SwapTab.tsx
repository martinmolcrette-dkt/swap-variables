import { Banner, Button, Muted, Stack, Text, VerticalSpace } from '@create-figma-plugin/ui';
import { h } from 'preact';
import type { SwapCollectionSourceName } from '../../shared/constants';

type SwapTabProps = {
	swapping: boolean;
	swapMessage: string | null;
	swapSuccess: boolean | null;
	swapErrors: string[];
	tokensJson: string;
	tokensMessage: string | null;
	tokensSuccess: boolean | null;
	tokensLoading: boolean;
	tokensImporting: boolean;
	transferCollectionId: string;
	transferCollectionOptions: Array<{ value: string; label: string }>;
	sourceCollectionName: SwapCollectionSourceName;
	sourceOptions: Array<{ value: SwapCollectionSourceName; label: string }>;
	tokensFileUrl: string;
	targetCollectionName: string;
	onSourceCollectionChange: (value: SwapCollectionSourceName) => void;
	onSwap: () => void;
	onTokensJsonChange: (value: string) => void;
	onImportTokens: () => void;
	onTransferCollectionChange: (value: string) => void;
};

export function SwapTab({
	swapping,
	swapMessage,
	swapSuccess,
	swapErrors,
	tokensJson,
	tokensMessage,
	tokensSuccess,
	tokensLoading,
	tokensImporting,
	transferCollectionId,
	transferCollectionOptions,
	sourceCollectionName,
	sourceOptions,
	tokensFileUrl,
	targetCollectionName,
	onSourceCollectionChange,
	onSwap,
	onTokensJsonChange,
	onImportTokens,
	onTransferCollectionChange,
}: SwapTabProps) {
	return (
		<Stack space="small">
			<Text>
				<strong>Transfer design tokens</strong>
			</Text>
			<Muted>
				Copy this JSON, then paste it in the selected collection in another file.
				Existing tokens are never replaced.
			</Muted>
			<label class="linter-swap-select-label" for="swap-transfer-collection">
				Collection
			</label>
			<select
				id="swap-transfer-collection"
				class="linter-swap-select"
				value={transferCollectionId}
				disabled={transferCollectionOptions.length === 0}
				onChange={(event) =>
					onTransferCollectionChange(
						(event.currentTarget as HTMLSelectElement).value,
					)
				}
			>
				{transferCollectionOptions.length === 0 && (
					<option value="">No local variable collections</option>
				)}
				{transferCollectionOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<textarea
				class="linter-swap-tokens-json"
				value={tokensJson}
				placeholder="Select a collection to export its design tokens, or paste exported JSON here."
				rows={10}
				onInput={(event) =>
					onTokensJsonChange(
						(event.currentTarget as HTMLTextAreaElement).value,
					)
				}
			/>
			<Button
				fullWidth
				disabled={
					tokensLoading ||
					tokensImporting ||
					!transferCollectionId ||
					!tokensJson.trim()
				}
				onClick={onImportTokens}
			>
				{tokensImporting ? 'Adding tokens…' : 'Add tokens to selected collection'}
			</Button>
			{tokensLoading && <Muted>Exporting design tokens…</Muted>}
			{tokensMessage && (
				<Banner variant={tokensSuccess ? 'success' : 'warning'}>
					{tokensMessage}
				</Banner>
			)}

			<VerticalSpace space="small" />

			<Text>
				<strong>Swap {sourceCollectionName} → {targetCollectionName}</strong>
			</Text>
			<Muted>
				Rebind variables from the selected source collection to matching tokens from{' '}
				{targetCollectionName} in the Design Tokens library.
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

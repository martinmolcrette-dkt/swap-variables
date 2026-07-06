import { Banner, Button, Muted, Stack, Text, VerticalSpace } from '@create-figma-plugin/ui';
import { h } from 'preact';

type SwapTabProps = {
	swapping: boolean;
	swapMessage: string | null;
	swapSuccess: boolean | null;
	swapErrors: string[];
	tokensFileUrl: string;
	targetCollectionName: string;
	onSwap: () => void;
};

export function SwapTab({
	swapping,
	swapMessage,
	swapSuccess,
	swapErrors,
	tokensFileUrl,
	targetCollectionName,
	onSwap,
}: SwapTabProps) {
	return (
		<Stack space="small">
			<Text>
				<strong>Swap _temp → {targetCollectionName}</strong>
			</Text>
			<Muted>
				Rebind _temp variables on the selected components to matching tokens from{' '}
				{targetCollectionName} in the Design Tokens library.
			</Muted>

			<VerticalSpace space="extraSmall" />

			<Muted class="linter-swap-link">
				Source:{' '}
				<a href={tokensFileUrl} target="_blank" rel="noreferrer">
					{tokensFileUrl}
				</a>
			</Muted>

			<Button fullWidth disabled={swapping} onClick={onSwap}>
				{swapping ? 'Swapping…' : 'Swap variables'}
			</Button>

			{swapping && <Muted>Looking for _temp bindings and matching Design Tokens…</Muted>}

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

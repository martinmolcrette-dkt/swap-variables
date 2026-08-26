import {
	Banner,
	IconButton,
	IconRefresh16,
	LoadingIndicator,
	Muted,
	Stack,
	Text,
	VerticalSpace,
} from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type {
	ScanResult,
	SelectionVariable,
	UiToMainMessage,
	VariableCategory,
} from '../../shared/types';

const CATEGORY_ORDER: VariableCategory[] = [
	'color',
	'spacing',
	'sizing',
	'radius',
	'typography',
	'other',
];

const CATEGORY_LABELS: Record<VariableCategory, string> = {
	color: 'Color',
	spacing: 'Spacing',
	sizing: 'Sizing',
	radius: 'Radius',
	typography: 'Typography',
	other: 'Other',
};

function postToMain(message: UiToMainMessage) {
	parent.postMessage({ pluginMessage: message }, '*');
}

function groupVariablesByCategory(variables: SelectionVariable[]) {
	const groups = new Map<VariableCategory, SelectionVariable[]>();

	for (const variable of variables) {
		const existing = groups.get(variable.category) ?? [];
		existing.push(variable);
		groups.set(variable.category, existing);
	}

	return groups;
}

function countOccurrences(variables: SelectionVariable[]) {
	return variables.reduce((total, variable) => total + variable.occurrences.length, 0);
}

function VariableRow({
	variable,
	occurrence,
	onFocus,
}: {
	variable: SelectionVariable;
	occurrence: SelectionVariable['occurrences'][number];
	onFocus: (nodeId: string) => void;
}) {
	return (
		<button
			type="button"
			class="linter-item"
			onClick={() => onFocus(occurrence.nodeId)}
		>
			<div class="linter-item__main">
				<Text>
					<strong>{variable.variableName}</strong>
				</Text>
				<Muted>
					{variable.isRemote ? 'Remote variable' : 'Local variable'}
					{variable.collectionName ? ` · ${variable.collectionName}` : ''}
				</Muted>
			</div>
			<div class="linter-item__meta">
				<Muted>
					{occurrence.nodeName} · {occurrence.propertyLabel}
				</Muted>
			</div>
		</button>
	);
}

function VariableList({
	variables,
	onFocus,
}: {
	variables: SelectionVariable[];
	onFocus: (nodeId: string) => void;
}) {
	return (
		<Stack space="extraSmall">
			{variables.flatMap((variable) =>
				variable.occurrences.map((occurrence) => (
					<VariableRow
						key={`${variable.id}:${occurrence.nodeId}:${occurrence.property}`}
						variable={variable}
						occurrence={occurrence}
						onFocus={onFocus}
					/>
				)),
			)}
		</Stack>
	);
}

type VariablesListTabProps = {
	result: ScanResult | null;
	error: string | null;
	loading: boolean;
	onRescan: () => void;
};

export function VariablesListTab({
	result,
	error,
	loading,
	onRescan,
}: VariablesListTabProps) {
	const [activeCategory, setActiveCategory] = useState<VariableCategory | null>(null);

	const groupedVariables = useMemo(
		() => groupVariablesByCategory(result?.selectionVariables ?? []),
		[result?.selectionVariables],
	);

	const handleFocus = useCallback((nodeId: string) => {
		postToMain({ type: 'focus-node', nodeId });
	}, []);

	const categoryTabs = useMemo(() => {
		return CATEGORY_ORDER.filter((category) => groupedVariables.has(category)).map(
			(category) => {
				const variables = groupedVariables.get(category) ?? [];

				return {
					category,
					label: `${CATEGORY_LABELS[category]} (${countOccurrences(variables)})`,
					variables,
				};
			},
		);
	}, [groupedVariables, handleFocus]);

	useEffect(() => {
		if (categoryTabs.length === 0) {
			setActiveCategory(null);
			return;
		}

		const isCurrentCategoryValid = categoryTabs.some(
			(tab) => tab.category === activeCategory,
		);

		if (!isCurrentCategoryValid) {
			setActiveCategory(categoryTabs[0].category);
		}
	}, [categoryTabs, activeCategory]);

	const variableCount = result?.selectionVariables.length ?? 0;
	const title = `Variables in selection (${variableCount})`;
	const activeVariables =
		(activeCategory && groupedVariables.get(activeCategory)) ?? [];

	return (
		<div class="linter-panel linter-panel--fill">
			<Stack space="extraSmall">
				<div class="linter-header">
					<Text>
						<strong>{title}</strong>
					</Text>
					<IconButton onClick={onRescan}>
						<IconRefresh16 />
					</IconButton>
				</div>
			</Stack>

			{loading && (
				<div class="linter-center">
					<LoadingIndicator />
				</div>
			)}

			{!loading && error && <Banner variant="warning">{error}</Banner>}

			{!loading && !error && result?.selectionCount === 0 && (
				<Banner variant="warning">
					Select layers to list their bound variables.
				</Banner>
			)}

			{!loading && !error && result && variableCount === 0 && result.selectionCount > 0 && (
				<Banner variant="warning">No bound variables found in the selection.</Banner>
			)}

			{!loading && !error && variableCount > 0 && categoryTabs.length > 0 && activeCategory && (
				<Stack space="extraSmall" class="linter-panel__content variables-list-layout">
					<div class="variables-tabs" role="tablist" aria-label="Token categories">
						{categoryTabs.map((tab) => (
							<button
								key={tab.category}
								type="button"
								role="tab"
								aria-selected={tab.category === activeCategory}
								class={`variables-tab${tab.category === activeCategory ? ' variables-tab--active' : ''}`}
								onClick={() => setActiveCategory(tab.category)}
							>
								{tab.label}
							</button>
						))}
					</div>
					<div class="linter-list-scroll" role="tabpanel">
						<VariableList variables={activeVariables} onFocus={handleFocus} />
					</div>
				</Stack>
			)}
		</div>
	);
}

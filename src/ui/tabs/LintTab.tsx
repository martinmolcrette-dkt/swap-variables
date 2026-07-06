import {
	Banner,
	Button,
	IconButton,
	IconRefresh16,
	LoadingIndicator,
	Muted,
	Stack,
	Tabs,
	Text,
	VerticalSpace,
} from '@create-figma-plugin/ui';
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type {
	LintIssue,
	MainToUiMessage,
	ScanResult,
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

const VIOLATION_LABELS = {
	local: 'Local variable',
	foreign: 'External library',
} as const;

function postToMain(message: UiToMainMessage) {
	parent.postMessage({ pluginMessage: message }, '*');
}

function groupIssuesByCategory(issues: LintIssue[]) {
	const groups = new Map<VariableCategory, LintIssue[]>();

	for (const issue of issues) {
		const existing = groups.get(issue.category) ?? [];
		existing.push(issue);
		groups.set(issue.category, existing);
	}

	return groups;
}

function countOccurrences(issues: LintIssue[]) {
	return issues.reduce((total, issue) => total + issue.occurrences.length, 0);
}

function IssueRow({
	issue,
	occurrence,
	onFocus,
}: {
	issue: LintIssue;
	occurrence: LintIssue['occurrences'][number];
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
					<strong>{issue.variableName}</strong>
				</Text>
				<Muted>
					{VIOLATION_LABELS[issue.violation]}
					{issue.collectionName ? ` · ${issue.collectionName}` : ''}
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

function IssueList({
	issues,
	onFocus,
}: {
	issues: LintIssue[];
	onFocus: (nodeId: string) => void;
}) {
	return (
		<Stack space="extraSmall">
			{issues.flatMap((issue) =>
				issue.occurrences.map((occurrence) => (
					<IssueRow
						key={`${issue.id}:${occurrence.nodeId}:${occurrence.property}`}
						issue={issue}
						occurrence={occurrence}
						onFocus={onFocus}
					/>
				)),
			)}
		</Stack>
	);
}

type LintTabProps = {
	result: ScanResult | null;
	error: string | null;
	loading: boolean;
	detaching: boolean;
	detachMessage: string | null;
	onRescan: () => void;
	onDetachAll: () => void;
};

export function LintTab({
	result,
	error,
	loading,
	detaching,
	detachMessage,
	onRescan,
	onDetachAll,
}: LintTabProps) {
	const [activeTab, setActiveTab] = useState<string | null>(null);

	const groupedIssues = useMemo(
		() => groupIssuesByCategory(result?.issues ?? []),
		[result?.issues],
	);

	const handleFocus = useCallback((nodeId: string) => {
		postToMain({ type: 'focus-node', nodeId });
	}, []);

	const tabOptions = useMemo(() => {
		return CATEGORY_ORDER.filter((category) => groupedIssues.has(category)).map(
			(category) => {
				const issues = groupedIssues.get(category) ?? [];
				const count = countOccurrences(issues);

				return {
					value: `${CATEGORY_LABELS[category]} (${count})`,
					children: <IssueList issues={issues} onFocus={handleFocus} />,
				};
			},
		);
	}, [groupedIssues, handleFocus]);

	useEffect(() => {
		if (tabOptions.length === 0) {
			setActiveTab(null);
			return;
		}

		const isCurrentTabValid = tabOptions.some((option) => option.value === activeTab);

		if (!isCurrentTabValid) {
			setActiveTab(tabOptions[0].value);
		}
	}, [tabOptions, activeTab]);

	const issueCount =
		result?.issues.reduce((total, issue) => total + issue.occurrences.length, 0) ?? 0;
	const scannedNodeCount = result?.scannedNodeCount ?? 0;
	const canDetach = !loading && !detaching && issueCount > 0 && (result?.selectionCount ?? 0) > 0;

	return (
		<>
			<Stack space="extraSmall">
				<div class="linter-header">
					<Text>
						<strong>Non-team variables</strong>
					</Text>
					<IconButton onClick={onRescan}>
						<IconRefresh16 />
					</IconButton>
				</div>
				<Muted>
					{scannedNodeCount} node{scannedNodeCount === 1 ? '' : 's'} scanned
				</Muted>
			</Stack>

			<VerticalSpace space="small" />

			{loading && (
				<div class="linter-center">
					<LoadingIndicator />
				</div>
			)}

			{!loading && error && <Banner variant="warning">{error}</Banner>}

			{!loading && !error && result?.selectionCount === 0 && (
				<Banner variant="warning">
					Select layers to scan their bound variables.
				</Banner>
			)}

			{!loading && !error && result && result.teamLibraries.length === 0 && (
				<Banner variant="warning">
					No variable libraries enabled. Enable team libraries in this file (Assets →
					Libraries).
				</Banner>
			)}

			{!loading && !error && result && issueCount === 0 && result.selectionCount > 0 && (
				<Banner variant="success">No non-team variables found in the selection.</Banner>
			)}

			{detachMessage && (
				<>
					<VerticalSpace space="small" />
					<Banner variant="success">{detachMessage}</Banner>
				</>
			)}

			{!loading && !error && issueCount > 0 && tabOptions.length > 0 && activeTab && (
				<Stack space="extraSmall">
					<Text>
						<strong>
							{issueCount} issue{issueCount === 1 ? '' : 's'}
						</strong>
					</Text>
					<div class="linter-tabs">
						<Tabs
							options={tabOptions}
							value={activeTab}
							onValueChange={setActiveTab}
						/>
					</div>
					<VerticalSpace space="small" />
					<Button fullWidth secondary disabled={!canDetach} onClick={onDetachAll}>
						{detaching ? 'Detaching…' : 'Detach all'}
					</Button>
				</Stack>
			)}

			{!loading && result && result.teamLibraries.length > 0 && (
				<>
					<VerticalSpace space="medium" />
					<Muted>Team libraries: {result.teamLibraries.join(', ')}</Muted>
				</>
			)}

			<VerticalSpace space="small" />
			<Button fullWidth secondary onClick={onRescan}>
				Rescan selection
			</Button>
		</>
	);
}

export type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';

export type VariableCategory =
	| 'color'
	| 'spacing'
	| 'sizing'
	| 'radius'
	| 'typography'
	| 'other';

export type ViolationType = 'foundation';

export type LintOccurrence = {
	nodeId: string;
	nodeName: string;
	property: string;
	propertyLabel: string;
};

export type LintIssue = {
	id: string;
	variableId: string;
	variableName: string;
	variableType: VariableResolvedDataType;
	category: VariableCategory;
	violation: ViolationType;
	libraryName?: string;
	collectionName?: string;
	occurrences: LintOccurrence[];
};

export type SelectionVariable = {
	id: string;
	variableId: string;
	variableName: string;
	variableType: VariableResolvedDataType;
	category: VariableCategory;
	isRemote: boolean;
	libraryName?: string;
	collectionName?: string;
	occurrences: LintOccurrence[];
};

export type ScanResult = {
	issues: LintIssue[];
	selectionVariables: SelectionVariable[];
	teamLibraries: string[];
	selectionCount: number;
	scannedNodeCount: number;
};

export type TempCollectionInfo = {
	exists: boolean;
	variableCount: number;
};

export type LocalVariableCollectionInfo = {
	id: string;
	name: string;
};

export type PromptState = {
	createPrompt: string;
	mapPrompt: string | null;
	hasFileKey: boolean;
	tempCollection: TempCollectionInfo;
};

export type UiToMainMessage =
	| { type: 'scan' }
	| { type: 'focus-node'; nodeId: string }
	| { type: 'rescan' }
	| { type: 'detach-all' }
	| { type: 'get-prompt-state' }
	| { type: 'swap-temp'; sourceCollectionName: string }
	| { type: 'get-local-variable-collections' }
	| { type: 'get-swap-collection-tokens'; collectionId: string }
	| {
			type: 'import-swap-collection-tokens';
			targetCollectionId: string;
			tokensJson: string;
	  };

export type MainToUiMessage =
	| { type: 'scan-result'; result: ScanResult }
	| { type: 'scan-error'; message: string }
	| { type: 'detach-result'; detachedCount: number; nodeCount: number }
	| { type: 'prompt-state'; state: PromptState }
	| {
			type: 'swap-result';
			success: boolean;
			swappedCount: number;
			skippedCount: number;
			message: string;
			errors: string[];
	  }
	| {
			type: 'swap-collection-tokens';
			success: boolean;
			collectionId: string;
			tokensJson: string;
			message: string;
	  }
	| {
			type: 'local-variable-collections';
			collections: LocalVariableCollectionInfo[];
	  }
	| {
			type: 'swap-collection-import-result';
			success: boolean;
			message: string;
	  };

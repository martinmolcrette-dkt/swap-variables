/// <reference path="./src/vite-env.d.ts" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import type { Plugin as EsbuildPlugin } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const renderStub = path.resolve(rootDir, 'src/ui/create-figma-plugin-render-stub.ts');

function isCreateFigmaPluginImporter(importer?: string) {
	return importer?.includes('@create-figma-plugin/ui') ?? false;
}

function resolveBangCss(source: string, importer: string) {
	return path.resolve(path.dirname(importer), source.slice(1));
}

function resolveRenderStub(source: string, importer?: string) {
	if (!importer || !isCreateFigmaPluginImporter(importer)) {
		return null;
	}

	if (
		source === './utilities/render.js' ||
		source.endsWith('/utilities/render.js')
	) {
		return renderStub;
	}

	return null;
}

function createFigmaPluginUiEsbuild(): EsbuildPlugin {
	return {
		name: 'create-figma-plugin-ui',
		setup(build) {
			build.onResolve({ filter: /^!\.\.\/css\/.*\.css$/ }, (args) => ({
				path: resolveBangCss(args.path, args.importer),
			}));

			build.onResolve({ filter: /utilities\/render\.js$/ }, (args) => {
				if (!isCreateFigmaPluginImporter(args.importer)) {
					return null;
				}

				return { path: renderStub };
			});
		},
	};
}

function createFigmaPluginUiCss(): Plugin {
	return {
		name: 'create-figma-plugin-ui-css',
		enforce: 'pre',
		resolveId(source, importer) {
			const stub = resolveRenderStub(source, importer);
			if (stub) {
				return stub;
			}

			if (!source.startsWith('!') || !source.endsWith('.css') || !importer) {
				return null;
			}

			return resolveBangCss(source, importer);
		},
	};
}

// https://vite.dev/config/
export default defineConfig(({ context }) => {
	const uiConfig =
		context === 'ui'
			? {
					plugins: [createFigmaPluginUiCss(), preact()],
					resolve: {
						alias: {
							'@create-figma-plugin/ui/lib/utilities/render.js': renderStub,
						},
					},
					optimizeDeps: {
						include: ['@create-figma-plugin/ui', 'natural-compare-lite'],
						esbuildOptions: {
							plugins: [createFigmaPluginUiEsbuild()],
						},
					},
				}
			: {};

	return {
		...uiConfig,
	};
});

import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import filesize from 'rollup-plugin-filesize';
import fs from "fs";

export default {
	input: 'index.tsx',
	output: [
        {
		    file: 'bundle.js',
            format: 'esm',
			sourcemap: 'inline',
        },
		{
			file: 'bundle.min.js',
			format: 'esm',
			plugins: [terser()],
		}
	],
    plugins: [
		nodeResolve(),
		typescript(
			// Reading tsconfig.json as a JS expression allows some syntax
			// (comments, trailing commas, ...) which would not be permitted
			// if we imported it as JSON.
			Function(`return (${fs.readFileSync("tsconfig.json", "utf-8")});`)(),
		),
		filesize({
			showMinifiedSize: true,
			showGzippedSize: true,
			showBrotliSize: true,
		})
	],
};

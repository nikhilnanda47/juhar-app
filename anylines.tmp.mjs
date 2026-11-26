import { ESLint } from 'eslint';
const eslint = new ESLint({ overrideConfig: [{ rules: { '@typescript-eslint/no-explicit-any': 'warn' } }], cwd: process.cwd() });
const files = process.argv.slice(2);
const results = await eslint.lintFiles(files);
for (const r of results) for (const m of r.messages) if (m.ruleId === '@typescript-eslint/no-explicit-any') console.log(r.filePath.replace(process.cwd() + '/', '') + ':' + m.line);

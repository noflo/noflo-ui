import { load } from 'js-yaml';
import { readFile, writeFile } from 'node:fs/promises';

const yml = await readFile('node_modules/@fortawesome/fontawesome-free/metadata/icons.yml', 'utf-8');
const doc = load(yml);

const content = `export default function icons() {
  return {
  ${Object.keys(doc).map((icon) => { return `   '${icon}': '\\u{${doc[icon].unicode}}',` }).join('\n')}
  };
}
`;

await writeFile(`${process.cwd()}/utils/icon-map.js`, content, 'utf-8');

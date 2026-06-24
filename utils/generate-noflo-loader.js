import { writeFile } from 'node:fs/promises';

import componentLoader from 'noflo-component-loader';
// NoFlo hack: we need to override registerLoader
const loaderGeneration = () => {
  return new Promise((resolve, reject) => {
    componentLoader.call(
      {
        cacheable: () => {},
        async: () => { 
          return (err, loader) => {
            if (err) {
              reject(err);
              return;
            }
            const fixedLoader = loader.replace('noflo/components/Graph.js', 'noflo/src/components/Graph');
            resolve(fixedLoader);
          };
        },
        query: {
          runtimes: [],
        },
      },
    );
  });
};

const loader = await loaderGeneration();
await writeFile('./node_modules/noflo/src/lib/loader/register.js', loader, 'utf-8');

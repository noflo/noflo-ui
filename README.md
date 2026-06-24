## Vendored dependecies

This project aims for long-term maintainability. In support of that, we try to keep dependencies as minimal as possible.
The dependencies we have are to be vendored and committed into git. For this we have two processes:

* `esinstall` to convert CommonJS dependencies into importable ES modules
* `copyVendors` to copy vendor files that are already ES modules into the vendor folder

Both of these are controlled by `package.json` and are done by running `npm run build-vendors`.
This should only be necessary when adding a new dependency or updating an existing one.

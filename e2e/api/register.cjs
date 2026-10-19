// Mocha loader for the API specs: the specs import sibling modules with a `.js` suffix (as the
// WebdriverIO specs do), which ts-node only maps back to `.ts` with its experimental resolver.
require('ts-node').register({ experimentalResolver: true });

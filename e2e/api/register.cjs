// The specs import `.js` paths, which ts-node maps back to `.ts` only with its experimental resolver.
require('ts-node').register({ experimentalResolver: true });

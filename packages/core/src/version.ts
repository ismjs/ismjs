/**
 * The version of this library.
 *
 * Declared here, not read from `package.json`. The single-file bundle is made to
 * be copied onto networks that cannot fetch it, and a file copied by hand
 * arrives with no manifest and no lockfile. During an audit there is then no way
 * to answer "which version is this?". Exporting the version lets a vendored copy
 * name itself.
 *
 * A test keeps this in step with `package.json`, not a build step, so a
 * difference fails loudly instead of being hidden at bundle time.
 */
export const VERSION = '0.1.0'

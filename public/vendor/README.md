# Vendored browser bundles

| File | Source | Licence |
| --- | --- | --- |
| `kokoro.web.js` | `kokoro-js@1.2.1` (`dist/kokoro.web.js`), the opt-in in-browser voice used by `lib/atlas-ai/localVoice.worker.ts` (the default in-browser voice is Piper, `lib/atlas-ai/piperVoice.worker.ts`: `en_US-joe-medium`, CC0 dataset, engine MIT, fetched at run time) | Apache-2.0 (bundles transformers.js, Apache-2.0, and phonemizer / espeak-ng, GPL-3.0) |

Served as a static file because the bundle resolves its own WebAssembly paths at run time and
must not be re-bundled. To update: reinstall `kokoro-js` and copy the file again.

import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      // Emitted by the API's build, so the contract cannot drift from the DTOs.
      target: '../api/openapi.json',
      override: {
        /**
         * nestjs-zod suffixes every response schema with `_Output` to separate it from the
         * input form of the same DTO. Nothing here consumes the input form, so the suffix
         * would show up in every type name the UI touches. A blunt string replace is safe
         * because the suffix appears nowhere in the spec but schema names and their refs.
         */
        transformer: (spec) => JSON.parse(JSON.stringify(spec).replaceAll('_Output', '')),
      },
    },
    output: {
      target: './src/api/generated.ts',
      client: 'react-query',
      httpClient: 'fetch',
      override: {
        mutator: { path: './src/api/http.ts', name: 'request' },
        // The mutator returns the parsed body, so the generated types must not promise
        // the status and headers envelope orval wraps responses in by default.
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
})

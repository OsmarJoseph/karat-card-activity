/**
 * Vite inlines VITE_-prefixed variables at build time, so these are constants in the
 * bundle rather than something read at runtime. The default is the local API from
 * docker-compose, which keeps a fresh clone working with no configuration.
 */
export const apiBaseUrl: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

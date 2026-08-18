import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { createQueryClient } from '@/lib/query-client'

const container = document.getElementById('root')
if (!container) {
  throw new Error('index.html is missing its #root element')
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

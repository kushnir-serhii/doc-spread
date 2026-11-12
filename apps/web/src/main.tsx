import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { USE_MOCKS, readBackendEnv } from '@/lib/env'
import '@/styles/index.css'

// A non-mock build without its backend variables fails here, with the variable's name.
if (!USE_MOCKS) readBackendEnv()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)

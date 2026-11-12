/** Package diagram: workspaces, folders of apps/web/src and the allowed import directions (docs/conventions.md). */
export const STRUCTURE_DIAGRAM = `flowchart TB
  subgraph web["apps/web (@docspread/web), folders of src"]
    main["main.tsx"]
    app["app (router, providers)"]
    pages["pages"]
    features["features"]
    hooks["hooks"]
    styles["styles"]
    subgraph components["components"]
      layout["layout"]
      domain["domain"]
      ui["ui"]
    end
    subgraph lib["lib"]
      api["api"]
      fields["fields"]
      mock["mock (domain types, fake backend)"]
      theme["theme"]
      locale["format-locale"]
    end
  end
  subgraph shared["packages/shared (@docspread/shared)"]
    sharedsrc["src (raw TypeScript, no build step)"]
  end

  main --> app
  app -->|lazy| pages
  app --> layout
  app --> theme
  pages --> features
  pages --> components
  pages --> api
  features --> components
  features --> api
  features --> fields
  features --> locale
  features --> hooks
  layout --> ui
  domain --> ui
  api -->|"only importer of mock functions"| mock
  web -->|workspace dependency| shared
`

/** Navigation diagram: every route in src/app/router.tsx, grouped by layout, with the links between screens. */
export const SCREENS_DIAGRAM = `flowchart TB
  subgraph pub["Public"]
    landing["/"]
  end
  subgraph auth["Auth (AuthLayout)"]
    signin["/sign-in"]
    signup["/sign-up"]
    reset["/reset-password"]
    onboarding["/onboarding"]
  end
  subgraph shell["App shell"]
    direction TB
    inbox["/inbox"]
    upload["/upload"]
    types["/types"]
    typesnew["/types/new"]
    type["/types/:typeId"]
    train["/types/:typeId/train"]
    document["/documents/:documentId"]
    groups["/groups"]
    group["/groups/:typeId/:fieldId"]
    exp["/export"]
    settings["/settings"]
    subgraph dev["Developer pages"]
      design["/design"]
      architecture["/architecture"]
    end
    sidebar(["Sidebar and mobile nav reach Inbox, Upload, Types, Groups, Export, Settings and the developer pages"])
  end

  landing --> signin
  landing --> signup
  signin --> signup
  signup --> signin
  signin --> reset
  reset --> signin
  signin --> inbox
  signup --> onboarding
  onboarding --> inbox
  onboarding --> typesnew
  inbox --> document
  inbox --> exp
  document --> inbox
  upload --> document
  upload --> inbox
  upload --> typesnew
  types --> type
  types --> typesnew
  typesnew --> type
  type --> train
  train --> type
  groups --> group
  group --> groups
  group --> document
  exp --> types
  exp --> inbox
`

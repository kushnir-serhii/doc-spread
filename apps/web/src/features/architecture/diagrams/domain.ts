/** Class diagram: domain types of the app with key attributes and multiplicities (src/lib/mock/types.ts). */
export const DOMAIN_DIAGRAM = `classDiagram
  direction TB
  class Company {
    name
    taxId
    defaultCurrency
    locale
    recipients
  }
  class TeamMember {
    id
    email
    role
    status
  }
  class Plan {
    id
    name
    documentsPerMonth
    typeLimit
  }
  class DocumentType {
    id
    name
    version
    titleFieldId
    listColumnIds
  }
  class FieldDef {
    id
    key
    label
    type
    required
  }
  class ColumnDef {
    id
    key
    label
    type
  }
  class FieldAction {
    <<union>>
  }
  class CheckAction {
    kind = check
    label
    op
    severity
  }
  class ComputeAction {
    kind = compute
    fieldId
    expr
  }
  class RowCheckAction {
    kind = row_check
    tableFieldId
    op
    severity
  }
  class RowComputeAction {
    kind = row_compute
    tableFieldId
    columnId
    expr
  }
  class Document {
    id
    status
    typeId
    typeVersion
    overallConfidence
    values
  }
  class DocumentPage {
    index
    width
    height
    tokens
  }
  class Token {
    id
    text
    bbox
  }
  class FieldValue {
    <<union>>
  }
  class ExtractedValue {
    type
    value
    confidence
    source
  }
  class TableValue {
    type = table
    rows
  }
  class ExportJob {
    id
    format
    typeId
    documentIds
    destination
    status
  }
  class ExportMapping {
    typeId
    columns
    tables
    updatedAt
  }

  Company "1" --> "*" Document : owns
  Company "1" --> "*" DocumentType : owns
  Company "1" --> "*" TeamMember : has
  Company "1" --> "1" Plan : subscribes to
  DocumentType "1" *-- "*" FieldDef : fields
  FieldDef "1" *-- "0..*" ColumnDef : columns of a table field
  DocumentType "1" *-- "*" FieldAction : actions
  FieldAction <|-- CheckAction
  FieldAction <|-- ComputeAction
  FieldAction <|-- RowCheckAction
  FieldAction <|-- RowComputeAction
  Document "*" --> "0..1" DocumentType : typeId + typeVersion
  Document "1" *-- "1..*" DocumentPage : pages
  DocumentPage "1" *-- "*" Token : tokens
  Document "1" *-- "*" FieldValue : values by field id
  FieldValue <|-- ExtractedValue
  FieldValue <|-- TableValue
  TableValue "1" *-- "*" ExtractedValue : cells of its rows
  ExportJob "*" --> "1" DocumentType : typeId
  ExportJob "*" --> "*" Document : documentIds
  ExportMapping "0..1" --> "1" DocumentType : typeId
`

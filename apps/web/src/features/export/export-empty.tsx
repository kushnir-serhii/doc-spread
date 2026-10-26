import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export type ExportEmptyKind =
  | { kind: 'no-types' }
  | { kind: 'unknown-type' }
  | { kind: 'nothing-approved'; typeId: string; typeName: string }

interface ExportEmptyProps {
  empty: ExportEmptyKind
}

const Box = ({ title, text, children }: { title: string; text: string; children: ReactNode }) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
    {children}
  </div>
)

export const ExportEmpty = ({ empty }: ExportEmptyProps) => {
  switch (empty.kind) {
    case 'no-types':
      return (
        <Box title="No document types yet" text="Define a document type first; exports are made per type.">
          <Button asChild className="min-h-touch md:min-h-9">
            <Link to="/types">Manage document types</Link>
          </Button>
        </Box>
      )
    case 'unknown-type':
      return (
        <Box title="This type was not found" text="It may have been deleted. Choose another type above.">
          <Button asChild variant="outline" className="min-h-touch md:min-h-9">
            <Link to="/types">Manage document types</Link>
          </Button>
        </Box>
      )
    case 'nothing-approved':
      return (
        <Box
          title={`No approved ${empty.typeName.toLowerCase()} documents yet`}
          text="Only approved documents can be exported. Approve them in the Inbox first."
        >
          <Button asChild className="min-h-touch md:min-h-9">
            <Link to={`/inbox?type=${encodeURIComponent(empty.typeId)}&status=needs_review`}>Review in Inbox</Link>
          </Button>
        </Box>
      )
    default: {
      const unreachable: never = empty
      return unreachable
    }
  }
}

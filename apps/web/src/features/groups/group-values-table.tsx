import { Link } from 'react-router'
import { TruncatedText } from '@/features/documents/truncated-text'
import { GroupAmounts } from '@/features/groups/group-amounts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/mock/format'
import type { FieldDef, GroupValue } from '@/lib/mock/types'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

interface GroupValuesTableProps {
  values: GroupValue[]
  totalFields: FieldDef[]
  hrefFor: (value: string) => string
}

export const GroupValuesTable = ({ values, totalFields, hrefFor }: GroupValuesTableProps) => {
  const locale = useFormatLocale()
  return (
    <div className="hidden rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Value</TableHead>
            <TableHead className="text-right">Documents</TableHead>
            <TableHead>Last document</TableHead>
            {totalFields.map((field) => (
              <TableHead key={field.id} className="text-right">
                {field.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {values.map((group) => (
            <TableRow key={group.value}>
              <TableCell className="max-w-72">
                <Link
                  to={hrefFor(group.value)}
                  className="block rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <TruncatedText text={group.value} className="max-w-full" />
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">{group.count}</TableCell>
              <TableCell className="tabular-nums">{formatDate(group.lastDocumentAt, locale)}</TableCell>
              {totalFields.map((field) => (
                <TableCell key={field.id} className="text-right align-top">
                  <GroupAmounts
                    amounts={group.totals.find((total) => total.fieldId === field.id)?.amounts ?? []}
                    className="items-end"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

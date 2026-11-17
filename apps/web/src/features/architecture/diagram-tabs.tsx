import { useSearchParams } from 'react-router'
import { DiagramPanel } from '@/features/architecture/diagram-panel'
import { DIAGRAMS, isDiagramId, resolveDiagramId } from '@/features/architecture/diagrams'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const DiagramTabs = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = resolveDiagramId(searchParams.get('tab'))

  const select = (value: string) => {
    if (!isDiagramId(value)) return
    // Pushes a history entry, so Back restores the previous tab.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', value)
      return next
    })
  }

  return (
    <Tabs value={selected} onValueChange={select} className="gap-4">
      <div className="max-w-full overflow-x-auto">
        <TabsList className="w-max group-data-[orientation=horizontal]/tabs:h-auto">
          {DIAGRAMS.map((diagram) => (
            <TabsTrigger key={diagram.id} value={diagram.id} className="h-auto min-h-11 px-4">
              {diagram.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {DIAGRAMS.map((diagram) => (
        <TabsContent key={diagram.id} value={diagram.id}>
          <DiagramPanel diagram={diagram} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

import { useNavigation } from 'react-router'

type RoutePendingProps = {
  /** Show the bar regardless of navigation state (e.g. during initial hydration). */
  forceVisible?: boolean
}

export const RoutePending = ({ forceVisible = false }: RoutePendingProps) => {
  const navigation = useNavigation()
  const isPending = forceVisible || navigation.state === 'loading'

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      {isPending ? (
        <>
          <span className="sr-only">Loading page…</span>
          <div className="h-full w-full bg-primary motion-safe:w-1/3 motion-safe:animate-route-progress" />
        </>
      ) : null}
    </div>
  )
}

import { Link } from 'react-router'

interface TypeNotFoundProps {
  title: string
  backTo: string
  backLabel: string
}

export const TypeNotFound = ({ title, backTo, backLabel }: TypeNotFoundProps) => (
  <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center">
    <p className="font-medium">{title}</p>
    <Link to={backTo} className="inline-flex min-h-touch items-center text-sm underline md:min-h-9">
      {backLabel}
    </Link>
  </div>
)

import { Link } from 'react-router'

interface DocumentTitleLinkProps {
  id: string
  title: string
}

/** Stretched link: the whole row is the click target. */
export const DocumentTitleLink = ({ id, title }: DocumentTitleLinkProps) => (
  <Link
    to={`/documents/${id}`}
    title={title}
    className="block max-w-40 truncate rounded-sm font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset sm:max-w-72"
  >
    {title}
  </Link>
)

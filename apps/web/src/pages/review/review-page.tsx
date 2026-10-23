import { useParams } from 'react-router'
import { ReviewScreen } from '@/features/documents/review/review-screen'

const ReviewPage = () => {
  const { documentId } = useParams()
  // the route always has the param; the key resets the screen state when the document changes
  return documentId ? <ReviewScreen key={documentId} documentId={documentId} /> : null
}

export default ReviewPage

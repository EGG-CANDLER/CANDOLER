import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Badge } from './ui/badge'

export default function ImageModal({ item, onClose }) {
  if (!item) return null

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Scan #{item.id}</DialogTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {item.predicted_day || 'Uncertain'}
            </Badge>
          </div>
          <DialogDescription>
            {item.date} at {item.time} &middot; Stage: {item.stage || item.development_stage || 'Not specified'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black/90 flex items-center justify-center">
          <img
            src={item.image_url}
            alt={`Egg ${item.id}`}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>
            Confidence:{' '}
            <strong className="text-foreground font-mono">
              {typeof item.confidence === 'number'
                ? `${item.confidence.toFixed(2)}%`
                : '—'}
            </strong>
          </span>
          <span className="font-mono">
            Status: {item.is_archived ? 'Archived' : 'Active'}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

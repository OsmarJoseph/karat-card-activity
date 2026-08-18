import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { Observable, Subject, filter } from 'rxjs'

export interface ActivityChangedEvent {
  type: 'activity.changed'
  cardholderId: string
}

/**
 * Carries "something changed" from ingestion to every connected browser. Nothing is
 * buffered, because the stream is a nudge rather than a log: a client that missed one
 * refetches on reconnect and is current again.
 */
@Injectable()
export class ActivityEventBus implements OnModuleDestroy {
  private readonly changes = new Subject<ActivityChangedEvent>()

  publish(cardholderId: string): void {
    this.changes.next({ type: 'activity.changed', cardholderId })
  }

  streamFor(cardholderId: string): Observable<ActivityChangedEvent> {
    return this.changes.pipe(filter((event) => event.cardholderId === cardholderId))
  }

  onModuleDestroy(): void {
    // Completes open streams, so shutdown is not held up by an idle connection.
    this.changes.complete()
  }
}

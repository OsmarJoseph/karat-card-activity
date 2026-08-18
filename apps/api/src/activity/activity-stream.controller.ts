import { Controller, Sse, type MessageEvent } from '@nestjs/common'
import { Observable, defer, map, merge, switchMap, timer } from 'rxjs'
import { ActivityEventBus } from '@/activity/activity-event-bus'
import { CurrentCardholderService } from '@/cardholder/current-cardholder.service'

/** Under the minute that proxies and load balancers usually cut an idle stream at. */
const HEARTBEAT_MS = 30_000

@Controller('activity')
export class ActivityStreamController {
  constructor(
    private readonly cardholder: CurrentCardholderService,
    private readonly bus: ActivityEventBus,
  ) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const changes = defer(() => this.cardholder.resolveId()).pipe(
      switchMap((cardholderId) => this.bus.streamFor(cardholderId)),
      map((event): MessageEvent => ({ data: event })),
    )

    // A comment is invisible to EventSource, so the connection is held open without the
    // client having to recognise and discard a filler event. Starting at zero rather
    // than after the first interval matters: Nest defers the response headers until the
    // first message, so without it the browser would wait 30 seconds to open.
    const keepAlive = timer(0, HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ comment: 'keepalive' })),
    )

    return merge(changes, keepAlive)
  }
}

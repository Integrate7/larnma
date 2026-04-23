import { createServer } from 'node:http'
import { parse as parseUrl } from 'node:url'
import { parse as parseCookies } from 'cookie'
import next from 'next'
import { WebSocketServer } from 'ws'
import { verifyJwt } from './src/services/jwt/jwtService'
import {
  subscribe,
  type DashboardEvent,
} from './src/services/eventBus/eventBus'
import { ADAPTER_CONFIG } from './src/services/adapter/config'

const dev = process.env.NODE_ENV !== 'production'
const port = Number(process.env.PORT ?? 3000)

const app = next({ dev })
const handle = app.getRequestHandler()

await app.prepare()

const httpServer = createServer((req, res) => {
  const parsedUrl = parseUrl(req.url ?? '/', true)
  handle(req, res, parsedUrl)
})

const wss = new WebSocketServer({ noServer: true })

httpServer.on('upgrade', (req, socket, head) => {
  const { pathname } = parseUrl(req.url ?? '/', true)
  if (pathname !== '/api/events/ws') {
    socket.destroy()
    return
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

wss.on('connection', async (ws, req) => {
  const cookies = parseCookies(req.headers.cookie ?? '')
  const token = cookies[ADAPTER_CONFIG.accessCookie]

  if (!token) {
    ws.close(1008, 'Unauthorized')
    return
  }

  const result = await verifyJwt<{ sub: string; role: string }>(token)
  if (!result.valid || result.payload.role !== 'caregiver') {
    ws.close(1008, 'Unauthorized')
    return
  }

  const caregiverId = result.payload.sub

  const send = (event: DashboardEvent) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event))
    }
  }

  send({ kind: 'heartbeat' })

  const unsubscribe = subscribe(caregiverId, send)

  const heartbeat = setInterval(() => send({ kind: 'heartbeat' }), 15_000)

  ws.on('close', () => {
    unsubscribe()
    clearInterval(heartbeat)
  })
})

httpServer.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`)
})

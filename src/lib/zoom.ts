import { prisma } from './prisma'
import { encrypt, decrypt } from './utils'

const AUTH_URL = 'https://zoom.us/oauth/authorize'
const TOKEN_URL = 'https://zoom.us/oauth/token'
const API_BASE = 'https://api.zoom.us/v2'

function clientId() {
  const v = process.env.ZOOM_CLIENT_ID
  if (!v) throw new Error('ZOOM_CLIENT_ID is not set')
  return v
}
function clientSecret() {
  const v = process.env.ZOOM_CLIENT_SECRET
  if (!v) throw new Error('ZOOM_CLIENT_SECRET is not set')
  return v
}
function redirectUri() {
  return `${process.env.APP_BASE_URL}/api/integrations/zoom/callback`
}

export function getZoomAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    redirect_uri: redirectUri(),
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function exchangeZoomCode(code: string): Promise<TokenResponse> {
  const basic = Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) throw new Error(`Zoom token exchange failed: ${await res.text()}`)
  return res.json() as Promise<TokenResponse>
}

async function refreshZoomToken(refreshToken: string): Promise<TokenResponse> {
  const basic = Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) throw new Error(`Zoom token refresh failed: ${await res.text()}`)
  return res.json() as Promise<TokenResponse>
}

export async function getZoomAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      zoomAccessTokenEncrypted: true,
      zoomRefreshTokenEncrypted: true,
      zoomTokenExpiresAt: true,
    },
  })
  if (!user?.zoomAccessTokenEncrypted || !user.zoomRefreshTokenEncrypted) {
    throw new Error('Zoom not connected for this user')
  }
  // Refresh if token expires within the next minute
  const expiresAt = user.zoomTokenExpiresAt ? user.zoomTokenExpiresAt.getTime() : 0
  if (Date.now() > expiresAt - 60_000) {
    const refreshed = await refreshZoomToken(decrypt(user.zoomRefreshTokenEncrypted))
    await prisma.user.update({
      where: { id: userId },
      data: {
        zoomAccessTokenEncrypted: encrypt(refreshed.access_token),
        zoomRefreshTokenEncrypted: encrypt(refreshed.refresh_token),
        zoomTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    })
    return refreshed.access_token
  }
  return decrypt(user.zoomAccessTokenEncrypted)
}

export async function persistZoomTokens(
  userId: string,
  tokens: TokenResponse,
  accountEmail?: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      zoomAccessTokenEncrypted: encrypt(tokens.access_token),
      zoomRefreshTokenEncrypted: encrypt(tokens.refresh_token),
      zoomTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      ...(accountEmail ? { zoomAccountEmail: accountEmail } : {}),
    },
  })
}

export async function fetchZoomUserEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return undefined
  const data = await res.json()
  return typeof data.email === 'string' ? data.email : undefined
}

export interface CreateZoomMeetingInput {
  topic: string
  startIso: string
  durationMinutes: number
  timezone: string
  agenda?: string
}

export async function createZoomMeeting(
  userId: string,
  input: CreateZoomMeetingInput,
): Promise<{ meetingId: string; joinUrl: string; startUrl: string }> {
  const token = await getZoomAccessToken(userId)
  const body = {
    topic: input.topic,
    type: 2, // scheduled meeting
    start_time: input.startIso,
    duration: input.durationMinutes,
    timezone: input.timezone,
    agenda: input.agenda || '',
    settings: { join_before_host: true, waiting_room: false },
  }
  const res = await fetch(`${API_BASE}/users/me/meetings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Zoom meeting create failed: ${await res.text()}`)
  const data = await res.json()
  return {
    meetingId: String(data.id),
    joinUrl: data.join_url,
    startUrl: data.start_url,
  }
}

export async function disconnectZoom(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      zoomAccessTokenEncrypted: null,
      zoomRefreshTokenEncrypted: null,
      zoomTokenExpiresAt: null,
      zoomAccountEmail: null,
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'

// Public referral redirect: sets a 24h cookie then sends the visitor to the
// home/login page.  The dashboard layout reads this cookie and calls
// /api/referral/activate after the user signs in.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const base = process.env.APP_BASE_URL || 'http://localhost:3000'

  const response = NextResponse.redirect(`${base}/`)
  response.cookies.set('pending_ref', code, {
    path: '/',
    maxAge: 86_400,   // 24 hours
    httpOnly: false,  // needs to be readable by client JS in the dashboard
    sameSite: 'lax',
  })
  return response
}

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://pendingly.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/connect', '/scan', '/admin', '/r/', '/s/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

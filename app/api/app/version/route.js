import { APP_RELEASE } from '@/lib/app-release';

/**
 * What the newest Android build is.
 *
 * Public and unauthenticated on purpose: a tablet sitting on the login
 * screen with an old shell should still be able to find out it is behind.
 * It gives away nothing a visitor couldn't learn by downloading the APK.
 */
export const dynamic = 'force-static';

export function GET() {
  return Response.json(APP_RELEASE, {
    headers: {
      // Short, so a tablet notices a new build the same day without
      // asking on every single page view.
      'cache-control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
}

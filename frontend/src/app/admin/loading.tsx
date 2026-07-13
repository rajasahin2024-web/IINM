/**
 * loading.tsx — intentionally returns null.
 * Route transitions and back/forward navigation happen cleanly
 * without any skeleton flash. The AdminSkeleton is only used
 * inside ProtectedAdmin for the initial auth-verify step.
 */
export default function Loading() {
  return null;
}

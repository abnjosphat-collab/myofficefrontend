/**
 * Small interaction gestures shared by controls. Plain class strings (no client code), so server and client
 * components can both use them.
 *
 * closeTurn: the close (✕) turns a quarter turn on hover, the Tools workspace's close gesture, on every close and
 * remove control. Reduced motion keeps it still.
 */
export const closeTurn = '[&>svg]:transition-transform [&>svg]:duration-[250ms] [&>svg]:ease-standard hover:[&>svg]:rotate-90 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:rotate-0';

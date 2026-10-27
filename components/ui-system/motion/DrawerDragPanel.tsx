'use client';

import { motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

export interface DrawerDragPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  /** Called the moment a release past the threshold decides to dismiss (logic never waits on the exit animation). */
  onDismiss: () => void;
  children: ReactNode;
}

/**
 * The drawer's panel: on coarse pointers with full motion it follows a
 * horizontal drag with elastic resistance and dismisses past 100 px or a
 * 600 px/s fling; otherwise it snaps back on the gentle spring, keeping the
 * release velocity. Everywhere else (desktop, reduced motion) it is a plain
 * panel and the drawer keeps its fixed edge slide.
 */
export const DrawerDragPanel = forwardRef<HTMLDivElement, DrawerDragPanelProps>(function DrawerDragPanel(
  { onDismiss, children, ...rest },
  ref,
) {
  const reduce = useIsReducedMotion();
  const coarse = useMediaQuery('(pointer: coarse)', false);
  if (reduce || !coarse) {
    return <div ref={ref} {...rest}>{children}</div>;
  }
  return (
    <motion.div
      ref={ref}
      data-motion="drag-x"
      drag="x"
      dragConstraints={{ left: 0, right: 600 }}
      dragElastic={0.6}
      dragDirectionLock
      dragMomentum={false}
      transition={SPRING.gentle}
      onDragEnd={(_event, info) => {
        if (info.offset.x > 100 || info.velocity.x > 600) onDismiss();
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

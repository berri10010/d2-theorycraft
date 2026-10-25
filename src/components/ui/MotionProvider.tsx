'use client';

import React from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Makes every framer-motion animation follow the visitor's OS "reduce motion" setting (movement and scaling are
 * dropped, plain fades stay). The CSS animations honour the same setting in globals.css.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

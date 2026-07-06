import { Box, type BoxProps } from '@chakra-ui/react';
import { animate, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export const MotionBox = motion(Box);

const premiumEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Entrada suave com fade + deslocamento vertical.
 * Use `index` para escalonar (stagger) uma grade de cards.
 */
export function Reveal({
  children,
  delay,
  index = 0,
  y = 12,
  duration = 0.45,
  ...props
}: BoxProps & {
  children: ReactNode;
  delay?: number;
  index?: number;
  y?: number;
  duration?: number;
}) {
  return (
    <MotionBox
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay: delay ?? index * 0.06,
        ease: premiumEase,
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
}

/**
 * Numero com contagem animada. Anima do valor anterior para o novo,
 * usando o `format` informado (ex.: formatCurrency, formatNumber).
 */
export function CountUp({
  value,
  format,
  duration = 0.9,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const controls = animate(fromRef.current, target, {
      duration,
      ease: premiumEase,
      onUpdate: current => setDisplay(current),
    });
    fromRef.current = target;
    return () => controls.stop();
  }, [value, duration]);

  return <>{format ? format(display) : Math.round(display)}</>;
}

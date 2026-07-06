import { useColorModeValue } from '@chakra-ui/react';

/**
 * Paleta de series para graficos, alinhada a marca NovaWave.
 * Azul para o dado principal, indigo/violeta como apoio, cinza para comparativos.
 */
export const chartColors = {
  primary: '#2F80FF',
  secondary: '#4F46E5',
  accent: '#7C8CFF',
  positive: '#22C55E',
  negative: '#FB7185',
  muted: '#94A3B8',
} as const;

export const chartSeries = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.accent,
  '#38BDF8',
  '#F59E0B',
  '#EC4899',
];

/** Config de animacao padrao para as series (draw-in suave). */
export const chartAnimation = {
  isAnimationActive: true,
  animationDuration: 900,
  animationEasing: 'ease-out' as const,
};

/** Tokens visuais do grid/eixos sensiveis ao tema claro/escuro. */
export function useChartTheme() {
  const grid = useColorModeValue('#E9EDF4', '#273143');
  const axis = useColorModeValue('#94A3B8', '#6B7280');
  return {
    grid,
    axis,
    axisTick: { fontSize: 11, fill: axis },
  };
}

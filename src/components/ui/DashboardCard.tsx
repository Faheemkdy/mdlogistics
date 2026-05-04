import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ children, className, ...rest }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.97 }}
    className={clsx(
      'bg-glass shadow-glass rounded-2xl border border-white/30 p-4 transition-all',
      className
    )}
    {...rest}
  >
    {children}
  </motion.div>
);

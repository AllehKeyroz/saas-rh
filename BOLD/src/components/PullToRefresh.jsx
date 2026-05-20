import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function PullToRefresh({ children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const queryClient = useQueryClient();

  const TRIGGER_DISTANCE = 80;

  const handleTouchStart = (e) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0 && startYRef.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;
      
      if (distance > 0) {
        setPullDistance(Math.min(distance, TRIGGER_DISTANCE * 1.2));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= TRIGGER_DISTANCE && !isRefreshing) {
      setIsRefreshing(true);
      try {
        // Refetch todas as queries
        await queryClient.refetchQueries();
      } catch (error) {
        console.error('Erro ao atualizar:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startYRef.current = 0;
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, false);
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  const pullPercentage = Math.min(pullDistance / TRIGGER_DISTANCE, 1);
  const isReady = pullDistance >= TRIGGER_DISTANCE;

  return (
    <div
      ref={scrollContainerRef}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden"
      style={{
        WebkitOverscrollBehavior: 'contain',
      }}
    >
      {/* Indicador de Pull */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
            style={{
              height: pullDistance,
              zIndex: 10,
            }}
          >
            <motion.div
              className="flex flex-col items-center gap-2"
              animate={{
                scale: isReady ? 1.2 : 1,
              }}
            >
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : pullPercentage * 180,
                }}
                transition={{
                  rotate: isRefreshing ? {
                    repeat: Infinity,
                    duration: 1,
                    ease: 'linear',
                  } : { type: 'spring', stiffness: 300, damping: 30 },
                }}
              >
                <RefreshCw className={`w-5 h-5 ${
                  isReady ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </motion.div>
              <motion.p
                className={`text-xs font-medium ${
                  isReady ? 'text-primary' : 'text-muted-foreground'
                }`}
                animate={{
                  scale: isReady ? 1.1 : 1,
                }}
              >
                {isRefreshing ? 'Atualizando...' : isReady ? 'Solte para atualizar' : 'Puxe para atualizar'}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo com offset */}
      <motion.div
        animate={{
          y: Math.min(pullDistance * 0.5, TRIGGER_DISTANCE * 0.6),
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
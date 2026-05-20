import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * SafeButton - Wrapper seguro para botões com navegação/ação
 * Previne cliques duplos e garante tratamento de erros
 */
export default function SafeButton({
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  variant = 'default',
  size = 'default',
  children,
  className,
  ...props
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleClick = async (e) => {
    // Previne múltiplos cliques
    if (isProcessing || disabled || loading) {
      e.preventDefault();
      return;
    }

    setIsProcessing(true);
    try {
      if (typeof onClick === 'function') {
        const result = onClick(e);
        if (result instanceof Promise) {
          await result;
        }
      }
    } catch (error) {
      console.error('[SafeButton] Erro:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || loading || isProcessing;

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
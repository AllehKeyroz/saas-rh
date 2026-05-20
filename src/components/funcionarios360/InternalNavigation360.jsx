import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navTabs = [
  { id: 'dados', label: 'Dados Pessoais', icon: '👤' },
  { id: 'docs', label: 'Documentos', icon: '📄' },
  { id: 'pagamentos', label: 'Pagamentos', icon: '💰' },
  { id: 'vales', label: 'Vales', icon: '💳' },
  { id: 'descontos', label: 'Descontos', icon: '📉' },
  { id: 'consignados', label: 'Consignados', icon: '🏦' },
  { id: 'comissoes', label: 'Comissões', icon: '🏆' },
  { id: 'solicitacoes', label: 'Solicitações', icon: '📋' },
  { id: 'advertencias', label: 'Advertências', icon: '⚠️' },
  { id: 'ferias', label: 'Férias', icon: '🏖️' },
  { id: 'banco-horas', label: 'Banco de Horas', icon: '⏰' },
  { id: 'avaliacao', label: 'Avaliação', icon: '⭐' },
  { id: 'salario', label: 'Salário', icon: '📊' },
  { id: 'funcao', label: 'Função/Setor', icon: '🏢' },
  { id: 'timeline', label: 'Linha do Tempo', icon: '📅' },
  { id: 'auditoria', label: 'Auditoria', icon: '🔍' },
  { id: 'anexos', label: 'Anexos', icon: '📎' }
];

export default function InternalNavigation360({ activeTab, onTabChange }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newPosition = direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      
      scrollContainerRef.current.scrollLeft = newPosition;
      setScrollPosition(newPosition);
    }
  };

  return (
    <div className="mb-6 -mx-4 lg:mx-0">
      <div className="bg-card border-b border-border">
        <div className="relative">
          {/* Scroll buttons - mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 lg:hidden bg-white/80 backdrop-blur-sm"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Tabs container */}
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-1 px-4 lg:px-6 py-3 scroll-smooth lg:overflow-x-visible lg:flex-wrap"
            style={{ scrollBehavior: 'smooth' }}
          >
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all shrink-0 lg:shrink-1",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Scroll buttons - mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 lg:hidden bg-white/80 backdrop-blur-sm"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
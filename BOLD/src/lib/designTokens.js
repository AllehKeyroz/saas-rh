// Design System Tokens - Padrão Visual do RH

export const colors = {
  // Cores Principais
  primary: '#1A73E8',      // Azul Primário
  primaryDark: '#0F3D91',  // Azul Escuro
  background: '#F2F4F7',   // Cinza Claro
  text: '#2E2E2E',         // Cinza Grafite
  textMuted: '#9EA3A8',    // Cinza Médio
  white: '#FFFFFF',
  
  // Status
  success: '#2ECC71',      // Verde
  warning: '#F1C40F',      // Amarelo
  error: '#E74C3C',        // Vermelho
  accent: '#FF8C42',       // Laranja
  
  // Gráficos
  chartBlue: '#1A73E8',
  chartGreen: '#2ECC71',
  chartOrange: '#FF8C42',
  chartPurple: '#8E44AD',
  chartCyan: '#00B8D9'
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px'
};

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px'
};

export const shadows = {
  sm: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  md: '0px 2px 6px rgba(0, 0, 0, 0.08)',
  lg: '0px 4px 12px rgba(0, 0, 0, 0.12)'
};

export const typography = {
  title: 'font-bold text-20 leading-28',
  subtitle: 'font-semibold text-18 leading-26',
  body: 'font-regular text-14 leading-20',
  label: 'font-medium text-12 leading-16'
};

// Mapa de Ícones por Módulo
export const icons = {
  dashboard: ['BarChart3', 'TrendingUp', 'Bell', 'FolderOpen'],
  payroll: ['CreditCard', 'Receipt', 'DollarSign', 'MinusCircle', 'Wallet', 'ShoppingCart'],
  employees: ['User', 'Users', 'FileText', 'AlertTriangle', 'Calendar', 'Clock'],
  commissions: ['Star', 'TrendingUp', 'Lightbulb'],
  requests: ['Mail', 'Clock', 'CheckCircle2', 'XCircle'],
  communication: ['MessageSquare', 'Smartphone'],
  controlCenter: ['Settings', 'Lock', 'Bell', 'Grid3x3']
};

export const responsive = {
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  grid: {
    desktop: 12,
    tablet: 4,
    mobile: 1
  }
};
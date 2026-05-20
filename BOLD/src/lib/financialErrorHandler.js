export function getFinancialLogs() {
  return JSON.parse(sessionStorage.getItem('financial_logs') || '[]');
}

export function clearFinancialLogs() {
  sessionStorage.removeItem('financial_logs');
}

export function hasFinancialErrors() {
  const logs = getFinancialLogs();
  return logs.length > 0;
}

export function getErrorSummary() {
  const logs = getFinancialLogs();
  const errors = {};
  
  logs.forEach(log => {
    if (!errors[log.component]) {
      errors[log.component] = [];
    }
    errors[log.component].push({
      context: log.context,
      message: log.error,
      timestamp: log.timestamp
    });
  });
  
  return errors;
}
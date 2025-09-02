import { useContext } from 'react';
import { QueryContext } from '../contexts/query/context';

export function useQuery() {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
}

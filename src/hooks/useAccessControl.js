import { client } from '@/api/client';
import { useState, useEffect } from 'react';

export const useAccessControl = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await client.auth.me();
        setUser(currentUser);
        setRole(currentUser?.role || 'user');
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const hasPermission = (requiredRoles = []) => {
    if (!role) return false;
    if (requiredRoles.length === 0) return true;
    return requiredRoles.includes(role);
  };

  const isAdmin = role === 'admin';
  const isManager = ['admin', 'manager'].includes(role);
  const isEmployee = role === 'user';

  return {
    user,
    role,
    loading,
    hasPermission,
    isAdmin,
    isManager,
    isEmployee
  };
};
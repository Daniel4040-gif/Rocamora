import type {
  AdminUser,
  Cliente,
  ConfiguracionTaller,
  Servicio,
  Trabajo,
  Turno,
  Vehiculo,
} from '../types/workshop';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (inMemoryToken) {
    headers.Authorization = `Bearer ${inMemoryToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Error de comunicación con el servidor (${res.status}).`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await request<{ user: AdminUser; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      return res.user;
    },
    logout: async () => {
      try {
        await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
      } finally {
        setAuthToken(null);
      }
    },
    me: () => request<{ user: AdminUser }>('/api/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: boolean }>('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  configuracion: {
    get: () => request<ConfiguracionTaller>('/api/configuracion'),
    update: (payload: Partial<Omit<ConfiguracionTaller, 'id' | 'updated_at'>>) =>
      request<ConfiguracionTaller>('/api/configuracion', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  clientes: {
    list: (q = '') =>
      request<Cliente[]>(`/api/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create: (payload: Omit<Cliente, 'id' | 'created_at'>) =>
      request<Cliente>('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Omit<Cliente, 'id' | 'created_at'>>) =>
      request<Cliente>(`/api/clientes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/clientes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  vehiculos: {
    list: (q = '', clienteId = '') => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (clienteId) params.set('cliente_id', clienteId);
      const qs = params.toString();
      return request<Vehiculo[]>(`/api/vehiculos${qs ? `?${qs}` : ''}`);
    },
    create: (payload: Omit<Vehiculo, 'id' | 'created_at' | 'cliente_nombre'>) =>
      request<Vehiculo>('/api/vehiculos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Omit<Vehiculo, 'id' | 'created_at' | 'cliente_nombre'>>) =>
      request<Vehiculo>(`/api/vehiculos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/vehiculos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  servicios: {
    list: (activos = false) =>
      request<Servicio[]>(`/api/servicios${activos ? '?activos=true' : ''}`),
    create: (payload: Omit<Servicio, 'id' | 'created_at'>) =>
      request<Servicio>('/api/servicios', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Omit<Servicio, 'id' | 'created_at'>>) =>
      request<Servicio>(`/api/servicios/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/servicios/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  turnos: {
    list: (filters?: {
      fecha?: string;
      desde?: string;
      hasta?: string;
      cliente_id?: string;
      vehiculo_id?: string;
      estado?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.fecha) params.set('fecha', filters.fecha);
      if (filters?.desde) params.set('desde', filters.desde);
      if (filters?.hasta) params.set('hasta', filters.hasta);
      if (filters?.cliente_id) params.set('cliente_id', filters.cliente_id);
      if (filters?.vehiculo_id) params.set('vehiculo_id', filters.vehiculo_id);
      if (filters?.estado) params.set('estado', filters.estado);
      const qs = params.toString();
      return request<Turno[]>(`/api/turnos${qs ? `?${qs}` : ''}`);
    },
    create: (
      payload: Omit<
        Turno,
        | 'id'
        | 'created_at'
        | 'cliente_nombre'
        | 'cliente_telefono'
        | 'vehiculo_patente'
        | 'vehiculo_marca'
        | 'vehiculo_modelo'
        | 'servicio_nombre'
      >
    ) =>
      request<Turno>('/api/turnos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Omit<Turno, 'id' | 'created_at'>>) =>
      request<Turno>(`/api/turnos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/turnos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  trabajos: {
    list: (filters?: {
      desde?: string;
      hasta?: string;
      cliente_id?: string;
      vehiculo_id?: string;
      servicio_id?: string;
      patente?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.desde) params.set('desde', filters.desde);
      if (filters?.hasta) params.set('hasta', filters.hasta);
      if (filters?.cliente_id) params.set('cliente_id', filters.cliente_id);
      if (filters?.vehiculo_id) params.set('vehiculo_id', filters.vehiculo_id);
      if (filters?.servicio_id) params.set('servicio_id', filters.servicio_id);
      if (filters?.patente) params.set('patente', filters.patente);
      const qs = params.toString();
      return request<Trabajo[]>(`/api/trabajos${qs ? `?${qs}` : ''}`);
    },
    create: (
      payload: Omit<
        Trabajo,
        | 'id'
        | 'created_at'
        | 'cliente_nombre'
        | 'vehiculo_patente'
        | 'vehiculo_marca'
        | 'vehiculo_modelo'
        | 'servicio_nombre'
      > & { finalizar_turno?: boolean }
    ) =>
      request<Trabajo>('/api/trabajos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Omit<Trabajo, 'id' | 'created_at'>>) =>
      request<Trabajo>(`/api/trabajos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/trabajos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },
};

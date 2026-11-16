-- ============================================================================
-- SISTEMA WEB DE GESTIÓN PARA TALLER MECÁNICO
-- Esquema relacional PostgreSQL para Supabase (incluye claves foráneas,
-- restricciones de integridad y políticas RLS).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_apellido TEXT NOT NULL,
  dni_cuit TEXT NOT NULL,
  telefono TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes (nombre_apellido);
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON public.clientes (dni_cuit);

-- 2. VEHÍCULOS
CREATE TABLE IF NOT EXISTS public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patente TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  kilometraje INTEGER NOT NULL DEFAULT 0,
  motor TEXT DEFAULT '',
  tipo_combustible TEXT NOT NULL DEFAULT 'Nafta',
  color TEXT DEFAULT '',
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON public.vehiculos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_patente ON public.vehiculos (patente);

-- 3. SERVICIOS
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  duracion_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracion_minutos > 0),
  precio_orientativo NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (precio_orientativo >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TURNOS
CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  hora TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracion_minutos > 0),
  estado TEXT NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente', 'Confirmado', 'En taller', 'En reparación', 'Finalizado', 'Cancelado')),
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON public.turnos (fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_cliente ON public.turnos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_turnos_vehiculo ON public.turnos (vehiculo_id);

-- 5. HISTORIAL DE TRABAJOS
CREATE TABLE IF NOT EXISTS public.trabajos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id UUID REFERENCES public.turnos(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  kilometraje INTEGER NOT NULL DEFAULT 0 CHECK (kilometraje >= 0),
  descripcion TEXT NOT NULL,
  observaciones TEXT DEFAULT '',
  importe NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (importe >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trabajos_fecha ON public.trabajos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_trabajos_cliente ON public.trabajos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_vehiculo ON public.trabajos (vehiculo_id);

-- 6. CONFIGURACIÓN DEL TALLER (registro único id = 1)
CREATE TABLE IF NOT EXISTS public.configuracion (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_taller TEXT NOT NULL DEFAULT 'Mecánica Rocamora',
  telefono TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  hora_apertura TEXT NOT NULL DEFAULT '08:00',
  hora_cierre TEXT NOT NULL DEFAULT '18:00',
  dias_laborables JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5, 6]'::jsonb,
  duracion_predeterminada INTEGER NOT NULL DEFAULT 60 CHECK (duracion_predeterminada > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SEGURIDAD (ROW LEVEL SECURITY)
-- Solo usuarios autenticados o el backend con service_role pueden operar.
-- ============================================================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso administrativo autenticado clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Acceso administrativo autenticado vehiculos"
  ON public.vehiculos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Acceso administrativo autenticado servicios"
  ON public.servicios FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Acceso administrativo autenticado turnos"
  ON public.turnos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Acceso administrativo autenticado trabajos"
  ON public.trabajos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Acceso administrativo autenticado configuracion"
  ON public.configuracion FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

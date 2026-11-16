import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  parseCookies,
  type AuthenticatedRequest,
} from './src/server/auth.ts';
import {
  authenticateAdmin,
  createCliente,
  createServicio,
  createTrabajo,
  createTurno,
  createVehiculo,
  deleteCliente,
  deleteServicio,
  deleteTrabajo,
  deleteTurno,
  deleteVehiculo,
  DomainError,
  getConfiguracion,
  listClientes,
  listServicios,
  listTrabajos,
  listTurnos,
  listVehiculos,
  updateAdminPassword,
  updateCliente,
  updateConfiguracion,
  updateServicio,
  updateTrabajo,
  updateTurno,
  updateVehiculo,
} from './src/server/db.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function handleRouteError(res: Response, err: unknown): void {
  if (err instanceof DomainError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error('Error inesperado en API:', err);
  res.status(500).json({ error: 'Error interno del servidor. Intentá nuevamente.' });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ error: 'Ingresá correo electrónico y contraseña.' });
        return;
      }
      const user = await authenticateAdmin(String(email), String(password));
      if (!user) {
        res.status(401).json({ error: 'Credenciales inválidas.' });
        return;
      }
      const token = signSessionToken(user);
      res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json({ user, token });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    }
    if (!token) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies[SESSION_COOKIE_NAME];
    }
    const session = verifySessionToken(token);
    if (!session) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    res.json({
      user: {
        id: session.userId,
        email: session.email,
        nombre: session.nombre,
      },
    });
  });

  app.post('/api/auth/password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      await updateAdminPassword(
        req.adminUser!.userId,
        String(currentPassword || ''),
        String(newPassword || '')
      );
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // ============================================================================
  // PROTECTED WORKSHOP API ROUTES
  // ============================================================================
  app.get('/api/configuracion', requireAuth, async (_req: Request, res: Response) => {
    try {
      res.json(await getConfiguracion());
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/configuracion', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await updateConfiguracion(req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // CLIENTES
  app.get('/api/clientes', requireAuth, async (req: Request, res: Response) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      res.json(await listClientes(q));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/clientes', requireAuth, async (req: Request, res: Response) => {
    try {
      res.status(201).json(await createCliente(req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/clientes/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await updateCliente(String(req.params.id), req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/clientes/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteCliente(String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // VEHICULOS
  app.get('/api/vehiculos', requireAuth, async (req: Request, res: Response) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const cliente_id = typeof req.query.cliente_id === 'string' ? req.query.cliente_id : '';
      res.json(await listVehiculos(q, cliente_id));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/vehiculos', requireAuth, async (req: Request, res: Response) => {
    try {
      res.status(201).json(await createVehiculo(req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/vehiculos/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await updateVehiculo(String(req.params.id), req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/vehiculos/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteVehiculo(String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // SERVICIOS
  app.get('/api/servicios', requireAuth, async (req: Request, res: Response) => {
    try {
      const activos = req.query.activos === 'true';
      res.json(await listServicios(activos));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/servicios', requireAuth, async (req: Request, res: Response) => {
    try {
      res.status(201).json(await createServicio(req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/servicios/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await updateServicio(String(req.params.id), req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/servicios/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteServicio(String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // TURNOS
  app.get('/api/turnos', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(
        await listTurnos({
          fecha: typeof req.query.fecha === 'string' ? req.query.fecha : undefined,
          desde: typeof req.query.desde === 'string' ? req.query.desde : undefined,
          hasta: typeof req.query.hasta === 'string' ? req.query.hasta : undefined,
          cliente_id: typeof req.query.cliente_id === 'string' ? req.query.cliente_id : undefined,
          vehiculo_id: typeof req.query.vehiculo_id === 'string' ? req.query.vehiculo_id : undefined,
          estado: typeof req.query.estado === 'string' ? req.query.estado : undefined,
        })
      );
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/turnos', requireAuth, async (req: Request, res: Response) => {
    try {
      res.status(201).json(await createTurno(req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/turnos/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await updateTurno(String(req.params.id), req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/turnos/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteTurno(String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // TRABAJOS (HISTORIAL)
  app.get('/api/trabajos', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(
        await listTrabajos({
          desde: typeof req.query.desde === 'string' ? req.query.desde : undefined,
          hasta: typeof req.query.hasta === 'string' ? req.query.hasta : undefined,
          cliente_id: typeof req.query.cliente_id === 'string' ? req.query.cliente_id : undefined,
          vehiculo_id: typeof req.query.vehiculo_id === 'string' ? req.query.vehiculo_id : undefined,
          servicio_id: typeof req.query.servicio_id === 'string' ? req.query.servicio_id : undefined,
          patente: typeof req.query.patente === 'string' ? req.query.patente : undefined,
        })
      );
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.post('/api/trabajos', requireAuth, async (req: Request, res: Response) => {
    try {
      res.status(201).json(await createTrabajo(req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.put('/api/trabajos/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await updateTrabajo(String(req.params.id), req.body || {}));
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  app.delete('/api/trabajos/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteTrabajo(String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  // ============================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // ============================================================================
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor del taller mecánico escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();

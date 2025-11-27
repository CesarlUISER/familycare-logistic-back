// backend/src/middlewares/permMiddleware.js

/**
 * Middleware de permisos por módulo.
 *
 * - Requiere que antes se haya ejecutado `requireAuth`
 *   (es decir, que exista `req.user`).
 * - Si el usuario tiene rol `superadmin`, siempre pasa.
 * - Para otros roles, revisa una bandera booleana en `req.user`
 *   con el nombre del permiso, por ejemplo:
 *   requirePerm("perm_usuarios") -> req.user.perm_usuarios === true
 */
export function requirePerm(permName) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // El doctor dueño (desde .env) tiene rol superadmin
    if (user.role === "superadmin") {
      return next();
    }

    // Para futuros empleados: se revisa la bandera de permiso
    const hasPerm = user[permName];

    if (!hasPerm) {
      return res.status(403).json({
        message: "No tienes permisos para acceder a este recurso",
        required: permName,
      });
    }

    return next();
  };
}

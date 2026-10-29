// Datos del usuario que conserva el frontend. La respuesta del backend también incluye
// la contraseña; se descarta al recibirla y nunca forma parte de este modelo.
export interface Usuario {
  id: number;
  nombreUsuario: string;
  email: string;
}

// POST /api/auth/registro
export interface RegistroRequest {
  nombreUsuario: string;
  email: string;
  contrasenia: string;
}

// POST /api/auth/login — identificador acepta nombre de usuario o email
export interface LoginRequest {
  identificador: string;
  contrasenia: string;
}

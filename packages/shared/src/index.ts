// Tipos TypeScript compartidos entre frontend y backend

export type Rol = 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'VALIDADOR';
export type EstadoEvento = 'BORRADOR' | 'ACTIVO' | 'PAUSADO' | 'FINALIZADO';
export type EstadoOrden = 'PENDIENTE' | 'PAGADA' | 'EXPIRADA' | 'REEMBOLSADA' | 'FALLIDA';
export type EstadoBoleto = 'VALIDO' | 'USADO' | 'CANCELADO';
export type CanalVenta = 'ONLINE' | 'TAQUILLA';
export type FormaPago = 'MERCADOPAGO' | 'EFECTIVO' | 'TARJETA' | 'CORTESIA';
export type TipoItem = 'BOLETO' | 'PRODUCTO';

export interface UsuarioPublico {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export interface EventoPublico {
  id: string;
  slug: string;
  nombre: string;
  descripcion?: string;
  lugar: string;
  fechaEvento: string;
  fechaFin?: string;
  imagen?: string;
  estado: EstadoEvento;
  ventaOnline: boolean;
  ventaTaquilla: boolean;
  categorias: CategoriaPublica[];
}

export interface CategoriaPublica {
  id: string;
  nombre: string;
  precio: number;
  disponibles: number;
  totalBoletos: number;
  activaOnline: boolean;
  activaTaquilla: boolean;
  ordenDisplay: number;
}

export interface OrdenPublica {
  id: string;
  canal: CanalVenta;
  formaPago: FormaPago;
  estado: EstadoOrden;
  compradorNombre?: string;
  compradorEmail?: string;
  total: number;
  items: ItemOrdenPublico[];
  boletos: BoletoPublico[];
  createdAt: string;
  expiresAt?: string;
}

export interface ItemOrdenPublico {
  id: string;
  tipoItem: TipoItem;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  categoria?: CategoriaPublica;
}

export interface BoletoPublico {
  id: string;
  numero: number;
  estado: EstadoBoleto;
  categoria: { nombre: string; precio: number };
  evento: { nombre: string; lugar: string; fechaEvento: string };
  compradorNombre?: string;
  canal: CanalVenta;
  createdAt: string;
}

export interface SSEStockPayload {
  eventoId: string;
  categorias: { id: string; disponibles: number }[];
}

export interface DashboardMetricas {
  vendidosHoy: number;
  ingresosDia: number;
  ingresosTotal: number;
  disponiblesPorCategoria: { id: string; nombre: string; disponibles: number; total: number }[];
  ultimasOrdenes: OrdenResumen[];
  ventasPorHora: { hora: number; cantidad: number; ingresos: number }[];
}

export interface OrdenResumen {
  id: string;
  compradorNombre?: string;
  canal: CanalVenta;
  formaPago: FormaPago;
  estado: EstadoOrden;
  total: number;
  createdAt: string;
  categoria?: string;
}

export interface AuthJWT {
  sub: string;
  email: string;
  nombre: string;
  rol: Rol;
  iat: number;
  exp: number;
}

// Configuración NextAuth — credentials provider contra la API Express
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_INTERNAL = process.env.API_INTERNAL_URL || 'http://localhost:4000';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${API_INTERNAL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { id: data.usuario.id, email: data.usuario.email, name: data.usuario.nombre, rol: data.usuario.rol, token: data.token };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.rol = (user as any).rol; token.apiToken = (user as any).token; }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).rol = token.rol;
        (session.user as any).apiToken = token.apiToken;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: { signIn: '/admin/login', error: '/admin/login' },
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};

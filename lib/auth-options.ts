import Google from 'next-auth/providers/google';
import connectDB from '@/lib/db/mongoose';
import { Admin } from '@/lib/db/models/admin.model';
import type { NextAuthOptions } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      adminId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    adminId?: string;
    role?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false;
      if (!user.email) return false;

      try {
        await connectDB();
        const admin = await Admin.findOne({
          emailNormalized: user.email.toLowerCase(),
          isActive: true,
        });

        if (!admin) return false;

        if (!admin.googleId && account.providerAccountId) {
          admin.googleId = account.providerAccountId;
          admin.image = user.image ?? undefined;
          await admin.save();
        }

        admin.lastLoginAt = new Date();
        await admin.save();

        return true;
      } catch (err) {
        console.error('[AUTH] signIn error:', err);
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/admin`;
    },

    async jwt({ token, user, account }) {
      if (user?.email && account) {
        try {
          await connectDB();
          const admin = await Admin.findOne({
            emailNormalized: user.email.toLowerCase(),
          });

          if (admin) {
            token.adminId = admin._id.toString();
            token.role = admin.role;
          }
        } catch (err) {
          console.error('[AUTH] JWT error:', err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.adminId) {
        session.user.adminId = token.adminId as string;
        session.user.role = (token.role as string) ?? 'owner';
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
};

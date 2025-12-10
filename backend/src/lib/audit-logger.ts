import { Request } from 'express';
import { prisma } from './prisma';
import { verifyToken, extractTokenFromHeader } from './jwt';

export interface AuditLogEntry {
  action: string;
  details: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  severity?: 'Low' | 'Medium' | 'High';
  metadata?: Record<string, any>;
  requestId?: string;
  sessionId?: string;
  clientIp?: string;
  userAgent?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Log to database audit_logs table
  async logToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userName: entry.userName || 'System',
          userAvatarUrl: entry.userId ? `https://picsum.photos/seed/${entry.userEmail}/100/100` : null,
          action: entry.action,
          details: entry.details,
          severity: entry.severity || 'Low',
        }
      });
    } catch (error) {
      console.error('Failed to log to database:', error);
    }
  }

  // Log to Fluent Bit (application logs)
  async logToFluentBit(entry: AuditLogEntry): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: this.severityToLevel(entry.severity || 'Low'),
        message: `${entry.action}: ${entry.details}`,
        service: 'studio-backend',
        worker_type: 'api-service',
        component: 'audit-system',
        user_id: entry.userId,
        session_id: entry.sessionId,
        request_id: entry.requestId,
        client_ip: entry.clientIp,
        user_agent: entry.userAgent,
        metadata: entry.metadata,
        action: entry.action,
        details: entry.details,
        severity: entry.severity
      };

      if (process.env.FLUENT_BIT_URL && typeof fetch !== 'undefined') {
        try {
          await fetch(process.env.FLUENT_BIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([logEntry])
          });
        } catch (fetchError) {
          console.error('Failed to send to Fluent Bit:', fetchError);
        }
      }

      console.log('AUDIT_LOG:', JSON.stringify(logEntry));
    } catch (error) {
      console.error('Failed to log to Fluent Bit:', error);
    }
  }

  async log(entry: AuditLogEntry): Promise<void> {
    await Promise.all([
      this.logToDatabase(entry),
      this.logToFluentBit(entry)
    ]);
  }

  async extractUserFromRequest(request: Request): Promise<Partial<AuditLogEntry>> {
    const authHeader = request.headers.authorization || null;
    const token = extractTokenFromHeader(authHeader);

    let userInfo: Partial<AuditLogEntry> = {
      clientIp: this.getClientIp(request),
      userAgent: request.headers['user-agent'] || undefined,
      requestId: (request.headers['x-request-id'] as string) || `req-${Date.now()}`,
    };

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, name: true, email: true }
          });

          if (user) {
            userInfo = {
              ...userInfo,
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
            };
          }
        } catch (error) {
          console.error('Failed to fetch user for audit log:', error);
        }
      }
    }

    return userInfo;
  }

  private severityToLevel(severity: string): string {
    switch (severity) {
      case 'High': return 'error';
      case 'Medium': return 'warn';
      case 'Low': return 'info';
      default: return 'info';
    }
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];

    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return forwardedStr.split(',')[0].trim();
    }

    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || 'unknown';
  }
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  const logger = AuditLogger.getInstance();
  await logger.log(entry);
}
import { prisma } from './prisma';
import { NextRequest } from 'next/server';
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

      // Send to Fluent Bit via HTTP (if running)
      if (process.env.FLUENT_BIT_URL && typeof fetch !== 'undefined') {
        try {
          await fetch(`${process.env.FLUENT_BIT_URL}/app`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
          });
        } catch (fetchError) {
          console.error('Failed to send to Fluent Bit:', fetchError);
        }
      }

      // Also log to console for development
      console.log('AUDIT_LOG:', JSON.stringify(logEntry));
    } catch (error) {
      console.error('Failed to log to Fluent Bit:', error);
    }
  }

  // Main logging method - logs to both database and Fluent Bit
  async log(entry: AuditLogEntry): Promise<void> {
    await Promise.all([
      this.logToDatabase(entry),
      this.logToFluentBit(entry)
    ]);
  }

  // Extract user info from request
  async extractUserFromRequest(request: NextRequest): Promise<Partial<AuditLogEntry>> {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    
    let userInfo: Partial<AuditLogEntry> = {
      clientIp: this.getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined,
      requestId: request.headers.get('X-Request-ID') || `req-${Date.now()}`,
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

  // Helper methods
  private severityToLevel(severity: string): string {
    switch (severity) {
      case 'High': return 'error';
      case 'Medium': return 'warn';
      case 'Low': return 'info';
      default: return 'info';
    }
  }

  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('X-Forwarded-For');
    const realIp = request.headers.get('X-Real-IP');
    const remoteAddr = request.headers.get('Remote-Addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || remoteAddr || 'unknown';
  }
}

// Convenience function for quick logging
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  const logger = AuditLogger.getInstance();
  await logger.log(entry);
}

// Middleware function for API routes
export function withAuditLogging(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const logger = AuditLogger.getInstance();
    const userInfo = await logger.extractUserFromRequest(request);
    
    // Log the request
    await logger.log({
      action: `API ${request.method}`,
      details: `${request.method} ${request.nextUrl.pathname}`,
      severity: 'Low',
      ...userInfo,
    });

    try {
      const response = await handler(request, ...args);
      
      // Log successful response
      await logger.log({
        action: `API ${request.method} Success`,
        details: `${request.method} ${request.nextUrl.pathname} completed successfully`,
        severity: 'Low',
        ...userInfo,
      });
      
      return response;
    } catch (error) {
      // Log error
      await logger.log({
        action: `API ${request.method} Error`,
        details: `${request.method} ${request.nextUrl.pathname} failed: ${error}`,
        severity: 'High',
        ...userInfo,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      
      throw error;
    }
  };
}
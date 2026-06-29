import type { APIRoute } from 'astro';
import {
  getReportById,
  updateReportStatus,
  updateContentReportStatus,
  type ReportStatus,
  type ContentReportStatus,
} from '../../../lib/db';
import { notifyRemovalAction } from '../../../lib/email';

export const prerender = false;

function checkAuth(request: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${token}`;
}

export const PATCH: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const entity_type = body.entity_type as 'story' | 'content';
    const id = Number(body.id);
    const notes = String(body.notes ?? '').trim() || undefined;
    const operator = String(body.operator ?? 'admin').trim();

    if (!id || !entity_type) {
      return jsonError('Missing required fields: entity_type, id', 400);
    }

    if (entity_type === 'story') {
      const status = body.status as ReportStatus;
      const valid: ReportStatus[] = ['approved', 'rejected', 'removed'];
      if (!valid.includes(status)) {
        return jsonError('Invalid status for story', 400);
      }

      const existing = await getReportById(id);
      if (!existing) return jsonError('Report not found', 404);

      const updated = await updateReportStatus(id, status, notes, operator);
      if (!updated) return jsonError('Update failed', 500);

      if (status === 'rejected' || status === 'removed') {
        await notifyRemovalAction({
          entity_type: 'story',
          id,
          action: status,
          notes,
          affected_email: updated.reporter_email,
        });
      }

      return json({ success: true, id, status });
    }

    if (entity_type === 'content') {
      const status = body.status as ContentReportStatus;
      const valid: ContentReportStatus[] = ['resolved', 'dismissed'];
      if (!valid.includes(status)) {
        return jsonError('Invalid status for content report', 400);
      }

      const updated = await updateContentReportStatus(id, status, notes, operator);
      if (!updated) return jsonError('Content report not found', 404);

      await notifyRemovalAction({
        entity_type: 'content',
        id,
        action: status,
        notes,
        affected_email: updated.reporter_email ?? undefined,
      });

      return json({ success: true, id, status });
    }

    return jsonError('Invalid entity_type', 400);
  } catch (error) {
    console.error('Moderation action failed:', error);
    return jsonError('Internal server error', 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number) {
  return json({ error: message }, status);
}

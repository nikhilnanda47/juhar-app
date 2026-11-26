// The audit trail records WHO acted as a users.id (the login id; the same "user=<id>" the logs show).
// To show a name and role, the login is followed to its staff record (admin_users.user_id).
// A person who is no longer an admin is still named, from their login.
import { PrismaService } from '../../prisma/prisma.service';

export interface ActorName {
  name: string;
  /** owner, catalog_editor, fulfillment_operator, support; empty when the person is not (or no longer) an admin */
  role: string;
}

/** Names for the given audit actor ids (users.id). Ids that match no user are left out. */
export async function resolveActors(
  prisma: Pick<PrismaService, 'user'>,
  actorIds: (string | null | undefined)[],
): Promise<Map<string, ActorName>> {
  const ids = [...new Set(actorIds.filter((id): id is string => !!id))];
  const result = new Map<string, ActorName>();
  if (ids.length === 0) return result;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, phone: true, name: true, adminUser: { select: { name: true, role: true } } },
  });
  for (const u of users) {
    result.set(u.id, { name: u.adminUser?.name || u.name || u.phone, role: u.adminUser?.role || '' });
  }
  return result;
}

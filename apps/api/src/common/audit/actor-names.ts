// The audit trail records WHO acted as a users.id (the login id; the same "user=<id>" the logs show),
// not as an admin_users.id. To show a name and role, the user's phone is matched to the admin record.
// A person who is no longer an admin is still named, from their login.
import { PrismaService } from '../../prisma/prisma.service';

export interface ActorName {
  name: string;
  /** owner, catalog_editor, fulfillment_operator, support; empty when the person is no longer an admin */
  role: string;
}

/** Names for the given audit actor ids (users.id). Ids that match no user are left out. */
export async function resolveActors(
  prisma: Pick<PrismaService, 'user' | 'adminUser'>,
  actorIds: (string | null | undefined)[],
): Promise<Map<string, ActorName>> {
  const ids = [...new Set(actorIds.filter((id): id is string => !!id))];
  const result = new Map<string, ActorName>();
  if (ids.length === 0) return result;

  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, name: true } });
  if (users.length === 0) return result;
  const admins = await prisma.adminUser.findMany({
    where: { phone: { in: users.map((u) => u.phone) } },
    select: { phone: true, name: true, role: true },
  });
  for (const u of users) {
    const admin = admins.find((a) => a.phone === u.phone);
    result.set(u.id, { name: admin?.name || u.name || u.phone, role: admin?.role || '' });
  }
  return result;
}

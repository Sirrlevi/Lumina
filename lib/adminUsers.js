import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

async function listAllAuthUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

export async function getAdminUsers() {
  const authUsers = await listAllAuthUsers();
  const db = adminDb();
  const refs = authUsers.map((u) => db.collection("users").doc(u.uid));
  const snapshots = refs.length ? await db.getAll(...refs) : [];
  const profiles = new Map(snapshots.map((snap) => [snap.id, snap.exists ? snap.data() : {}]));

  return authUsers.map((u) => {
    const p = profiles.get(u.uid) || {};
    return {
      uid: u.uid,
      email: p.email || u.email || "",
      name: p.name || u.displayName || "",
      username: p.username || "",
      createdAt: p.createdAt || (u.metadata?.creationTime ? new Date(u.metadata.creationTime).getTime() : null),
      disabled: !!u.disabled,
      override: p.adminOverride || { enabled: false },
    };
  });
}

export async function searchAdminUsers(query = "") {
  const q = String(query || "").trim().toLowerCase();
  const users = await getAdminUsers();
  if (!q) return users;
  return users.filter((u) =>
    [u.email, u.name, u.username].some((value) => String(value || "").toLowerCase().includes(q))
  );
}

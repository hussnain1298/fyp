import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";


export async function POST() {
  try {
    const snap = await dbAdmin.collection("donations").get();
    const docs = snap.docs;
    const half = Math.floor(docs.length / 2);

    // Delete the *oldest* half – change orderBy if you prefer newest/random
    const docsToDelete = docs
      .sort((a, b) => a.createTime.toMillis() - b.createTime.toMillis())
      .slice(0, half);

    const batch = dbAdmin.batch();
    docsToDelete.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return NextResponse.json(
      { deleted: half, totalBefore: docs.length },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

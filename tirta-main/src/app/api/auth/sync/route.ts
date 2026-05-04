import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, name, photoURL, firebaseUID } = await req.json();

    const user = await prisma.user.upsert({
      where: { firebaseUID },
      update: {
        name,
        photoURL,
      },
      create: {
        email,
        name,
        photoURL,
        firebaseUID,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { authenticatedProxy } from "@/lib/server-auth";
export const runtime = "nodejs";
export const maxDuration = 120;
export const GET = (req: NextRequest) => authenticatedProxy(req);
export const POST = (req: NextRequest) => authenticatedProxy(req);

import { NextRequest } from "next/server";
import { authenticatedProxy } from "@/lib/server-auth";
export const GET = (req: NextRequest) => authenticatedProxy(req, true);
export const POST = (req: NextRequest) => authenticatedProxy(req, true);

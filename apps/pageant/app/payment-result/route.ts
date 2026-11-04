import { NextResponse } from "next/server";
export const GET = () =>
  NextResponse.redirect(
    "https://pageant.self.com.tw/account?tab=tickets&payment=received",
    303,
  );
export const POST = GET;

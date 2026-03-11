import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. 公開ページ（ログイン・登録）へのアクセスはスルー
    if (path.startsWith("/login") || path.startsWith("/register")) {
      return NextResponse.next();
    }

    // 2. 認証済みだが部門（department）が未設定の場合
    //    自分のプロフィールページ以外にアクセスしようとしたら、プロフィールページへ強制移動
    if (token && !token.department) {
      const profilePath = `/members/${token.id}`;
      if (path !== profilePath) {
        return NextResponse.redirect(new URL(profilePath, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // 🛡️ セッション（token）がある場合のみ、middlewareの中身を実行する
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // ログイン、登録、公開リソースは認証不要
        if (
          path.startsWith("/login") || 
          path.startsWith("/register") || 
          path.startsWith("/api/auth") ||
          path.includes(".") // 静的ファイル (favicon.ico等)
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

// 🛡️ 監視対象を「すべて」に広げ、authorized callback 内で細かく制御するのが最も安全です
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)"],
};
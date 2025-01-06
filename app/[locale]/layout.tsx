import { Toaster } from "@/components/ui/sonner"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { ReactNode } from "react"
import "./globals.css"
// 导入 Inter 字体，使用 latin 子集
const inter = Inter({ subsets: ["latin"] })

// 定义应用的基本信息常量
const APP_NAME = "Lawbot UI"
const APP_DEFAULT_TITLE = "Lawbot UI"
const APP_TITLE_TEMPLATE = "%s - Lawbot UI"
const APP_DESCRIPTION = "Lawbot UI PWA!"

// 定义根布局组件的属性接口
interface RootLayoutProps {
  children: ReactNode // 子组件
  params: {
    locale: string // 语言区域参数
  }
}

// 定义网站元数据，用于SEO和PWA配置
export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE, // 默认标题
    template: APP_TITLE_TEMPLATE // 标题模板
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json", // PWA配置文件
  appleWebApp: {
    capable: true, // 启用iOS PWA功能
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
    // startUpImage: [], // iOS启动图片
  },
  formatDetection: {
    telephone: false // 禁用电话号码自动检测
  },
  openGraph: {
    // Open Graph 协议配置，用于社交媒体分享
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    // Twitter 卡片配置
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
}

// 视口配置
export const viewport: Viewport = {
  themeColor: "#000000" // 设置主题颜色
}

// 定义国际化命名空间
const i18nNamespaces = ["translation"]

// 根布局组件
export default async function RootLayout({
  children,
  params: { locale }
}: RootLayoutProps) {
  // 获取 cookie 存储
  const cookieStore = cookies()

  // 创建 Supabase 客户端
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  // 获取用户会话信息,调用了 Supabase 的 auth.getSession() 方法，获取当前用户的会话信息。
  // 会话信息通常包含：
  // 用户的登录状态。
  // 用户的身份认证令牌（如 JWT）。
  const session = (await supabase.auth.getSession()).data.session

  // 初始化国际化配置
  const { t, resources } = await initTranslations(locale, i18nNamespaces)

  return (
    // HTML 根元素，设置语言和禁用水合警告
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 主题提供者组件，设置默认深色主题 */}
        <Providers attribute="class" defaultTheme="dark">
          {/* 国际化提供者组件 */}
          <TranslationsProvider
            namespaces={i18nNamespaces}
            locale={locale}
            resources={resources}
          >
            {/* 消息提示组件 */}
            <Toaster richColors position="top-center" duration={3000} />
            {/* 主要内容容器 */}
            <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
              {/* 根据用户是否登录显示不同内容 */}
              {session ? <GlobalState>{children}</GlobalState> : children}
            </div>
          </TranslationsProvider>
        </Providers>
      </body>
    </html>
  )
}

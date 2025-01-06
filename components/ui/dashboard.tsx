"use client"
// 导入必要的组件和工具函数
import { Sidebar } from "@/components/sidebar/sidebar" // 侧边栏组件
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher" // 侧边栏切换器组件
import { Button } from "@/components/ui/button" // 按钮组件
import { Tabs } from "@/components/ui/tabs" // 标签页组件
import useHotkey from "@/lib/hooks/use-hotkey" // 快捷键钩子
import { cn } from "@/lib/utils" // 工具函数,用于合并className
import { ContentType } from "@/types" // 内容类型定义
import { IconChevronCompactRight } from "@tabler/icons-react" // 图标组件
import { usePathname, useRouter, useSearchParams } from "next/navigation" // Next.js路由相关hooks
import { FC, useState } from "react" // React核心功能
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler" // 文件选择处理钩子
import { CommandK } from "../utility/command-k" // 命令面板组件

// 定义侧边栏宽度常量
export const SIDEBAR_WIDTH = 350

// 定义Dashboard组件的Props接口
interface DashboardProps {
  children: React.ReactNode // 子组件
}

// Dashboard组件定义 - 这是整个应用的主要布局组件
export const Dashboard: FC<DashboardProps> = ({ children }) => {
  // 注册's'快捷键来切换侧边栏
  // useHotkey("s", () => setShowSidebar(prevState => !prevState))

  // 获取路由相关信息
  const pathname = usePathname() // 当前路径
  const router = useRouter() // 路由实例
  const searchParams = useSearchParams() // URL参数
  const tabValue = searchParams.get("tab") || "chats" // 获取当前标签值,默认为chats

  // 获取文件选择处理函数
  const { handleSelectDeviceFile } = useSelectFileHandler()

  // 状态管理
  const [contentType, setContentType] = useState<ContentType>(
    tabValue as ContentType // 类型断言，它告诉 TypeScript 编译器：“相信我，我知道 tabValue 的类型是 ContentType，即使你现在无法确定。”
  )
  const [showSidebar, setShowSidebar] = useState(
    localStorage.getItem("showSidebar") === "true" // 侧边栏显示状态,从localStorage读取
  )
  const [isDragging, setIsDragging] = useState(false) // 拖拽状态

  // 文件拖放处理函数
  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    const file = files[0]
    handleSelectDeviceFile(file)
    setIsDragging(false)
  }

  // 拖拽相关事件处理函数
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  // 侧边栏切换处理函数
  const handleToggleSidebar = () => {
    setShowSidebar(prevState => !prevState)
    localStorage.setItem("showSidebar", String(!showSidebar))
  }

  // 渲染主要UI结构
  return (
    <div className="flex size-full">
      <CommandK /> {/* 命令面板组件 */}
      {/* 侧边栏容器 */}
      <div
        className={cn(
          "duration-200 dark:border-none " + (showSidebar ? "border-r-2" : "")
        )}
        style={{
          minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          width: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px"
        }}
      >
        {/* 条件渲染。只有当 showSidebar 为 true 时，才会渲染大括号内的内容，也就是侧边栏的内容。 */}
        {showSidebar && (
          <Tabs
            className="flex h-full"
            value={contentType}
            onValueChange={tabValue => {
              setContentType(tabValue as ContentType)
              router.replace(`${pathname}?tab=${tabValue}`)
            }}
          >
            <SidebarSwitcher onContentTypeChange={setContentType} />
            <Sidebar contentType={contentType} showSidebar={showSidebar} />
          </Tabs>
        )}
      </div>
      {/* 主内容区域 */}
      <div
        className="bg-muted/50 relative flex w-screen min-w-[90%] grow flex-col sm:min-w-fit"
        onDrop={onFileDrop}
        onDragOver={onDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {isDragging ? (
          // 拖拽文件时显示的提示
          <div className="flex h-full items-center justify-center bg-black/50 text-2xl text-white">
            拖拽文件到这里
          </div>
        ) : (
          children // 显示子组件内容
        )}

        {/* 侧边栏切换按钮 */}
        <Button
          className={cn(
            "absolute left-[4px] top-[50%] z-10 size-[32px] cursor-pointer"
          )}
          style={{
            // marginLeft: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
            transform: showSidebar ? "rotate(180deg)" : "rotate(0deg)"
          }}
          variant="ghost" // 幽灵按钮，没有背景颜色，只有边框和文字
          size="icon" // 图标按钮，只有图标，没有文字
          onClick={handleToggleSidebar} // 点击事件处理函数
        >
          <IconChevronCompactRight size={24} />
        </Button>
      </div>
    </div>
  )
}

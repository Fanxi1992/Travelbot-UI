"use client"
// 导入必要的组件和依赖
import { Dashboard } from "@/components/ui/dashboard"
import { ChatbotUIContext } from "@/context/context" // 导入全局上下文
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants" // 获取助手数据的函数
import { getChatsByWorkspaceId } from "@/db/chats" // 获取聊天数据的函数
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections" // 获取集合数据的函数
import { getFileWorkspacesByWorkspaceId } from "@/db/files" // 获取文件数据的函数
import { getFoldersByWorkspaceId } from "@/db/folders" // 获取文件夹数据的函数
import { getModelWorkspacesByWorkspaceId } from "@/db/models" // 获取模型数据的函数
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets" // 获取预设数据的函数
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts" // 获取提示词数据的函数
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images" // 获取助手图片的函数
import { getToolWorkspacesByWorkspaceId } from "@/db/tools" // 获取工具数据的函数
import { getWorkspaceById } from "@/db/workspaces" // 获取工作区数据的函数
import { convertBlobToBase64 } from "@/lib/blob-to-b64" // Blob转Base64的工具函数
import { supabase } from "@/lib/supabase/browser-client" // Supabase客户端
import { LLMID } from "@/types" // 语言模型ID类型
import { useParams, useRouter, useSearchParams } from "next/navigation" // Next.js路由相关hooks
import { ReactNode, useContext, useEffect, useState } from "react" // React核心hooks
import Loading from "../loading" // 加载组件

// 定义工作区布局组件的Props接口
interface WorkspaceLayoutProps {
  children: ReactNode // 子组件类型
}

// 工作区布局组件
export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter() // 路由实例

  // 获取路由参数和查询参数
  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string // 从URL获取工作区ID

  // 从全局上下文中获取状态和设置函数
  const {
    setChatSettings, // 设置聊天配置
    setAssistants, // 设置助手列表
    setAssistantImages, // 设置助手图片
    setChats, // 设置聊天列表
    setCollections, // 设置集合列表
    setFolders, // 设置文件夹列表
    setFiles, // 设置文件列表
    setPresets, // 设置预设列表
    setPrompts, // 设置提示词列表
    setTools, // 设置工具列表
    setModels, // 设置模型列表
    selectedWorkspace, // 当前选中的工作区
    setSelectedWorkspace, // 设置当前工作区
    setSelectedChat, // 设置当前聊天
    setChatMessages, // 设置聊天消息
    setUserInput, // 设置用户输入
    setIsGenerating, // 设置是否正在生成
    setFirstTokenReceived, // 设置是否收到第一个token
    setChatFiles, // 设置聊天文件
    setChatImages, // 设置聊天图片
    setNewMessageFiles, // 设置新消息文件
    setNewMessageImages, // 设置新消息图片
    setShowFilesDisplay // 设置是否显示文件
  } = useContext(ChatbotUIContext)

  const [loading, setLoading] = useState(true) // 加载状态

  // 组件挂载时检查用户登录状态
  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login") // 未登录则跳转到登录页
      } else {
        await fetchWorkspaceData(workspaceId) // 已登录则获取工作区数据
      }
    })()
  }, [])

  // 当工作区ID变化时重新获取数据并重置状态
  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId))()

    // 重置所有相关状态
    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
  }, [workspaceId])

  // 获取工作区所有相关数据的函数
  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    // 获取工作区基本信息
    const workspace = await getWorkspaceById(workspaceId)
    setSelectedWorkspace(workspace)

    // 获取助手数据
    const assistantData = await getAssistantWorkspacesByWorkspaceId(workspaceId)
    setAssistants(assistantData.assistants)

    // 处理每个助手的图片
    for (const assistant of assistantData.assistants) {
      let url = ""

      if (assistant.image_path) {
        url = (await getAssistantImageFromStorage(assistant.image_path)) || ""
      }

      if (url) {
        // 如果有图片URL，获取图片并转换为Base64
        const response = await fetch(url)
        const blob = await response.blob()
        const base64 = await convertBlobToBase64(blob)

        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64,
            url
          }
        ])
      } else {
        // 如果没有图片，添加空图片数据
        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64: "",
            url
          }
        ])
      }
    }

    // 获取各种工作区相关数据
    const chats = await getChatsByWorkspaceId(workspaceId)
    setChats(chats)

    const collectionData =
      await getCollectionWorkspacesByWorkspaceId(workspaceId)
    setCollections(collectionData.collections)

    const folders = await getFoldersByWorkspaceId(workspaceId)
    setFolders(folders)

    const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)
    setFiles(fileData.files)

    const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)
    setPresets(presetData.presets)

    const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)
    setPrompts(promptData.prompts)

    const toolData = await getToolWorkspacesByWorkspaceId(workspaceId)
    setTools(toolData.tools)

    const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)
    setModels(modelData.models)

    // 设置聊天配置
    setChatSettings({
      model: (searchParams.get("model") ||
        workspace?.default_model ||
        "gpt-4o") as LLMID,
      prompt:
        workspace?.default_prompt ||
        "hi, You are a friendly, helpful AI assistant.",
      temperature: workspace?.default_temperature || 0.2,
      contextLength: workspace?.default_context_length || 4096,
      includeProfileContext: workspace?.include_profile_context || true,
      includeWorkspaceInstructions:
        workspace?.include_workspace_instructions || true,
      embeddingsProvider:
        (workspace?.embeddings_provider as "openai" | "local") || "openai"
    })

    setLoading(false) // 数据加载完成
  }

  // 如果正在加载，显示加载组件
  if (loading) {
    return <Loading />
  }

  // 渲染Dashboard组件并传入子组件
  return <Dashboard>{children}</Dashboard>
}

// 导入必要的依赖
import { ChatbotUIContext } from "@/context/context" // 导入全局上下文
import { createDocXFile, createFile } from "@/db/files" // 导入文件创建相关函数
import { LLM_LIST } from "@/lib/models/llm/llm-list" // 导入LLM模型列表
import mammoth from "mammoth" // 导入docx文件处理库
import { useContext, useEffect, useState } from "react" // 导入React Hooks
import { toast } from "sonner" // 导入提示组件

// 定义支持的文件类型常量
export const ACCEPTED_FILE_TYPES = [
  "text/csv", // CSV文件
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word文档
  "application/json", // JSON文件
  "text/markdown", // Markdown文件
  "application/pdf", // PDF文件
  "text/plain" // 纯文本文件
].join(",") // 将数组转换为逗号分隔的字符串

// 自定义Hook: 处理文件选择的逻辑
export const useSelectFileHandler = () => {
  // 从全局上下文中获取需要的状态和方法
  const {
    selectedWorkspace, // 当前选中的工作区
    profile, // 用户配置
    chatSettings, // 聊天设置
    setNewMessageImages, // 设置新消息图片
    setNewMessageFiles, // 设置新消息文件
    setShowFilesDisplay, // 设置是否显示文件
    setFiles, // 设置文件列表
    setUseRetrieval // 设置是否使用检索
  } = useContext(ChatbotUIContext)

  // 状态: 可接受的文件类型
  const [filesToAccept, setFilesToAccept] = useState(ACCEPTED_FILE_TYPES)

  // 当模型改变时更新可接受的文件类型
  useEffect(() => {
    handleFilesToAccept()
  }, [chatSettings?.model])

  // 处理可接受文件类型的函数
  const handleFilesToAccept = () => {
    const model = chatSettings?.model
    const FULL_MODEL = LLM_LIST.find(llm => llm.modelId === model)

    if (!FULL_MODEL) return

    // 如果模型支持图片输入，则添加图片类型到可接受类型中
    setFilesToAccept(
      FULL_MODEL.imageInput
        ? `${ACCEPTED_FILE_TYPES},image/*`
        : ACCEPTED_FILE_TYPES
    )
  }

  // 处理设备文件选择的主要函数
  const handleSelectDeviceFile = async (file: File) => {
    // 验证必要条件
    if (!profile || !selectedWorkspace || !chatSettings) {
      toast.error(
        "Missing configuration: profile, workspace, or chat settings.",
        {
          duration: 3000
        }
      )
      return
    }

    // 显示文件显示并启用检索
    setShowFilesDisplay(true)
    setUseRetrieval(true)

    if (file) {
      // 获取简化的文件类型
      let simplifiedFileType = file.type.split("/")[1]

      // 创建文件读取器
      let reader = new FileReader()

      // 处理图片文件
      if (file.type.includes("image")) {
        reader.readAsDataURL(file)
      }
      // 处理支持的文件类型
      else if (ACCEPTED_FILE_TYPES.split(",").includes(file.type)) {
        // 处理特殊文件类型的命名
        if (simplifiedFileType.includes("vnd.adobe.pdf")) {
          simplifiedFileType = "pdf"
        } else if (
          simplifiedFileType.includes(
            "vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              "docx"
          )
        ) {
          simplifiedFileType = "docx"
        }

        // 添加loading状态的文件到新消息文件列表
        setNewMessageFiles(prev => [
          ...prev,
          {
            id: "loading",
            name: file.name,
            type: simplifiedFileType,
            file: file
          }
        ])

        // 特殊处理docx文件
        if (
          file.type.includes(
            "vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              "docx"
          )
        ) {
          const arrayBuffer = await file.arrayBuffer()
          // 使用mammoth提取docx文本内容
          const result = await mammoth.extractRawText({
            arrayBuffer
          })

          // createDocXFile函数负责在 Supabase 的 files 表中创建一条记录来代表这个 DOCX 文件。
          const createdFile = await createDocXFile(
            result.value,
            file,
            {
              user_id: profile.user_id,
              description: "",
              file_path: "",
              name: file.name,
              size: file.size,
              tokens: 0,
              type: simplifiedFileType
            },
            selectedWorkspace.id,
            chatSettings.embeddingsProvider
          )

          // 更新文件列表
          setFiles(prev => [...prev, createdFile])

          // 更新新消息文件列表，替换loading状态
          setNewMessageFiles(prev =>
            prev.map(item =>
              item.id === "loading"
                ? {
                    id: createdFile.id,
                    name: createdFile.name,
                    type: createdFile.type,
                    file: file
                  }
                : item
            )
          )

          reader.onloadend = null

          return
        } else {
          // 根据文件类型选择不同的读取方式
          file.type.includes("pdf")
            ? reader.readAsArrayBuffer(file)
            : reader.readAsText(file)
        }
      } else {
        throw new Error("Unsupported file type")
      }

      // 文件读取完成后的处理
      reader.onloadend = async function () {
        try {
          if (file.type.includes("image")) {
            // 处理图片文件
            const imageUrl = URL.createObjectURL(file)

            // 添加临时图片到新消息图片列表
            setNewMessageImages(prev => [
              ...prev,
              {
                messageId: "temp",
                path: "",
                base64: reader.result,
                url: imageUrl,
                file
              }
            ])
          } else {
            // 处理其他类型文件
            const createdFile = await createFile(
              file,
              {
                user_id: profile.user_id,
                description: "",
                file_path: "",
                name: file.name,
                size: file.size,
                tokens: 0,
                type: simplifiedFileType
              },
              selectedWorkspace.id,
              chatSettings.embeddingsProvider
            )

            // 更新文件列表
            setFiles(prev => [...prev, createdFile])

            // 更新新消息文件列表
            setNewMessageFiles(prev =>
              prev.map(item =>
                item.id === "loading"
                  ? {
                      id: createdFile.id,
                      name: createdFile.name,
                      type: createdFile.type,
                      file: file
                    }
                  : item
              )
            )
          }
        } catch (error: any) {
          // 错误处理
          toast.error("Failed to upload. " + error?.message, {
            duration: 10000
          })
          // 清除临时文件和图片
          setNewMessageImages(prev =>
            prev.filter(img => img.messageId !== "temp")
          )
          setNewMessageFiles(prev => prev.filter(file => file.id !== "loading"))
        }
      }
    }
  }

  // 返回处理函数和可接受的文件类型
  return {
    handleSelectDeviceFile,
    filesToAccept
  }
}

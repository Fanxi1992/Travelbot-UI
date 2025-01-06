import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
// import { TransformStream } from "stream/web" // Edge Runtime 需要这样引入

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }
  // 对特定问题进行伪造回答
  const message_match = messages[1].content
  console.log("for openrouter,打印重要的请求体messages", message_match)

  try {
 // --- 特例分支：模拟流式返回包含 Markdown 表格的纯文本 ---
 if (message_match === "请帮我设计一份新加坡5天4晚的旅游行程") {
  const fixedResponse = `
详细行程

以下是行程概要：

| 日期 | 上午 | 下午 | 晚上 |
|---|---|---|---|
| 第一天 | 抵达新加坡，入住酒店 | 滨海湾花园 | 克拉码头夜游 |
| 第二天 | 新加坡动物园 | 河川生态园 |  品尝当地美食 |
| 第三天 | 圣淘沙岛，环球影城 | S.E.A.海洋馆 |  时光之翼表演 |
| 第四天 | 牛车水，小印度 |  乌节路购物 |  体验夜间飞行者 |
| 第五天 |  酒店退房，根据航班时间安排 |  前往机场 |  |

更详细的每日安排如下：

**第一天：抵达新加坡**
交通选择：
MRT（地铁）：20-30新元
出租车：20-35新元
机场巴士：9-15新元
...
  `.trim();

  const encoder = new TextEncoder();
  const chunks = fixedResponse.split('\n').map(line => line + '\n'); // 将内容按行分割

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise(resolve => setTimeout(resolve, 100)); // 添加延迟，模拟流式效果
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

    console.log("这个走正常")
    // 如果不是特定问题,走正常的大模型调用流程
    const profile = await getServerProfile()
    checkApiKey(profile.openrouter_api_key, "OpenRouter")

    const openai = new OpenAI({
      apiKey: profile.openrouter_api_key || "",
      baseURL: "https://openrouter.ai/api/v1"
    })

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens: undefined,
      stream: true
    })

    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenRouter API Key not found. Please set it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

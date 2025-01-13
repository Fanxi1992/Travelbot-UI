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
  // 添加2秒延迟,模拟思考时间
  // await new Promise(resolve => setTimeout(resolve, 8000));
  
  const fixedResponse = `
***详细行程***

**第一天：抵达新加坡**
- 交通选择：
    - MRT（地铁）：20-30新元
    - 出租车：20-35新元
    - 机场巴士：9-15新元
- 下午行程：滨海湾花园
    - 门票：约38新元（云雾林和花穹）
    - 特色：云雾林的人工瀑布和超级树丛的灯光秀
- 晚上活动：滨海湾灯光秀
    - 时间：晚上8:00和8:30

**第二天：文化与历史探索**
- 上午：小印度
    - 早餐推荐：Tekka Centre（印度薄饼和马来卡亚吐司）
    - 参观斯里维拉玛卡里亚曼庙
- 下午：阿拉伯街与牛车水
    - 阿拉伯街：苏丹清真寺（免费），特色购物
    - 牛车水：参观文化遗产中心
- 晚上：克拉码头
    - 晚餐：Jumbo Seafood（辣椒螃蟹，约100-200新元）
    - 夜生活：酒吧和现场音乐

**第三天：动物与自然探索**
- 上午：新加坡动物园
    - 门票：约40新元
    - 特色展区：猩猩王国和夜间动物表演
- 下午：夜间动物园
    - 门票：约50新元，观赏夜间动物表演
- 晚上：继续夜间活动或自由活动

**第四天：现代购物与观赏**
- 上午：乌节路购物
    - 推荐购物中心：ION Orchard和河滨点
- 下午：新加坡摩天轮
    - 门票：约33新元，俯瞰城市全景
- 晚上：滨海湾散步
    - 推荐地点：滨海湾金沙和艺术科学博物馆周边

**第五天：自由活动与离境**
- 上午：最后购物
    - 建议：再访问乌节路或牛车水
- 午餐：当地特色餐厅
- 准备离境：根据航班时间返回酒店取行李，前往樟宜机场



***以下是行程总结：***

| 日期   | 上午             | 下午           | 晚上         |
|------|----------------|----------------|--------------|
| 第一天  | 抵达樟宜机场，前往酒店 | 滨海湾花园       | 滨海湾灯光秀   |
| 第二天  | 小印度文化体验     | 阿拉伯街与牛车水  | 克拉码头晚餐与夜生活 |
| 第三天  | 新加坡动物园       | 自然探险与夜间动物园 | 自由活动       |
| 第四天  | 乌节路购物       | 新加坡摩天轮     | 江边散步与滨海湾之夜 |
| 第五天  | 最后购物         | 返回酒店，准备离境 | 离开新加坡     |

如果您有任何其他需求或问题，欢迎随时提出！希望这份专业而细致的旅游计划能够帮助您充分利用在新加坡的每一天。
  `.trim();

  const encoder = new TextEncoder();
  const chunks = fixedResponse.split('\n').map(line => line + '\n'); // 将内容按行分割

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        // 生成一个在300ms上下30%范围内的随机延迟
        const randomDelay = 100 * (1 + (Math.random() * 0.6 - 0.3)); // 0.7到1.3之间的随机数乘以300
        await new Promise(resolve => setTimeout(resolve, randomDelay));
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

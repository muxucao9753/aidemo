import Link from "next/link";

const features = [
  {
    title: "图片压缩",
    description: "智能压缩图片大小，最大限度保持清晰度。",
    href: "/compress",
  },
  {
    title: "抠图去背景",
    description: "自动识别主体，一键去除复杂背景。",
    href: "/background-removal",
  },
  {
    title: "图片识别",
    description: "上传图片快速识别内容与标签信息。",
    href: "/recognition",
  },
  {
    title: "AI 生图",
    description: "输入文字描述即可生成创意图片。",
    href: "/image-generation",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-24 sm:px-10">
        <header className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <span className="rounded-full border border-zinc-200 px-4 py-1 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            图片工具集
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            一站式图片综合处理平台
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-zinc-600 dark:text-zinc-400">
            选择需要的功能，快速处理图片，从压缩到生成一步到位。
          </p>
        </header>

        <section className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-semibold">{feature.title}</h2>
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition group-hover:gap-3 dark:text-blue-400">
                开始使用<span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

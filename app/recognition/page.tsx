"use client";

import { useEffect, useMemo, useState } from "react";

interface RecognitionResult {
  result: string;
  preview: string;
  mimeType: string;
}

const MAX_LENGTH = 3000;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function RecognitionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResult(null);
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setError("请选择图片文件");
      setFile(null);
      return;
    }

    setFile(nextFile);
  };

  const handleRecognize = async () => {
    if (!file) {
      setError("请先上传图片");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/recognize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "识别失败，请稍后重试");
      }

      const data = (await response.json()) as RecognitionResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "识别失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const trimmedResult = useMemo(() => {
    if (!result?.result) {
      return "";
    }
    return result.result.length > MAX_LENGTH
      ? `${result.result.slice(0, MAX_LENGTH)}...`
      : result.result;
  }, [result]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">图片识别</span>
          <h1 className="text-3xl font-semibold">上传图片，快速获取识别结果</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            调用火山引擎识别服务，自动解析图片内容并生成文字描述。
          </p>
        </header>

        <section className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3">
            <label htmlFor="recognition-upload" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              1. 上传图片
            </label>
            <input
              id="recognition-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            />
            {file ? (
              <div className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <span className="truncate" title={file.name}>
                  {file.name}
                </span>
                <span>{formatBytes(file.size)}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">2. 预览图片</span>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="上传图片预览"
                className="h-full max-h-[320px] w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                上传图片后即可预览内容
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleRecognize}
              disabled={isLoading || !file}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isLoading ? "识别中..." : "开始识别"}
            </button>

            {result ? (
              <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                    识别结果
                  </span>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {trimmedResult || "未获取到详细描述"}
                  </p>
                </div>

                {result.preview ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                      API 返回预览
                    </span>
                    <img
                      src={`data:${result.mimeType};base64,${result.preview}`}
                      alt="识别接口返回的图片预览"
                      className="max-h-[320px] w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

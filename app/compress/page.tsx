"use client";

import { useEffect, useMemo, useState } from "react";

const MIN_QUALITY = 40;
const MAX_QUALITY = 95;
const DEFAULT_QUALITY = 80;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function base64ToSize(base64: string): number {
  const padding = (base64.match(/=*$/)?.[0].length ?? 0);
  return Math.floor(base64.length * 0.75) - padding;
}

function inferFormatFromFile(file: File): "jpeg" | "png" | "webp" | "avif" {
  const type = file.type.toLowerCase();
  if (type.includes("png")) {
    return "png";
  }
  if (type.includes("webp")) {
    return "webp";
  }
  if (type.includes("avif")) {
    return "avif";
  }
  return "jpeg";
}

interface CompressionResult {
  filename: string;
  mimeType: string;
  data: string;
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressed, setCompressed] = useState<CompressionResult | null>(null);

  useEffect(() => {
    if (!file) {
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
    setCompressed(null);
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

  const handleSubmit = async () => {
    if (!file) {
      setError("请先上传图片");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("quality", String(quality));
      formData.append("format", inferFormatFromFile(file));

      const response = await fetch("/api/compress", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "压缩失败，请稍后重试");
      }

      const data = (await response.json()) as CompressionResult;
      setCompressed(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "压缩失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!compressed) {
      return;
    }
    const link = document.createElement("a");
    link.href = `data:${compressed.mimeType};base64,${compressed.data}`;
    link.download = compressed.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const originalSize = useMemo(() => (file ? file.size : 0), [file]);
  const compressedSize = useMemo(() => (compressed ? base64ToSize(compressed.data) : 0), [compressed]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">图片压缩</span>
          <h1 className="text-3xl font-semibold">上传图片，选择压缩比例，一键保存</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            支持 JPEG/PNG/WebP/AVIF 格式，默认自动识别图片类型并在压缩后保持尽可能的清晰度。
          </p>
        </header>

        <section className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3">
            <label htmlFor="image-upload" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              1. 上传图片
            </label>
            <input
              id="image-upload"
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
                <span>{formatBytes(originalSize)}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">2. 选择压缩百分比</span>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={MIN_QUALITY}
                max={MAX_QUALITY}
                step={1}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
              <span className="w-16 text-right text-sm font-medium text-blue-600 dark:text-blue-400">{quality}%</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              数值越低压缩率越高，但可能影响画质。建议选择 70% - 85% 之间以平衡体积与清晰度。
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">3. 预览图片</span>
            {previewUrl ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">原图</span>
                  <img
                    src={previewUrl}
                    alt="原始图片预览"
                    className="h-full w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
                  />
                </div>
                {compressed ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400">压缩后</span>
                    <img
                      src={`data:${compressed.mimeType};base64,${compressed.data}`}
                      alt="压缩后的图片预览"
                      className="h-full w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    压缩完成后将在此显示预览
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                上传图片后可实时预览
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
              onClick={handleSubmit}
              disabled={isSubmitting || !file}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isSubmitting ? "压缩中..." : "开始压缩"}
            </button>

            {compressed ? (
              <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">压缩完成</p>
                    <p className="text-xs text-green-700/80 dark:text-green-300/70">{compressed.filename}</p>
                  </div>
                  <div className="text-xs text-green-700/80 dark:text-green-300/70">
                    <span>原始大小: {formatBytes(originalSize)}</span>
                    <span className="mx-2">→</span>
                    <span>压缩后: {formatBytes(compressedSize)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex w-full items-center justify-center rounded-md border border-green-500 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-500 hover:text-white dark:text-green-300"
                >
                  下载压缩图片
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

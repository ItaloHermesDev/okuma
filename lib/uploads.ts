import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function saveUpload(file: File, folder: string, options?: { pdf?: boolean }) {
  const extension = TYPES[file.type];

  if (!extension || (extension === "pdf" && !options?.pdf)) {
    throw new Error(
      options?.pdf
        ? "Envie o comprovante em JPG, PNG, WebP ou PDF."
        : "Envie uma imagem JPG, PNG ou WebP.",
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const name = `${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}

export async function removeUpload(publicPath: string) {
  if (!publicPath.startsWith("/uploads/")) {
    return;
  }

  const root = path.resolve(process.cwd(), "public", "uploads");
  const full = path.resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));

  if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
    return;
  }

  await unlink(full).catch(() => undefined);
}

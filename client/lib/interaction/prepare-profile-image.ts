/** HEIC는 서버에서 처리한다. 브라우저에서 읽을 수 있는 사진은 긴 변을 1024px로 줄인다. */
export const prepareProfileImage = async (file: File): Promise<File> => {
  if (file.type !== "image/jpeg" && file.type !== "image/png") return file;
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((bitmap.width * 1024) / longest));
    canvas.height = Math.max(1, Math.round((bitmap.height * 1024) / longest));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 준비하지 못했어요. 다른 사진을 선택해 주세요.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (encoded) => {
          if (encoded) resolve(encoded);
          else reject(new Error("사진을 준비하지 못했어요. 다른 사진을 선택해 주세요."));
        },
        file.type,
        0.85,
      );
    });
    return new File([blob], file.name, { type: blob.type });
  } finally {
    bitmap.close();
  }
};

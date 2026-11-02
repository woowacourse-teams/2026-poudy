const PROFILE_SIZE = 512;
const PREPARE_FAILED = "사진을 준비하지 못했어요. 다른 사진을 선택해 주세요.";

const squareCanvasOf = (bitmap: ImageBitmap): HTMLCanvasElement => {
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(side, PROFILE_SIZE);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(PREPARE_FAILED);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return canvas;
};

/** HEIC는 서버에서 처리한다. 브라우저에서 읽을 수 있는 사진은 서버와 같게 가운데를 정사각형으로 잘라 512px 이하로 줄인다. */
export const prepareProfileImage = async (file: File): Promise<File> => {
  if (file.type !== "image/jpeg" && file.type !== "image/png") return file;
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width === bitmap.height && bitmap.width <= PROFILE_SIZE) return file;
    const canvas = squareCanvasOf(bitmap);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (encoded) => {
          if (encoded) resolve(encoded);
          else reject(new Error(PREPARE_FAILED));
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

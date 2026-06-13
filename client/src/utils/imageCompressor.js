/**
 * Utility to compress images in the client using HTML5 Canvas.
 * Supports PNG (resizing while preserving transparency) and JPEG (resizing and quality compression).
 * 
 * @param {File} file The input file object
 * @param {Object} options Options for compression
 * @param {number} options.maxSize Maximum width or height of the compressed image in pixels.
 * @param {number} options.quality JPEG quality from 0 to 1. Default is 0.8.
 * @returns {Promise<File>} Compressed File object, or the original File if compression fails or isn't applicable.
 */
export const compressImage = (file, options = {}) => {
  const { maxSize = 1024, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    // Only process images
    if (!file || !file.type || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Only resize/compress if it exceeds maxSize or is a JPEG that can be compressed
      const needsResize = width > maxSize || height > maxSize;
      const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";

      if (!needsResize && !isJpeg) {
        // No resize needed and not a JPEG (so PNG compression won't do much without resize), return original
        resolve(file);
        return;
      }

      // Calculate new dimensions
      if (needsResize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Draw the image to the canvas
      ctx.drawImage(img, 0, 0, width, height);

      let outputMimeType = file.type;
      if (outputMimeType === "image/jpg") {
        outputMimeType = "image/jpeg";
      }

      const finalQuality = outputMimeType === "image/jpeg" ? quality : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // Fallback to original
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: outputMimeType,
            lastModified: Date.now(),
          });

          // Only return the compressed file if it's actually smaller
          if (compressedFile.size < file.size) {
            console.log(
              `Compressed ${file.name} from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB`
            );
            resolve(compressedFile);
          } else {
            console.log(`Compressed file was not smaller. Keeping original.`);
            resolve(file);
          }
        },
        outputMimeType,
        finalQuality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      console.error("Image loading failed for compression:", err);
      resolve(file); // Fallback to original on error
    };
  });
};

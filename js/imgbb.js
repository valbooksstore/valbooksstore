// Uploads a cover image to imgBB and returns its hosted URL.
// imgBB's free API accepts a base64-encoded image with no server needed.

import { IMGBB_API_KEY } from "./config.js";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadCoverImage(file) {
  if (!IMGBB_API_KEY || IMGBB_API_KEY.startsWith("YOUR_")) {
    throw new Error("Add your imgBB API key in js/config.js first.");
  }
  const base64 = await fileToBase64(file);
  const form = new FormData();
  form.append("image", base64);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data?.error?.message || "Image upload failed.");
  return data.data.url;
}
